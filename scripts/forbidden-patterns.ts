/**
 * Patterns for claims that must never ship.
 *
 * The trigger strings are assembled from fragments on purpose. The hostile
 * audit scans every file in the repository including itself and the modules it
 * imports, so a verbatim regex literal here would match itself and report a
 * permanent false positive. The previous workaround — exempting the auditor and
 * the deck validator from the scan entirely — also silently disabled the secret
 * scan for those files.
 */

const join = (...parts: string[]) => parts.join("");

const PLACEHOLDER_URL_ALTERNATIVES = [
  join("your", "-product\\.com"),
  join("example", "\\.vercel\\.app"),
  join("github\\.com\\/(?:your", "|example)"),
  join("REPLACE", "_ME"),
];

/** Placeholder or invented public URLs left in shipped copy. */
export const PLACEHOLDER_PUBLIC_URL = new RegExp(
  PLACEHOLDER_URL_ALTERNATIVES.join("|"),
  "i",
);

const UNSUPPORTED_CLAIM_ALTERNATIVES = [
  join("guarantees? per", "fect"),
  join("per", "fect (?:native|human)[-\\s]level"),
  join("every language per", "fectly"),
];

/** Translation-quality claims the product cannot support. */
export const UNSUPPORTED_LANGUAGE_CLAIM = new RegExp(
  UNSUPPORTED_CLAIM_ALTERNATIVES.join("|"),
  "i",
);

/** Absolute developer-machine paths that must not appear in shipped artifacts. */
export const MACHINE_PATH = /(?:[A-Z]:\\Users\\[^\\]+|[A-Z]:\/Users\/[^/]+)/;

/** Long-lived credentials. */
export const EXPOSED_SECRET =
  /(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
