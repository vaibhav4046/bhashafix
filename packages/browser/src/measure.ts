/**
 * In-page measurement payload.
 *
 * `collectPageMeasurement` is serialised into the page by Playwright, so it must
 * be self-contained: no imports, no closure over module scope.
 */

export type ElementMeasurement = {
  selector: string;
  tag: string;
  role: string | null;
  text: string;
  dir: string;
  lang: string;
  clientWidth: number;
  scrollWidth: number;
  clientHeight: number;
  scrollHeight: number;
  overflowX: string;
  overflowY: string;
  whiteSpace: string;
  display: string;
  fontFamily: string;
  fontSize: number;
  rect: { x: number; y: number; width: number; height: number };
  accessibleName: string;
  interactive: boolean;
  hasAlt: boolean | null;
};

export type PageMeasurement = {
  lang: string;
  dir: string;
  title: string;
  contentLanguage: string | null;
  hreflang: Array<{ hreflang: string; href: string }>;
  documentScrollWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  fontsReady: boolean;
  visibleText: string[];
  elements: ElementMeasurement[];
  sameOriginLinks: string[];
  truncatedElements: number;
};

export const MAX_MEASURED_ELEMENTS = 600;
export const MAX_TEXT_LENGTH = 240;

/* c8 ignore start -- executed inside the browser, covered by fixture scans */
export function collectPageMeasurement(limits: {
  maxElements: number;
  maxTextLength: number;
}): PageMeasurement {
  // This function is serialised into the page. Bundlers that preserve function
  // names (esbuild/tsx) emit `__name(...)` wrappers that do not exist in the
  // browser realm, so provide a no-op shim before any nested declaration runs.
  const realm = globalThis as unknown as { __name?: (fn: unknown) => unknown };
  if (!realm.__name) realm.__name = (fn: unknown) => fn;

  const interactiveTags = new Set([
    "A",
    "BUTTON",
    "INPUT",
    "SELECT",
    "TEXTAREA",
    "SUMMARY",
  ]);

  function cssSelector(element: Element): string {
    const parts: string[] = [];
    let node: Element | null = element;
    while (node && node.nodeType === 1 && parts.length < 6) {
      if (node.id) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const testId = node.getAttribute("data-testid");
      if (testId) {
        parts.unshift(`[data-testid="${testId}"]`);
        break;
      }
      const parent: Element | null = node.parentElement;
      if (!parent) {
        parts.unshift(node.tagName.toLowerCase());
        break;
      }
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === node!.tagName,
      );
      const index = siblings.indexOf(node) + 1;
      parts.unshift(
        siblings.length > 1
          ? `${node.tagName.toLowerCase()}:nth-of-type(${index})`
          : node.tagName.toLowerCase(),
      );
      node = parent;
    }
    return parts.join(" > ") || element.tagName.toLowerCase();
  }

  function ownText(element: Element): string {
    let text = "";
    element.childNodes.forEach((child) => {
      if (child.nodeType === 3) text += child.textContent ?? "";
    });
    return text.replace(/\s+/g, " ").trim();
  }

  function accessibleName(element: Element): string {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const referenced = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ")
        .trim();
      if (referenced) return referenced;
    }
    const aria = element.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    if (element.tagName === "IMG") {
      const alt = element.getAttribute("alt");
      if (alt && alt.trim()) return alt.trim();
    }
    if (element.tagName === "INPUT") {
      const id = element.getAttribute("id");
      const label = id
        ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
        : element.closest("label");
      const labelText = label?.textContent?.trim();
      if (labelText) return labelText;
      const placeholder = element.getAttribute("placeholder");
      if (placeholder && placeholder.trim()) return placeholder.trim();
    }
    const title = element.getAttribute("title");
    if (title && title.trim()) return title.trim();
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) return text;
    // A control whose only content is an image or icon takes its name from
    // that descendant. Without this, every icon link looks unnamed.
    const describedImage = element.querySelector("img[alt]:not([alt=''])");
    if (describedImage) return (describedImage.getAttribute("alt") ?? "").trim();
    const svgTitle = element.querySelector("svg > title");
    if (svgTitle?.textContent?.trim()) return svgTitle.textContent.trim();
    return "";
  }

  function isRendered(element: Element, style: CSSStyleDeclaration): boolean {
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  const measurements: ElementMeasurement[] = [];
  const visibleText: string[] = [];
  let truncated = 0;

  const all = document.body ? Array.from(document.body.querySelectorAll("*")) : [];
  for (const element of all) {
    const style = window.getComputedStyle(element);
    if (!isRendered(element, style)) continue;

    const text = ownText(element);
    const interactive =
      interactiveTags.has(element.tagName) ||
      element.getAttribute("role") === "button" ||
      element.getAttribute("role") === "link" ||
      element.hasAttribute("onclick");

    if (text) visibleText.push(text.slice(0, limits.maxTextLength));
    if (!text && !interactive && element.tagName !== "IMG") continue;

    if (measurements.length >= limits.maxElements) {
      truncated += 1;
      continue;
    }

    const rect = element.getBoundingClientRect();
    measurements.push({
      selector: cssSelector(element),
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      text: text.slice(0, limits.maxTextLength),
      dir: style.direction,
      lang: element.closest("[lang]")?.getAttribute("lang") ?? "",
      clientWidth: (element as HTMLElement).clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: (element as HTMLElement).clientHeight,
      scrollHeight: element.scrollHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      whiteSpace: style.whiteSpace,
      display: style.display,
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize) || 0,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      accessibleName: accessibleName(element).slice(0, limits.maxTextLength),
      interactive,
      hasAlt: element.tagName === "IMG" ? element.hasAttribute("alt") : null,
    });
  }

  const origin = window.location.origin;
  const sameOriginLinks = Array.from(document.querySelectorAll("a[href]"))
    .map((anchor) => {
      try {
        return new URL(
          anchor.getAttribute("href") ?? "",
          window.location.href,
        ).href;
      } catch {
        return "";
      }
    })
    .filter((href) => href.startsWith(origin));

  return {
    lang: document.documentElement.getAttribute("lang") ?? "",
    dir:
      document.documentElement.getAttribute("dir") ??
      window.getComputedStyle(document.documentElement).direction ??
      "",
    title: document.title ?? "",
    contentLanguage:
      document
        .querySelector('meta[http-equiv="content-language" i]')
        ?.getAttribute("content") ?? null,
    hreflang: Array.from(
      document.querySelectorAll('link[rel="alternate"][hreflang]'),
    ).map((link) => ({
      hreflang: link.getAttribute("hreflang") ?? "",
      href: link.getAttribute("href") ?? "",
    })),
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    fontsReady: document.fonts ? document.fonts.status === "loaded" : true,
    visibleText: Array.from(new Set(visibleText)).slice(0, 2000),
    elements: measurements,
    sameOriginLinks: Array.from(new Set(sameOriginLinks)).slice(0, 200),
    truncatedElements: truncated,
  };
}
/* c8 ignore stop */
