/**
 * Schemas for the artifacts a BhashaFix run writes, used by the report import
 * console to validate a file the reviewer supplies.
 *
 * These mirror `packages/shared/src/index.ts`. They are restated here, rather
 * than imported, for two reasons: the console runs entirely in the browser, and
 * it must be able to explain *why* a file was rejected in the reviewer's terms.
 * Where the engine's own schema is narrower than the artifacts it actually
 * emits — a hosted HTTP preflight records `viewport: null`, `browser: "http"`
 * and a string `measuredEvidence` — the field is widened here so a genuine
 * artifact is never rejected. Nothing is defaulted into existence: a field the
 * artifact does not carry stays absent and is reported as absent.
 */

import { z } from "zod";

const ViewportSchema = z.object({
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type Viewport = z.infer<typeof ViewportSchema>;

const IssueSchema = z.object({
  issueId: z.string().min(1),
  scanId: z.string().min(1),
  origin: z.string().min(1),
  category: z.string().min(1),
  ruleId: z.string().min(1),
  severity: z.string().min(1),
  confidence: z.string().min(1),
  locale: z.string().min(2),
  route: z.string().min(1),
  viewport: ViewportSchema.nullable(),
  browser: z.string().min(1),
  selector: z.string().nullable().optional(),
  sourceHint: z.string().nullable().optional(),
  description: z.string().min(1),
  whyItMatters: z.string().min(1),
  evidence: z.record(z.unknown()).optional(),
  measuredEvidence: z
    .union([z.record(z.unknown()), z.string()])
    .nullable()
    .optional(),
  screenshotBefore: z.string().nullable().optional(),
  recommendedAction: z.string().min(1),
  deterministicPredicate: z.string().nullable().optional(),
  humanReviewRequired: z.boolean().optional(),
});

export type ImportedIssue = z.infer<typeof IssueSchema>;

const ScanConfigSchema = z.object({
  projectRoot: z.string().optional(),
  url: z.string().optional(),
  sourceLocale: z.string().min(2),
  locales: z.array(z.string().min(2)).min(1),
  routes: z.array(z.string()).min(1),
  viewports: z.array(ViewportSchema).min(1),
  browsers: z.array(z.string().min(1)).min(1),
  themes: z.array(z.string().min(1)).min(1),
  maxPages: z.number().optional(),
  maxDepth: z.number().optional(),
  rateLimitPerSecond: z.number().optional(),
  noAi: z.boolean().optional(),
  hosted: z.boolean().optional(),
  allowlist: z.array(z.string()).optional(),
});

const ScanSchema = z.object({
  scanId: z.string().min(1),
  origin: z.string().min(1),
  status: z.string().min(1),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1),
  config: ScanConfigSchema,
  issues: z.array(IssueSchema),
  routesDiscovered: z.array(z.string()),
  localesTested: z.array(z.string()),
  engineVersion: z.string().min(1),
  mode: z.string().min(1),
});

const VerificationSchema = z.object({
  scanId: z.string().min(1),
  verifiedAt: z.string().min(1),
  status: z.string().min(1),
  baselineBlocking: z.number().int().nonnegative(),
  finalBlocking: z.number().int().nonnegative(),
  sourceLocaleRegression: z.enum(["PASS", "FAIL"]),
  consoleErrorDelta: z.number().int().nullable(),
  accessibilityRegression: z.boolean().nullable(),
  newBlockingIssues: z.number().int().nonnegative(),
  diffWithinPolicy: z.boolean().nullable(),
  notMeasured: z.array(z.string()).optional(),
});

/** `repair-proof.json` — the capsule the replay and the MCP verify tool emit. */
const ProofCapsuleSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  origin: z.string().min(1),
  mode: z.string().min(1),
  baselineScanId: z.string().min(1),
  verificationScanId: z.string().min(1),
  baselineBlocking: z.number().int().nonnegative(),
  finalBlocking: z.number().int().nonnegative(),
  sourceLocaleRegression: z.enum(["PASS", "FAIL"]),
  consoleErrorDelta: z.number().int().nullable(),
  accessibilityRegression: z.boolean().nullable(),
  diffWithinPolicy: z.boolean().nullable(),
  status: z.string().min(1),
});

const RepairPlanSchema = z.object({
  scanId: z.string().min(1),
  createdAt: z.string().min(1),
  allowlist: z.array(z.string()).min(1),
  operations: z
    .array(
      z.object({
        issueId: z.string().min(1),
        file: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .min(1),
  unifiedDiff: z.string(),
});

/** The bounded HTTP scan this site's own /api/scan endpoint returns. */
const HostedScanSchema = z.object({
  scanId: z.string().min(1),
  origin: z.string().min(1),
  status: z.string().min(1),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1),
  target: z.string().min(1),
  sourceLocale: z.string().min(2),
  requestedLocales: z.array(z.string()),
  scope: z.object({
    maxRoutes: z.number(),
    crawlDepth: z.number(),
    browserRendered: z.boolean(),
    repositoryAccess: z.boolean(),
    authenticated: z.boolean(),
  }),
  summary: z.object({
    routesChecked: z.number(),
    stringsExtracted: z.number(),
    verifiedBlocking: z.number(),
    warnings: z.number(),
  }),
  routes: z.array(z.object({ route: z.string(), url: z.string() })),
  issues: z.array(IssueSchema),
  checksRun: z.array(z.string()),
  notRun: z.array(z.string()),
  limitations: z.array(z.string()),
});

const ReportBundleSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  claim: z.string().optional(),
  scan: z.unknown(),
  verification: z.unknown().optional(),
  limitations: z.array(z.string()).optional(),
});

/* ------------------------------------------------------------------ *
 * Normalised view model
 * ------------------------------------------------------------------ */

export type ArtifactKind =
  | "cli-report-bundle"
  | "cli-scan"
  | "hosted-preflight-scan"
  | "proof-capsule"
  | "repair-plan";

export type NormalisedVerification = {
  scanId: string | null;
  verifiedAt: string;
  status: string;
  baselineBlocking: number;
  finalBlocking: number;
  sourceLocaleRegression: "PASS" | "FAIL";
  consoleErrorDelta: number | null;
  accessibilityRegression: boolean | null;
  newBlockingIssues: number | null;
  diffWithinPolicy: boolean | null;
  notMeasured: string[];
};

export type NormalisedReport = {
  kind: ArtifactKind;
  /** What the file is, in the reviewer's words. */
  label: string;
  scanId: string | null;
  origin: string | null;
  status: string | null;
  target: string | null;
  sourceLocale: string | null;
  startedAt: string | null;
  completedAt: string | null;
  generatedAt: string | null;
  engineVersion: string | null;
  routes: string[];
  locales: string[];
  browsers: string[];
  viewports: Viewport[];
  themes: string[];
  /** Screenshot file names the artifact references, de-duplicated. */
  screenshotNames: string[];
  issues: ImportedIssue[];
  axeFindings: ImportedIssue[];
  runtimeFailures: ImportedIssue[];
  repair: {
    allowlist: string[];
    files: string[];
    unifiedDiff: string | null;
    operations: Array<{ issueId: string; file: string; reason: string }>;
  } | null;
  verification: NormalisedVerification | null;
  /** Things the artifact genuinely does not contain. Rendered as gaps. */
  absent: string[];
};

export type ImportOutcome =
  | { ok: true; report: NormalisedReport }
  | { ok: false; reason: string; details: string[] };

const ACCEPTED =
  "report.json, a CLI scan.json, a hosted preflight scan export, repair-proof.json, or a repair plan";

function issueDetails(error: z.ZodError): string[] {
  return error.issues.slice(0, 8).map((issue) => {
    const at = issue.path.length ? issue.path.join(".") : "(root)";
    return `${at}: ${issue.message}`;
  });
}

/**
 * `screenshotBefore` is recorded as an absolute path by the local browser
 * scanner and as a site-relative path by the demo fixtures. Only the file name
 * is carried forward: the console never resolves a path from an imported file,
 * and never renders the machine path a scan happened to run on.
 */
function screenshotName(value: string) {
  const parts = value.split(/[\\/]/);
  return parts[parts.length - 1] ?? value;
}

function collectScreenshots(issues: ImportedIssue[]) {
  const names = new Set<string>();
  for (const issue of issues) {
    if (issue.screenshotBefore) names.add(screenshotName(issue.screenshotBefore));
  }
  return [...names].sort();
}

function isAxeFinding(issue: ImportedIssue) {
  const rule = issue.ruleId.toUpperCase();
  const axeRule = (issue.evidence as { axeRule?: unknown } | undefined)?.axeRule;
  return rule.includes("AXE") || typeof axeRule === "string";
}

function normaliseVerification(
  value: z.infer<typeof VerificationSchema>,
): NormalisedVerification {
  return {
    scanId: value.scanId,
    verifiedAt: value.verifiedAt,
    status: value.status,
    baselineBlocking: value.baselineBlocking,
    finalBlocking: value.finalBlocking,
    sourceLocaleRegression: value.sourceLocaleRegression,
    consoleErrorDelta: value.consoleErrorDelta,
    accessibilityRegression: value.accessibilityRegression,
    newBlockingIssues: value.newBlockingIssues,
    diffWithinPolicy: value.diffWithinPolicy,
    notMeasured: value.notMeasured ?? [],
  };
}

function fromScan(
  scan: z.infer<typeof ScanSchema>,
  kind: ArtifactKind,
  label: string,
  extras: {
    generatedAt?: string | null;
    verification?: NormalisedVerification | null;
  } = {},
): NormalisedReport {
  const screenshotNames = collectScreenshots(scan.issues);
  const absent: string[] = [];
  if (screenshotNames.length === 0) {
    absent.push("No issue in this scan references a screenshot file.");
  }
  if (!extras.verification) {
    absent.push("This file carries no verification result.");
  }
  if (scan.issues.length === 0) {
    absent.push("This scan records no issues.");
  }
  return {
    kind,
    label,
    scanId: scan.scanId,
    origin: scan.origin,
    status: scan.status,
    target: scan.config.url ?? null,
    sourceLocale: scan.config.sourceLocale,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    generatedAt: extras.generatedAt ?? null,
    engineVersion: scan.engineVersion,
    routes: scan.routesDiscovered.length
      ? scan.routesDiscovered
      : scan.config.routes,
    locales: scan.localesTested.length ? scan.localesTested : scan.config.locales,
    browsers: scan.config.browsers,
    viewports: scan.config.viewports,
    themes: scan.config.themes,
    screenshotNames,
    issues: scan.issues,
    axeFindings: scan.issues.filter(isAxeFinding),
    runtimeFailures: scan.issues.filter((issue) => issue.category === "runtime"),
    repair: null,
    verification: extras.verification ?? null,
    absent,
  };
}

function fromHostedScan(
  scan: z.infer<typeof HostedScanSchema>,
  generatedAt: string | null,
): NormalisedReport {
  return {
    kind: "hosted-preflight-scan",
    label: "Hosted HTTP preflight export",
    scanId: scan.scanId,
    origin: scan.origin,
    status: scan.status,
    target: scan.target,
    sourceLocale: scan.sourceLocale,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    generatedAt,
    engineVersion: null,
    routes: scan.routes.map((route) => route.route),
    locales: [scan.sourceLocale, ...scan.requestedLocales],
    browsers: [],
    viewports: [],
    themes: [],
    screenshotNames: [],
    issues: scan.issues,
    axeFindings: scan.issues.filter(isAxeFinding),
    runtimeFailures: scan.issues.filter((issue) => issue.category === "runtime"),
    repair: null,
    verification: null,
    absent: [
      `No browser rendered this scan (scope.browserRendered = ${String(scan.scope.browserRendered)}), so it records no screenshot, no viewport and no axe run.`,
      "This file carries no verification result.",
      ...scan.notRun.map((entry) => `Not run: ${entry}`),
    ],
  };
}

/**
 * Validates a parsed JSON value. Dispatch is on structural markers so a
 * near-miss file is reported against the shape it was closest to, instead of a
 * union error listing every schema at once.
 */
export function readArtifact(value: unknown): ImportOutcome {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      reason: "The file does not contain a JSON object.",
      details: [`Accepted artifacts: ${ACCEPTED}.`],
    };
  }
  const record = value as Record<string, unknown>;

  if ("scan" in record && "schemaVersion" in record) {
    const bundle = ReportBundleSchema.safeParse(record);
    if (!bundle.success) {
      return {
        ok: false,
        reason:
          "This looks like a BhashaFix report bundle, but its envelope does not validate.",
        details: issueDetails(bundle.error),
      };
    }
    const hosted = HostedScanSchema.safeParse(bundle.data.scan);
    if (hosted.success) {
      const report = fromHostedScan(hosted.data, bundle.data.generatedAt);
      return { ok: true, report: { ...report, label: "Hosted HTTP preflight report bundle" } };
    }
    const scan = ScanSchema.safeParse(bundle.data.scan);
    if (!scan.success) {
      return {
        ok: false,
        reason:
          "The report bundle envelope is valid but its `scan` member is not a BhashaFix scan.",
        details: issueDetails(scan.error),
      };
    }
    let verification: NormalisedVerification | null = null;
    if (bundle.data.verification !== null && bundle.data.verification !== undefined) {
      const parsed = VerificationSchema.safeParse(bundle.data.verification);
      if (!parsed.success) {
        return {
          ok: false,
          reason:
            "The report bundle carries a `verification` member that is not a verification result.",
          details: issueDetails(parsed.error),
        };
      }
      verification = normaliseVerification(parsed.data);
    }
    return {
      ok: true,
      report: fromScan(scan.data, "cli-report-bundle", "CLI report bundle", {
        generatedAt: bundle.data.generatedAt,
        verification,
      }),
    };
  }

  if ("summary" in record && "scope" in record && "target" in record) {
    const hosted = HostedScanSchema.safeParse(record);
    if (!hosted.success) {
      return {
        ok: false,
        reason:
          "This looks like a hosted preflight scan, but it does not validate.",
        details: issueDetails(hosted.error),
      };
    }
    return { ok: true, report: fromHostedScan(hosted.data, null) };
  }

  if ("issues" in record && "config" in record) {
    const scan = ScanSchema.safeParse(record);
    if (!scan.success) {
      return {
        ok: false,
        reason: "This looks like a CLI scan.json, but it does not validate.",
        details: issueDetails(scan.error),
      };
    }
    return { ok: true, report: fromScan(scan.data, "cli-scan", "CLI scan") };
  }

  if ("operations" in record && "unifiedDiff" in record) {
    const plan = RepairPlanSchema.safeParse(record);
    if (!plan.success) {
      return {
        ok: false,
        reason: "This looks like a repair plan, but it does not validate.",
        details: issueDetails(plan.error),
      };
    }
    return {
      ok: true,
      report: {
        kind: "repair-plan",
        label: "Repair plan",
        scanId: plan.data.scanId,
        origin: null,
        status: null,
        target: null,
        sourceLocale: null,
        startedAt: null,
        completedAt: null,
        generatedAt: plan.data.createdAt,
        engineVersion: null,
        routes: [],
        locales: [],
        browsers: [],
        viewports: [],
        themes: [],
        screenshotNames: [],
        issues: [],
        axeFindings: [],
        runtimeFailures: [],
        repair: {
          allowlist: plan.data.allowlist,
          files: [...new Set(plan.data.operations.map((op) => op.file))],
          unifiedDiff: plan.data.unifiedDiff,
          operations: plan.data.operations,
        },
        verification: null,
        absent: [
          "A repair plan records the proposed change only. It carries no routes, locales, screenshots or verification.",
        ],
      },
    };
  }

  if ("finalBlocking" in record && "baselineBlocking" in record) {
    const capsule = ProofCapsuleSchema.safeParse(record);
    if (capsule.success) {
      return {
        ok: true,
        report: {
          kind: "proof-capsule",
          label: "Proof capsule",
          scanId: capsule.data.baselineScanId,
          origin: capsule.data.origin,
          status: capsule.data.status,
          target: null,
          sourceLocale: null,
          startedAt: null,
          completedAt: null,
          generatedAt: capsule.data.generatedAt,
          engineVersion: null,
          routes: [],
          locales: [],
          browsers: [],
          viewports: [],
          themes: [],
          screenshotNames: [],
          issues: [],
          axeFindings: [],
          runtimeFailures: [],
          repair: null,
          verification: {
            scanId: capsule.data.verificationScanId,
            verifiedAt: capsule.data.generatedAt,
            status: capsule.data.status,
            baselineBlocking: capsule.data.baselineBlocking,
            finalBlocking: capsule.data.finalBlocking,
            sourceLocaleRegression: capsule.data.sourceLocaleRegression,
            consoleErrorDelta: capsule.data.consoleErrorDelta,
            accessibilityRegression: capsule.data.accessibilityRegression,
            newBlockingIssues: null,
            diffWithinPolicy: capsule.data.diffWithinPolicy,
            notMeasured: [
              ...(capsule.data.consoleErrorDelta === null ? ["consoleErrorDelta"] : []),
              ...(capsule.data.accessibilityRegression === null
                ? ["accessibilityRegression"]
                : []),
              ...(capsule.data.diffWithinPolicy === null ? ["diffWithinPolicy"] : []),
            ],
          },
          absent: [
            "A proof capsule records the verification outcome only. It carries no issue list, no screenshots and no diff.",
          ],
        },
      };
    }
    const verification = VerificationSchema.safeParse(record);
    if (verification.success) {
      const normalised = normaliseVerification(verification.data);
      return {
        ok: true,
        report: {
          kind: "proof-capsule",
          label: "Verification result",
          scanId: verification.data.scanId,
          origin: null,
          status: verification.data.status,
          target: null,
          sourceLocale: null,
          startedAt: null,
          completedAt: null,
          generatedAt: verification.data.verifiedAt,
          engineVersion: null,
          routes: [],
          locales: [],
          browsers: [],
          viewports: [],
          themes: [],
          screenshotNames: [],
          issues: [],
          axeFindings: [],
          runtimeFailures: [],
          repair: null,
          verification: normalised,
          absent: [
            "A verification result records the outcome only. It carries no issue list, no screenshots and no diff.",
          ],
        },
      };
    }
    return {
      ok: false,
      reason:
        "This looks like a proof capsule, but it matches neither the capsule nor the verification-result shape.",
      details: issueDetails(capsule.error),
    };
  }

  return {
    ok: false,
    reason: "This JSON is not a BhashaFix artifact.",
    details: [
      `No recognised marker was found. Accepted artifacts: ${ACCEPTED}.`,
      `Top-level keys present: ${Object.keys(record).slice(0, 12).join(", ") || "(none)"}.`,
    ],
  };
}

/** Parses text and validates it. JSON syntax errors are reported verbatim. */
export function readArtifactText(text: string): ImportOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      reason: "The file is not valid JSON.",
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
  return readArtifact(parsed);
}
