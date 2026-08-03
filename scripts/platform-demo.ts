import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { scanDemoProject, loadDemoPredicates, type Scan } from "@bhashafix/core";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { writeReportBundle } from "@bhashafix/report";
import { verifyRepair } from "@bhashafix/verifier";
import { buildStoredZip } from "./stored-zip";

const projectRoot = process.cwd();
const command = process.argv[2];
const baselineRoot = path.join(
  projectRoot,
  "fixtures",
  "multilingual-demo",
  "baseline",
);
const targetRoot = path.join(projectRoot, "apps", "demo-target", "data");
const files = [
  "layout.json",
  "locale-state.json",
  "translations.json",
  "glossary.json",
];
const evidenceRoot = path.join(projectRoot, "artifacts", "replay");
const publicReplayRoot = path.join(projectRoot, "public", "replay");
const submissionRoot = path.join(projectRoot, "submission");

async function reset() {
  await mkdir(targetRoot, { recursive: true });
  await Promise.all(
    files.map((file) =>
      copyFile(path.join(baselineRoot, file), path.join(targetRoot, file)),
    ),
  );
  console.log(`RESET ${files.length} AtlasPay fixture files to canonical baseline`);
}

async function scan() {
  const result = await scanDemoProject(projectRoot, {
    mode: "replay",
    origin: "RECORDED_REPLAY",
  });
  const expected = (await loadDemoPredicates(projectRoot)).length;
  if (result.issues.length !== expected) {
    throw new Error(
      `Baseline mismatch: detected ${result.issues.length}; predicate fixture defines ${expected}.`,
    );
  }
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(path.join(projectRoot, ".bhashafix"), { recursive: true });
  const encoded = `${JSON.stringify(result, null, 2)}\n`;
  await writeFile(path.join(evidenceRoot, "baseline-scan.json"), encoded);
  await writeFile(
    path.join(projectRoot, ".bhashafix", "baseline-scan.json"),
    encoded,
  );
  // public/replay ships with the deployed site, so the absolute project root
  // must not travel with it. It is a developer home directory, not evidence.
  const shipped = `${JSON.stringify(
    { ...result, config: { ...result.config, projectRoot: "<local project root>" } },
    null,
    2,
  )}\n`;
  await mkdir(publicReplayRoot, { recursive: true });
  await writeFile(path.join(publicReplayRoot, "baseline-scan.json"), shipped);
  console.log(
    `SCAN ${result.scanId} ${result.issues.length} verified failures across ${result.routesDiscovered.length} routes`,
  );
  return result;
}

async function repair() {
  const baseline = await scanDemoProject(projectRoot, {
    mode: "replay",
    origin: "RECORDED_REPLAY",
  });
  const plan = await prepareRepair(projectRoot, baseline);
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(submissionRoot, { recursive: true });
  await writeFile(
    path.join(projectRoot, ".bhashafix", "prepared-plan.json"),
    `${JSON.stringify(plan, null, 2)}\n`,
  );
  await writeFile(path.join(evidenceRoot, "repair.patch"), plan.unifiedDiff);
  await writeFile(path.join(submissionRoot, "repair.patch"), plan.unifiedDiff);
  const applied = await applyRepair(plan);
  console.log(
    `REPAIR ${plan.operations.length} verified operations in ${applied.files.length} allowlisted files`,
  );
  return { baseline, plan };
}

async function prove() {
  const baselineFile = path.join(evidenceRoot, "baseline-scan.json");
  const baseline = JSON.parse(await readFile(baselineFile, "utf8")) as Scan;
  const { scan: finalScan, result } = await verifyRepair(projectRoot, baseline);
  if (
    result.status !== "verified" ||
    result.finalBlocking !== 0 ||
    result.sourceLocaleRegression !== "PASS"
  ) {
    throw new Error(`Verification failed: ${JSON.stringify(result)}`);
  }
  const proof = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    origin: "RECORDED_REPLAY",
    mode: "genuine deterministic replay artifact",
    baselineScanId: baseline.scanId,
    verificationScanId: finalScan.scanId,
    baselineBlocking: result.baselineBlocking,
    finalBlocking: result.finalBlocking,
    sourceLocaleRegression: result.sourceLocaleRegression,
    consoleErrorDelta: result.consoleErrorDelta,
    accessibilityRegression: result.accessibilityRegression,
    diffWithinPolicy: result.diffWithinPolicy,
    status: result.status,
  };
  await writeFile(
    path.join(evidenceRoot, "repair-proof.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  await writeFile(
    path.join(submissionRoot, "repair-proof.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  await writeReportBundle(path.join(evidenceRoot, "report"), finalScan, result);
  const screenshotDirectory = path.join(
    projectRoot,
    "submission",
    "screenshots",
    "atlaspay",
  );
  const screenshotFiles = baseline.issues.flatMap((issue) => {
    const before = path.basename(String(issue.screenshotBefore));
    return [before, before.replace(/\.png$/i, "-after.png")];
  });
  const screenshotZip = buildStoredZip(
    await Promise.all(
      screenshotFiles.map(async (file) => ({
        name: `${file.endsWith("-after.png") ? "after" : "before"}/${file}`,
        data: await readFile(path.join(screenshotDirectory, file)),
      })),
    ),
  );
  await writeFile(
    path.join(evidenceRoot, "report", "screenshots.zip"),
    screenshotZip,
  );
  await mkdir(publicReplayRoot, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(publicReplayRoot, "repair-proof.json"),
      `${JSON.stringify(proof, null, 2)}\n`,
    ),
    copyFile(
      path.join(evidenceRoot, "repair.patch"),
      path.join(publicReplayRoot, "repair.patch"),
    ),
    ...["report.json", "report.html", "report.sarif", "junit.xml", "issues.csv"].map(
      (file) =>
        copyFile(
          path.join(evidenceRoot, "report", file),
          path.join(publicReplayRoot, file),
        ),
    ),
    writeFile(path.join(publicReplayRoot, "screenshots.zip"), screenshotZip),
  ]);
  console.log(
    `PROVE ${result.baselineBlocking} → ${result.finalBlocking}; source-locale regression ${result.sourceLocaleRegression}`,
  );
  await reset();
  return proof;
}

if (command === "reset") await reset();
else if (command === "scan") await scan();
else if (command === "repair") await repair();
else if (command === "prove") await prove();
else throw new Error("Usage: platform-demo.ts reset|scan|repair|prove");
