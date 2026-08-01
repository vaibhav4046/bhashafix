/**
 * Deterministic source codemods.
 *
 * These transforms edit real `.tsx`, `.css` and `.json` files rather than
 * assigning JSON pointers, so they operate on text. There is no AST library
 * behind them, which means every transform must be anchored tightly enough
 * that it either does exactly what it claims or throws. The rules below are
 * enforced by every strategy in this file:
 *
 *   - the anchor must occur exactly once, never "first match wins";
 *   - if the file already carries the repaired form, that is an error, not a
 *     silent no-op, because it means the plan was built against stale input;
 *   - nothing outside the matched anchor is rewritten.
 */

/** Raised when an anchor is missing, ambiguous, or already rewritten. */
export class SourceRepairError extends Error {
  constructor(message: string) {
    super(`Repair rejected: ${message}`);
    this.name = "SourceRepairError";
  }
}

/**
 * Replace one complete JSX opening tag, optionally widening a named import so
 * the replacement's identifiers resolve.
 */
export type JsxOpenTagRewrite = {
  readonly kind: "jsx-open-tag";
  /** Exact current opening tag, e.g. `<html lang="en">`. */
  readonly expect: string;
  /** Exact replacement opening tag, e.g. `<html lang={locale} dir={dir}>`. */
  readonly replace: string;
  /** Named import the replacement depends on. Must already be imported from `module`. */
  readonly ensureNamedImport?: { readonly module: string; readonly name: string };
};

/** Let clamped text wrap instead of being held on one line at a fixed width. */
export type CssRelaxTextClamp = {
  readonly kind: "css-relax-text-clamp";
  /** Selector of the single rule to relax, e.g. `.cta`. */
  readonly selector: string;
};

/** Add one missing key to a flat `messages/<locale>.json` dictionary. */
export type TranslationKeyInsert = {
  readonly kind: "translation-key";
  readonly key: string;
  readonly value: string;
};

export type SourceRepairStrategy =
  | JsxOpenTagRewrite
  | CssRelaxTextClamp
  | TranslationKeyInsert;

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) throw new SourceRepairError("an empty anchor is never valid.");
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function tagNameOf(openTag: string): string {
  const match = /^<([a-zA-Z][a-zA-Z0-9-]*)[\s/>]/.exec(openTag);
  if (!match) throw new SourceRepairError(`"${openTag}" is not a JSX opening tag.`);
  return match[1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyJsxOpenTagRewrite(source: string, strategy: JsxOpenTagRewrite): string {
  const { expect, replace } = strategy;
  if (!expect.startsWith("<") || !expect.endsWith(">")) {
    throw new SourceRepairError(`the anchor "${expect}" is not a complete opening tag.`);
  }
  if (!replace.startsWith("<") || !replace.endsWith(">")) {
    throw new SourceRepairError(`the replacement "${replace}" is not a complete opening tag.`);
  }
  if (tagNameOf(expect) !== tagNameOf(replace)) {
    throw new SourceRepairError(
      `the replacement retags <${tagNameOf(expect)}> as <${tagNameOf(replace)}>.`,
    );
  }
  if (expect === replace) {
    throw new SourceRepairError("the replacement is identical to the anchor.");
  }
  if (source.includes(replace)) {
    throw new SourceRepairError(`the file already contains "${replace}".`);
  }
  const occurrences = countOccurrences(source, expect);
  if (occurrences !== 1) {
    throw new SourceRepairError(
      `"${expect}" occurs ${occurrences} time(s); exactly one is required.`,
    );
  }

  let next = source.replace(expect, () => replace);
  if (strategy.ensureNamedImport) next = ensureNamedImport(next, strategy.ensureNamedImport);
  return next;
}

/**
 * Widen an existing `import { ... } from "<module>"` to include `name`.
 * The import statement must already exist: this never invents a new one.
 */
function ensureNamedImport(
  source: string,
  request: { readonly module: string; readonly name: string },
): string {
  const pattern = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*(["'])${escapeRegExp(request.module)}\\2;`,
    "g",
  );
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new SourceRepairError(
      `expected exactly one named import from "${request.module}", found ${matches.length}.`,
    );
  }
  const [statement, names, quote] = matches[0];
  const existing = names
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (existing.includes(request.name)) return source;
  const widened = `import { ${[...existing, request.name].join(", ")} } from ${quote}${request.module}${quote};`;
  return source.replace(statement, () => widened);
}

/**
 * Relax a single CSS rule so long translations wrap instead of being clipped:
 * `width` becomes `max-width`, and `white-space: nowrap` is removed.
 */
function applyCssRelaxTextClamp(source: string, strategy: CssRelaxTextClamp): string {
  const pattern = new RegExp(
    `(^|\\n)([ \\t]*)${escapeRegExp(strategy.selector)}[ \\t]*\\{([^{}]*)\\}`,
    "g",
  );
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new SourceRepairError(
      `expected exactly one "${strategy.selector}" rule, found ${matches.length}.`,
    );
  }
  const [rule, lead, indent, block] = matches[0];

  // Split on declaration boundaries, keeping each segment's original
  // whitespace so untouched declarations are reproduced byte for byte.
  const segments = block.split(";");
  const trailing = segments.pop() ?? "";
  let widthRewritten = 0;
  let nowrapRemoved = 0;

  const kept = segments.filter((segment) => {
    const colon = segment.indexOf(":");
    if (colon === -1) return true;
    const property = segment.slice(0, colon).trim().toLowerCase();
    const value = segment.slice(colon + 1).trim().toLowerCase();
    if (property === "white-space" && value === "nowrap") {
      nowrapRemoved += 1;
      return false;
    }
    return true;
  });

  const rewritten = kept.map((segment) => {
    const colon = segment.indexOf(":");
    if (colon === -1) return segment;
    const rawProperty = segment.slice(0, colon);
    if (rawProperty.trim().toLowerCase() !== "width") return segment;
    widthRewritten += 1;
    return `${rawProperty.replace(/width\s*$/i, "max-width")}${segment.slice(colon)}`;
  });

  if (widthRewritten === 0 && nowrapRemoved === 0) {
    throw new SourceRepairError(
      `"${strategy.selector}" declares neither a fixed width nor white-space: nowrap.`,
    );
  }
  if (widthRewritten > 1) {
    throw new SourceRepairError(
      `"${strategy.selector}" declares width ${widthRewritten} times; the rewrite would be ambiguous.`,
    );
  }

  const nextBlock = `${rewritten.join(";")}${rewritten.length ? ";" : ""}${trailing}`;
  const nextRule = `${lead}${indent}${strategy.selector} {${nextBlock}}`;
  return source.replace(rule, () => nextRule);
}

/**
 * Detect a file's dominant line ending so a rewrite preserves it.
 *
 * A repo with `core.autocrlf=true` hands us CRLF on Windows; re-emitting LF
 * would turn a one-line insert into a whole-file diff.
 */
function detectEol(source: string): "\r\n" | "\n" {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * Insert one key into a flat `{ "key": "string" }` dictionary.
 *
 * The file is re-serialised, so it must already be canonical two-space JSON in
 * its own line-ending convention. If it is not, the strategy refuses rather
 * than emitting a reformatting diff that would hide the real change.
 */
function applyTranslationKeyInsert(
  source: string,
  strategy: TranslationKeyInsert,
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new SourceRepairError(
      `the target is not valid JSON (${(error as Error).message}).`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SourceRepairError("the target is not a JSON object.");
  }
  const dictionary = parsed as Record<string, unknown>;
  if (Object.values(dictionary).some((value) => typeof value !== "string")) {
    throw new SourceRepairError("the target is not a flat string dictionary.");
  }
  if (Object.hasOwn(dictionary, strategy.key)) {
    throw new SourceRepairError(`"${strategy.key}" is already present.`);
  }
  if (!strategy.value.trim()) {
    throw new SourceRepairError(`the replacement for "${strategy.key}" is blank.`);
  }
  const eol = detectEol(source);
  const serialise = (value: unknown) =>
    `${JSON.stringify(value, null, 2).replaceAll("\n", eol)}${eol}`;
  if (serialise(dictionary) !== source) {
    throw new SourceRepairError(
      "the target is not canonical two-space JSON; refusing to reformat it.",
    );
  }
  return serialise({ ...dictionary, [strategy.key]: strategy.value });
}

/** Run one strategy over a file's text. Throws unless the edit is unambiguous. */
export function applySourceStrategy(
  source: string,
  strategy: SourceRepairStrategy,
): string {
  const next =
    strategy.kind === "jsx-open-tag"
      ? applyJsxOpenTagRewrite(source, strategy)
      : strategy.kind === "css-relax-text-clamp"
        ? applyCssRelaxTextClamp(source, strategy)
        : applyTranslationKeyInsert(source, strategy);
  if (next === source) {
    throw new SourceRepairError(`the ${strategy.kind} strategy changed nothing.`);
  }
  return next;
}

export function describeStrategy(strategy: SourceRepairStrategy): string {
  switch (strategy.kind) {
    case "jsx-open-tag":
      return `Rewrite ${strategy.expect} to ${strategy.replace}`;
    case "css-relax-text-clamp":
      return `Relax the fixed width and nowrap clamp on ${strategy.selector}`;
    default:
      return `Insert the "${strategy.key}" translation`;
  }
}
