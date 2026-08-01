/**
 * End-to-end proof that BhashaFix repairs a real Next.js project's source.
 *
 * One run does all of this against `fixtures/nextjs-app`, a genuine Next.js
 * App Router project:
 *
 *   1. `next build` (output: "export") renders the real TSX and CSS to static
 *      HTML, and a local server serves it.
 *   2. A real browser scan runs through `runBrowserProjectScan`.
 *   3. The three seeded defect classes must be detected from measurements.
 *   4. A source repair is prepared and dry-run, producing a unified diff.
 *   5. `git apply --check` proves the diff is a real, appliable patch.
 *   6. The repair is applied to the .tsx / .css / .json source.
 *   7. The project is rebuilt and the identical scan is re-run.
 *   8. Those blockers must be zero, en-GB must still pass, and no new blocking
 *      issue may appear.
 *   9. `artifacts/nextjs-repair-proof.json` records the receipt.
 *
 * The fixture source is restored from the repair's own rollback snapshot at the
 * end, so the script is repeatable.
 */

import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applySourceRepair,
  listRollbackSnapshot,
  prepareSourceRepair,
  restoreSourceRepair,
  type SourceRepairRequest,
} from "@bhashafix/repair-engine";
import type { Issue, Scan } from "@bhashafix/shared";
import { runBrowserProjectScan } from "../packages/cli/src/browser-scan";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const FIXTURE_REL = "fixtures/nextjs-app";
const FIXTURE_ROOT = path.join(REPO_ROOT, FIXTURE_REL);
const OUT_DIR = path.join(FIXTURE_ROOT, "out");
const ARTIFACT_DIR = path.join(REPO_ROOT, "artifacts");

const SOURCE_LOCALE = "en-GB";
const LOCALES = ["en-GB", "de-DE", "ar-SA", "ja-JP"];
const ROUTES = ["/"];
const VIEWPORTS = ["desktop"];

const LAYOUT_FILE = `${FIXTURE_REL}/app/[locale]/layout.tsx`;
const CSS_FILE = `${FIXTURE_REL}/app/globals.css`;
const JA_MESSAGES_FILE = `${FIXTURE_REL}/messages/ja-JP.json`;
/** Only these three files may ever be written by this proof. */
const ALLOWLIST = [LAYOUT_FILE, CSS_FILE, JA_MESSAGES_FILE];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

class ProofError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ProofError(message);
}

function run(command: string, args: string[], cwd: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: process.platform === "win32" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

/** Build the fixture with the real Next.js toolchain. */
async function buildFixture(label: string) {
  log(`\n[build:${label}] next build --output export in ${FIXTURE_REL}`);
  const nextBin = path.join(
    REPO_ROOT,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "next.cmd" : "next",
  );
  const started = Date.now();
  const result = await run(nextBin, ["build"], FIXTURE_ROOT);
  if (result.code !== 0) {
    throw new ProofError(
      `next build failed (exit ${result.code}).\n${result.stdout}\n${result.stderr}`,
    );
  }
  const durationMs = Date.now() - started;
  log(`[build:${label}] ok in ${durationMs}ms`);
  return { durationMs };
}

/**
 * Serve the static export.
 *
 * `runBrowserProjectScan` addresses non-source locales as `?locale=<tag>` on
 * the same route, so this server performs the same rewrite a Next.js
 * middleware would: `/?locale=ar-SA` serves the prerendered `/ar-SA/` document.
 */
function startStaticServer(outDir: string) {
  const server: Server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const locale = url.searchParams.get("locale") ?? SOURCE_LOCALE;
      const rewritten =
        url.pathname === "/" && LOCALES.includes(locale)
          ? `/${locale}/index.html`
          : url.pathname;
      const decoded = decodeURIComponent(rewritten);
      const candidate = path.resolve(outDir, `.${decoded}`);
      // Never serve anything outside the export directory.
      if (candidate !== outDir && !candidate.startsWith(outDir + path.sep)) {
        response.writeHead(403).end("forbidden");
        return;
      }
      let file = candidate;
      try {
        if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      } catch {
        response.writeHead(404).end("not found");
        return;
      }
      try {
        const info = await stat(file);
        response.writeHead(200, {
          "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
          "content-length": String(info.size),
          "cache-control": "no-store",
        });
        createReadStream(file).pipe(response);
      } catch {
        response.writeHead(404).end("not found");
      }
    })();
  });
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new ProofError("the static server did not bind a port."));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}/`,
        close: () =>
          new Promise<void>((done, fail) =>
            server.close((error) => (error ? fail(error) : done())),
          ),
      });
    });
  });
}

async function scan(label: string, url: string): Promise<Scan> {
  log(`\n[scan:${label}] ${url}`);
  const outcome = await runBrowserProjectScan({
    url,
    projectRoot: REPO_ROOT,
    sourceLocale: SOURCE_LOCALE,
    locales: LOCALES,
    routes: ROUTES,
    viewports: VIEWPORTS,
    allowLocalhost: true,
    runAxe: true,
    onProgress: (message) => log(`  ${message}`),
  });
  log(
    `[scan:${label}] scanId=${outcome.scan.scanId} renders=${outcome.renderCount} issues=${outcome.scan.issues.length}`,
  );
  return outcome.scan;
}

const isBlocking = (issue: Issue) => issue.severity === "blocking";

function summarise(target: Scan) {
  const byRule: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  for (const issue of target.issues) {
    byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1;
    byLocale[issue.locale] = (byLocale[issue.locale] ?? 0) + 1;
  }
  const blockingByRule: Record<string, number> = {};
  for (const issue of target.issues.filter(isBlocking)) {
    blockingByRule[issue.ruleId] = (blockingByRule[issue.ruleId] ?? 0) + 1;
  }
  return {
    scanId: target.scanId,
    total: target.issues.length,
    blocking: target.issues.filter(isBlocking).length,
    byRule,
    blockingByRule,
    byLocale,
  };
}

function issuesFor(target: Scan, ruleId: string) {
  return target.issues.filter((issue) => issue.ruleId === ruleId);
}

/** Confirm the fixture still carries its three seeded defects before scanning. */
async function assertDefectiveBaseline() {
  const layout = await readFile(path.join(REPO_ROOT, LAYOUT_FILE), "utf8");
  const css = await readFile(path.join(REPO_ROOT, CSS_FILE), "utf8");
  const messages = JSON.parse(
    await readFile(path.join(REPO_ROOT, JA_MESSAGES_FILE), "utf8"),
  ) as Record<string, string>;
  const problems = [
    layout.includes('<html lang="en">')
      ? null
      : `${LAYOUT_FILE} no longer hardcodes <html lang="en">`,
    /\bwidth:\s*168px/.test(css) && /white-space:\s*nowrap/.test(css)
      ? null
      : `${CSS_FILE} no longer clamps .cta`,
    Object.hasOwn(messages, "cta.primary")
      ? `${JA_MESSAGES_FILE} already defines cta.primary`
      : null,
  ].filter((problem): problem is string => problem !== null);
  assert(
    problems.length === 0,
    `The fixture is not in its defective baseline state:\n  - ${problems.join(
      "\n  - ",
    )}\nRestore it with: git checkout -- ${FIXTURE_REL}`,
  );
}

async function main() {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await assertDefectiveBaseline();

  const buildBefore = await buildFixture("before");
  let server = await startStaticServer(OUT_DIR);
  let before: Scan;
  try {
    before = await scan("before", server.url);
  } finally {
    await server.close();
  }

  // ---- 3. the three defect classes must be detected -----------------------
  const langMismatch = issuesFor(before, "BF-LOC-LANG-MISMATCH");
  const dirMissing = issuesFor(before, "BF-LOC-DIR-MISSING");
  const overflow = issuesFor(before, "BF-VIS-TEXT-OVERFLOW-X");
  const rawKey = issuesFor(before, "BF-LNG-RAW-KEY");

  assert(
    langMismatch.length > 0,
    "BF-LOC-LANG-MISMATCH was not detected on the defective build.",
  );
  assert(
    langMismatch.some((issue) => issue.locale === "ar-SA"),
    "BF-LOC-LANG-MISMATCH was not detected for ar-SA.",
  );
  assert(
    dirMissing.some((issue) => issue.locale === "ar-SA"),
    "BF-LOC-DIR-MISSING was not detected for ar-SA.",
  );
  assert(
    overflow.some((issue) => issue.locale === "de-DE"),
    "BF-VIS-TEXT-OVERFLOW-X was not detected for de-DE.",
  );
  assert(
    rawKey.some((issue) => issue.locale === "ja-JP"),
    "BF-LNG-RAW-KEY was not detected for ja-JP.",
  );
  assert(
    issuesFor(before, "BF-LOC-LANG-MISMATCH").every((issue) => issue.locale !== SOURCE_LOCALE),
    "the source locale must not be reported as a language mismatch.",
  );

  const detections = {
    "BF-LOC-LANG-MISMATCH": langMismatch.map((issue) => ({
      issueId: issue.issueId,
      locale: issue.locale,
      selector: issue.selector,
      measuredEvidence: issue.measuredEvidence,
    })),
    "BF-LOC-DIR-MISSING": dirMissing.map((issue) => ({
      issueId: issue.issueId,
      locale: issue.locale,
      selector: issue.selector,
      measuredEvidence: issue.measuredEvidence,
    })),
    "BF-VIS-TEXT-OVERFLOW-X": overflow.map((issue) => ({
      issueId: issue.issueId,
      locale: issue.locale,
      selector: issue.selector,
      measuredEvidence: issue.measuredEvidence,
    })),
    "BF-LNG-RAW-KEY": rawKey.map((issue) => ({
      issueId: issue.issueId,
      locale: issue.locale,
      selector: issue.selector,
      measuredEvidence: issue.measuredEvidence,
    })),
  };
  log("\n[detect] measured evidence");
  for (const [ruleId, entries] of Object.entries(detections)) {
    for (const entry of entries) {
      log(
        `  ${ruleId} ${entry.locale} ${entry.selector ?? "-"} ${JSON.stringify(
          entry.measuredEvidence,
        )}`,
      );
    }
  }

  // ---- 4. prepare the repair (dry-run by default) -------------------------
  // The missing key is taken from the scan's own evidence; its translation is
  // taken from the approved-but-unmerged delivery in messages/pending.
  const rawKeyIssue = rawKey.find((issue) => issue.locale === "ja-JP")!;
  const missingKey = (rawKeyIssue.measuredEvidence as { visibleText?: unknown }).visibleText;
  assert(
    typeof missingKey === "string" && missingKey.length > 0,
    "BF-LNG-RAW-KEY carried no visibleText evidence to repair from.",
  );
  const pending = JSON.parse(
    await readFile(path.join(FIXTURE_ROOT, "messages", "pending", "ja-JP.json"), "utf8"),
  ) as Record<string, string>;
  const translation = pending[missingKey];
  assert(
    typeof translation === "string" && translation.length > 0,
    `messages/pending/ja-JP.json has no approved translation for "${missingKey}".`,
  );

  const requests: SourceRepairRequest[] = [
    {
      issueIds: [...langMismatch, ...dirMissing].map((issue) => issue.issueId),
      ruleId: "BF-LOC-LANG-MISMATCH+BF-LOC-DIR-MISSING",
      file: LAYOUT_FILE,
      strategy: {
        kind: "jsx-open-tag",
        expect: '<html lang="en">',
        replace: "<html lang={locale} dir={textDirection(locale)}>",
        ensureNamedImport: { module: "../../lib/i18n", name: "textDirection" },
      },
      reason:
        "The root layout hardcodes lang=\"en\" and omits dir, so every non-English route serves the wrong language and right-to-left locales are not mirrored.",
    },
    {
      issueIds: overflow.map((issue) => issue.issueId),
      ruleId: "BF-VIS-TEXT-OVERFLOW-X",
      file: CSS_FILE,
      strategy: { kind: "css-relax-text-clamp", selector: ".cta" },
      reason:
        "The call to action is pinned to a fixed width and held on one line, so longer translations are clipped.",
    },
    {
      issueIds: rawKey.map((issue) => issue.issueId),
      ruleId: "BF-LNG-RAW-KEY",
      file: JA_MESSAGES_FILE,
      strategy: { kind: "translation-key", key: missingKey, value: translation },
      reason: `The ja-JP dictionary has no "${missingKey}" entry, so the raw key renders.`,
    },
  ];

  const plan = await prepareSourceRepair(REPO_ROOT, before, requests, {
    allowlist: ALLOWLIST,
  });
  log(
    `\n[plan] files=${plan.changedFiles} changedLines=${plan.changedLines}/${plan.maxChangedLines} diffHash=${plan.diffHash}`,
  );

  const dryRun = await applySourceRepair(plan);
  assert(dryRun.applied === false && dryRun.dryRun === true, "the default apply must be a dry run.");
  assert(
    dryRun.diffHash === plan.diffHash,
    "the dry run produced a different diff from the prepared plan.",
  );

  const diffPath = path.join(ARTIFACT_DIR, "nextjs-repair.diff");
  await writeFile(diffPath, plan.unifiedDiff, "utf8");
  log(`\n[diff] ${plan.unifiedDiff.split("\n").length - 1} line(s) written to ${diffPath}`);
  log(plan.unifiedDiff);

  // ---- 5. the diff must be a real, appliable patch ------------------------
  const check = await run("git", ["apply", "--check", "--verbose", diffPath], REPO_ROOT);
  log(`[git apply --check] exit=${check.code}\n${check.stderr.trim() || check.stdout.trim()}`);
  assert(
    check.code === 0,
    `git apply --check rejected the diff (exit ${check.code}).\n${check.stderr}`,
  );

  // ---- 6. apply, rebuild, rescan ------------------------------------------
  const applied = await applySourceRepair(plan, {
    dryRun: false,
    expectedDiffHash: plan.diffHash,
  });
  assert(applied.applied === true, "the repair did not apply.");
  const rollbackFiles = await listRollbackSnapshot(plan);
  log(`\n[apply] files=${applied.files.join(", ")}`);
  log(`[apply] rollback snapshot: ${rollbackFiles.join(", ")}`);

  let after: Scan;
  let buildAfter: { durationMs: number };
  try {
    buildAfter = await buildFixture("after");
    server = await startStaticServer(OUT_DIR);
    try {
      after = await scan("after", server.url);
    } finally {
      await server.close();
    }
  } catch (error) {
    await restoreSourceRepair(plan);
    throw error;
  }

  // ---- 8. the repair must hold up under the identical scan ----------------
  const beforeSummary = summarise(before);
  const afterSummary = summarise(after);
  const repairedRules = [
    "BF-LOC-LANG-MISMATCH",
    "BF-LOC-DIR-MISSING",
    "BF-VIS-TEXT-OVERFLOW-X",
    "BF-LNG-RAW-KEY",
  ];

  const failures: string[] = [];
  for (const ruleId of repairedRules) {
    const remaining = issuesFor(after, ruleId).filter(isBlocking);
    if (remaining.length > 0) {
      failures.push(
        `${ruleId} still reports ${remaining.length} blocking issue(s) after the repair.`,
      );
    }
  }

  const sourceLocaleBefore = before.issues.filter(
    (issue) => issue.locale === SOURCE_LOCALE && isBlocking(issue),
  );
  const sourceLocaleAfter = after.issues.filter(
    (issue) => issue.locale === SOURCE_LOCALE && isBlocking(issue),
  );
  if (sourceLocaleBefore.length !== 0) {
    failures.push(
      `${SOURCE_LOCALE} had ${sourceLocaleBefore.length} blocking issue(s) before the repair; the source locale must start clean.`,
    );
  }
  if (sourceLocaleAfter.length !== 0) {
    failures.push(
      `${SOURCE_LOCALE} regressed to ${sourceLocaleAfter.length} blocking issue(s) after the repair.`,
    );
  }

  // A new blocking issue is one whose (rule, locale, selector) was not blocking
  // before. Issue IDs are stable across scans, so identity is exact.
  const key = (issue: Issue) =>
    `${issue.ruleId}|${issue.locale}|${issue.route}|${issue.selector ?? "-"}|${issue.viewport.name}`;
  const blockingBefore = new Set(before.issues.filter(isBlocking).map(key));
  const newBlocking = after.issues.filter(isBlocking).filter((issue) => !blockingBefore.has(key(issue)));
  if (newBlocking.length > 0) {
    failures.push(
      `${newBlocking.length} new blocking issue(s) appeared: ${newBlocking
        .map((issue) => `${issue.ruleId}@${issue.locale}`)
        .join(", ")}`,
    );
  }

  const totalBlockingAfter = after.issues.filter(isBlocking).length;
  if (totalBlockingAfter !== 0) {
    failures.push(
      `${totalBlockingAfter} blocking issue(s) remain after the repair: ${after.issues
        .filter(isBlocking)
        .map((issue) => `${issue.ruleId}@${issue.locale}`)
        .join(", ")}`,
    );
  }

  const receipt = {
    generatedAt: new Date().toISOString(),
    fixture: FIXTURE_REL,
    servingApproach:
      "next build with output: \"export\", served over a local static HTTP server that rewrites /?locale=<tag> to the prerendered /<tag>/ document",
    buildMs: { before: buildBefore.durationMs, after: buildAfter.durationMs },
    scanConfig: { routes: ROUTES, locales: LOCALES, viewports: VIEWPORTS, sourceLocale: SOURCE_LOCALE, runAxe: true },
    scanIds: { before: before.scanId, after: after.scanId },
    before: beforeSummary,
    after: afterSummary,
    detections,
    repair: {
      diffHash: plan.diffHash,
      changedFiles: plan.changedFiles,
      changedLines: plan.changedLines,
      maxChangedFiles: plan.maxChangedFiles,
      maxChangedLines: plan.maxChangedLines,
      maxDiffBytes: plan.maxDiffBytes,
      allowlist: plan.allowlist,
      files: applied.files,
      strategies: plan.operations.map((operation) => ({
        ruleId: operation.ruleId,
        file: operation.file,
        kind: operation.strategy.kind,
        issueIds: operation.issueIds,
        beforeSha256: operation.beforeSha256,
        afterSha256: operation.afterSha256,
      })),
      dryRunFirst: true,
      gitApplyCheck: { command: "git apply --check", exitCode: check.code },
      rollbackSnapshot: rollbackFiles,
      diffPath: path.relative(REPO_ROOT, diffPath).replaceAll("\\", "/"),
    },
    assertions: {
      sourceLocaleBlockingBefore: sourceLocaleBefore.length,
      sourceLocaleBlockingAfter: sourceLocaleAfter.length,
      newBlockingIssues: newBlocking.length,
      repairedRuleBlockingAfter: Object.fromEntries(
        repairedRules.map((ruleId) => [ruleId, issuesFor(after, ruleId).filter(isBlocking).length]),
      ),
      totalBlockingBefore: beforeSummary.blocking,
      totalBlockingAfter: afterSummary.blocking,
    },
    fixtureRestoredFromRollback: true,
    status: failures.length === 0 ? "verified" : "failed",
    failures,
  };

  const receiptPath = path.join(ARTIFACT_DIR, "nextjs-repair-proof.json");
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

  // Restore the fixture from the repair's own rollback snapshot so the proof
  // is repeatable, then rebuild so `out/` matches the source again.
  const restored = await restoreSourceRepair(plan);
  log(`\n[rollback] restored ${restored.length} file(s) from the snapshot`);
  await buildFixture("restore");

  log(`\n[receipt] ${receiptPath}`);
  log(
    `[receipt] blocking ${beforeSummary.blocking} -> ${afterSummary.blocking}, total ${beforeSummary.total} -> ${afterSummary.total}`,
  );
  log(`[receipt] scanIds ${before.scanId} -> ${after.scanId}`);
  log(`[receipt] status ${receipt.status}`);

  if (failures.length > 0) {
    throw new ProofError(`Proof failed:\n  - ${failures.join("\n  - ")}`);
  }
  log("\nPASS: the Next.js source repair was verified end to end.");
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
});
