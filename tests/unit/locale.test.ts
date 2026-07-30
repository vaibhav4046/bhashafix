import { describe, expect, it } from "vitest";
import {
  formatLocaleSample,
  isValidLocaleTag,
  localeProfile,
  REPRESENTATIVE_LOCALE_MATRIX,
} from "@bhashafix/locale-engine";

describe("locale engine", () => {
  it("validates and canonicalises BCP 47 locale tags", () => {
    expect(isValidLocaleTag("zh-Hans-CN")).toBe(true);
    expect(isValidLocaleTag("en_GB")).toBe(false);
    expect(localeProfile("en-gb").canonical).toBe("en-GB");
  });

  it("derives writing direction from script metadata", () => {
    expect(localeProfile("ar-SA").direction).toBe("rtl");
    expect(localeProfile("he-IL").direction).toBe("rtl");
    expect(localeProfile("fa-IR").direction).toBe("rtl");
    expect(localeProfile("ja-JP").direction).toBe("ltr");
  });

  it("covers the representative global script matrix with Intl formatting", () => {
    expect(REPRESENTATIVE_LOCALE_MATRIX).toHaveLength(17);
    expect(REPRESENTATIVE_LOCALE_MATRIX).toEqual(
      expect.arrayContaining(["fa-IR", "bn-BD", "vi-VN", "id-ID"]),
    );
    for (const locale of REPRESENTATIVE_LOCALE_MATRIX) {
      const sample = formatLocaleSample(locale);
      expect(sample.date.length).toBeGreaterThan(2);
      expect(sample.currency.length).toBeGreaterThan(2);
    }
  });
});
