/**
 * Publish real scan evidence into public/ so the web console can display it.
 *
 * Nothing here is authored: every file is copied from a receipt produced by an
 * actual run. Screenshots are copied as-is and their SHA-256 recorded, so a
 * reader can verify the image in the browser is the image the scan captured.
 */
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, "public", "evidence");

async function sha256(file: string) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function readJson<T>(relative: string): Promise<T | null> {
  const raw = await readFile(path.join(root, relative), "utf8").catch(() => null);
  return raw === null ? null : (JSON.parse(raw) as T);
}


// ---------------------------------------------------------------- real scans
type RealSiteReceipt = {
  generatedAt: string;
  limitations: string[];
  scans: Array<{
    name: string;
    target: string;
    note: string;
    scanId: string;
    origin: string;
    routes: string[];
    locales: string[];
    renders: number;
    screenshots: number;
    issues: number;
  }>;
};

// The real-site scans reach the public internet, so they are deliberately not
// part of `verify`, and `artifacts/` is gitignored. On a clean checkout there
// is nothing to regenerate from - but public/evidence is committed, so the
// evidence itself is present. Verify it and leave it alone rather than
// deleting real evidence because the source receipt is not on this machine.
const realSites = await readJson<RealSiteReceipt>("artifacts/real-site-scans.json");
if (!realSites) {
  const committed = await readJson<{ realSiteScans: { scans: unknown[] }; mcp: { calls: unknown[] } }>(
    "public/evidence/index.json",
  );
  if (!committed) {
    throw new Error(
      "No scan receipt in artifacts/ and no committed evidence in public/evidence. Run `pnpm scan:real-sites` to generate it.",
    );
  }
  console.log(
    `EVIDENCE left unchanged: no artifacts/real-site-scans.json on this machine. The committed evidence holds ${committed.realSiteScans.scans.length} scan(s) and ${committed.mcp.calls.length} MCP call(s). Regenerate with \`pnpm scan:real-sites && pnpm evidence:publish\`.`,
  );
  process.exit(0);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(path.join(outputRoot, "scans"), { recursive: true });
await mkdir(path.join(outputRoot, "mcp"), { recursive: true });

// The AtlasPay before/after frames are canonical submission captures, not
// transient public output. Republish all 20 so evidence:publish can rebuild
// public/evidence without breaking demo:prove on the next verification run.
const atlasPayEvidenceRoot = path.join(
  root,
  "submission",
  "screenshots",
  "atlaspay",
);
const atlasPayEvidenceFiles = (await readdir(atlasPayEvidenceRoot)).filter((file) =>
  /^BF-[A-Z0-9-]+(?:-after)?\.png$/.test(file),
);
if (atlasPayEvidenceFiles.length !== 20) {
  throw new Error(
    `Expected 20 AtlasPay before/after evidence frames; found ${atlasPayEvidenceFiles.length}.`,
  );
}
await Promise.all(
  atlasPayEvidenceFiles.map((file) =>
    copyFile(path.join(atlasPayEvidenceRoot, file), path.join(outputRoot, file)),
  ),
);

const published: Array<Record<string, unknown>> = [];

for (const entry of realSites.scans) {
  const scanDirectory = path.join(root, ".bhashafix", "scans", entry.scanId);
  const scan = await readJson<Record<string, unknown>>(
    path.join(".bhashafix", "scans", entry.scanId, "scan.json"),
  );
  if (!scan) {
    console.warn(`skipping ${entry.scanId}: no scan.json on disk`);
    continue;
  }

  const destination = path.join(outputRoot, "scans", entry.scanId);
  await mkdir(path.join(destination, "screenshots"), { recursive: true });

  const files = await readdir(scanDirectory);
  const screenshots: Array<{ file: string; bytes: number; sha256: string }> = [];
  for (const file of files.filter((name) => name.endsWith(".png"))) {
    const source = path.join(scanDirectory, file);
    await copyFile(source, path.join(destination, "screenshots", file));
    screenshots.push({
      file: `screenshots/${file}`,
      bytes: (await stat(source)).size,
      sha256: await sha256(source),
    });
  }

  // Strip the absolute project root: it is a developer machine path and it is
  // not evidence about the target.
  const config = scan.config as Record<string, unknown>;
  // Every issue records the absolute path of the screenshot it was measured
  // against. That is a developer home directory, and it is not evidence about
  // the target, so re-root it at the published location.
  const issues = ((scan.issues as Array<Record<string, unknown>>) ?? []).map((issue) => ({
    ...issue,
    screenshotBefore: issue.screenshotBefore
      ? `screenshots/${path.basename(String(issue.screenshotBefore))}`
      : null,
  }));
  const publishedScan: Record<string, unknown> = {
    ...scan,
    issues,
    config: { ...config, projectRoot: "<local project root>" },
  };
  await writeFile(
    path.join(destination, "scan.json"),
    `${JSON.stringify(publishedScan, null, 2)}\n`,
  );

  const renders = await readJson<unknown[]>(
    path.join(".bhashafix", "scans", entry.scanId, "renders.json"),
  );
  if (renders) {
    const sanitised = (renders as Array<Record<string, unknown>>).map((render) => ({
      ...render,
      screenshot: render.screenshot
        ? `screenshots/${path.basename(String(render.screenshot))}`
        : null,
      dom: render.dom ? `dom/${path.basename(String(render.dom))}` : null,
    }));
    await writeFile(
      path.join(destination, "renders.json"),
      `${JSON.stringify(sanitised, null, 2)}\n`,
    );
  }

  published.push({
    name: entry.name,
    scanId: entry.scanId,
    origin: publishedScan.origin,
    target: entry.target,
    note: entry.note,
    routes: entry.routes,
    locales: entry.locales,
    renders: entry.renders,
    issues: entry.issues,
    startedAt: publishedScan.startedAt,
    completedAt: publishedScan.completedAt,
    screenshots,
    path: `/evidence/scans/${entry.scanId}`,
  });
}

// ------------------------------------------------------------------ mcp calls
const MCP_CALLS = [
  { file: "00-tools.json", tool: "tools/list", label: "List the tools the server exposes" },
  { file: "01-inspect-project.json", tool: "bhashafix_inspect_project", label: "Inspect the project" },
  { file: "02-create-scan.json", tool: "bhashafix_create_scan", label: "Create a scan" },
  { file: "03-run-scan.json", tool: "bhashafix_run_scan", label: "Run it" },
  { file: "04-list-issues.json", tool: "bhashafix_list_issues", label: "Read the verified issues" },
  { file: "06-repair-dry-run.json", tool: "bhashafix_prepare_repair", label: "Prepare a repair (dry run)" },
  { file: "07-apply-repair.json", tool: "bhashafix_apply_repair", label: "Apply the approved issue IDs" },
  { file: "08-verify-repair.json", tool: "bhashafix_verify_repair", label: "Rerun the identical predicates" },
] as const;

const mcpCalls: Array<Record<string, unknown>> = [];
for (const call of MCP_CALLS) {
  const payload = await readJson<unknown>(path.join("submission", "mcp-output", call.file));
  if (!payload) {
    console.warn(`skipping MCP evidence ${call.file}: not on disk`);
    continue;
  }
  const written = path.join(outputRoot, "mcp", call.file);
  await writeFile(written, `${JSON.stringify(payload, null, 2)}\n`);
  mcpCalls.push({
    tool: call.tool,
    label: call.label,
    file: `/evidence/mcp/${call.file}`,
    // Measure the file that actually ships, not the compact serialisation.
    // The written file is pretty-printed, so the two differed by about a third
    // and the recorded size described a file nobody could download.
    bytes: (await stat(written)).size,
    sha256: await sha256(written),
  });
}

const stdioReceipt = await readJson<Record<string, unknown>>(
  "artifacts/mcp-stdio-receipt.json",
);

// -------------------------------------------------------------------- indexes
const benchmark = await readJson<Record<string, unknown>>("artifacts/benchmark.json");
const repairProof = await readJson<Record<string, unknown>>("submission/repair-proof.json");
const nextjsProof = await readJson<Record<string, unknown>>(
  "artifacts/nextjs-repair-proof.json",
);

await writeFile(
  path.join(outputRoot, "index.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "Every entry here was produced by an actual run and copied verbatim. Regenerate with `pnpm evidence:publish`.",
      realSiteScans: {
        generatedAt: realSites.generatedAt,
        limitations: realSites.limitations,
        scans: published,
      },
      mcp: {
        transport: stdioReceipt?.transport ?? null,
        serverEntry: stdioReceipt?.serverEntry ?? null,
        tools: stdioReceipt?.tools ?? null,
        resources: stdioReceipt?.resources ?? null,
        prompts: stdioReceipt?.prompts ?? null,
        calls: mcpCalls,
      },
      benchmark: benchmark
        ? { fixture: benchmark.fixture, metrics: benchmark.metrics }
        : null,
      atlaspayRepair: repairProof
        ? {
            ...repairProof,
            browserEvidence: atlasPayEvidenceFiles.map((file) => `/evidence/${file}`),
          }
        : null,
      nextjsRepair: nextjsProof
        ? {
            scanIds: nextjsProof.scanIds,
            before: nextjsProof.before,
            after: nextjsProof.after,
            assertions: nextjsProof.assertions,
            repair: nextjsProof.repair,
          }
        : null,
    },
    null,
    2,
  )}\n`,
);

const totalScreenshots = published.reduce(
  (total, scan) => total + (scan.screenshots as unknown[]).length,
  0,
);
console.log(
  `EVIDENCE published ${published.length} real scan(s), ${totalScreenshots} screenshot(s), ${mcpCalls.length} MCP call(s) to public/evidence`,
);
