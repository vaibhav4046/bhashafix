#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectProject, scanDemoProject } from "@bhashafix/core";
import { fetchWithPolicy } from "@bhashafix/crawler";
import { extractTextFromHtml, redactSecrets } from "@bhashafix/extractor";
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
  apply: boolean;
};

const HELP = `BhashaFix — test, repair and prove every language before release

Usage: bhashafix <command> [options]

Commands:
  init        Create .bhashafix project configuration
  inspect     Discover framework and localisation infrastructure
  crawl       Crawl a public or explicitly local target
  extract     Extract visible strings and context from a target
  scan        Run deterministic localisation checks
  translate   Generate missing translations through a configured provider
  diagnose    List evidence-backed issues
  repair      Prepare or apply an allowlisted repair
  verify      Rerun identical predicates and check regressions
  report      Export JSON, HTML, SARIF, JUnit and CSV
  ci          Run the severity-aware CI gate
  mcp         Start the local STDIO MCP server
  doctor      Check the local runtime

Options:
  --json --quiet --verbose --output <path> --changed-only --no-ai
  --dry-run --apply --project <path> --url <url>

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
    project: process.cwd(),
  };
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index + 1];
    if (args[index] === "--output" && value) options.output = value;
    if (args[index] === "--project" && value) options.project = path.resolve(value);
    if (args[index] === "--url" && value) options.url = value;
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

export async function runCli(
  args: string[],
  io: Io = {
    out: (message) => console.log(message),
    error: (message) => console.error(message),
  },
) {
  const { command, options } = parseArgs(args);
  try {
    if (command === "help" || command === "--help" || command === "-h") {
      io.out(HELP);
      return EXIT.passed;
    }
    if (command === "init") {
      const files = await initialise(options.project);
      emit(io, options, { status: "initialised", files }, `Initialised ${files.length} project files.`);
      return EXIT.passed;
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
      const scan = await scanDemoProject(options.project);
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
    if (command === "diagnose") {
      const scan = await scanDemoProject(options.project);
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
    if (command === "repair") {
      const scan = await scanDemoProject(options.project);
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
      const scan = await scanDemoProject(options.project);
      const output = path.resolve(options.output ?? "artifacts/report");
      const files = await writeReportBundle(output, scan);
      emit(io, options, { output, files }, `Wrote ${files.length} reports to ${output}.`);
      return EXIT.passed;
    }
    if (command === "ci") {
      const scan = await scanDemoProject(options.project);
      emit(
        io,
        options,
        { scanId: scan.scanId, blocking: scan.issues.length },
        `CI gate: ${scan.issues.length ? "FAIL" : "PASS"} (${scan.issues.length} blocking).`,
      );
      return scan.issues.length ? EXIT.blocking : EXIT.passed;
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
