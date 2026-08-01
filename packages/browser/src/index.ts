import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { localeProfile } from "@bhashafix/locale-engine";
import { DEFAULT_VIEWPORTS, type Issue, type ScanOrigin } from "@bhashafix/shared";
import {
  MAX_MEASURED_ELEMENTS,
  MAX_TEXT_LENGTH,
  collectPageMeasurement,
  type PageMeasurement,
} from "./measure.js";
import { evaluateRules, type RuleContext, type RuntimeSignals } from "./rules.js";

export * from "./measure.js";
export * from "./rules.js";

export type BrowserEngine = "chromium" | "firefox" | "webkit";

export type BrowserLaunchOptions = {
  engine?: BrowserEngine;
  /** CDP/Playwright websocket endpoint, e.g. a Browserless instance. */
  wsEndpoint?: string | null;
  headless?: boolean;
  timeoutMs?: number;
};

export type RenderRequest = {
  url: string;
  route: string;
  locale: string;
  viewport: { name: string; width: number; height: number };
  theme?: "light" | "dark";
  /** Directory for screenshots and DOM snapshots; omit to skip artifact writes. */
  artifactDir?: string | null;
  artifactPrefix?: string;
  waitForSelector?: string | null;
  runAxe?: boolean;
  timeoutMs?: number;
};

export type RenderedRoute = {
  request: RenderRequest;
  measurement: PageMeasurement;
  runtime: RuntimeSignals;
  screenshotPath: string | null;
  domPath: string | null;
  engine: BrowserEngine;
  renderedAt: string;
  durationMs: number;
};

/** Minimal structural types so this package compiles without Playwright's types. */
type PlaywrightPage = {
  goto: (url: string, options?: Record<string, unknown>) => Promise<{ status: () => number } | null>;
  evaluate: <T, A>(fn: (arg: A) => T, arg: A) => Promise<T>;
  screenshot: (options: Record<string, unknown>) => Promise<Buffer>;
  content: () => Promise<string>;
  waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
  on: (event: string, handler: (payload: never) => void) => void;
  close: () => Promise<void>;
};
type PlaywrightContext = {
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};
type PlaywrightBrowser = {
  newContext: (options: Record<string, unknown>) => Promise<PlaywrightContext>;
  close: () => Promise<void>;
};

export type BrowserSession = {
  engine: BrowserEngine;
  remote: boolean;
  render: (request: RenderRequest) => Promise<RenderedRoute>;
  close: () => Promise<void>;
};

async function loadPlaywright(): Promise<Record<string, unknown>> {
  const candidates = ["playwright", "@playwright/test", "playwright-core"];
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      return (await import(/* @vite-ignore */ candidate)) as Record<string, unknown>;
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(
    `Playwright is not installed. Install it with "pnpm add -D playwright" and run "npx playwright install chromium".\n${failures.join("\n")}`,
  );
}

/**
 * Launch a real browser. Uses a remote websocket endpoint when one is
 * configured (BHASHAFIX_BROWSER_WS_ENDPOINT), otherwise a local install.
 */
export async function openBrowserSession(
  options: BrowserLaunchOptions = {},
): Promise<BrowserSession> {
  const engine = options.engine ?? "chromium";
  const wsEndpoint =
    options.wsEndpoint ?? process.env.BHASHAFIX_BROWSER_WS_ENDPOINT ?? null;
  const playwright = await loadPlaywright();
  const launcher = playwright[engine] as
    | {
        launch: (options: Record<string, unknown>) => Promise<PlaywrightBrowser>;
        connect: (url: string, options?: Record<string, unknown>) => Promise<PlaywrightBrowser>;
      }
    | undefined;
  if (!launcher) throw new Error(`Playwright engine "${engine}" is unavailable.`);

  const browser = wsEndpoint
    ? await launcher.connect(wsEndpoint, { timeout: options.timeoutMs ?? 30_000 })
    : await launcher.launch({ headless: options.headless ?? true });

  return {
    engine,
    remote: Boolean(wsEndpoint),
    close: () => browser.close(),
    render: (request) => renderWithBrowser(browser, engine, request),
  };
}

async function renderWithBrowser(
  browser: PlaywrightBrowser,
  engine: BrowserEngine,
  request: RenderRequest,
): Promise<RenderedRoute> {
  const started = Date.now();
  const profile = localeProfile(request.locale);
  const timeout = request.timeoutMs ?? 30_000;
  const context = await browser.newContext({
    viewport: { width: request.viewport.width, height: request.viewport.height },
    locale: profile.canonical,
    colorScheme: request.theme ?? "light",
    userAgent: undefined,
    extraHTTPHeaders: { "accept-language": `${profile.canonical},${profile.language};q=0.9` },
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const failedRequests: Array<{ url: string; failure: string }> = [];

  page.on("console", (message: never) => {
    const entry = message as unknown as { type: () => string; text: () => string };
    if (entry.type() === "error") consoleErrors.push(entry.text().slice(0, 500));
  });
  page.on("pageerror", (error: never) => {
    consoleErrors.push(String((error as unknown as Error)?.message ?? error).slice(0, 500));
  });
  page.on("requestfailed", (failed: never) => {
    const entry = failed as unknown as {
      url: () => string;
      failure: () => { errorText: string } | null;
    };
    failedRequests.push({
      url: entry.url().slice(0, 300),
      failure: entry.failure()?.errorText ?? "unknown",
    });
  });

  try {
    const response = await page.goto(request.url, {
      waitUntil: "domcontentloaded",
      timeout,
    });
    if (request.waitForSelector) {
      await page.waitForSelector(request.waitForSelector, { timeout }).catch(() => undefined);
    }
    // Give web fonts and locale bundles a bounded moment to settle.
    await page.waitForTimeout(600);

    const measurement = await page.evaluate(collectPageMeasurement, {
      maxElements: MAX_MEASURED_ELEMENTS,
      maxTextLength: MAX_TEXT_LENGTH,
    });

    let screenshotPath: string | null = null;
    let domPath: string | null = null;
    if (request.artifactDir) {
      await mkdir(request.artifactDir, { recursive: true });
      const prefix = request.artifactPrefix ?? artifactKey(request);
      screenshotPath = path.join(request.artifactDir, `${prefix}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      domPath = path.join(request.artifactDir, `${prefix}.html`);
      await writeFile(domPath, await page.content(), "utf8");
    }

    const axeViolations = request.runAxe ? await runAxe(page) : [];

    return {
      request,
      measurement,
      runtime: {
        status: response?.status() ?? 0,
        consoleErrors,
        failedRequests,
        axeViolations,
      },
      screenshotPath,
      domPath,
      engine,
      renderedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

function artifactKey(request: RenderRequest): string {
  return createHash("sha256")
    .update(
      [request.route, request.locale, request.viewport.name, request.theme ?? "light"].join(
        "|",
      ),
    )
    .digest("hex")
    .slice(0, 12);
}

async function runAxe(page: PlaywrightPage): Promise<RuntimeSignals["axeViolations"]> {
  try {
    const axeModule = (await import(/* @vite-ignore */ "@axe-core/playwright")) as {
      default: new (options: { page: unknown }) => {
        withTags: (tags: string[]) => { analyze: () => Promise<AxeResults> };
        analyze: () => Promise<AxeResults>;
      };
    };
    const AxeBuilder = axeModule.default;
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 10),
    }));
  } catch (error) {
    // Never return an empty array here. A swallowed failure is indistinguishable
    // from a page with no accessibility violations, which would report a clean
    // result for a check that did not run.
    throw new Error(
      `axe could not be run on this page. Install @axe-core/playwright, or pass runAxe: false to scan without accessibility checks. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

type AxeResults = {
  violations: Array<{
    id: string;
    impact: string | null;
    help: string;
    nodes: Array<{ target: string[] }>;
  }>;
};

export type BrowserScanRequest = {
  scanId: string;
  origin: ScanOrigin;
  target: string;
  routes: string[];
  locales: string[];
  viewports?: Array<{ name: string; width: number; height: number }>;
  themes?: Array<"light" | "dark">;
  engine?: BrowserEngine;
  artifactDir?: string | null;
  runAxe?: boolean;
  localeUrl?: (target: string, route: string, locale: string) => string;
  onProgress?: (event: {
    route: string;
    locale: string;
    viewport: string;
    issues: number;
  }) => void;
};

export type BrowserScanResult = {
  scanId: string;
  origin: ScanOrigin;
  target: string;
  engine: BrowserEngine;
  remote: boolean;
  startedAt: string;
  completedAt: string;
  renders: RenderedRoute[];
  issues: Issue[];
  coverage: {
    routes: string[];
    locales: string[];
    viewports: string[];
    renderCount: number;
  };
};

function defaultLocaleUrl(target: string, route: string, locale: string): string {
  const base = new URL(route, target);
  base.searchParams.set("locale", locale);
  return base.href;
}

/** Render every route × locale × viewport in a real browser and evaluate rules. */
export async function runBrowserScan(
  request: BrowserScanRequest,
): Promise<BrowserScanResult> {
  const startedAt = new Date().toISOString();
  const viewports = request.viewports ?? [...DEFAULT_VIEWPORTS];
  const themes = request.themes ?? ["light"];
  const localeUrl = request.localeUrl ?? defaultLocaleUrl;
  const session = await openBrowserSession({ engine: request.engine });
  const renders: RenderedRoute[] = [];
  const issues: Issue[] = [];

  try {
    for (const route of request.routes) {
      for (const locale of request.locales) {
        for (const viewport of viewports) {
          for (const theme of themes) {
            const rendered = await session.render({
              url: localeUrl(request.target, route, locale),
              route,
              locale,
              viewport,
              theme,
              artifactDir: request.artifactDir ?? null,
              runAxe: request.runAxe ?? true,
            });
            renders.push(rendered);
            const context: RuleContext = {
              scanId: request.scanId,
              origin: request.origin,
              route,
              locale,
              viewport,
              browser: session.engine,
              target: request.target,
              screenshotRef: rendered.screenshotPath,
            };
            const found = evaluateRules(rendered.measurement, context, rendered.runtime);
            issues.push(...found);
            request.onProgress?.({
              route,
              locale,
              viewport: viewport.name,
              issues: found.length,
            });
          }
        }
      }
    }
  } finally {
    await session.close().catch(() => undefined);
  }

  return {
    scanId: request.scanId,
    origin: request.origin,
    target: request.target,
    engine: session.engine,
    remote: session.remote,
    startedAt,
    completedAt: new Date().toISOString(),
    renders,
    issues: deduplicateIssues(issues),
    coverage: {
      routes: request.routes,
      locales: request.locales,
      viewports: viewports.map((viewport) => viewport.name),
      renderCount: renders.length,
    },
  };
}

/**
 * Render the entry page once and read its same-origin links to derive a bounded
 * route list. Returns the entry route first so scans always cover it.
 */
export async function discoverRoutes(
  target: string,
  options: {
    maxRoutes?: number;
    engine?: BrowserEngine;
    locale?: string;
    include?: RegExp | null;
    exclude?: RegExp | null;
  } = {},
): Promise<{ routes: string[]; discovered: number }> {
  const maxRoutes = options.maxRoutes ?? 5;
  const entry = new URL(target);
  const entryRoute = entry.pathname || "/";
  const session = await openBrowserSession({ engine: options.engine });
  try {
    const rendered = await session.render({
      url: entry.href,
      route: entryRoute,
      locale: options.locale ?? "en-GB",
      viewport: { name: "desktop", width: 1440, height: 900 },
      artifactDir: null,
      runAxe: false,
    });
    const candidates = new Set<string>([entryRoute]);
    for (const href of rendered.measurement.sameOriginLinks) {
      let route: string;
      try {
        route = new URL(href).pathname || "/";
      } catch {
        continue;
      }
      if (options.include && !options.include.test(route)) continue;
      if (options.exclude && options.exclude.test(route)) continue;
      candidates.add(route);
    }
    const routes = [...candidates].slice(0, maxRoutes);
    return { routes, discovered: candidates.size };
  } finally {
    await session.close().catch(() => undefined);
  }
}

function deduplicateIssues(issues: Issue[]): Issue[] {
  const byId = new Map<string, Issue>();
  for (const issue of issues) {
    if (!byId.has(issue.issueId)) byId.set(issue.issueId, issue);
  }
  return [...byId.values()];
}
