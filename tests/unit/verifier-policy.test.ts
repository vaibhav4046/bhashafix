import { describe, expect, it } from "vitest";
import type { RepairPlan } from "@bhashafix/shared";
import {
  DEFAULT_MAX_CHANGED_LINES,
  countChangedDiffLines,
  evaluateDiffPolicy,
} from "@bhashafix/verifier";

function planWith(
  overrides: Partial<RepairPlan> & Pick<RepairPlan, "unifiedDiff">,
): RepairPlan {
  return {
    scanId: "scan-policy",
    createdAt: new Date().toISOString(),
    projectRoot: ".",
    allowlist: ["a.json", "b.json"],
    operations: [
      {
        issueId: "issue-1",
        file: "a.json",
        pointer: ["value"],
        before: 1,
        after: 2,
        reason: "test",
      },
    ],
    ...overrides,
  };
}

function diffOfChangedLines(count: number) {
  const body = Array.from({ length: count }, (_, index) =>
    index % 2 === 0 ? `-old ${index}` : `+new ${index}`,
  ).join("\n");
  return `--- a/a.json\n+++ b/a.json\n@@ -1,${count} +1,${count} @@\n${body}\n`;
}

describe("diff policy is measured, not assumed", () => {
  it("ignores the ---/+++ headers when counting changed lines", () => {
    const diff = "--- a/a.json\n+++ b/a.json\n@@ -1,2 +1,2 @@\n-one\n+two\n three\n";
    expect(countChangedDiffLines(diff)).toBe(2);
  });

  it("passes a small in-budget repair", () => {
    const measurement = evaluateDiffPolicy(
      planWith({ unifiedDiff: diffOfChangedLines(4) }),
    );
    expect(measurement).toEqual({
      changedLines: 4,
      maxChangedLines: DEFAULT_MAX_CHANGED_LINES,
      changedFiles: 1,
      maxChangedFiles: 2,
      withinPolicy: true,
    });
  });

  it("fails a repair that exceeds the changed-line budget", () => {
    const measurement = evaluateDiffPolicy(
      planWith({ unifiedDiff: diffOfChangedLines(DEFAULT_MAX_CHANGED_LINES + 1) }),
    );
    expect(measurement.changedLines).toBe(DEFAULT_MAX_CHANGED_LINES + 1);
    expect(measurement.withinPolicy).toBe(false);
  });

  it("fails a repair that touches more files than the allowlist permits", () => {
    const measurement = evaluateDiffPolicy(
      planWith({
        unifiedDiff: diffOfChangedLines(2),
        allowlist: ["a.json"],
        operations: [
          {
            issueId: "issue-1",
            file: "a.json",
            pointer: ["value"],
            before: 1,
            after: 2,
            reason: "test",
          },
          {
            issueId: "issue-2",
            file: "b.json",
            pointer: ["value"],
            before: 1,
            after: 2,
            reason: "test",
          },
        ],
      }),
    );
    expect(measurement.changedFiles).toBe(2);
    expect(measurement.maxChangedFiles).toBe(1);
    expect(measurement.withinPolicy).toBe(false);
  });

  it("honours a caller-supplied changed-line budget", () => {
    expect(
      evaluateDiffPolicy(planWith({ unifiedDiff: diffOfChangedLines(6) }), {
        maxChangedLines: 5,
      }).withinPolicy,
    ).toBe(false);
    expect(
      evaluateDiffPolicy(planWith({ unifiedDiff: diffOfChangedLines(6) }), {
        maxChangedLines: 6,
      }).withinPolicy,
    ).toBe(true);
  });
});
