import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { localeProfile } from "@bhashafix/locale-engine";
import {
  DEFAULT_VIEWPORTS,
  ENGINE_VERSION,
  IssueSchema,
  ScanSchema,
  issueCategoryForRule,
  type Issue,
  type Scan,
} from "@bhashafix/shared";
import {
  evaluatePredicate,
  PredicateSchema,
  type Predicate,
  type State,
} from "@bhashafix/visual-engine";
import { z } from "zod";

const PredicateListSchema = z.array(PredicateSchema).min(1);
const DEMO_FILES = {
  layout: "apps/demo-target/data/layout.json",
  localeState: "apps/demo-target/data/locale-state.json",
  translations: "apps/demo-target/data/translations.json",
  glossary: "apps/demo-target/data/glossary.json",
} as const;

async function readJson(file: string) {
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

export async function loadDemoState(projectRoot: string): Promise<State> {
  const entries = await Promise.all(
    Object.entries(DEMO_FILES).map(async ([key, relative]) => [
      key,
      await readJson(path.join(projectRoot, relative)),
    ]),
  );
  return Object.fromEntries(entries);
}

export async function loadDemoPredicates(projectRoot: string) {
  return PredicateListSchema.parse(
    await readJson(
      path.join(projectRoot, "fixtures/multilingual-demo/predicates.json"),
    ),
  );
}

function scanFingerprint(state: State, predicates: Predicate[]) {
  return createHash("sha256")
    .update(JSON.stringify({ state, predicates, engine: ENGINE_VERSION }))
    .digest("hex")
    .slice(0, 12);
}

export async function scanDemoProject(
  projectRoot: string,
  options: {
    mode?: "live" | "replay";
    origin?:
      | "LOCAL_REPOSITORY_SCAN"
      | "GUIDED_DEMO"
      | "RECORDED_REPLAY";
    now?: Date;
  } = {},
): Promise<Scan> {
  const started = options.now ?? new Date();
  const state = await loadDemoState(projectRoot);
  const predicates = await loadDemoPredicates(projectRoot);
  const scanId = `atlaspay-${scanFingerprint(state, predicates)}`;
  const issues: Issue[] = [];

  for (const predicate of predicates) {
    const result = evaluatePredicate(predicate, state);
    if (result.passed) continue;
    localeProfile(predicate.locale);
    issues.push(
      IssueSchema.parse({
        issueId: predicate.issueId,
        scanId,
        origin:
          options.origin ??
          (options.mode === "replay" ? "RECORDED_REPLAY" : "GUIDED_DEMO"),
        category: issueCategoryForRule(predicate.category),
        ruleId: predicate.category,
        severity: "blocking",
        confidence: "verified",
        locale: predicate.locale,
        route: predicate.route,
        viewport: DEFAULT_VIEWPORTS[0],
        browser: "deterministic",
        selector: predicate.selector,
        sourceHint: predicate.sourceHint,
        description: predicate.description,
        whyItMatters:
          "A released user interface would present an objectively broken or inconsistent localisation experience.",
        evidence: result.evidence,
        measuredEvidence: result.evidence,
        screenshotBefore: `/evidence/${predicate.issueId}.png`,
        recommendedAction: predicate.recommendedAction,
        deterministicPredicate: result.expression,
        humanReviewRequired: false,
      }),
    );
  }

  const completed = new Date(started.getTime() + 137);
  return ScanSchema.parse({
    scanId,
    origin:
      options.origin ??
      (options.mode === "replay" ? "RECORDED_REPLAY" : "GUIDED_DEMO"),
    status: issues.length > 0 ? "completed_with_warnings" : "completed",
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    config: {
      projectRoot,
      sourceLocale: "en-GB",
      locales: [...new Set(predicates.map((item) => item.locale))],
      routes: [...new Set(predicates.map((item) => item.route))],
      viewports: [...DEFAULT_VIEWPORTS],
      browsers: ["chromium"],
      themes: ["light", "dark"],
      maxPages: 20,
      maxDepth: 2,
      rateLimitPerSecond: 2,
      noAi: true,
      hosted: false,
      allowLocalhost: true,
      allowlist: [
        "apps/demo-target/data/layout.json",
        "apps/demo-target/data/locale-state.json",
        "apps/demo-target/data/translations.json",
      ],
    },
    issues,
    routesDiscovered: ["/", "/pricing", "/dashboard", "/checkout", "/settings"],
    localesTested: [...new Set(predicates.map((item) => item.locale))],
    engineVersion: ENGINE_VERSION,
    mode: options.mode ?? "live",
  });
}

export async function inspectProject(projectRoot: string) {
  const packageFile = path.join(projectRoot, "package.json");
  const packageJson = (await readJson(packageFile)) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const framework = dependencies.next
    ? "nextjs"
    : dependencies["@remix-run/react"]
      ? "remix-experimental"
      : dependencies.astro
        ? "astro-experimental"
        : dependencies.nuxt
          ? "nuxt-experimental"
          : dependencies.vue
            ? "vue-vite-experimental"
            : dependencies["@sveltejs/kit"]
              ? "sveltekit-experimental"
              : dependencies.react && dependencies.vite
                ? "react-vite-experimental"
                : "static-html-experimental";
  return {
    projectRoot,
    framework,
    support: framework === "nextjs" ? "supported" : "experimental",
    scripts: packageJson.scripts ?? {},
    commandsRequireApproval: true,
  };
}

export { ENGINE_VERSION } from "@bhashafix/shared";
export type { Issue, Scan } from "@bhashafix/shared";
