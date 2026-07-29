import { copyFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanDemoProject } from "@bhashafix/core";
import { applyRepair, prepareRepair } from "@bhashafix/repair-engine";
import { verifyRepair } from "@bhashafix/verifier";

const root = process.cwd();
const fixtureFiles = [
  "layout.json",
  "locale-state.json",
  "translations.json",
  "glossary.json",
];

async function reset() {
  await Promise.all(
    fixtureFiles.map((file) =>
      copyFile(
        path.join(root, "fixtures/multilingual-demo/baseline", file),
        path.join(root, "apps/demo-target/data", file),
      ),
    ),
  );
}

describe("ten-to-zero repair loop", () => {
  beforeAll(reset);
  afterAll(reset);

  it("derives ten failures, applies only allowlisted files and verifies zero", async () => {
    const baseline = await scanDemoProject(root);
    expect(baseline.issues).toHaveLength(10);
    expect(new Set(baseline.issues.map((issue) => issue.issueId)).size).toBe(10);

    const plan = await prepareRepair(root, baseline);
    expect(plan.operations).toHaveLength(baseline.issues.length);
    expect(plan.unifiedDiff).toContain("--- a/apps/demo-target/data/layout.json");
    const dryRun = await applyRepair(plan, { dryRun: true });
    expect(dryRun.applied).toBe(false);
    expect((await scanDemoProject(root)).issues).toHaveLength(10);

    const applied = await applyRepair(plan);
    expect(applied.files.sort()).toEqual(
      [
        "apps/demo-target/data/layout.json",
        "apps/demo-target/data/locale-state.json",
        "apps/demo-target/data/translations.json",
      ].sort(),
    );

    const { scan, result } = await verifyRepair(root, baseline);
    expect(scan.issues).toHaveLength(0);
    expect(result).toMatchObject({
      status: "verified",
      baselineBlocking: 10,
      finalBlocking: 0,
      sourceLocaleRegression: "PASS",
      accessibilityRegression: false,
      newBlockingIssues: 0,
      diffWithinPolicy: true,
    });
  });
});
