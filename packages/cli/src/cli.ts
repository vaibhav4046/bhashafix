#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectProject, scanDemoProject } from "@bhashafix/core";
import { loadProjectConfig } from "@bhashafix/config";
import { fetchWithPolicy } from "@bhashafix/crawler";
import { extractTextFromHtml, redactSecrets } from "@bhashafix/extractor";
import {
  extractProtectedTokens,
  placeholderMismatch,
  pseudoLocalise,
  type PseudoMode,
} from "@bhashafix/linguistic-engine";
import {
  formatLocaleSample,
  localeProfile,
  REPRESENTATIVE_LOCALE_MATRIX,
} from "@bhashafix/locale-engine";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { writeReportBundle } from "@bhashafix/report";
import { verifyRepair } from "@bhashafix/verifier";

export const EXIT = {
  passed: 0,
  blocking: 1,
  invalidConfig: 2,
  unavailable: 3,
  runtime: 4,
  provider: 5,
} as const;

type Io = {
  out(message: string): void;
  error(message: string): void;
};

type Options = {
  json: boolean;
  quiet: boolean;
  verbose: boolean;
  dryRun: boolean;
  noAi: boolean;
  changedOnly: boolean;
  output?: string;
  project: string;
  url?: string;
  sourceLocale?: string;
  locales?: string[];
  routes?: string[];
  viewports?: string[];
  themes?: Array<"light" | "dark">;
  configPath?: string;
  failOn: "blocking" | "warning" | "advisory";
  apply: boolean;
  text?: string;
  locale?: string;
  pseudoMode?: PseudoMode;
};

const HELP = `BhashaFix — test, repair and prove every language before release

Usage: bhashafix <command> [options]

Commands:
  init        Create .bhashafix project configuration
  doctor      Check the local runtime
  inspect     Discover framework and localisation infrastructure
  locales     List the representative BCP 47 locale registry
  crawl       Crawl a public or explicitly local target
  extract     Extract visible strings and context from a target
  scan        Run deterministic localisation checks
  translate-preview
              Generate a protected synthetic localisation preview
  issues      List evidence-backed issues
  translate   Generate missing translations through a configured provider
  diagnose    Compatibility alias for issues
  repair      Prepare or apply an allowlisted repair
  verify      Rerun identical predicates and check regressions
  report      Export JSON, HTML, SARIF, JUnit and CSV
  ci          Run the severity-aware CI gate
  mcp         Start the local STDIO MCP server

Options:
  --json --quiet --verbose --output <path> --changed-only --no-ai
  --dry-run --apply --project <path> --url <url>
  --source-locale <bcp47> --locales <bcp47,bcp47>
  --routes </,/pricing> --viewports <mobile,desktop>
  --themes <light,dark>
  --text <value> --locale <bcp47> --mode <pseudo-mode>
  --config <path> --fail-on <blocking|warning|advisory>

Exit codes: 0 passed · 1 blocking issues · 2 invalid config ·
            3 target unavailable · 4 runtime failure · 5 provider failure`;

function parseArgs(args: string[]) {
  const command = args[0] ?? "help";
  const options: Options = {
    json: args.includes("--json"),
    quiet: args.includes("--quiet"),
    verbose: args.includes("--verbose"),
    dryRun: args.includes("--dry-run"),
    noAi: args.includes("--no-ai"),
    changedOnly: args.includes("--changed-only"),
    apply: args.includes("--apply"),
    failOn: "blocking",
    project: process.cwd(),
  };
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index + 1];
    if (args[index] === "--output" && value) options.output = value;
    if (args[index] === "--project" && value) options.project = path.resolve(value);
    if (args[index] === "--url" && value) options.url = value;
    if (args[index] === "--source-locale" && value) {
      options.sourceLocale = localeProfile(value).canonical;
    }
    if (args[index] === "--locales" && value) {
      options.locales = value.split(",").map((locale) => localeProfile(locale).canonical);
    }
    if (args[index] === "--routes" && value) {
      options.routes = value.split(",").map((route) => {
        if (!route.startsWith("/")) throw new Error(`Invalid route "${route}".`);
        return route;
      });
    }
    if (args[index] === "--viewports" && value) {
      const viewports = value.split(",");
      if (viewports.some((viewport) => !["mobile", "tablet", "desktop"].includes(viewport))) {
        throw new Error(`Invalid viewport list "${value}".`);
      }
      options.viewports = viewports;
    }
    if (args[index] === "--themes" && value) {
      const themes = value.split(",");
      if (themes.some((theme) => !["light", "dark"].includes(theme))) {
        throw new Error(`Invalid theme list "${value}".`);
      }
      options.themes = themes as Array<"light" | "dark">;
    }
    if (args[index] === "--config" && value) options.configPath = value;
    if (args[index] === "--text" && value) options.text = value;
    if (args[index] === "--locale" && value) options.locale = value;
    if (args[index] === "--mode" && value) {
      const modes = [
        "expanded-latin",
        "extreme-expansion",
        "rtl-mirrored",
        "accented",
        "cjk-density",
        "no-space",
        "tall-glyph",
        "emoji-symbol",
        "long-compound",
      ] as const;
      if (!modes.includes(value as (typeof modes)[number])) {
        throw new Error(`Invalid pseudo-localisation mode "${value}".`);
      }
      options.pseudoMode = value as PseudoMode;
    }
    if (args[index] === "--fail-on" && value) {
      if (!["blocking", "warning", "advisory"].includes(value)) {
        throw new Error(`Invalid --fail-on severity "${value}".`);
      }
      options.failOn = value as Options["failOn"];
    }
  }
  return { command, options };
}

function emit(io: Io, options: Options, value: unknown, human: string) {
  if (options.quiet) return;
  io.out(options.json ? JSON.stringify(value, null, 2) : human);
}

async function initialise(projectRoot: string) {
  const directory = path.join(projectRoot, ".bhashafix");
  await mkdir(path.join(directory, "locale-rules"), { recursive: true });
  const files: Record<string, string> = {
    "config.yml": `sourceLocale: en-GB
locales: [hi-IN, de-DE, ar-SA, he-IL, ja-JP, zh-Hans-CN, th-TH, fr-FR, es-MX]
routes: [/, /pricing, /dashboard, /checkout, /settings]
browsers: [chromium]
viewports: [mobile, tablet, desktop]
themes: [light, dark]
severity: blocking
noAi: true
crawl:
  maxPages: 20
  maxDepth: 2
  rateLimitPerSecond: 2
  respectRobots: true
repair:
  allowlist:
    - apps/demo-target/data/layout.json
    - apps/demo-target/data/locale-state.json
    - apps/demo-target/data/translations.json
`,
    "glossary.yml": `entries:
  - source: Checkout
    approved:
      es-MX: Pagar
    domain: payments
    exactMatch: true
`,
    "brand-voice.md":
      "# Brand voice\n\nClear, calm, globally respectful and technically precise.\n",
    "protected-terms.yml": "terms:\n  - AtlasPay\n  - BhashaFix\n",
    "forbidden-phrases.yml": "phrases: []\n",
    "route-rules.yml": "include: ['/**']\nexclude: ['/api/**']\n",
    "translation-memory.json": "[]\n",
  };
  await Promise.all(
    Object.entries(files).map(([name, contents]) =>
      writeFile(path.join(directory, name), contents, { flag: "wx" }).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code !== "EEXIST") throw error;
        },
      ),
    ),
  );
  return Object.keys(files);
}

async function readBaseline(projectRoot: string) {
  const file = path.join(projectRoot, ".bhashafix", "baseline-scan.json");
  return JSON.parse(await readFile(file, "utf8"));
}

async function scanLocalProject(projectRoot: string, options?: Options) {
  const scan = await scanDemoProject(projectRoot, {
    mode: "live",
    origin: "LOCAL_REPOSITORY_SCAN",
  });
  if (options?.sourceLocale) scan.config.sourceLocale = options.sourceLocale;
  if (options?.locales) {
    scan.issues = scan.issues.filter((issue) =>
      options.locales!.includes(issue.locale),
    );
    scan.localesTested = scan.localesTested.filter((locale) =>
      options.locales!.includes(locale),
    );
    scan.config.locales = options.locales;
  }
  if (options?.routes) {
    scan.issues = scan.issues.filter((issue) =>
      options.routes!.includes(issue.route),
    );
    scan.routesDiscovered = scan.routesDiscovered.filter((route) =>
      options.routes!.includes(route),
    );
    scan.config.routes = options.routes;
  }
  if (options?.viewports) {
    scan.config.viewports = scan.config.viewports.filter((viewport) =>
      options.viewports!.includes(viewport.name),
    );
  }
  if (options?.themes) scan.config.themes = options.themes;
  return scan;
}

export async function runCli(
  args: string[],
  io: Io = {
    out: (message) => console.log(message),
    error: (message) => console.error(message),
  },
) {
  try {
    const { command, options } = parseArgs(args);
    if (command === "help" || command === "--help" || command === "-h") {
      io.out(HELP);
      return EXIT.passed;
    }
    if (command === "init") {
      const files = await initialise(options.project);
      emit(io, options, { status: "initialised", files }, `Initialised ${files.length} project files.`);
      return EXIT.passed;
    }
    if (options.configPath) {
      await loadProjectConfig(options.project, options.configPath);
    }
    if (command === "inspect") {
      const inspection = await inspectProject(options.project);
      emit(
        io,
        options,
        inspection,
        `Framework: ${inspection.framework} (${inspection.support})\nUnknown scripts require approval before execution.`,
      );
      return EXIT.passed;
    }
    if (command === "locales") {
      const registry = REPRESENTATIVE_LOCALE_MATRIX.map((locale) => ({
        ...localeProfile(locale),
        sample: formatLocaleSample(locale),
      }));
      emit(
        io,
        options,
        { count: registry.length, locales: registry },
        registry
          .map(
            (locale) =>
              `${locale.canonical.padEnd(12)} ${locale.script} ${locale.direction} ${locale.sample.date}`,
          )
          .join("\n"),
      );
      return EXIT.passed;
    }
    if (command === "crawl" || command === "extract") {
      if (!options.url) {
        io.error("Provide --url with an absolute target URL.");
        return EXIT.invalidConfig;
      }
      const response = await fetchWithPolicy(options.url, {
        hosted: false,
        allowLocalhost: true,
      });
      const strings = extractTextFromHtml(response.body, new URL(response.url).pathname);
      const value =
        command === "crawl"
          ? { url: response.url, status: response.status, routes: [new URL(response.url).pathname] }
          : { url: response.url, strings };
      emit(
        io,
        options,
        value,
        command === "crawl"
          ? `Crawled ${response.url} (${response.status}).`
          : `Extracted ${strings.length} contextual strings.`,
      );
      return response.status >= 400 ? EXIT.unavailable : EXIT.passed;
    }
    if (command === "scan") {
      const scan = await scanLocalProject(options.project, options);
      await mkdir(path.join(options.project, ".bhashafix"), { recursive: true });
      await writeFile(
        path.join(options.project, ".bhashafix", "baseline-scan.json"),
        `${JSON.stringify(scan, null, 2)}\n`,
      );
      if (options.output) {
        await writeFile(path.resolve(options.output), `${JSON.stringify(scan, null, 2)}\n`);
      }
      emit(
        io,
        options,
        scan,
        `${scan.scanId}\n${scan.issues.length} verified blocking issue(s) across ${scan.routesDiscovered.length} routes and ${scan.localesTested.length} locales.`,
      );
      return scan.issues.some((issue) => issue.severity === "blocking")
        ? EXIT.blocking
        : EXIT.passed;
    }
    if (command === "issues" || command === "diagnose") {
      const scan = await scanLocalProject(options.project, options);
      emit(
        io,
        options,
        { scanId: scan.scanId, issues: scan.issues },
        scan.issues
          .map(
            (issue) =>
              `${issue.issueId} ${issue.locale} ${issue.route} — ${issue.description}`,
          )
          .join("\n"),
      );
      return scan.issues.length ? EXIT.blocking : EXIT.passed;
    }
    if (command === "translate-preview") {
      const source = options.text ?? "Pay {amount} securely with AtlasPay";
      const targetLocale = options.locale ?? "ar-SA";
      const profile = localeProfile(targetLocale);
      const mode =
        options.pseudoMode ??
        (profile.direction === "rtl" ? "rtl-mirrored" : "expanded-latin");
      const target = pseudoLocalise(source, mode, ["AtlasPay"]);
      const preview = {
        label: "Synthetic localisation preview — not the production website.",
        source,
        target,
        targetLocale: profile.canonical,
        direction: profile.direction,
        mode,
        protectedTokens: extractProtectedTokens(source),
        placeholders: placeholderMismatch(source, target),
      };
      emit(
        io,
        options,
        preview,
        `${preview.label}\n${preview.targetLocale} · ${preview.direction} · ${preview.mode}\n${preview.target}`,
      );
      return preview.placeholders.valid ? EXIT.passed : EXIT.runtime;
    }
    if (command === "repair") {
      const scan = await scanLocalProject(options.project, options);
      const plan = await prepareRepair(options.project, scan);
      const result = options.apply
        ? await applyRepair(plan, { dryRun: options.dryRun })
        : { applied: false, dryRun: true, unifiedDiff: plan.unifiedDiff };
      if (options.output) await writeFile(path.resolve(options.output), plan.unifiedDiff);
      emit(
        io,
        options,
        { plan, result },
        `${options.apply && !options.dryRun ? "Applied" : "Prepared"} ${plan.operations.length} bounded operation(s).\n${plan.unifiedDiff}`,
      );
      return EXIT.passed;
    }
    if (command === "verify") {
      const baseline = await readBaseline(options.project);
      const { result } = await verifyRepair(options.project, baseline);
      emit(
        io,
        options,
        result,
        `${result.status}: ${result.baselineBlocking} → ${result.finalBlocking}; source-locale regression ${result.sourceLocaleRegression}.`,
      );
      return result.status === "verified" ? EXIT.passed : EXIT.blocking;
    }
    if (command === "report") {
      const scan = await scanLocalProject(options.project, options);
      const output = path.resolve(options.output ?? "artifacts/report");
      const files = await writeReportBundle(output, scan);
      emit(io, options, { output, files }, `Wrote ${files.length} reports to ${output}.`);
      return EXIT.passed;
    }
    if (command === "ci") {
      const scan = await scanLocalProject(options.project, options);
      const severityRank = {
        blocking: 0,
        serious: 0.5,
        warning: 1,
        review: 2,
        advisory: 3,
      } as const;
      const failingIssues = scan.issues.filter(
        (issue) => severityRank[issue.severity] <= severityRank[options.failOn],
      );
      const ciResult = {
        scanId: scan.scanId,
        failOn: options.failOn,
        failing: failingIssues.length,
        issues: scan.issues.length,
      };
      if (options.output) {
        const output = path.resolve(options.output);
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, `${JSON.stringify(ciResult, null, 2)}\n`);
      }
      emit(
        io,
        options,
        ciResult,
        `CI gate: ${failingIssues.length ? "FAIL" : "PASS"} (${failingIssues.length} at or above ${options.failOn}).`,
      );
      return failingIssues.length ? EXIT.blocking : EXIT.passed;
    }
    if (command === "translate") {
      io.error(
        "No provider is configured. Deterministic checks remain available; configure OpenAI, Anthropic, Groq or an OpenAI-compatible endpoint.",
      );
      return EXIT.provider;
    }
    if (command === "mcp") {
      const { startMcpServer } = await import("../../mcp/src/server");
      await startMcpServer();
      return EXIT.passed;
    }
    if (command === "doctor") {
      const major = Number(process.versions.node.split(".")[0]);
      const report = {
        node: process.versions.node,
        nodeSupported: major >= 22,
        project: options.project,
        noAiReady: true,
      };
      emit(
        io,
        options,
        report,
        `Node ${report.node}: ${report.nodeSupported ? "PASS" : "FAIL"}\nNo-AI deterministic mode: PASS`,
      );
      return report.nodeSupported ? EXIT.passed : EXIT.runtime;
    }
    io.error(`Unknown command "${command}".\n\n${HELP}`);
    return EXIT.invalidConfig;
  } catch (error) {
    const message = redactSecrets(
      error instanceof Error ? error.message : String(error),
    );
    io.error(message);
    return /config|locale|allowlist|issue ID|required/i.test(message)
      ? EXIT.invalidConfig
      : /fetch|target|URL|ENOTFOUND|ECONN/i.test(message)
        ? EXIT.unavailable
        : EXIT.runtime;
  }
}

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isEntrypoint) {
  process.exitCode = await runCli(process.argv.slice(2));
}
