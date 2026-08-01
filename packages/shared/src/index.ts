import { z } from "zod";

export const ScanOriginSchema = z.enum([
  // Rendered in a real browser against a public target.
  "LIVE_PUBLIC_BROWSER_SCAN",
  // Bounded static HTTP inspection. No browser, no layout, no axe.
  "HTTP_PREFLIGHT",
  // Retained so existing stored scans and artifacts still validate.
  "LIVE_PUBLIC_SCAN",
  "LOCAL_REPOSITORY_SCAN",
  "GUIDED_DEMO",
  "RECORDED_REPLAY",
  "SYNTHETIC_LOCALISATION_PREVIEW",
]);
export const ScanStatusSchema = z.enum([
  "draft",
  "queued",
  "validating",
  "discovering",
  "crawling",
  "extracting",
  "rendering",
  "checking",
  "analysing",
  "completed",
  "completed_with_warnings",
  "failed",
  "cancelled",
]);
export const IssueCategorySchema = z.enum([
  "visual",
  "locale",
  "linguistic",
  "accessibility",
  "runtime",
]);
export const SeveritySchema = z.enum([
  "blocking",
  "serious",
  "warning",
  "review",
  "advisory",
]);
export const ConfidenceSchema = z.enum([
  "verified",
  "high",
  "medium",
  "low",
  "human-review",
  "high confidence",
  "medium confidence",
  "low confidence",
  "human review required",
]);
export const VerificationStatusSchema = z.enum([
  "unverified",
  "verification failed",
  "verified with warnings",
  "verified",
  "human review required",
]);

export const ViewportSchema = z.object({
  name: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const IssueSchema = z.object({
  issueId: z.string().min(1),
  scanId: z.string().min(1),
  origin: ScanOriginSchema,
  category: IssueCategorySchema,
  ruleId: z.string().min(1),
  severity: SeveritySchema,
  confidence: ConfidenceSchema,
  locale: z.string().min(2),
  route: z.string().startsWith("/"),
  viewport: ViewportSchema,
  browser: z.enum(["chromium", "firefox", "webkit", "deterministic"]),
  selector: z.string().min(1).nullable(),
  sourceHint: z.string().min(1).nullable(),
  description: z.string().min(1),
  whyItMatters: z.string().min(1),
  evidence: z.record(z.unknown()),
  measuredEvidence: z.record(z.unknown()),
  screenshotBefore: z.string().nullable(),
  recommendedAction: z.string().min(1),
  deterministicPredicate: z.string().min(1).nullable(),
  sourceText: z.string().optional(),
  targetText: z.string().optional(),
  backTranslation: z.string().optional(),
  humanReviewRequired: z.boolean().default(false),
});

export const ScanConfigSchema = z.object({
  projectRoot: z.string().min(1),
  url: z.string().url().optional(),
  sourceLocale: z.string().min(2),
  locales: z.array(z.string().min(2)).min(1),
  routes: z.array(z.string().startsWith("/")).min(1),
  viewports: z.array(ViewportSchema).min(1),
  browsers: z.array(z.enum(["chromium", "firefox", "webkit"])).min(1),
  themes: z.array(z.enum(["light", "dark"])).min(1),
  maxPages: z.number().int().min(1).max(100).default(20),
  maxDepth: z.number().int().min(0).max(5).default(2),
  rateLimitPerSecond: z.number().positive().max(10).default(2),
  noAi: z.boolean().default(true),
  hosted: z.boolean().default(false),
  allowLocalhost: z.boolean().default(false),
  allowlist: z.array(z.string()).default([]),
});

export const ScanSchema = z.object({
  scanId: z.string().min(1),
  origin: ScanOriginSchema,
  status: ScanStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  config: ScanConfigSchema,
  issues: z.array(IssueSchema),
  routesDiscovered: z.array(z.string()),
  localesTested: z.array(z.string()),
  engineVersion: z.string(),
  mode: z.enum(["live", "replay"]),
});

export const RepairOperationSchema = z.object({
  issueId: z.string().min(1),
  file: z.string().min(1),
  pointer: z.array(z.string()).min(1),
  before: z.unknown(),
  after: z.unknown(),
  reason: z.string().min(1),
});

export const RepairPlanSchema = z.object({
  scanId: z.string().min(1),
  createdAt: z.string().datetime(),
  projectRoot: z.string().min(1),
  allowlist: z.array(z.string()).min(1),
  operations: z.array(RepairOperationSchema).min(1),
  unifiedDiff: z.string(),
});

export const VerificationResultSchema = z.object({
  scanId: z.string().min(1),
  verifiedAt: z.string().datetime(),
  status: VerificationStatusSchema,
  baselineBlocking: z.number().int().nonnegative(),
  finalBlocking: z.number().int().nonnegative(),
  sourceLocaleRegression: z.enum(["PASS", "FAIL"]),
  // `null` means the value was NOT measured on this code path. It is never a pass.
  // Any field that is null must also be listed in `notMeasured`.
  consoleErrorDelta: z.number().int().nullable(),
  accessibilityRegression: z.boolean().nullable(),
  newBlockingIssues: z.number().int().nonnegative(),
  diffWithinPolicy: z.boolean().nullable(),
  /** Names of the fields above that were not measured and must not be read as evidence. */
  notMeasured: z.array(z.string()).default([]),
});

export type Severity = z.infer<typeof SeveritySchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type ScanOrigin = z.infer<typeof ScanOriginSchema>;
export type ScanStatus = z.infer<typeof ScanStatusSchema>;
export type IssueCategory = z.infer<typeof IssueCategorySchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type ScanConfig = z.infer<typeof ScanConfigSchema>;
export type Scan = z.infer<typeof ScanSchema>;
export type RepairOperation = z.infer<typeof RepairOperationSchema>;
export type RepairPlan = z.infer<typeof RepairPlanSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const DEFAULT_VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

export const ENGINE_VERSION = "0.2.0";

const RULE_CATEGORIES: Record<string, IssueCategory> = {
  "vertical-clipping": "visual",
  "cta-overflow": "visual",
  "rtl-icon-order": "visual",
  "font-coverage": "visual",
  "line-breaking": "visual",
  "wrong-direction": "locale",
  "wrong-page-lang": "locale",
  "missing-page-lang": "locale",
  "wrong-page-direction": "locale",
  "raw-translation-key": "linguistic",
  "placeholder-mismatch": "linguistic",
  "glossary-violation": "linguistic",
  "missing-document-title": "accessibility",
  "missing-image-alt": "accessibility",
  "missing-accessible-name": "accessibility",
  "target-response-error": "runtime",
  "low-static-text-coverage": "runtime",
};

export function issueCategoryForRule(ruleId: string): IssueCategory {
  return RULE_CATEGORIES[ruleId] ?? "runtime";
}
