#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectProject, scanDemoProject } from "@bhashafix/core";
import { fetchWithPolicy } from "@bhashafix/crawler";
import { extractTextFromHtml } from "@bhashafix/extractor";
import {
  checkGlossary,
  extractProtectedTokens,
  placeholderMismatch,
  pseudoLocalise,
  type PseudoMode,
} from "@bhashafix/linguistic-engine";
import {
  localeProfile,
  REPRESENTATIVE_LOCALE_MATRIX,
} from "@bhashafix/locale-engine";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { writeReportBundle } from "@bhashafix/report";
import { verifyRepair } from "@bhashafix/verifier";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

function text(value: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    isError,
  };
}

async function readJson(file: string) {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

function scansDirectory(root: string) {
  return path.join(root, ".bhashafix", "scans");
}

function scanRequestsDirectory(root: string) {
  return path.join(root, ".bhashafix", "scan-requests");
}

type ScanRequest = {
  scanId: string;
  createdAt: string;
  target: "atlaspay-demo";
  mode: "live" | "replay";
  requestedLocales: string[];
  requestedRoutes: string[];
  status: "created";
};

async function writeScanRequest(root: string, request: ScanRequest) {
  const directory = scanRequestsDirectory(root);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${request.scanId}.json`),
    `${JSON.stringify(request, null, 2)}\n`,
  );
}

async function loadScanRequest(root: string, scanId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(scanId)) throw new Error("Invalid scan ID.");
  return (await readJson(
    path.join(scanRequestsDirectory(root), `${scanId}.json`),
  )) as ScanRequest;
}

async function writeScan(root: string, scan: Awaited<ReturnType<typeof scanDemoProject>>) {
  const directory = scansDirectory(root);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${scan.scanId}.json`),
    `${JSON.stringify(scan, null, 2)}\n`,
  );
}

async function loadScan(root: string, scanId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(scanId)) throw new Error("Invalid scan ID.");
  return (await readJson(path.join(scansDirectory(root), `${scanId}.json`))) as Awaited<
    ReturnType<typeof scanDemoProject>
  >;
}

function planHash(unifiedDiff: string) {
  return createHash("sha256").update(unifiedDiff).digest("hex");
}

export function createMcpServer(projectRoot = process.cwd()) {
  const server = new McpServer({
    name: "@bhashafix/mcp",
    version: "0.2.0",
  });

  server.registerTool(
    "bhashafix_inspect_project",
    {
      description: "Inspect framework and localisation infrastructure without executing project scripts.",
      inputSchema: { projectRoot: z.string().optional() },
    },
    async ({ projectRoot: requestedRoot }) =>
      text(await inspectProject(path.resolve(requestedRoot ?? projectRoot))),
  );

  server.registerTool(
    "bhashafix_list_locales",
    {
      description: "Validate and describe BCP 47 locales using platform standards.",
      inputSchema: { locales: z.array(z.string()).optional() },
    },
    async ({ locales }) =>
      text((locales ?? [...REPRESENTATIVE_LOCALE_MATRIX]).map(localeProfile)),
  );

  server.registerTool(
    "bhashafix_crawl_routes",
    {
      description: "Crawl a URL under the BhashaFix URL and SSRF policy.",
      inputSchema: {
        url: z.string().url(),
        localMode: z.boolean().default(false),
      },
    },
    async ({ url, localMode }) => {
      const response = await fetchWithPolicy(url, {
        hosted: !localMode,
        allowLocalhost: localMode,
      });
      return text({
        url: response.url,
        status: response.status,
        routes: [new URL(response.url).pathname],
      });
    },
  );

  server.registerTool(
    "bhashafix_extract_strings",
    {
      description: "Extract visible strings and context from supplied HTML.",
      inputSchema: {
        html: z.string().max(2_000_000),
        route: z.string().startsWith("/"),
      },
    },
    async ({ html, route }) => text({ strings: extractTextFromHtml(html, route) }),
  );

  server.registerTool(
    "bhashafix_create_scan",
    {
      description:
        "Create a validated AtlasPay scan request without claiming that execution has started.",
      inputSchema: {
        target: z.literal("atlaspay-demo").default("atlaspay-demo"),
        mode: z.enum(["live", "replay"]).default("live"),
        locales: z.array(z.string().min(2).max(64)).max(50).optional(),
        routes: z.array(z.string().startsWith("/")).max(50).optional(),
      },
    },
    async ({ target, mode, locales, routes }) => {
      const requestedLocales = locales ?? [...REPRESENTATIVE_LOCALE_MATRIX];
      requestedLocales.forEach(localeProfile);
      const request: ScanRequest = {
        scanId: `scan_${randomUUID().replaceAll("-", "")}`,
        createdAt: new Date().toISOString(),
        target,
        mode,
        requestedLocales,
        requestedRoutes: routes ?? ["/", "/pricing", "/dashboard", "/checkout", "/settings"],
        status: "created",
      };
      await writeScanRequest(projectRoot, request);
      return text({
        ...request,
        executionStarted: false,
        coveragePolicy:
          "The bundled deterministic run executes the complete canonical AtlasPay matrix.",
      });
    },
  );

  server.registerTool(
    "bhashafix_run_scan",
    {
      description:
        "Execute a previously created scan request and persist genuine deterministic evidence.",
      inputSchema: { scanId: z.string().min(1) },
    },
    async ({ scanId }) => {
      const request = await loadScanRequest(projectRoot, scanId);
      const scan = await scanDemoProject(projectRoot, { mode: request.mode });
      scan.scanId = request.scanId;
      scan.issues = scan.issues.map((issue) => ({
        ...issue,
        scanId: request.scanId,
      }));
      await writeScan(projectRoot, scan);
      return text(scan);
    },
  );

  server.registerTool(
    "bhashafix_scan_project",
    {
      description: "Run the deterministic AtlasPay localisation scan and persist its evidence.",
      inputSchema: { mode: z.enum(["live", "replay"]).default("live") },
    },
    async ({ mode }) => {
      const scan = await scanDemoProject(projectRoot, { mode });
      await writeScan(projectRoot, scan);
      return text(scan);
    },
  );

  server.registerTool(
    "bhashafix_get_scan",
    {
      description: "Read a persisted scan by explicit scan ID.",
      inputSchema: { scanId: z.string().min(1) },
    },
    async ({ scanId }) => text(await loadScan(projectRoot, scanId)),
  );

  server.registerTool(
    "bhashafix_list_issues",
    {
      description: "List evidence-backed issues for a persisted scan.",
      inputSchema: { scanId: z.string().min(1) },
    },
    async ({ scanId }) => text({ issues: (await loadScan(projectRoot, scanId)).issues }),
  );

  server.registerTool(
    "bhashafix_get_issue",
    {
      description: "Read one issue from an explicit scan.",
      inputSchema: {
        scanId: z.string().min(1),
        issueId: z.string().min(1),
      },
    },
    async ({ scanId, issueId }) => {
      const issue = (await loadScan(projectRoot, scanId)).issues.find(
        (candidate) => candidate.issueId === issueId,
      );
      return issue ? text(issue) : text({ error: "Issue not found." }, true);
    },
  );

  server.registerTool(
    "bhashafix_check_translation",
    {
      description: "Run deterministic placeholder and optional glossary checks.",
      inputSchema: {
        source: z.string(),
        target: z.string(),
        locale: z.string(),
        approvedTerm: z.string().optional(),
      },
    },
    async ({ source, target, locale, approvedTerm }) =>
      text({
        locale: localeProfile(locale),
        placeholders: placeholderMismatch(source, target),
        glossary: approvedTerm
          ? checkGlossary(source, target, locale, [
              { source, approved: { [locale]: approvedTerm } },
            ])
          : [],
      }),
  );

  server.registerTool(
    "bhashafix_generate_virtual_preview",
    {
      description:
        "Generate a protected deterministic specimen for a sandboxed synthetic localisation preview.",
      inputSchema: {
        strings: z.array(z.string().max(10_000)).min(1).max(50),
        targetLocale: z.string().min(2).max(64),
        mode: z
          .enum([
            "expanded-latin",
            "extreme-expansion",
            "rtl-mirrored",
            "accented",
            "cjk-density",
            "no-space",
            "tall-glyph",
            "emoji-symbol",
            "long-compound",
          ])
          .optional(),
        protectedTerms: z.array(z.string().min(1).max(200)).max(100).default([]),
      },
    },
    async ({ strings, targetLocale, mode, protectedTerms }) => {
      const profile = localeProfile(targetLocale);
      const selectedMode: PseudoMode =
        mode ?? (profile.direction === "rtl" ? "rtl-mirrored" : "expanded-latin");
      const preview = strings.map((source) => {
        const target = pseudoLocalise(source, selectedMode, protectedTerms);
        return {
          source,
          target,
          protectedTokens: extractProtectedTokens(source),
          placeholders: placeholderMismatch(source, target),
        };
      });
      return text({
        label: "Synthetic localisation preview — not the production website.",
        targetLocale: profile.canonical,
        direction: profile.direction,
        mode: selectedMode,
        strings: preview,
        valid: preview.every((item) => item.placeholders.valid),
      });
    },
  );

  for (const name of [
    "bhashafix_suggest_translation",
    "bhashafix_generate_translation",
  ] as const) {
    server.registerTool(
      name,
      {
        description:
          "Provider-routed linguistic operation. Returns an honest unavailable result when no provider is configured.",
        inputSchema: {
          source: z.string(),
          sourceLocale: z.string(),
          targetLocale: z.string(),
          context: z.string().optional(),
        },
      },
      async ({ sourceLocale, targetLocale }) =>
        text(
          {
            status: "provider unavailable",
            sourceLocale,
            targetLocale,
            deterministicChecksAvailable: true,
            message:
              "No model provider is configured. No translation was fabricated.",
          },
          true,
        ),
    );
  }

  server.registerTool(
    "bhashafix_prepare_repair",
    {
      description: "Prepare an allowlisted repair and return its diff without mutation.",
      inputSchema: {
        scanId: z.string().min(1),
        issueIds: z.array(z.string().min(1)).min(1),
      },
    },
    async ({ scanId, issueIds }) => {
      const scan = await loadScan(projectRoot, scanId);
      scan.issues = scan.issues.filter((issue) => issueIds.includes(issue.issueId));
      const plan = await prepareRepair(projectRoot, scan);
      return text({ ...plan, diffHash: planHash(plan.unifiedDiff) });
    },
  );

  server.registerTool(
    "bhashafix_apply_repair",
    {
      description:
        "Apply explicitly selected allowlisted repairs. Dry-run is the default; mutation requires the exact prepared diff hash.",
      inputSchema: {
        scanId: z.string().min(1),
        issueIds: z.array(z.string().min(1)).min(1),
        dryRun: z.boolean().default(true),
        confirmedDiffHash: z.string().optional(),
      },
      annotations: { destructiveHint: true, idempotentHint: false },
    },
    async ({ scanId, issueIds, dryRun, confirmedDiffHash }) => {
      const scan = await loadScan(projectRoot, scanId);
      scan.issues = scan.issues.filter((issue) => issueIds.includes(issue.issueId));
      const plan = await prepareRepair(projectRoot, scan);
      const expectedHash = planHash(plan.unifiedDiff);
      if (!dryRun && confirmedDiffHash !== expectedHash) {
        return text(
          {
            status: "rejected",
            reason: "The exact prepared diff hash is required before mutation.",
            expectedDiffHash: expectedHash,
            unifiedDiff: plan.unifiedDiff,
          },
          true,
        );
      }
      return text(await applyRepair(plan, { dryRun, issueIds }));
    },
  );

  server.registerTool(
    "bhashafix_verify_repair",
    {
      description: "Rerun identical predicates and return verification status.",
      inputSchema: { scanId: z.string().min(1) },
    },
    async ({ scanId }) =>
      text((await verifyRepair(projectRoot, await loadScan(projectRoot, scanId))).result),
  );

  server.registerTool(
    "bhashafix_generate_report",
    {
      description: "Generate portable reports for an explicit scan.",
      inputSchema: {
        scanId: z.string().min(1),
        outputDirectory: z.string().default("artifacts/report"),
      },
    },
    async ({ scanId, outputDirectory }) => {
      const scan = await loadScan(projectRoot, scanId);
      const files = await writeReportBundle(
        path.resolve(projectRoot, outputDirectory),
        scan,
      );
      return text({ scanId, files });
    },
  );

  const staticResources = [
    ["project-config", "bhashafix://project/config", ".bhashafix/config.yml"],
    ["project-glossary", "bhashafix://project/glossary", ".bhashafix/glossary.yml"],
    ["brand-voice", "bhashafix://project/brand-voice", ".bhashafix/brand-voice.md"],
    [
      "translation-memory",
      "bhashafix://project/translation-memory",
      ".bhashafix/translation-memory.json",
    ],
  ] as const;
  for (const [name, uri, relative] of staticResources) {
    server.registerResource(
      name,
      uri,
      { description: `BhashaFix ${name.replaceAll("-", " ")}`, mimeType: "text/plain" },
      async () => ({
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: await readFile(path.join(projectRoot, relative), "utf8").catch(
              () => "Not initialised. Run `bhashafix init`.",
            ),
          },
        ],
      }),
    );
  }

  server.registerResource(
    "scan",
    new ResourceTemplate("bhashafix://scans/{scanId}", { list: undefined }),
    { description: "Persisted BhashaFix scan", mimeType: "application/json" },
    async (uri, variables) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            await loadScan(projectRoot, String(variables.scanId)),
            null,
            2,
          ),
        },
      ],
    }),
  );
  server.registerResource(
    "issue",
    new ResourceTemplate("bhashafix://issues/{issueId}", { list: undefined }),
    { description: "Issue resources require a scan lookup", mimeType: "application/json" },
    async (uri, variables) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({
            issueId: variables.issueId,
            guidance: "Call bhashafix_get_issue with an explicit scanId.",
          }),
        },
      ],
    }),
  );
  server.registerResource(
    "report",
    new ResourceTemplate("bhashafix://reports/{scanId}", { list: undefined }),
    { description: "Report resource", mimeType: "application/json" },
    async (uri, variables) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({
            scanId: variables.scanId,
            guidance: "Call bhashafix_generate_report.",
          }),
        },
      ],
    }),
  );

  const prompts: Record<string, string> = {
    localise_project:
      "Inspect the project, identify source and target locales, extract strings, then generate only provider-backed translations and verify the rendered result.",
    audit_localisation:
      "Run deterministic localisation checks first, then separate model-assisted findings by confidence and human-review requirement.",
    repair_verified_issues:
      "Prepare a repair for explicit verified issue IDs, inspect the unified diff, apply only after confirmation, then rerun identical predicates.",
    review_translation_quality:
      "Review meaning, formality, brand voice and context. Treat subjective findings as recommendations with confidence, not facts.",
    prepare_release_report:
      "Verify blocking issues, source-locale regression, accessibility and diff policy before generating the release report.",
  };
  for (const [name, prompt] of Object.entries(prompts)) {
    server.registerPrompt(
      name,
      { description: prompt, argsSchema: { project: z.string().optional() } },
      async ({ project }) => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `${prompt}\nProject: ${project ?? projectRoot}`,
            },
          },
        ],
      }),
    );
  }

  return server;
}

export async function startMcpServer(projectRoot = process.cwd()) {
  const server = createMcpServer(projectRoot);
  await server.connect(new StdioServerTransport());
  console.error("BhashaFix MCP server running over local STDIO.");
}

// No auto-start on import. Bundlers inline this module into other entrypoints
// (the CLI does), and an import-time `argv[1]` guard then matches the host
// bundle and starts a second server on the same stdio pipe — every JSON-RPC
// call, including apply_repair, would execute twice. The executable entrypoint
// lives in ./bin.ts instead.
