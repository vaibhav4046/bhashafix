import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { scanDemoProject, loadDemoPredicates } from "@bhashafix/core";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { writeReportBundle } from "@bhashafix/report";
import { verifyRepair } from "@bhashafix/verifier";

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
  const result = await scanDemoProject(projectRoot);
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
  console.log(
    `SCAN ${result.scanId} ${result.issues.length} verified failures across ${result.routesDiscovered.length} routes`,
  );
  return result;
}

async function repair() {
  const baseline = await scanDemoProject(projectRoot);
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
  const baseline = JSON.parse(await readFile(baselineFile, "utf8"));
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
