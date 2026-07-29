import { describe, expect, it } from "vitest";
import {
  checkGlossary,
  matchTranslationMemory,
  placeholderMismatch,
  pseudoLocalise,
  validateIcuMessage,
} from "@bhashafix/linguistic-engine";

describe("linguistic deterministic checks", () => {
  it("detects placeholder corruption", () => {
    expect(placeholderMismatch("Pay {amount}", "Payer le montant").valid).toBe(
      false,
    );
    expect(placeholderMismatch("Pay {amount}", "Payer {amount}").valid).toBe(
      true,
    );
  });

  it("validates balanced ICU and mandatory plural other branches", () => {
    expect(validateIcuMessage("{count, plural, one {1} other {#}}").valid).toBe(
      true,
    );
    expect(validateIcuMessage("{count, plural, one {1}}").valid).toBe(false);
    expect(validateIcuMessage("Hello }").valid).toBe(false);
  });

  it("enforces approved and forbidden glossary terminology", () => {
    const findings = checkGlossary("Checkout", "Finalizar compra", "es-MX", [
      {
        source: "Checkout",
        approved: { "es-MX": "Pagar" },
        forbidden: { "es-MX": ["Finalizar compra"] },
      },
    ]);
    expect(findings[0].expected).toBe("Pagar");
  });

  it("matches translation memory by exact, normalised and context paths", () => {
    const memory = [
      {
        source: "Checkout",
        target: "Pagar",
        locale: "es-MX",
        context: "checkout-title",
        provider: "human",
        humanApproved: true,
        updatedAt: "2026-07-29T00:00:00.000Z",
      },
    ];
    expect(matchTranslationMemory("Checkout", "es-MX", undefined, memory).kind).toBe(
      "exact",
    );
    expect(
      matchTranslationMemory(" checkout ", "es-MX", undefined, memory).kind,
    ).toBe("normalised");
  });

  it("preserves placeholders, tags, URLs and protected terms in pseudo locales", () => {
    const source = "Pay {amount} at <b>AtlasPay</b> https://atlas.test";
    for (const mode of [
      "expanded-latin",
      "rtl-mirrored",
      "extreme-expansion",
      "long-compound",
    ] as const) {
      const transformed = pseudoLocalise(source, mode, ["AtlasPay"]);
      expect(transformed).toContain("{amount}");
      expect(transformed).toContain("<b>");
      expect(transformed).toContain("</b>");
      expect(transformed).toContain("AtlasPay");
      expect(transformed).toContain("https://atlas.test");
    }
  });
});
