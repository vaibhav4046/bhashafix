import { createHash, randomUUID } from "node:crypto";
import {
  deduplicateStrings,
  extractTextFromHtml,
} from "@bhashafix/extractor";
import { localeProfile } from "@bhashafix/locale-engine";
import {
  issueCategoryForRule,
  type IssueCategory,
} from "@bhashafix/shared";
import { fetchWithPolicy } from "./policy";

type FetchResult = Awaited<ReturnType<typeof fetchWithPolicy>>;
type PolicyFetcher = (
  input: string,
  policy: Parameters<typeof fetchWithPolicy>[1],
) => Promise<FetchResult>;

export type HostedHttpScanInput = {
  url: string;
  sourceLocale: string;
  locales: string[];
  maxRoutes?: number;
};

export type HostedScanIssue = {
  issueId: string;
  scanId: string;
  origin: "LIVE_PUBLIC_SCAN";
  category: IssueCategory;
  ruleId:
    | "missing-page-lang"
    | "wrong-page-lang"
    | "wrong-page-direction"
    | "raw-translation-key"
    | "missing-document-title"
    | "missing-image-alt"
    | "target-response-error"
    | "low-static-text-coverage";
  severity: "blocking" | "warning";
  confidence: "verified";
  locale: string;
  route: string;
  viewport: null;
  browser: "http";
  selector: string | null;
  description: string;
  whyItMatters: string;
  evidence: Record<string, unknown>;
  measuredEvidence: string;
  screenshotBefore: null;
  sourceHint: null;
  recommendedAction: string;
  deterministicPredicate: string;
};

export type HostedScanRoute = {
  url: string;
  route: string;
  status: number;
  contentType: string;
  strings: number;
  declaredLang: string | null;
  declaredDir: "ltr" | "rtl" | null;
  title: string | null;
  issueCount: number;
};

export type HostedHttpScanResult = {
  scanId: string;
  origin: "LIVE_PUBLIC_SCAN";
  status: "completed" | "completed_with_warnings";
  mode: "live hosted HTTP scan";
  startedAt: string;
  completedAt: string;
  target: string;
  sourceLocale: string;
  requestedLocales: string[];
  scope: {
    maxRoutes: number;
    crawlDepth: 1;
    browserRendered: false;
    repositoryAccess: false;
    authenticated: false;
  };
  summary: {
    routesChecked: number;
    stringsExtracted: number;
    verifiedBlocking: number;
    warnings: number;
  };
  routes: HostedScanRoute[];
  issues: HostedScanIssue[];
  robots: {
    checked: boolean;
    policyUrl: string;
    skippedRoutes: number;
  };
  checksRun: string[];
  notRun: string[];
  limitations: string[];
};

const RAW_TRANSLATION_KEY =
  /^(?:[a-z][a-z0-9_]*\.){1,}[a-z][a-z0-9_]*$/;
const ASSET_EXTENSION =
  /\.(?:avif|bmp|css|csv|docx?|gif|ico|jpe?g|js|json|mp4|pdf|png|svg|txt|webm|webp|xlsx?|xml|zip)$/i;

function decodeAttribute(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function looksLikeRawTranslationKey(value: string) {
  if (!RAW_TRANSLATION_KEY.test(value)) return false;
  const segments = value.split(".");
  // Hosted evidence should be conservative: dotted brands and domains such as
  // Mozilla.ai are more common than two-segment keys without a key marker.
  return value.includes("_") || segments.length >= 3;
}

function normaliseDiscoveredUrl(value: URL) {
  value.hash = "";
  for (const key of [...value.searchParams.keys()]) {
    if (
      key.toLowerCase().startsWith("utm_") ||
      ["gclid", "fbclid", "ref", "source"].includes(key.toLowerCase())
    ) {
      value.searchParams.delete(key);
    }
  }
  return value;
}

export function discoverInternalUrls(
  html: string,
  baseUrl: string,
  maximum = 20,
) {
  const base = new URL(baseUrl);
  const discovered: string[] = [];
  const seen = new Set<string>();
  const hrefPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) && discovered.length < maximum) {
    const rawHref = decodeAttribute(match[2].trim());
    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      /^(?:data|javascript|mailto|tel):/i.test(rawHref)
    ) {
      continue;
    }
    let candidate: URL;
    try {
      candidate = normaliseDiscoveredUrl(new URL(rawHref, base));
    } catch {
      continue;
    }
    if (
      candidate.origin !== base.origin ||
      !["http:", "https:"].includes(candidate.protocol) ||
      ASSET_EXTENSION.test(candidate.pathname)
    ) {
      continue;
    }
    const href = candidate.href;
    if (href === base.href || seen.has(href)) continue;
    seen.add(href);
    discovered.push(href);
  }
  return discovered;
}

type RobotsRule = { allow: boolean; path: string };

export function robotsAllowsPath(robotsText: string, pathname: string) {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;
  let rulesStarted = false;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || rulesStarted) {
        current = { agents: [], rules: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (
      current &&
      (field === "allow" || field === "disallow") &&
      value
    ) {
      current.rules.push({ allow: field === "allow", path: value });
      rulesStarted = true;
    }
  }

  const specific = groups.filter((group) =>
    group.agents.some((agent) => agent === "bhashafix"),
  );
  const applicable =
    specific.length > 0
      ? specific
      : groups.filter((group) =>
          group.agents.some((agent) => agent === "*"),
        );
  const matches = applicable
    .flatMap((group) => group.rules)
    .filter((rule) => pathname.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length);
  return matches[0]?.allow ?? true;
}

function htmlAttribute(
  html: string,
  element: string,
  attribute: string,
): string | null {
  const openTag = html.match(new RegExp(`<${element}\\b[^>]*>`, "i"))?.[0];
  if (!openTag) return null;
  return (
    openTag.match(
      new RegExp(`\\s${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i"),
    )?.[2]?.trim() ?? null
  );
}

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function issueId(url: string, category: string, selector: string, evidence: string) {
  return `web_${createHash("sha256")
    .update(`${url}\0${category}\0${selector}\0${evidence}`)
    .digest("hex")
    .slice(0, 14)}`;
}

function createIssue(
  scanId: string,
  url: string,
  sourceLocale: string,
  input: Omit<
    HostedScanIssue,
    | "issueId"
    | "scanId"
    | "origin"
    | "category"
    | "confidence"
    | "locale"
    | "viewport"
    | "browser"
    | "evidence"
    | "screenshotBefore"
    | "sourceHint"
  >,
): HostedScanIssue {
  return {
    issueId: issueId(
      url,
      input.ruleId,
      input.selector ?? "document",
      input.measuredEvidence,
    ),
    scanId,
    origin: "LIVE_PUBLIC_SCAN",
    category: issueCategoryForRule(input.ruleId),
    confidence: "verified",
    locale: sourceLocale,
    viewport: null,
    browser: "http",
    evidence: { measurement: input.measuredEvidence },
    screenshotBefore: null,
    sourceHint: null,
    ...input,
  };
}

function analyseHtml(
  scanId: string,
  fetched: FetchResult,
  sourceLocale: string,
): { route: HostedScanRoute; issues: HostedScanIssue[] } {
  const url = new URL(fetched.url);
  const routeName = `${url.pathname || "/"}${url.search}`;
  const strings = deduplicateStrings(
    extractTextFromHtml(fetched.body, routeName),
  );
  const declaredLang = htmlAttribute(fetched.body, "html", "lang");
  const declaredDirValue = htmlAttribute(fetched.body, "html", "dir")?.toLowerCase();
  const declaredDir =
    declaredDirValue === "ltr" || declaredDirValue === "rtl"
      ? declaredDirValue
      : null;
  const titleText = fetched.body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = titleText ? plainText(titleText) : null;
  const issues: HostedScanIssue[] = [];
  const expected = localeProfile(sourceLocale);

  if (fetched.status >= 400) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "target-response-error",
        severity: "blocking",
        route: routeName,
        selector: "document",
        description: `The route returned HTTP ${fetched.status}.`,
        whyItMatters: "Users cannot access the localised route.",
        measuredEvidence: `status=${fetched.status}`,
        recommendedAction: "Restore a successful HTML response for the route.",
        deterministicPredicate: "response.status < 400",
      }),
    );
  }

  if (!declaredLang) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "missing-page-lang",
        severity: "blocking",
        route: routeName,
        selector: "html",
        description: "The document does not declare an HTML language.",
        whyItMatters:
          "Assistive technology and browsers cannot reliably determine the page language.",
        measuredEvidence: `expected language compatible with ${expected.canonical}; lang is missing`,
        recommendedAction: `Set the document lang attribute to ${expected.canonical}.`,
        deterministicPredicate: "html[lang] exists",
      }),
    );
  } else {
    let declaredLanguage: string | null = null;
    try {
      declaredLanguage = localeProfile(declaredLang).language;
    } catch {
      declaredLanguage = null;
    }
    if (declaredLanguage !== expected.language) {
      issues.push(
        createIssue(scanId, fetched.url, sourceLocale, {
          ruleId: "wrong-page-lang",
          severity: "blocking",
          route: routeName,
          selector: "html",
          description: "The declared page language conflicts with the configured source locale.",
          whyItMatters:
            "Screen readers and locale-aware browser behavior may use the wrong language.",
          measuredEvidence: `expected language=${expected.language}; declared=${declaredLang}`,
          recommendedAction: `Set the document lang attribute to ${expected.canonical}.`,
          deterministicPredicate:
            "Intl.Locale(html.lang).language === Intl.Locale(sourceLocale).language",
        }),
      );
    }
  }

  if (
    declaredDir !== null &&
    declaredDir !== expected.direction
  ) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "wrong-page-direction",
        severity: "blocking",
        route: routeName,
        selector: "html",
        description: "The document direction conflicts with the configured source locale.",
        whyItMatters:
          "Reading order, navigation placement and mixed-direction content can become confusing.",
        measuredEvidence: `expected dir=${expected.direction}; declared=${declaredDir}`,
        recommendedAction: `Set document direction to ${expected.direction}.`,
        deterministicPredicate: "html.dir === locale.direction",
      }),
    );
  } else if (expected.direction === "rtl" && declaredDir === null) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "wrong-page-direction",
        severity: "blocking",
        route: routeName,
        selector: "html",
        description: "The RTL source locale requires an explicit document direction.",
        whyItMatters:
          "The page can render in an incorrect reading and navigation order.",
        measuredEvidence: `expected dir=rtl; dir is missing`,
        recommendedAction: "Set dir=\"rtl\" on the document root.",
        deterministicPredicate: "html.dir === 'rtl'",
      }),
    );
  }

  for (const item of strings.filter((item) =>
    looksLikeRawTranslationKey(item.text),
  )) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "raw-translation-key",
        severity: "blocking",
        route: routeName,
        selector: item.selector,
        description: "A translation key is visible to the user.",
        whyItMatters:
          "Users see internal implementation text instead of usable product copy.",
        measuredEvidence: `visible text=${item.text}`,
        recommendedAction: "Provide a visible translation for this key.",
        deterministicPredicate: "visibleText does not match rawTranslationKey",
      }),
    );
  }

  if (!title) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "missing-document-title",
        severity: "warning",
        route: routeName,
        selector: "head > title",
        description: "The route has no non-empty document title.",
        whyItMatters:
          "Browser tabs and assistive navigation cannot identify the page reliably.",
        measuredEvidence: "title is missing or empty",
        recommendedAction: "Add a concise localised document title.",
        deterministicPredicate: "document.title.trim().length > 0",
      }),
    );
  }

  const missingAltCount = [
    ...fetched.body.matchAll(/<img\b[^>]*>/gi),
  ].filter((match) => !/\salt\s*=/i.test(match[0])).length;
  if (missingAltCount > 0) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "missing-image-alt",
        severity: "warning",
        route: routeName,
        selector: "img:not([alt])",
        description: `${missingAltCount} image${missingAltCount === 1 ? "" : "s"} omit the alt attribute.`,
        whyItMatters:
          "Screen-reader users may miss meaningful image content or hear an unhelpful file name.",
        measuredEvidence: `img_without_alt=${missingAltCount}`,
        recommendedAction:
          "Add localised alternative text, or an empty alt attribute for decorative images.",
        deterministicPredicate: "every img has an alt attribute",
      }),
    );
  }

  if (strings.length < 3 && /<script\b/i.test(fetched.body)) {
    issues.push(
      createIssue(scanId, fetched.url, sourceLocale, {
        ruleId: "low-static-text-coverage",
        severity: "warning",
        route: routeName,
        selector: "document",
        description:
          "Very little static text was available; a JavaScript-rendered browser scan is required for dependable coverage.",
        whyItMatters:
          "A static response cannot provide enough evidence to judge the rendered product.",
        measuredEvidence: `static_visible_strings=${strings.length}`,
        recommendedAction:
          "Run the local browser scanner or a configured browser-capable worker.",
        deterministicPredicate: "staticVisibleStrings >= 3",
      }),
    );
  }

  return {
    route: {
      url: fetched.url,
      route: routeName,
      status: fetched.status,
      contentType: fetched.contentType,
      strings: strings.length,
      declaredLang,
      declaredDir,
      title,
      issueCount: issues.length,
    },
    issues,
  };
}

export async function runHostedHttpScan(
  input: HostedHttpScanInput,
  fetchPage: PolicyFetcher = fetchWithPolicy,
): Promise<HostedHttpScanResult> {
  const started = new Date();
  const scanId = `web-${randomUUID()}`;
  const sourceLocale = localeProfile(input.sourceLocale).canonical;
  const requestedLocales = input.locales.map(
    (locale) => localeProfile(locale).canonical,
  );
  const maxRoutes = Math.max(1, Math.min(input.maxRoutes ?? 5, 5));
  const policy = {
    hosted: true,
    allowLocalhost: false,
    timeoutMs: 8_000,
    redirectLimit: 4,
    maxBytes: 1_500_000,
  } as const;

  const entry = await fetchPage(input.url, policy);
  if (entry.status === 401 || entry.status === 403) {
    throw new Error(
      "The target requires authentication or blocks automation. Use local CLI storage state when authorised.",
    );
  }
  if (
    !entry.contentType.toLowerCase().includes("text/html") &&
    !/(?:<!doctype\s+html|<html\b)/i.test(entry.body)
  ) {
    throw new Error(
      `The target did not return an HTML document (content-type: ${entry.contentType || "missing"}).`,
    );
  }

  const origin = new URL(entry.url).origin;
  const robotsUrl = new URL("/robots.txt", origin).href;
  let robotsText = "";
  let robotsChecked = false;
  try {
    const robots = await fetchPage(robotsUrl, {
      ...policy,
      timeoutMs: 4_000,
      maxBytes: 100_000,
    });
    if (robots.status >= 200 && robots.status < 300) {
      robotsText = robots.body;
      robotsChecked = true;
    }
  } catch {
    // An unavailable robots file does not turn a user-requested entry fetch into
    // fabricated coverage. Discovered routes still remain same-origin and bounded.
  }

  const queue = [entry.url, ...discoverInternalUrls(entry.body, entry.url, 24)];
  const seen = new Set<string>();
  const pages: FetchResult[] = [];
  let skippedRoutes = 0;

  while (queue.length > 0 && pages.length < maxRoutes) {
    const candidate = queue.shift();
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    const candidateUrl = new URL(candidate);
    if (
      candidateUrl.origin !== origin ||
      (robotsChecked &&
        candidate !== entry.url &&
        !robotsAllowsPath(robotsText, candidateUrl.pathname))
    ) {
      if (candidateUrl.origin === origin) skippedRoutes += 1;
      continue;
    }
    const fetched =
      candidate === entry.url ? entry : await fetchPage(candidate, policy);
    if (
      !fetched.contentType.toLowerCase().includes("text/html") &&
      !/(?:<!doctype\s+html|<html\b)/i.test(fetched.body)
    ) {
      continue;
    }
    pages.push(fetched);
  }

  const analysed = pages.map((page) => analyseHtml(scanId, page, sourceLocale));
  const routes = analysed.map((item) => item.route);
  const issues = analysed.flatMap((item) => item.issues);
  const completed = new Date();

  return {
    scanId,
    origin: "LIVE_PUBLIC_SCAN",
    status: issues.length > 0 ? "completed_with_warnings" : "completed",
    mode: "live hosted HTTP scan",
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    target: entry.url,
    sourceLocale,
    requestedLocales,
    scope: {
      maxRoutes,
      crawlDepth: 1,
      browserRendered: false,
      repositoryAccess: false,
      authenticated: false,
    },
    summary: {
      routesChecked: routes.length,
      stringsExtracted: routes.reduce((total, route) => total + route.strings, 0),
      verifiedBlocking: issues.filter((issue) => issue.severity === "blocking")
        .length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
    routes,
    issues,
    robots: {
      checked: robotsChecked,
      policyUrl: robotsUrl,
      skippedRoutes,
    },
    checksRun: [
      "SSRF, DNS and redirect validation",
      "same-origin internal-link discovery",
      "robots policy for discovered routes when available",
      "HTTP status and HTML response limits",
      "visible static text extraction with secret redaction",
      "HTML language and writing direction",
      "raw translation keys",
      "document title and image alt attributes",
    ],
    notRun: [
      "JavaScript browser rendering",
      "visual overflow, clipping or overlap",
      "axe accessibility execution",
      "authenticated routes",
      "translation generation or linguistic preference scoring",
      "repository repair or source verification",
    ],
    limitations: [
      `This hosted scan checked ${routes.length} real HTML route${routes.length === 1 ? "" : "s"} up to a hard limit of ${maxRoutes}.`,
      "Requested target locales are recorded for the next local browser run; they are not claimed as tested by this HTTP-only scan.",
      "Run the local CLI for Playwright screenshots, target-locale stress, accessibility and bounded repair.",
    ],
  };
}
