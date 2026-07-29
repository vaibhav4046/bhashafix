import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const { result } = await verifyRepair(root, baseline);
if (result.status !== "verified") {
  throw new Error(`Submission proof is not verified: ${result.status}`);
}

const manifest = {
  product: "BhashaFix",
  version: "0.2.0",
  generatedAt: new Date().toISOString(),
  proof: {
    baselineBlocking: result.baselineBlocking,
    finalBlocking: result.finalBlocking,
    sourceLocaleRegression: result.sourceLocaleRegression,
    status: result.status,
  },
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
  `${JSON.stringify(result, null, 2)}\n`,
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
  `SUBMISSION PREPARED ${result.baselineBlocking} → ${result.finalBlocking}; source-locale regression ${result.sourceLocaleRegression}`,
);
