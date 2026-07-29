import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { scanDemoProject } from "@bhashafix/core";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { verifyRepair } from "@bhashafix/verifier";

const root = process.cwd();
const submission = path.join(root, "submission");
await mkdir(submission, { recursive: true });

const baseline = await scanDemoProject(root, { mode: "replay" });
const plan = await prepareRepair(root, baseline);
await applyRepair(plan);
const { scan: finalScan, result } = await verifyRepair(root, baseline);
if (result.status !== "verified") {
  throw new Error(`Submission proof is not verified: ${result.status}`);
}

const deckPath = path.join(submission, "BhashaFix-Hackathon-Deck.pptx");
const deckHeader = (await readFile(deckPath)).subarray(0, 2).toString("ascii");
if (deckHeader !== "PK") {
  throw new Error("Submission deck is not a valid PPTX container.");
}

const screenshots = (await readdir(path.join(submission, "screenshots"))).filter(
  (file) => file.endsWith(".png"),
);
if (screenshots.length < 5) {
  throw new Error(
    `Submission requires at least 5 actual screenshots; found ${screenshots.length}.`,
  );
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

const manifest = {
  schemaVersion: "1.0",
  product: "BhashaFix",
  version: "0.2.0",
  generatedAt: new Date().toISOString(),
  commit: null,
  deployment: "https://bhashafix.vercel.app",
  repository: null,
  proof,
  artifacts: [
    "BhashaFix-Hackathon-Deck.pptx",
    "FINAL_SUBMISSION_FORM.md",
    "PROJECT_DESCRIPTION.md",
    "ONE_LINE_PITCH.txt",
    "DEMO_SCRIPT_90_SECONDS.md",
    "PITCH_SCRIPT_3_MINUTES.md",
    "TECHNICAL_ARCHITECTURE.md",
    "CODEX_USAGE_EVIDENCE.md",
    "MARKET_POSITIONING.md",
    "JUDGING_CHECKLIST.md",
    "repair-proof.json",
    "repair.patch",
    "screenshots/",
  ],
  claims: {
    universalLinguisticPerfection: false,
    deterministicEngineeringChecksAuthoritative: true,
    linguisticHumanReviewGates: true,
  },
};

await writeFile(
  path.join(submission, "RELEASE_MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await writeFile(path.join(submission, "repair.patch"), plan.unifiedDiff);
await writeFile(
  path.join(submission, "repair-proof.json"),
  `${JSON.stringify(proof, null, 2)}\n`,
);

for (const file of [
  "layout.json",
  "locale-state.json",
  "translations.json",
  "glossary.json",
]) {
  await writeFile(
    path.join(root, "apps/demo-target/data", file),
    await readFile(
      path.join(root, "fixtures/multilingual-demo/baseline", file),
      "utf8",
    ),
  );
}

console.log(
  `SUBMISSION PREPARED ${result.baselineBlocking} → ${result.finalBlocking}; source-locale regression ${result.sourceLocaleRegression}; ${screenshots.length} screenshots; PPTX PASS`,
);
