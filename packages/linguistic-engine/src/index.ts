export type GlossaryEntry = {
  source: string;
  approved: Record<string, string>;
  forbidden?: Record<string, string[]>;
  caseSensitive?: boolean;
  exactMatch?: boolean;
  notes?: string;
  domain?: string;
  doNotTranslate?: boolean;
};

export type MemoryEntry = {
  source: string;
  target: string;
  locale: string;
  context?: string;
  provider: string;
  humanApproved: boolean;
  updatedAt: string;
};

const TOKEN_PATTERN =
  /(\{\{[^{}]+\}\}|\{[A-Za-z_][^{}]*\}|%[sdif]|<\/?[A-Za-z][^>]*>|https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;

export function extractProtectedTokens(value: string): string[] {
  return value.match(TOKEN_PATTERN) ?? [];
}

export function placeholderMismatch(source: string, target: string) {
  const sourceTokens = extractProtectedTokens(source).sort();
  const targetTokens = extractProtectedTokens(target).sort();
  return {
    valid: JSON.stringify(sourceTokens) === JSON.stringify(targetTokens),
    sourceTokens,
    targetTokens,
  };
}

export function validateIcuMessage(value: string) {
  let depth = 0;
  for (const char of value) {
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth < 0) return { valid: false, reason: "Unexpected closing brace" };
  }
  if (depth !== 0) return { valid: false, reason: "Unbalanced ICU braces" };
  const isPlural = /,\s*plural\s*,/.test(value);
  if (isPlural && !/\bother\s*\{/.test(value)) {
    return { valid: false, reason: 'Plural message requires an "other" branch' };
  }
  return { valid: true, reason: null };
}

function normalise(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function checkGlossary(
  source: string,
  target: string,
  locale: string,
  entries: GlossaryEntry[],
) {
  const findings: Array<{
    sourceTerm: string;
    expected: string;
    actual: string;
    reason: string;
  }> = [];
  for (const entry of entries) {
    const sourceHaystack = entry.caseSensitive ? source : source.toLowerCase();
    const sourceNeedle = entry.caseSensitive
      ? entry.source
      : entry.source.toLowerCase();
    if (!sourceHaystack.includes(sourceNeedle)) continue;
    const expected = entry.doNotTranslate ? entry.source : entry.approved[locale];
    if (!expected) continue;
    const matches = entry.caseSensitive
      ? target.includes(expected)
      : target.toLowerCase().includes(expected.toLowerCase());
    const forbidden = (entry.forbidden?.[locale] ?? []).find((alternative) =>
      target.toLowerCase().includes(alternative.toLowerCase()),
    );
    if (!matches || forbidden) {
      findings.push({
        sourceTerm: entry.source,
        expected,
        actual: target,
        reason: forbidden
          ? `Forbidden alternative "${forbidden}" was used`
          : `Approved term "${expected}" is missing`,
      });
    }
  }
  return findings;
}

export function matchTranslationMemory(
  source: string,
  locale: string,
  context: string | undefined,
  memory: MemoryEntry[],
) {
  const localeEntries = memory.filter((entry) => entry.locale === locale);
  const exact = localeEntries.find((entry) => entry.source === source);
  if (exact) return { match: exact, kind: "exact" as const };
  const normalised = localeEntries.find(
    (entry) => normalise(entry.source) === normalise(source),
  );
  if (normalised) return { match: normalised, kind: "normalised" as const };
  const contextual = localeEntries.find(
    (entry) => entry.context && entry.context === context,
  );
  if (contextual) return { match: contextual, kind: "context" as const };
  return { match: null, kind: "none" as const };
}

type PseudoMode =
  | "expanded-latin"
  | "extreme-expansion"
  | "rtl-mirrored"
  | "accented"
  | "cjk-density"
  | "no-space"
  | "tall-glyph"
  | "emoji-symbol"
  | "long-compound";

const ACCENTS: Record<string, string> = {
  a: "á",
  e: "ë",
  i: "ï",
  o: "ø",
  u: "ü",
  A: "Â",
  E: "Ë",
  I: "Ï",
  O: "Ø",
  U: "Ü",
};

export function pseudoLocalise(
  input: string,
  mode: PseudoMode,
  protectedTerms: string[] = [],
) {
  const preserved = new Map<string, string>();
  let cursor = 0;
  const protect = (value: string) => {
    const key = `\uE000${cursor++}\uE001`;
    preserved.set(key, value);
    return key;
  };
  let value = input.replace(TOKEN_PATTERN, protect);
  for (const term of [...protectedTerms].sort((a, b) => b.length - a.length)) {
    value = value.split(term).join(protect(term));
  }

  if (mode === "accented") {
    value = [...value].map((char) => ACCENTS[char] ?? char).join("");
  } else if (mode === "expanded-latin") {
    value = `[${value.replace(/[aeiou]/gi, (char) => `${char}${char}`)}]`;
  } else if (mode === "extreme-expansion") {
    value = `[${value} ${value} ${value}]`;
  } else if (mode === "rtl-mirrored") {
    value = `\u202E${value
      .split(/(\uE000\d+\uE001)/)
      .map((segment) =>
        preserved.has(segment) ? segment : [...segment].reverse().join(""),
      )
      .join("")}\u202C`;
  } else if (mode === "cjk-density") {
    value = `界${value.replace(/\s+/g, "")}測試`;
  } else if (mode === "no-space") {
    value = value.replace(/\s+/g, "");
  } else if (mode === "tall-glyph") {
    value = `ऊँ${value}ज्ञै`;
  } else if (mode === "emoji-symbol") {
    value = `⚑ ${value} ◈`;
  } else if (mode === "long-compound") {
    value = value.replace(/\s+/g, "") + "Lokalisierungsprüfung";
  }

  for (const [key, original] of preserved) value = value.split(key).join(original);
  return value;
}
