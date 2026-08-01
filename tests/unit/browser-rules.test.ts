import { describe, expect, it } from "vitest";
import {
  IMPLEMENTED_RULE_IDS,
  evaluateRules,
  stableIssueId,
  type ElementMeasurement,
  type PageMeasurement,
  type RuleContext,
  type RuntimeSignals,
} from "../../packages/browser/src/rules";

const context: RuleContext = {
  scanId: "test-scan",
  origin: "LOCAL_REPOSITORY_SCAN",
  route: "/checkout",
  locale: "de-DE",
  viewport: { name: "mobile", width: 390, height: 844 },
  browser: "chromium",
  target: "https://example.test",
  screenshotRef: null,
};

const quietRuntime: RuntimeSignals = {
  status: 200,
  consoleErrors: [],
  failedRequests: [],
  axeViolations: [],
};

function element(overrides: Partial<ElementMeasurement> = {}): ElementMeasurement {
  return {
    selector: '[data-testid="cta"]',
    tag: "button",
    role: null,
    text: "Jetzt kostenpflichtig bestellen",
    dir: "ltr",
    lang: "",
    clientWidth: 144,
    scrollWidth: 144,
    clientHeight: 40,
    scrollHeight: 40,
    overflowX: "visible",
    overflowY: "visible",
    whiteSpace: "normal",
    display: "block",
    fontFamily: "system-ui",
    fontSize: 16,
    rect: { x: 0, y: 0, width: 144, height: 40 },
    accessibleName: "Jetzt kostenpflichtig bestellen",
    interactive: true,
    hasAlt: null,
    ...overrides,
  };
}

function page(overrides: Partial<PageMeasurement> = {}): PageMeasurement {
  return {
    lang: "de-DE",
    dir: "ltr",
    title: "Kasse",
    contentLanguage: null,
    hreflang: [],
    documentScrollWidth: 390,
    viewportWidth: 390,
    viewportHeight: 844,
    fontsReady: true,
    visibleText: [],
    elements: [],
    sameOriginLinks: [],
    truncatedElements: 0,
    ...overrides,
  };
}

function ruleIds(measurement: PageMeasurement, runtime = quietRuntime, ctx = context) {
  return evaluateRules(measurement, ctx, runtime).map((issue) => issue.ruleId);
}

describe("browser rule engine", () => {
  it("reports nothing for a correctly localised page", () => {
    expect(ruleIds(page({ elements: [element()] }))).toEqual([]);
  });

  it("detects a missing document language", () => {
    expect(ruleIds(page({ lang: "" }))).toContain("BF-LOC-LANG-MISSING");
  });

  it("detects an invalid BCP 47 tag", () => {
    expect(ruleIds(page({ lang: "de_DE" }))).toContain("BF-LOC-LANG-INVALID");
  });

  it("detects a language that does not match the requested locale", () => {
    expect(ruleIds(page({ lang: "en" }))).toContain("BF-LOC-LANG-MISMATCH");
  });

  it("accepts a regional variant of the requested language", () => {
    expect(ruleIds(page({ lang: "de-AT" }))).not.toContain("BF-LOC-LANG-MISMATCH");
  });

  it("requires rtl direction for a right-to-left locale", () => {
    const arabic = { ...context, locale: "ar-SA" };
    expect(ruleIds(page({ lang: "ar-SA", dir: "ltr" }), quietRuntime, arabic)).toContain(
      "BF-LOC-DIR-MISSING",
    );
    expect(ruleIds(page({ lang: "ar-SA", dir: "rtl" }), quietRuntime, arabic)).not.toContain(
      "BF-LOC-DIR-MISSING",
    );
  });

  it("flags an invalid hreflang but allows x-default", () => {
    expect(
      ruleIds(page({ hreflang: [{ hreflang: "de_DE", href: "/de" }] })),
    ).toContain("BF-LOC-HREFLANG-INVALID");
    expect(
      ruleIds(page({ hreflang: [{ hreflang: "x-default", href: "/" }] })),
    ).not.toContain("BF-LOC-HREFLANG-INVALID");
  });

  it("measures horizontal text overflow from the rendered box", () => {
    const overflowing = element({ scrollWidth: 212, clientWidth: 144, overflowX: "hidden" });
    const issues = evaluateRules(page({ elements: [overflowing] }), context, quietRuntime);
    const overflow = issues.find((issue) => issue.ruleId === "BF-VIS-TEXT-OVERFLOW-X");
    expect(overflow?.severity).toBe("blocking");
    expect(overflow?.evidence).toMatchObject({ overflowPx: 68, clipped: true });
  });

  it("does not flag a scrollable container as overflow", () => {
    const scrollable = element({ scrollWidth: 900, clientWidth: 144, overflowX: "auto" });
    expect(ruleIds(page({ elements: [scrollable] }))).not.toContain(
      "BF-VIS-TEXT-OVERFLOW-X",
    );
  });

  it("ignores screen-reader-only text clipped into a 1px box", () => {
    // The standard visually-hidden pattern. Found on en.wikipedia.org, where it
    // produced 64 false positives before this guard existed.
    const srOnly = element({
      text: "Jump to content",
      clientWidth: 1,
      clientHeight: 1,
      scrollWidth: 52,
      scrollHeight: 19,
      overflowX: "hidden",
      overflowY: "hidden",
    });
    const found = ruleIds(page({ elements: [srOnly] }));
    expect(found).not.toContain("BF-VIS-TEXT-OVERFLOW-X");
    expect(found).not.toContain("BF-VIS-TEXT-CLIP-Y");
  });

  it("ignores sub-pixel overflow within tolerance", () => {
    const noise = element({ scrollWidth: 145, clientWidth: 144, overflowX: "hidden" });
    expect(ruleIds(page({ elements: [noise] }))).not.toContain("BF-VIS-TEXT-OVERFLOW-X");
  });

  it("detects vertical clipping only when the overflow is actually hidden", () => {
    const clipped = element({ scrollHeight: 72, clientHeight: 40, overflowY: "hidden" });
    const visible = element({ scrollHeight: 72, clientHeight: 40, overflowY: "visible" });
    expect(ruleIds(page({ elements: [clipped] }))).toContain("BF-VIS-TEXT-CLIP-Y");
    expect(ruleIds(page({ elements: [visible] }))).not.toContain("BF-VIS-TEXT-CLIP-Y");
  });

  it("detects horizontal viewport overflow", () => {
    const issues = evaluateRules(
      page({ documentScrollWidth: 460, viewportWidth: 390 }),
      context,
      quietRuntime,
    );
    const overflow = issues.find((issue) => issue.ruleId === "BF-VIS-VIEWPORT-OVERFLOW");
    expect(overflow?.evidence).toMatchObject({ overflowPx: 70 });
  });

  it("detects a visible raw translation key but not ordinary prose", () => {
    const rawKey = element({ text: "checkout.cta.primary", interactive: false });
    const sentence = element({ text: "Weiter zur Kasse.", interactive: false });
    expect(ruleIds(page({ elements: [rawKey] }))).toContain("BF-LNG-RAW-KEY");
    expect(ruleIds(page({ elements: [sentence] }))).not.toContain("BF-LNG-RAW-KEY");
  });

  it("does not mistake usernames, hostnames or filenames for translation keys", () => {
    // Each of these was a real false positive found by the ground-truth benchmark.
    for (const text of [
      "a.okafor",
      "atlaspay.test",
      "checkout.tsx",
      "styles.css",
      "meridian.example.com",
      "repair.patch",
      "pnpm-lock.yaml",
      "results.sarif",
      "run.log",
    ]) {
      expect(
        ruleIds(page({ elements: [element({ text, interactive: false })] })),
        `${text} must not be reported as a translation key`,
      ).not.toContain("BF-LNG-RAW-KEY");
    }
  });

  it("detects a missing title, missing alt and a nameless control", () => {
    const image = element({ tag: "img", text: "", hasAlt: false, interactive: false });
    const nameless = element({ text: "", accessibleName: "", interactive: true });
    const found = ruleIds(page({ title: "", elements: [image, nameless] }));
    expect(found).toContain("BF-A11Y-TITLE-MISSING");
    expect(found).toContain("BF-A11Y-IMG-ALT-MISSING");
    expect(found).toContain("BF-A11Y-NAME-MISSING");
  });

  it("promotes critical axe violations to blocking and ignores minor ones", () => {
    const runtime: RuntimeSignals = {
      ...quietRuntime,
      axeViolations: [
        { id: "button-name", impact: "critical", help: "Buttons need text", nodes: ["button"] },
        { id: "region", impact: "minor", help: "Use landmarks", nodes: ["div"] },
      ],
    };
    const issues = evaluateRules(page(), context, runtime);
    const axe = issues.filter((issue) => issue.ruleId.startsWith("BF-A11Y-AXE-"));
    expect(axe).toHaveLength(1);
    expect(axe[0]?.severity).toBe("blocking");
  });

  it("reports runtime failures from the render", () => {
    const runtime: RuntimeSignals = {
      status: 500,
      consoleErrors: ["TypeError: t is not a function"],
      failedRequests: [{ url: "https://example.test/font.woff2", failure: "net::ERR_FAILED" }],
      axeViolations: [],
    };
    const found = ruleIds(page(), runtime);
    expect(found).toContain("BF-RUN-STATUS");
    expect(found).toContain("BF-RUN-CONSOLE-ERROR");
    expect(found).toContain("BF-RUN-REQUEST-FAILED");
  });

  it("derives stable issue ids that ignore time and depend on locale", () => {
    const base = {
      target: "https://example.test",
      route: "/checkout",
      ruleId: "BF-VIS-TEXT-OVERFLOW-X",
      selector: '[data-testid="cta"]',
      viewport: "mobile",
    };
    const first = stableIssueId({ ...base, locale: "de-DE" });
    expect(stableIssueId({ ...base, locale: "de-DE" })).toBe(first);
    expect(stableIssueId({ ...base, locale: "ar-SA" })).not.toBe(first);
  });

  it("keeps the published rule list in sync with what the engine can emit", () => {
    const emitted = new Set<string>();
    const cases: Array<[PageMeasurement, RuntimeSignals, RuleContext]> = [
      [page({ lang: "" }), quietRuntime, context],
      [page({ lang: "de_DE" }), quietRuntime, context],
      [page({ lang: "en" }), quietRuntime, context],
      [page({ lang: "ar-SA", dir: "ltr" }), quietRuntime, { ...context, locale: "ar-SA" }],
      [page({ hreflang: [{ hreflang: "de_DE", href: "/de" }] }), quietRuntime, context],
      [page({ documentScrollWidth: 460 }), quietRuntime, context],
      [
        page({ elements: [element({ scrollWidth: 212, overflowX: "hidden" })] }),
        quietRuntime,
        context,
      ],
      [
        page({ elements: [element({ scrollHeight: 72, overflowY: "hidden" })] }),
        quietRuntime,
        context,
      ],
      [
        page({ elements: [element({ text: "checkout.cta.primary", interactive: false })] }),
        quietRuntime,
        context,
      ],
      [page({ title: "" }), quietRuntime, context],
      [
        page({ elements: [element({ tag: "img", text: "", hasAlt: false, interactive: false })] }),
        quietRuntime,
        context,
      ],
      [
        page({ elements: [element({ text: "", accessibleName: "" })] }),
        quietRuntime,
        context,
      ],
      [
        page(),
        {
          status: 500,
          consoleErrors: ["boom"],
          failedRequests: [{ url: "x", failure: "y" }],
          axeViolations: [],
        },
        context,
      ],
    ];
    for (const [measurement, runtime, ctx] of cases) {
      for (const id of ruleIds(measurement, runtime, ctx)) emitted.add(id);
    }
    for (const id of IMPLEMENTED_RULE_IDS) {
      expect(emitted, `${id} is published but never emitted`).toContain(id);
    }
  });
});
