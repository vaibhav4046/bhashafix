import { scanDemoProject } from "@bhashafix/core";
import {
  VerificationResultSchema,
  type RepairPlan,
  type Scan,
  type VerificationResult,
} from "@bhashafix/shared";

/**
 * Fields this code path structurally cannot measure: it replays deterministic
 * predicates against JSON state and never drives a browser, so there is no
 * console stream and no rendered accessibility tree to compare.
 */
const BROWSER_ONLY_FIELDS = [
  "consoleErrorDelta",
  "accessibilityRegression",
] as const;

export const DEFAULT_MAX_CHANGED_LINES = 200;

export type DiffPolicy = {
  /** Maximum added + removed lines the repair may contain. Defaults to 200. */
  maxChangedLines?: number;
  /** Maximum distinct files the repair may touch. Defaults to the allowlist size. */
  maxChangedFiles?: number;
};

export type DiffPolicyMeasurement = {
  changedLines: number;
  maxChangedLines: number;
  changedFiles: number;
  maxChangedFiles: number;
  withinPolicy: boolean;
};

export type VerifyRepairOptions = {
  /** The plan that produced the repair. Without it diffWithinPolicy is unmeasurable. */
  repairPlan?: RepairPlan;
  diffPolicy?: DiffPolicy;
};

/** Count added and removed lines in a unified diff, excluding the ---/+++ file headers. */
export function countChangedDiffLines(unifiedDiff: string) {
  return unifiedDiff
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") && !line.startsWith("+++")) ||
        (line.startsWith("-") && !line.startsWith("---")),
    ).length;
}

/** Measure the repair's real blast radius against the configured policy. */
export function evaluateDiffPolicy(
  plan: RepairPlan,
  policy: DiffPolicy = {},
): DiffPolicyMeasurement {
  const maxChangedLines = policy.maxChangedLines ?? DEFAULT_MAX_CHANGED_LINES;
  const maxChangedFiles = policy.maxChangedFiles ?? plan.allowlist.length;
  const changedFiles = new Set(plan.operations.map((operation) => operation.file))
    .size;
  const changedLines = countChangedDiffLines(plan.unifiedDiff);
  return {
    changedLines,
    maxChangedLines,
    changedFiles,
    maxChangedFiles,
    withinPolicy:
      changedLines <= maxChangedLines && changedFiles <= maxChangedFiles,
  };
}

export async function verifyRepair(
  projectRoot: string,
  baseline: Scan,
  options: VerifyRepairOptions = {},
): Promise<{
  scan: Scan;
  result: VerificationResult;
  diffPolicy: DiffPolicyMeasurement | null;
}> {
  const scan = await scanDemoProject(projectRoot, {
    mode: baseline.origin === "RECORDED_REPLAY" ? "replay" : "live",
    origin:
      baseline.origin === "RECORDED_REPLAY"
        ? "RECORDED_REPLAY"
        : baseline.origin === "LOCAL_REPOSITORY_SCAN"
          ? "LOCAL_REPOSITORY_SCAN"
          : "GUIDED_DEMO",
  });
  const baselineBlocking = baseline.issues.filter(
    (issue) => issue.severity === "blocking",
  ).length;
  const finalBlocking = scan.issues.filter(
    (issue) => issue.severity === "blocking",
  ).length;
  const sourceLocaleRegression = scan.issues.some(
    (issue) => issue.locale === baseline.config.sourceLocale,
  )
    ? "FAIL"
    : "PASS";
  const diffPolicy = options.repairPlan
    ? evaluateDiffPolicy(options.repairPlan, options.diffPolicy)
    : null;
  const notMeasured = [
    ...BROWSER_ONLY_FIELDS,
    ...(diffPolicy ? [] : ["diffWithinPolicy"]),
  ];
  const result = VerificationResultSchema.parse({
    scanId: baseline.scanId,
    verifiedAt: new Date().toISOString(),
    status:
      finalBlocking === 0 &&
      sourceLocaleRegression === "PASS" &&
      diffPolicy?.withinPolicy !== false
        ? "verified"
        : "verification failed",
    baselineBlocking,
    finalBlocking,
    sourceLocaleRegression,
    consoleErrorDelta: null,
    accessibilityRegression: null,
    newBlockingIssues: scan.issues.filter(
      (issue) =>
        issue.severity === "blocking" &&
        !baseline.issues.some((before) => before.issueId === issue.issueId),
    ).length,
    diffWithinPolicy: diffPolicy ? diffPolicy.withinPolicy : null,
    notMeasured,
  });
  return { scan, result, diffPolicy };
}
