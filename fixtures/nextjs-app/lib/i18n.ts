import { readFile } from "node:fs/promises";
import path from "node:path";

export const LOCALES = ["en-GB", "de-DE", "ar-SA", "ja-JP"] as const;

export type Locale = (typeof LOCALES)[number];

export const SOURCE_LOCALE: Locale = "en-GB";

/** Primary subtags whose script reads right to left. */
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur"]);

export function textDirection(locale: string): "ltr" | "rtl" {
  const language = locale.split("-")[0]?.toLowerCase() ?? "";
  return RTL_LANGUAGES.has(language) ? "rtl" : "ltr";
}

export type Messages = Record<string, string>;

export async function loadMessages(
  locale: string,
  root: string = process.cwd(),
): Promise<Messages> {
  const file = path.join(root, "messages", `${locale}.json`);
  return JSON.parse(await readFile(file, "utf8")) as Messages;
}

/**
 * Look a key up in the active dictionary.
 *
 * The fallback returns the key itself, which is exactly how an untranslated
 * string reaches the interface when a locale file is missing an entry.
 */
export function translate(messages: Messages, key: string): string {
  return messages[key] ?? key;
}
