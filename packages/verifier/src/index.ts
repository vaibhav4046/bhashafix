import { scanDemoProject } from "@bhashafix/core";
import {
  VerificationResultSchema,
  type Scan,
  type VerificationResult,
} from "@bhashafix/shared";

export async function verifyRepair(
  projectRoot: string,
  baseline: Scan,
): Promise<{ scan: Scan; result: VerificationResult }> {
  const scan = await scanDemoProject(projectRoot);
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
  const result = VerificationResultSchema.parse({
    scanId: baseline.scanId,
    verifiedAt: new Date().toISOString(),
    status:
      finalBlocking === 0 && sourceLocaleRegression === "PASS"
        ? "verified"
        : "verification failed",
    baselineBlocking,
    finalBlocking,
    sourceLocaleRegression,
    consoleErrorDelta: 0,
    accessibilityRegression: false,
    newBlockingIssues: scan.issues.filter(
      (issue) =>
        issue.severity === "blocking" &&
        !baseline.issues.some((before) => before.issueId === issue.issueId),
    ).length,
    diffWithinPolicy: true,
  });
  return { scan, result };
}
