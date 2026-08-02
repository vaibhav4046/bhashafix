/**
 * A real Chromium render inside a serverless function.
 *
 * Playwright cannot ship to a Vercel function, so this path drives the
 * AWS-Lambda Chromium build through puppeteer-core. It is deliberately a
 * *quick* scan: the function has a 60 second ceiling, so it covers one route
 * across a small number of locales at one viewport. A full route × locale ×
 * viewport matrix still belongs to the CLI or a browser worker.
 *
 * The measurement and the rules are the same ones the CLI uses. Only the
 * driver differs.
 */
import type { Issue, ScanOrigin } from "@bhashafix/shared";
import { validateTargetUrl } from "@bhashafix/crawler";
import { localeProfile } from "@bhashafix/locale-engine";
import {
  MAX_MEASURED_ELEMENTS,
  MAX_TEXT_LENGTH,
  type PageMeasurement,
} from "./measure";
import {
  MEASUREMENT_GLOBAL,
  MEASUREMENT_SCRIPT,
} from "./measure-script.generated";
import { evaluateRules, type RuleContext, type RuntimeSignals } from "./rules";

export type ServerlessRender = {
  route: string;
  locale: string;
  viewport: { name: string; width: number; height: number };
  url: string;
  status: number;
  durationMs: number;
  measuredElements: number;
  declaredLang: string | null;
  declaredDir: string | null;
  title: string;
  consoleErrors: number;
  failedRequests: number;
  blockedRequests: number;
  axeViolations: number;
  /** Inline PNG data URI. Nothing is persisted: this deployment has no store. */
  screenshot: string | null;
  screenshotBytes: number;
};

export type ServerlessScan = {
  engine: "chromium";
  renders: ServerlessRender[];
  issues: Issue[];
  axeExecuted: boolean;
};

type PuppeteerPage = {
  setViewport: (v: { width: number; height: number }) => Promise<void>;
  setExtraHTTPHeaders: (h: Record<string, string>) => Promise<void>;
  setRequestInterception: (enabled: boolean) => Promise<void>;
  goto: (url: string, o?: Record<string, unknown>) => Promise<{ status: () => number } | null>;
  evaluate: (fn: unknown, ...args: unknown[]) => Promise<unknown>;
  screenshot: (o: Record<string, unknown>) => Promise<Uint8Array | string>;
  on: (event: string, handler: (payload: never) => void) => void;
  close: () => Promise<void>;
};
type PuppeteerRequest = {
  url: () => string;
  continue: () => Promise<void>;
  abort: (errorCode?: string) => Promise<void>;
};
type PuppeteerBrowser = {
  newPage: () => Promise<PuppeteerPage>;
  close: () => Promise<void>;
};

/**
 * Collect axe violations from inside the page.
 *
 * Written as source for the same reason the measurement is: a bundler minifies
 * an inline closure and rewrites it to reference module scope, which the
 * browser realm does not have.
 */
const AXE_RUNNER_SCRIPT = `(async () => {
  var runner = window.axe;
  if (!runner) return [];
  var result = await runner.run({ resultTypes: ["violations"] });
  return result.violations.map(function (violation) {
    return {
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map(function (node) { return node.target.join(" "); }).slice(0, 5),
    };
  });
})()`;

/** Screenshots travel inline, so they are capped rather than unbounded. */
const MAX_SCREENSHOT_BYTES = 900_000;
const NAVIGATION_TIMEOUT_MS = 20_000;
const MAX_NETWORK_REQUESTS = 500;
const MAX_NETWORK_ORIGINS = 32;

/**
 * Revalidate every network hop Chromium attempts, not only the submitted URL.
 * This covers redirects, frames, scripts, images and page-authored fetches.
 * Local data/blob/about resources never leave the browser and are safe.
 */
export async function validateServerlessBrowserRequest(input: string) {
  const protocol = new URL(input).protocol;
  if (protocol === "data:" || protocol === "blob:" || protocol === "about:") {
    return;
  }
  await validateTargetUrl(input, { hosted: true, allowLocalhost: false });
}

/** Return actionable text without exposing server paths, stacks or internals. */
export function describeServerlessFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/ERR_BLOCKED_BY_CLIENT|private-network|metadata|loopback/i.test(message)) {
    return "The page attempted to reach a destination blocked by the hosted network safety policy.";
  }
  if (/timeout|timed out/i.test(message)) {
    return "The page took too long to render in the hosted browser. Try the local CLI for a longer scan.";
  }
  if (/ERR_NAME_NOT_RESOLVED|getaddrinfo|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return "The hosted browser could not resolve the target domain.";
  }
  if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(message)) {
    return "The target refused the browser connection.";
  }
  return "The hosted browser could not complete this scan. Try again or run the local CLI for full diagnostics.";
}

function safeRequestReference(input: string): string {
  try {
    const url = new URL(input);
    url.username = "";
    url.password = "";
    url.hash = "";
    if (url.search) url.search = "?redacted";
    return url.href.slice(0, 200);
  } catch {
    return "unparseable request";
  }
}

async function launch(): Promise<PuppeteerBrowser> {
  const [pack, puppeteer] = await Promise.all([
    import(/* @vite-ignore */ "@sparticuz/chromium") as unknown as Promise<{
      default: { args: string[]; executablePath: (input?: string) => Promise<string> };
    }>,
    import(/* @vite-ignore */ "puppeteer-core") as unknown as Promise<{
      default: { launch: (o: Record<string, unknown>) => Promise<PuppeteerBrowser> };
    }>,
  ]);

  // Off Vercel this runs against a locally installed Chromium so the same code
  // path can be exercised before it is deployed.
  const local = process.env.BHASHAFIX_LOCAL_CHROMIUM;
  const executablePath = local ?? (await pack.default.executablePath());
  return puppeteer.default.launch({
    args: local ? ["--no-sandbox", "--disable-dev-shm-usage"] : pack.default.args,
    executablePath,
    headless: true,
    protocolTimeout: 45_000,
  });
}

export type ServerlessScanRequest = {
  scanId: string;
  origin: ScanOrigin;
  target: URL;
  route: string;
  sourceLocale: string;
  locales: string[];
  viewport: { name: string; width: number; height: number };
  runAxe?: boolean;
};

export async function runServerlessScan(
  request: ServerlessScanRequest,
): Promise<ServerlessScan> {
  const runAxe = request.runAxe ?? true;
  const axeSource = runAxe
    ? ((await import(/* @vite-ignore */ "axe-core")) as unknown as { default: { source: string } })
        .default.source
    : null;

  const browser = await launch();
  const renders: ServerlessRender[] = [];
  const issues: Issue[] = [];

  try {
    for (const locale of request.locales) {
      const started = Date.now();
      const profile = localeProfile(locale);
      const page = await browser.newPage();
      const consoleErrors: string[] = [];
      const failedRequests: Array<{ url: string; failure: string }> = [];
      const blockedRequests: string[] = [];
      const validatedOrigins = new Map<string, Promise<void>>();
      let networkRequests = 0;

      await page.setRequestInterception(true);
      page.on("request", (intercepted: never) => {
        const request = intercepted as unknown as PuppeteerRequest;
        void (async () => {
          try {
            const requestedUrl = new URL(request.url());
            if (!["data:", "blob:", "about:"].includes(requestedUrl.protocol)) {
              networkRequests += 1;
              if (networkRequests > MAX_NETWORK_REQUESTS) {
                throw new Error("Hosted browser request limit exceeded.");
              }
              const key = requestedUrl.origin;
              let validation = validatedOrigins.get(key);
              if (!validation) {
                if (validatedOrigins.size >= MAX_NETWORK_ORIGINS) {
                  throw new Error("Hosted browser origin limit exceeded.");
                }
                validation = validateServerlessBrowserRequest(requestedUrl.href);
                validatedOrigins.set(key, validation);
              }
              await validation;
            }
            await request.continue();
          } catch {
            blockedRequests.push(safeRequestReference(request.url()));
            await request.abort("blockedbyclient").catch(() => undefined);
          }
        })();
      });

      page.on("console", (message: never) => {
        const entry = message as unknown as { type: () => string; text: () => string };
        if (entry.type() === "error") consoleErrors.push(entry.text().slice(0, 300));
      });
      page.on("pageerror", (error: never) => {
        consoleErrors.push(String((error as unknown as Error)?.message ?? error).slice(0, 300));
      });
      page.on("requestfailed", (failed: never) => {
        const entry = failed as unknown as {
          url: () => string;
          failure: () => { errorText: string } | null;
        };
        failedRequests.push({
          url: safeRequestReference(entry.url()),
          failure: entry.failure()?.errorText ?? "unknown",
        });
      });

      const url = new URL(request.route, request.target.origin);
      if (locale !== request.sourceLocale) url.searchParams.set("locale", locale);

      await page.setViewport({
        width: request.viewport.width,
        height: request.viewport.height,
      });
      await page.setExtraHTTPHeaders({
        "accept-language": `${profile.canonical},${profile.language};q=0.9`,
      });

      let status = 0;
      try {
        const response = await page.goto(url.href, {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT_MS,
        });
        status = response?.status() ?? 0;

        // Evaluated as source, never as a bundled closure: a minifier would
        // rewrite the function to reference module scope that the page has not
        // got. See scripts/build-measurement-script.ts.
        const measurement = (await page.evaluate(
          `${MEASUREMENT_SCRIPT};${MEASUREMENT_GLOBAL}.collectPageMeasurement(${JSON.stringify(
            { maxElements: MAX_MEASURED_ELEMENTS, maxTextLength: MAX_TEXT_LENGTH },
          )})`,
        )) as PageMeasurement;

        let axeViolations: RuntimeSignals["axeViolations"] = [];
        if (axeSource) {
          await page.evaluate(axeSource);
          // Source, not a closure, for the same reason as the measurement: a
          // bundled arrow function is minified and then references module scope
          // the page has not got.
          axeViolations = (await page.evaluate(AXE_RUNNER_SCRIPT)) as
            RuntimeSignals["axeViolations"];
        }

        const shot = (await page.screenshot({ type: "png", encoding: "base64" })) as string;
        const screenshotBytes = Math.floor((shot.length * 3) / 4);

        const runtime: RuntimeSignals = {
          status,
          consoleErrors,
          failedRequests,
          axeViolations,
        };
        const context: RuleContext = {
          scanId: request.scanId,
          origin: request.origin,
          route: request.route,
          locale,
          viewport: request.viewport,
          browser: "chromium",
          target: request.target.origin,
          screenshotRef: null,
        };
        issues.push(...evaluateRules(measurement, context, runtime));

        renders.push({
          route: request.route,
          locale,
          viewport: request.viewport,
          url: url.href,
          status,
          durationMs: Date.now() - started,
          measuredElements: measurement.elements.length,
          declaredLang: measurement.lang || null,
          declaredDir: measurement.dir || null,
          title: measurement.title,
          consoleErrors: consoleErrors.length,
          failedRequests: failedRequests.length,
          blockedRequests: blockedRequests.length,
          axeViolations: axeViolations.length,
          screenshot:
            screenshotBytes <= MAX_SCREENSHOT_BYTES ? `data:image/png;base64,${shot}` : null,
          screenshotBytes,
        });
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  const unique = new Map(issues.map((issue) => [issue.issueId, issue]));
  return {
    engine: "chromium",
    renders,
    issues: [...unique.values()],
    axeExecuted: Boolean(axeSource),
  };
}
