import { createHash } from "node:crypto";

export type ExtractedString = {
  stringId: string;
  text: string;
  route: string;
  selector: string;
  role: string | null;
  accessibleName: string | null;
  context: string | null;
  sourceHint: string | null;
};

const SENSITIVE_ATTRIBUTE =
  /(authorization|token|secret|password|api[-_]?key|session|cookie)/i;

export function redactSecrets(value: string) {
  return value
    .replace(
      /\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|Bearer\s+\S+)/gi,
      "[REDACTED]",
    )
    .replace(
      /(["']?(?:token|secret|password|api[-_]?key)["']?\s*[:=]\s*)["'][^"']+["']/gi,
      "$1[REDACTED]",
    );
}

export function stableStringId(
  route: string,
  selector: string,
  text: string,
) {
  return `str_${createHash("sha256")
    .update(`${route}\0${selector}\0${text}`)
    .digest("hex")
    .slice(0, 16)}`;
}

export function extractTextFromHtml(html: string, route: string) {
  const withoutSecrets = html.replace(
    /\s([A-Za-z0-9:_-]+)=["'][^"']*["']/g,
    (full, name: string) => (SENSITIVE_ATTRIBUTE.test(name) ? "" : full),
  );
  const title = withoutSecrets.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const results: ExtractedString[] = [];
  const pattern =
    /<(h[1-6]|p|button|a|label|option|textarea|span)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(withoutSecrets))) {
    const text = redactSecrets(
      match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    );
    if (!text) continue;
    const selector = `${match[1].toLowerCase()}:nth-of-type(${++index})`;
    results.push({
      stringId: stableStringId(route, selector, text),
      text,
      route,
      selector,
      role: match[1].toLowerCase() === "button" ? "button" : null,
      accessibleName: text,
      context: title?.trim() ?? null,
      sourceHint: null,
    });
  }
  return results;
}

export function deduplicateStrings(strings: ExtractedString[]) {
  const seen = new Map<string, ExtractedString>();
  for (const item of strings) {
    const key = `${item.text}\0${item.role}\0${item.context}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}
