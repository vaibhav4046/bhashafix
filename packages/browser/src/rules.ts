import { createHash } from "node:crypto";
import { isValidLocaleTag, localeProfile } from "@bhashafix/locale-engine";
import type { Issue, ScanOrigin, Severity } from "@bhashafix/shared";
import {
  detectElementOverflow,
  detectViewportOverflow,
} from "@bhashafix/visual-engine";
import type { ElementMeasurement, PageMeasurement } from "./measure.js";

export type RuleContext = {
  scanId: string;
  origin: ScanOrigin;
  route: string;
  locale: string;
  viewport: { name: string; width: number; height: number };
  browser: "chromium" | "firefox" | "webkit";
  target: string;
  screenshotRef: string | null;
  sourceHint?: string | null;
};

export type RuntimeSignals = {
  status: number;
  consoleErrors: string[];
  failedRequests: Array<{ url: string; failure: string }>;
  axeViolations: Array<{
    id: string;
    impact: string | null;
    help: string;
    nodes: string[];
  }>;
};

/** Text that looks like an untranslated i18n key, e.g. `checkout.cta.primary`. */
const RAW_KEY = /^(?:[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*\.){1,}[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
/**
 * Dotted text that is legitimately user-facing. Without these guards the rule
 * fires on usernames (`a.okafor`), hostnames and filenames, which was the only
 * source of false positives in the ground-truth benchmark.
 */
const NON_KEY_TRAILING_SEGMENTS = new Set([
  "app", "co", "com", "dev", "example", "invalid", "io", "local", "net", "org",
  "test", "uk", "css", "csv", "html", "jpeg", "jpg", "js", "json", "jsx", "md",
  "pdf", "png", "svg", "ts", "tsx", "txt", "webp", "xml", "yaml", "yml", "zip",
]);

function looksLikeTranslationKey(text: string): boolean {
  if (!RAW_KEY.test(text)) return false;
  const segments = text.split(".");
  // Initials and abbreviations ("a.okafor", "J.R.R") are names, not keys.
  if (segments.some((segment) => segment.length < 2)) return false;
  const last = segments.at(-1)?.toLowerCase() ?? "";
  return !NON_KEY_TRAILING_SEGMENTS.has(last);
}
/** Scrollable containers legitimately exceed their client box. */
const SCROLLABLE = new Set(["auto", "scroll", "overlay"]);
const OVERFLOW_TOLERANCE_PX = 2;
/**
 * Screen-reader-only text uses a 1px clipped box on purpose. Such an element
 * always "overflows", but nothing is being hidden from a sighted user, so a
 * box this small cannot evidence a layout failure. Found by scanning
 * en.wikipedia.org, where this pattern produced 64 false positives.
 */
const MIN_VISIBLE_BOX_PX = 8;

function presentsTextVisually(element: ElementMeasurement): boolean {
  return (
    element.clientWidth >= MIN_VISIBLE_BOX_PX &&
    element.clientHeight >= MIN_VISIBLE_BOX_PX
  );
}

export function stableIssueId(parts: {
  target: string;
  route: string;
  locale: string;
  ruleId: string;
  selector: string | null;
  viewport: string;
}): string {
  return createHash("sha256")
    .update(
      [
        parts.target,
        parts.route,
        parts.locale,
        parts.ruleId,
        parts.selector ?? "-",
        parts.viewport,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

function build(
  context: RuleContext,
  input: {
    ruleId: string;
    category: Issue["category"];
    severity: Severity;
    selector: string | null;
    description: string;
    whyItMatters: string;
    evidence: Record<string, unknown>;
    recommendedAction: string;
    predicate: string;
    confidence?: Issue["confidence"];
    humanReviewRequired?: boolean;
  },
): Issue {
  return {
    issueId: stableIssueId({
      target: context.target,
      route: context.route,
      locale: context.locale,
      ruleId: input.ruleId,
      selector: input.selector,
      viewport: context.viewport.name,
    }),
    scanId: context.scanId,
    origin: context.origin,
    category: input.category,
    ruleId: input.ruleId,
    severity: input.severity,
    confidence: input.confidence ?? "verified",
    locale: context.locale,
    route: context.route,
    viewport: context.viewport,
    browser: context.browser,
    selector: input.selector,
    sourceHint: context.sourceHint ?? null,
    description: input.description,
    whyItMatters: input.whyItMatters,
    evidence: input.evidence,
    measuredEvidence: input.evidence,
    screenshotBefore: context.screenshotRef,
    recommendedAction: input.recommendedAction,
    deterministicPredicate: input.predicate,
    humanReviewRequired: input.humanReviewRequired ?? false,
  };
}

function localeRules(page: PageMeasurement, context: RuleContext): Issue[] {
  const issues: Issue[] = [];
  const declared = page.lang.trim();

  if (!declared) {
    issues.push(
      build(context, {
        ruleId: "BF-LOC-LANG-MISSING",
        category: "locale",
        severity: "blocking",
        selector: "html",
        description: "The document declares no language.",
        whyItMatters:
          "Screen readers, translation tooling and locale formatting fall back to the browser default instead of the page language.",
        evidence: { declaredLang: "", expectedLocale: context.locale },
        recommendedAction: `Set <html lang="${context.locale}">.`,
        predicate: "document.documentElement.lang !== ''",
      }),
    );
  } else if (!isValidLocaleTag(declared)) {
    issues.push(
      build(context, {
        ruleId: "BF-LOC-LANG-INVALID",
        category: "locale",
        severity: "blocking",
        selector: "html",
        description: `The declared language "${declared}" is not a valid BCP 47 tag.`,
        whyItMatters:
          "Invalid tags are ignored by assistive technology and locale-aware formatting.",
        evidence: { declaredLang: declared },
        recommendedAction: `Replace it with a canonical tag such as ${context.locale}.`,
        predicate: "Intl.getCanonicalLocales(document.documentElement.lang).length === 1",
      }),
    );
  } else {
    const expected = localeProfile(context.locale);
    const actual = localeProfile(declared);
    if (actual.language !== expected.language) {
      issues.push(
        build(context, {
          ruleId: "BF-LOC-LANG-MISMATCH",
          category: "locale",
          severity: "blocking",
          selector: "html",
          description: `The page was requested as ${context.locale} but declares ${declared}.`,
          whyItMatters:
            "The served document is not the language the user asked for, so the localisation was not applied.",
          evidence: {
            declaredLang: declared,
            requestedLocale: context.locale,
            declaredLanguage: actual.language,
            expectedLanguage: expected.language,
          },
          recommendedAction: `Serve the ${context.locale} document or correct the lang attribute.`,
          predicate: "primarySubtag(document.documentElement.lang) === primarySubtag(requestedLocale)",
        }),
      );
    }
  }

  const expectedDirection = localeProfile(context.locale).direction;
  const declaredDirection = (page.dir || "").toLowerCase();
  if (expectedDirection === "rtl" && declaredDirection !== "rtl") {
    issues.push(
      build(context, {
        ruleId: "BF-LOC-DIR-MISSING",
        category: "locale",
        severity: "blocking",
        selector: "html",
        description: `${context.locale} is a right-to-left locale but the document direction is "${declaredDirection || "unset"}".`,
        whyItMatters:
          "Reading order, alignment and navigation controls are mirrored incorrectly for right-to-left readers.",
        evidence: {
          declaredDir: declaredDirection || null,
          expectedDir: "rtl",
          script: localeProfile(context.locale).script,
        },
        recommendedAction: 'Set <html dir="rtl"> for right-to-left locales.',
        predicate: "document.documentElement.dir === 'rtl' when locale script is RTL",
      }),
    );
  }

  for (const alternate of page.hreflang) {
    if (alternate.hreflang && alternate.hreflang !== "x-default" && !isValidLocaleTag(alternate.hreflang)) {
      issues.push(
        build(context, {
          ruleId: "BF-LOC-HREFLANG-INVALID",
          category: "locale",
          severity: "warning",
          selector: `link[hreflang="${alternate.hreflang}"]`,
          description: `An alternate link declares the invalid hreflang "${alternate.hreflang}".`,
          whyItMatters:
            "Search engines and language switchers ignore alternates they cannot parse.",
          evidence: alternate as unknown as Record<string, unknown>,
          recommendedAction: "Use a canonical BCP 47 tag or x-default.",
          predicate: "isValidLocaleTag(link[hreflang])",
        }),
      );
    }
  }

  return issues;
}

function visualRules(page: PageMeasurement, context: RuleContext): Issue[] {
  const issues: Issue[] = [];
  const viewport = detectViewportOverflow(
    page.documentScrollWidth,
    page.viewportWidth,
  );
  if (viewport.overflow) {
    issues.push(
      build(context, {
        ruleId: "BF-VIS-VIEWPORT-OVERFLOW",
        category: "visual",
        severity: "blocking",
        selector: "html",
        description: `The page scrolls horizontally by ${viewport.delta}px at ${context.viewport.width}px wide.`,
        whyItMatters:
          "Horizontal scrolling on a translated page usually means expanded text has pushed the layout past the viewport.",
        evidence: {
          documentScrollWidth: page.documentScrollWidth,
          viewportWidth: page.viewportWidth,
          overflowPx: viewport.delta,
        },
        recommendedAction:
          "Allow the expanded text to wrap, or constrain the widest element to the viewport.",
        predicate: "document.documentElement.scrollWidth <= window.innerWidth + 1",
      }),
    );
  }

  for (const element of page.elements) {
    if (!element.text) continue;
    if (!presentsTextVisually(element)) continue;
    const overflow = detectElementOverflow({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowX: element.overflowX,
      overflowY: element.overflowY,
    });

    const horizontalClipped =
      element.scrollWidth > element.clientWidth + OVERFLOW_TOLERANCE_PX &&
      !SCROLLABLE.has(element.overflowX);
    if (horizontalClipped) {
      issues.push(
        build(context, {
          ruleId: "BF-VIS-TEXT-OVERFLOW-X",
          category: "visual",
          severity: overflow.clipsHorizontally ? "blocking" : "serious",
          selector: element.selector,
          description: `"${element.text.slice(0, 60)}" is ${element.scrollWidth - element.clientWidth}px wider than its box.`,
          whyItMatters: overflow.clipsHorizontally
            ? "The overflow is clipped, so part of the translated text is unreadable."
            : "The translated text escapes its container and collides with the surrounding layout.",
          evidence: {
            text: element.text,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            overflowPx: element.scrollWidth - element.clientWidth,
            overflowX: element.overflowX,
            whiteSpace: element.whiteSpace,
            clipped: overflow.clipsHorizontally,
          },
          recommendedAction:
            element.whiteSpace === "nowrap"
              ? "Remove white-space: nowrap or allow the element to grow."
              : "Remove the fixed width or allow the text to wrap.",
          predicate: "element.scrollWidth <= element.clientWidth + 2",
        }),
      );
    }

    if (
      element.scrollHeight > element.clientHeight + OVERFLOW_TOLERANCE_PX &&
      !SCROLLABLE.has(element.overflowY) &&
      overflow.clipsVertically
    ) {
      issues.push(
        build(context, {
          ruleId: "BF-VIS-TEXT-CLIP-Y",
          category: "visual",
          severity: "blocking",
          selector: element.selector,
          description: `"${element.text.slice(0, 60)}" is vertically clipped by ${element.scrollHeight - element.clientHeight}px.`,
          whyItMatters:
            "A fixed height hides the lower part of the translated text, which taller scripts need.",
          evidence: {
            text: element.text,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            overflowPx: element.scrollHeight - element.clientHeight,
            overflowY: element.overflowY,
          },
          recommendedAction:
            "Replace the fixed height with a min-height so taller scripts can grow.",
          predicate: "element.scrollHeight <= element.clientHeight + 2",
        }),
      );
    }
  }

  return issues;
}

function linguisticRules(page: PageMeasurement, context: RuleContext): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const element of page.elements) {
    const text = element.text.trim();
    if (!text || text.includes(" ") || !looksLikeTranslationKey(text)) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    issues.push(
      build(context, {
        ruleId: "BF-LNG-RAW-KEY",
        category: "linguistic",
        severity: "blocking",
        selector: element.selector,
        description: `The raw translation key "${text}" is visible to users.`,
        whyItMatters:
          "An untranslated lookup key reached the interface instead of product copy.",
        evidence: { visibleText: text, selector: element.selector },
        recommendedAction: `Add the missing ${context.locale} string for "${text}".`,
        predicate: "visibleText does not match /^(word\\.)+word$/",
      }),
    );
  }
  return issues;
}

function accessibilityRules(
  page: PageMeasurement,
  context: RuleContext,
  runtime: RuntimeSignals,
): Issue[] {
  const issues: Issue[] = [];

  if (!page.title.trim()) {
    issues.push(
      build(context, {
        ruleId: "BF-A11Y-TITLE-MISSING",
        category: "accessibility",
        severity: "serious",
        selector: "title",
        description: "The document has no title.",
        whyItMatters:
          "Screen-reader users and tab lists rely on the title to identify the page.",
        evidence: { title: "" },
        recommendedAction: `Provide a localised <title> for ${context.locale}.`,
        predicate: "document.title.trim().length > 0",
      }),
    );
  }

  for (const element of page.elements) {
    if (element.tag === "img" && element.hasAlt === false) {
      issues.push(
        build(context, {
          ruleId: "BF-A11Y-IMG-ALT-MISSING",
          category: "accessibility",
          severity: "serious",
          selector: element.selector,
          description: "An image has no alt attribute.",
          whyItMatters:
            "Screen-reader users receive no description, and translated alt text is a common localisation gap.",
          evidence: { selector: element.selector, rect: element.rect },
          recommendedAction:
            'Add a localised alt attribute, or alt="" if the image is decorative.',
          predicate: "img.hasAttribute('alt')",
        }),
      );
      continue;
    }
    if (element.interactive && !element.accessibleName.trim()) {
      issues.push(
        build(context, {
          ruleId: "BF-A11Y-NAME-MISSING",
          category: "accessibility",
          severity: "blocking",
          selector: element.selector,
          description: `The ${element.tag} control has no accessible name.`,
          whyItMatters:
            "Screen-reader users cannot identify the control, and icon-only controls are frequently missed during translation.",
          evidence: {
            selector: element.selector,
            tag: element.tag,
            role: element.role,
            accessibleName: "",
          },
          recommendedAction: `Add a localised aria-label for ${context.locale}.`,
          predicate: "accessibleName(element).trim().length > 0",
        }),
      );
    }
  }

  for (const violation of runtime.axeViolations) {
    if (violation.impact !== "serious" && violation.impact !== "critical") continue;
    issues.push(
      build(context, {
        ruleId: `BF-A11Y-AXE-${violation.id.toUpperCase()}`,
        category: "accessibility",
        severity: violation.impact === "critical" ? "blocking" : "serious",
        selector: violation.nodes[0] ?? null,
        description: violation.help,
        whyItMatters:
          "axe-core reported a serious or critical accessibility failure on the rendered localised page.",
        evidence: {
          axeRule: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.slice(0, 5),
        },
        recommendedAction: `Resolve the axe rule "${violation.id}".`,
        predicate: `axe.run() reports no serious/critical violation of ${violation.id}`,
      }),
    );
  }

  return issues;
}

function runtimeRules(context: RuleContext, runtime: RuntimeSignals): Issue[] {
  const issues: Issue[] = [];
  if (runtime.status >= 400) {
    issues.push(
      build(context, {
        ruleId: "BF-RUN-STATUS",
        category: "runtime",
        severity: "blocking",
        selector: null,
        description: `The route returned HTTP ${runtime.status}.`,
        whyItMatters: "A locale route that does not load cannot be released.",
        evidence: { status: runtime.status },
        recommendedAction: "Fix the locale route or remove it from the language switcher.",
        predicate: "response.status < 400",
      }),
    );
  }
  if (runtime.consoleErrors.length > 0) {
    issues.push(
      build(context, {
        ruleId: "BF-RUN-CONSOLE-ERROR",
        category: "runtime",
        severity: "serious",
        selector: null,
        description: `The page logged ${runtime.consoleErrors.length} console error(s).`,
        whyItMatters:
          "Console errors on a localised route often indicate a missing bundle, format or dictionary.",
        evidence: { errors: runtime.consoleErrors.slice(0, 10) },
        recommendedAction: "Resolve the runtime errors reported in the browser console.",
        predicate: "consoleErrors.length === 0",
      }),
    );
  }
  if (runtime.failedRequests.length > 0) {
    issues.push(
      build(context, {
        ruleId: "BF-RUN-REQUEST-FAILED",
        category: "runtime",
        severity: "warning",
        selector: null,
        description: `${runtime.failedRequests.length} request(s) failed while rendering.`,
        whyItMatters:
          "Failed font or dictionary requests change how the translated page renders.",
        evidence: { requests: runtime.failedRequests.slice(0, 10) },
        recommendedAction: "Investigate the failed network requests.",
        predicate: "failedRequests.length === 0",
      }),
    );
  }
  return issues;
}

export function evaluateRules(
  page: PageMeasurement,
  context: RuleContext,
  runtime: RuntimeSignals,
): Issue[] {
  return [
    ...localeRules(page, context),
    ...visualRules(page, context),
    ...linguisticRules(page, context),
    ...accessibilityRules(page, context, runtime),
    ...runtimeRules(context, runtime),
  ];
}

export const IMPLEMENTED_RULE_IDS = [
  "BF-LOC-LANG-MISSING",
  "BF-LOC-LANG-INVALID",
  "BF-LOC-LANG-MISMATCH",
  "BF-LOC-DIR-MISSING",
  "BF-LOC-HREFLANG-INVALID",
  "BF-VIS-VIEWPORT-OVERFLOW",
  "BF-VIS-TEXT-OVERFLOW-X",
  "BF-VIS-TEXT-CLIP-Y",
  "BF-LNG-RAW-KEY",
  "BF-A11Y-TITLE-MISSING",
  "BF-A11Y-IMG-ALT-MISSING",
  "BF-A11Y-NAME-MISSING",
  "BF-RUN-STATUS",
  "BF-RUN-CONSOLE-ERROR",
  "BF-RUN-REQUEST-FAILED",
] as const;

export type { ElementMeasurement, PageMeasurement };
