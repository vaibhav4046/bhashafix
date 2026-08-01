import { copyFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
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
  beforeEach(reset);
  afterAll(reset);

  it("derives ten failures, applies only allowlisted files and verifies zero", async () => {
    const baseline = await scanDemoProject(root);
    expect(baseline.issues).toHaveLength(10);
    expect(new Set(baseline.issues.map((issue) => issue.issueId)).size).toBe(10);

    const plan = await prepareRepair(root, baseline);
    expect(plan.operations).toHaveLength(baseline.issues.length);
    expect(plan.unifiedDiff).toContain("--- a/apps/demo-target/data/layout.json");
    expect(plan.unifiedDiff).toContain("+++ b/apps/demo-target/data/layout.json");
    expect(plan.unifiedDiff).toMatch(/^@@ -\d+,\d+ \+\d+,\d+ @@$/m);
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

    const { scan, result, diffPolicy } = await verifyRepair(root, baseline, {
      repairPlan: plan,
    });
    expect(scan.issues).toHaveLength(0);
    expect(result).toMatchObject({
      status: "verified",
      baselineBlocking: 10,
      finalBlocking: 0,
      sourceLocaleRegression: "PASS",
      newBlockingIssues: 0,
    });

    // diffWithinPolicy is a real measurement of the plan's blast radius.
    expect(diffPolicy).not.toBeNull();
    expect(diffPolicy!.changedFiles).toBe(3);
    expect(diffPolicy!.maxChangedFiles).toBe(plan.allowlist.length);
    expect(diffPolicy!.changedLines).toBe(
      plan.unifiedDiff
        .split("\n")
        .filter(
          (line) =>
            (line.startsWith("+") && !line.startsWith("+++")) ||
            (line.startsWith("-") && !line.startsWith("---")),
        ).length,
    );
    expect(diffPolicy!.changedLines).toBeGreaterThan(0);
    expect(diffPolicy!.changedLines).toBeLessThanOrEqual(
      diffPolicy!.maxChangedLines,
    );
    expect(result.diffWithinPolicy).toBe(true);
    expect(result.notMeasured).not.toContain("diffWithinPolicy");

    // The browser-only fields are reported as unmeasured, never as passes.
    expect(result.consoleErrorDelta).toBeNull();
    expect(result.accessibilityRegression).toBeNull();
    expect(result.notMeasured).toEqual(
      expect.arrayContaining(["consoleErrorDelta", "accessibilityRegression"]),
    );
  });

  it("reports diffWithinPolicy as unmeasured when no repair plan is supplied", async () => {
    const baseline = await scanDemoProject(root);
    await applyRepair(await prepareRepair(root, baseline));

    const { result, diffPolicy } = await verifyRepair(root, baseline);
    // A "verified" status must never imply the unmeasured fields were checked.
    expect(result.status).toBe("verified");
    expect(diffPolicy).toBeNull();
    expect(result.diffWithinPolicy).toBeNull();
    expect(result.notMeasured).toEqual(
      expect.arrayContaining([
        "consoleErrorDelta",
        "accessibilityRegression",
        "diffWithinPolicy",
      ]),
    );
  });

  it("fails verification when the repair exceeds the diff policy", async () => {
    const baseline = await scanDemoProject(root);
    const plan = await prepareRepair(root, baseline);
    await applyRepair(plan);

    const inBudget = await verifyRepair(root, baseline, { repairPlan: plan });
    expect(inBudget.result.finalBlocking).toBe(0);
    expect(inBudget.result.status).toBe("verified");

    const overBudget = await verifyRepair(root, baseline, {
      repairPlan: plan,
      diffPolicy: { maxChangedLines: 0 },
    });
    expect(overBudget.diffPolicy!.withinPolicy).toBe(false);
    expect(overBudget.result.diffWithinPolicy).toBe(false);
    expect(overBudget.result.finalBlocking).toBe(0);
    expect(overBudget.result.status).toBe("verification failed");
  });
});
