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

await rm(outputRoot, { recursive: true, force: true });
await mkdir(path.join(outputRoot, "scans"), { recursive: true });
await mkdir(path.join(outputRoot, "mcp"), { recursive: true });

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

const realSites = await readJson<RealSiteReceipt>("artifacts/real-site-scans.json");
if (!realSites) {
  throw new Error("artifacts/real-site-scans.json is missing. Run `pnpm scan:real-sites` first.");
}

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
  const publishedScan = {
    ...scan,
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
  await writeFile(
    path.join(outputRoot, "mcp", call.file),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  mcpCalls.push({
    tool: call.tool,
    label: call.label,
    file: `/evidence/mcp/${call.file}`,
    bytes: JSON.stringify(payload).length,
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
      atlaspayRepair: repairProof ?? null,
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
