export type WritingDirection = "ltr" | "rtl";

export type LocaleProfile = {
  requested: string;
  canonical: string;
  language: string;
  script: string;
  region: string | null;
  direction: WritingDirection;
  expansionRisk: "low" | "medium" | "high";
  lineBreaking: "spaces" | "dictionary" | "character";
  segmentation: "word" | "dictionary" | "grapheme";
  pluralCategories: string[];
  fontStack: string;
};

const RTL_SCRIPTS = new Set(["Arab", "Hebr", "Thaa", "Nkoo", "Adlm", "Syrc"]);
const CHARACTER_BREAK_SCRIPTS = new Set(["Hans", "Hant", "Jpan", "Kore"]);
const DICTIONARY_BREAK_SCRIPTS = new Set(["Thai", "Laoo", "Khmr", "Mymr"]);
const TALL_GLYPH_SCRIPTS = new Set(["Deva", "Taml", "Thai", "Ethi"]);
const COMPACT_SCRIPTS = new Set(["Hans", "Hant", "Jpan", "Kore"]);

const SCRIPT_FONT_STACKS: Record<string, string> = {
  Arab: '"Noto Sans Arabic", "Segoe UI", sans-serif',
  Deva: '"Noto Sans Devanagari", "Nirmala UI", sans-serif',
  Ethi: '"Noto Sans Ethiopic", "Nyala", sans-serif',
  Hans: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
  Hant: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
  Hebr: '"Noto Sans Hebrew", "Segoe UI", sans-serif',
  Jpan: '"Noto Sans JP", "Yu Gothic UI", sans-serif',
  Kore: '"Noto Sans KR", "Malgun Gothic", sans-serif',
  Taml: '"Noto Sans Tamil", "Nirmala UI", sans-serif',
  Thai: '"Noto Sans Thai", "Leelawadee UI", sans-serif',
};

export function isValidLocaleTag(tag: string): boolean {
  if (!tag || tag.length > 64 || tag.includes("_")) return false;
  try {
    return Intl.getCanonicalLocales(tag).length === 1;
  } catch {
    return false;
  }
}

export function localeProfile(tag: string): LocaleProfile {
  if (!isValidLocaleTag(tag)) {
    throw new Error(`Invalid BCP 47 locale: ${tag}`);
  }
  const canonical = Intl.getCanonicalLocales(tag)[0];
  const locale = new Intl.Locale(canonical).maximize();
  const script = locale.script ?? "Latn";
  const pluralCategories = new Intl.PluralRules(canonical).resolvedOptions()
    .pluralCategories;

  return {
    requested: tag,
    canonical,
    language: locale.language,
    script,
    region: locale.region ?? null,
    direction: RTL_SCRIPTS.has(script) ? "rtl" : "ltr",
    expansionRisk: COMPACT_SCRIPTS.has(script)
      ? "low"
      : TALL_GLYPH_SCRIPTS.has(script)
        ? "medium"
        : "high",
    lineBreaking: CHARACTER_BREAK_SCRIPTS.has(script)
      ? "character"
      : DICTIONARY_BREAK_SCRIPTS.has(script)
        ? "dictionary"
        : "spaces",
    segmentation: CHARACTER_BREAK_SCRIPTS.has(script)
      ? "grapheme"
      : DICTIONARY_BREAK_SCRIPTS.has(script)
        ? "dictionary"
        : "word",
    pluralCategories: [...pluralCategories],
    fontStack:
      SCRIPT_FONT_STACKS[script] ??
      '"Noto Sans", Inter, system-ui, -apple-system, sans-serif',
  };
}

export function formatLocaleSample(tag: string) {
  const date = new Date("2026-07-29T12:00:00Z");
  return {
    number: new Intl.NumberFormat(tag).format(1234567.89),
    date: new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date),
    currency: new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "GBP",
    }).format(1299.5),
  };
}

export const REPRESENTATIVE_LOCALE_MATRIX = [
  "en-GB",
  "de-DE",
  "hi-IN",
  "ta-IN",
  "ar-SA",
  "he-IL",
  "zh-Hans-CN",
  "zh-Hant-TW",
  "ja-JP",
  "ko-KR",
  "th-TH",
  "uk-UA",
  "am-ET",
] as const;
