import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { discoverRoutes, runBrowserScan } from "@bhashafix/browser";
import { validateTargetUrl } from "@bhashafix/crawler";
import { localeProfile } from "@bhashafix/locale-engine";
import { createScanStore, type ScanStore } from "@bhashafix/persistence";
import { DEFAULT_VIEWPORTS, ScanSchema, type Scan } from "@bhashafix/shared";

export type BrowserScanOptions = {
  url: string;
  projectRoot: string;
  sourceLocale?: string;
  locales?: string[];
  routes?: string[];
  viewports?: string[];
  themes?: Array<"light" | "dark">;
  maxRoutes?: number;
  allowLocalhost?: boolean;
  runAxe?: boolean;
  onProgress?: (message: string) => void;
};

export type BrowserScanOutcome = {
  scan: Scan;
  artifactDir: string;
  screenshots: string[];
  renderCount: number;
  remote: boolean;
  discoveredRoutes: number;
  persistence: { driver: string; durable: boolean };
};

function selectViewports(names?: string[]) {
  if (!names || names.length === 0) return [...DEFAULT_VIEWPORTS];
  const selected = DEFAULT_VIEWPORTS.filter((viewport) =>
    names.includes(viewport.name),
  );
  if (selected.length === 0) throw new Error(`No known viewport in "${names.join(",")}".`);
  return selected;
}

/**
 * Render a live target in a real browser and return a schema-valid Scan.
 *
 * Unlike the fixture evaluator this launches Chromium, measures the rendered
 * DOM, writes real screenshots, and derives every issue from those
 * measurements.
 */
export async function runBrowserProjectScan(
  options: BrowserScanOptions,
): Promise<BrowserScanOutcome> {
  const allowLocalhost = options.allowLocalhost ?? true;
  const validated = await validateTargetUrl(options.url, {
    hosted: false,
    allowLocalhost,
  });
  const sourceLocale = localeProfile(options.sourceLocale ?? "en-GB").canonical;
  const locales = (options.locales?.length ? options.locales : [sourceLocale]).map(
    (locale) => localeProfile(locale).canonical,
  );
  const viewports = selectViewports(options.viewports);
  const themes = options.themes?.length ? options.themes : (["light"] as const);
  const scanId = `browser-${randomUUID()}`;
  const artifactDir = path.join(options.projectRoot, ".bhashafix", "scans", scanId);
  await mkdir(artifactDir, { recursive: true });

  let routes = options.routes;
  let discoveredRoutes = routes?.length ?? 0;
  if (!routes || routes.length === 0) {
    options.onProgress?.(`Discovering routes from ${validated.href}`);
    const discovery = await discoverRoutes(validated.href, {
      maxRoutes: options.maxRoutes ?? 5,
      locale: sourceLocale,
    });
    routes = discovery.routes;
    discoveredRoutes = discovery.discovered;
  }

  options.onProgress?.(
    `Rendering ${routes.length} route(s) × ${locales.length} locale(s) × ${viewports.length} viewport(s)`,
  );

  const result = await runBrowserScan({
    scanId,
    origin: "LOCAL_REPOSITORY_SCAN",
    target: validated.origin,
    routes,
    locales,
    viewports: [...viewports],
    themes: [...themes],
    artifactDir,
    runAxe: options.runAxe ?? true,
    localeUrl: (target, route, locale) => {
      const url = new URL(route, target);
      if (locale !== sourceLocale) url.searchParams.set("locale", locale);
      return url.href;
    },
    onProgress: (event) =>
      options.onProgress?.(
        `${event.route} · ${event.locale} · ${event.viewport} → ${event.issues} issue(s)`,
      ),
  });

  const scan = ScanSchema.parse({
    scanId,
    origin: "LOCAL_REPOSITORY_SCAN",
    status: result.issues.length > 0 ? "completed_with_warnings" : "completed",
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    config: {
      projectRoot: options.projectRoot,
      url: validated.href,
      sourceLocale,
      locales,
      routes,
      viewports: [...viewports],
      browsers: [result.engine],
      themes: [...themes],
      maxPages: options.maxRoutes ?? 5,
      maxDepth: 1,
      rateLimitPerSecond: 2,
      noAi: true,
      hosted: false,
      allowLocalhost,
      allowlist: [],
    },
    issues: result.issues,
    routesDiscovered: routes,
    localesTested: locales,
    engineVersion: "0.2.0",
    mode: "live",
  });

  const screenshots = result.renders
    .map((render) => render.screenshotPath)
    .filter((value): value is string => Boolean(value));

  await writeFile(
    path.join(artifactDir, "scan.json"),
    `${JSON.stringify(scan, null, 2)}\n`,
  );
  await writeFile(
    path.join(artifactDir, "renders.json"),
    `${JSON.stringify(
      result.renders.map((render) => ({
        route: render.request.route,
        locale: render.request.locale,
        viewport: render.request.viewport,
        theme: render.request.theme,
        url: render.request.url,
        status: render.runtime.status,
        renderedAt: render.renderedAt,
        durationMs: render.durationMs,
        measuredElements: render.measurement.elements.length,
        consoleErrors: render.runtime.consoleErrors.length,
        failedRequests: render.runtime.failedRequests.length,
        axeViolations: render.runtime.axeViolations.length,
        screenshot: render.screenshotPath,
        dom: render.domPath,
      })),
      null,
      2,
    )}\n`,
  );

  const store = await createScanStore({ projectRoot: options.projectRoot });
  await persistScan(store, scan, result.renders, artifactDir);
  await store.close();

  return {
    scan,
    artifactDir,
    screenshots,
    renderCount: result.coverage.renderCount,
    remote: result.remote,
    discoveredRoutes,
    persistence: { driver: store.driver, durable: store.durable },
  };
}

async function sha256File(file: string) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

/** Record the scan, its stage events and every artifact in the durable store. */
async function persistScan(
  store: ScanStore,
  scan: Scan,
  renders: Array<{
    request: { route: string; locale: string; viewport: { name: string } };
    screenshotPath: string | null;
    domPath: string | null;
    renderedAt: string;
    durationMs: number;
  }>,
  artifactDir: string,
) {
  if (!store.durable) return;
  await store.saveScan(scan);
  await store.appendEvent({
    scanId: scan.scanId,
    at: scan.startedAt,
    stage: "rendering",
    message: `Rendered ${renders.length} page(s) in a real browser.`,
    detail: { artifactDir },
  });
  for (const render of renders) {
    await store.appendEvent({
      scanId: scan.scanId,
      at: render.renderedAt,
      stage: "checking",
      message: `${render.request.route} · ${render.request.locale} · ${render.request.viewport.name}`,
      detail: { durationMs: render.durationMs },
    });
    for (const [kind, file] of [
      ["screenshot", render.screenshotPath],
      ["dom", render.domPath],
    ] as const) {
      if (!file) continue;
      const bytes = await readFile(file);
      await store.saveArtifact({
        scanId: scan.scanId,
        kind,
        route: render.request.route,
        locale: render.request.locale,
        viewport: render.request.viewport.name,
        filePath: path.relative(path.dirname(artifactDir), file).replaceAll("\\", "/"),
        byteLength: bytes.byteLength,
        sha256: await sha256File(file),
      });
    }
  }
  await store.appendEvent({
    scanId: scan.scanId,
    at: scan.completedAt,
    stage: scan.status,
    message: `${scan.issues.length} measured issue(s).`,
  });
}
