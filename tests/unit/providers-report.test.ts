import { describe, expect, it } from "vitest";
import { NoModelProvider, ProviderRouter } from "@bhashafix/providers";
import { buildHtmlReport, buildSarif } from "@bhashafix/report";
import { scanDemoProject } from "@bhashafix/core";

describe("providers and reports", () => {
  it("does not fabricate results when no model provider is configured", async () => {
    const router = new ProviderRouter([new NoModelProvider()]);
    await expect(
      router.withTimeout((provider) =>
        provider.generateTranslation({
          sourceLocale: "en-GB",
          targetLocale: "ja-JP",
          sourceText: "Pay",
        }),
      ),
    ).rejects.toThrow(/unavailable/);
  });

  it("generates structured and escaped report formats", async () => {
    const scan = await scanDemoProject(process.cwd());
    const sarif = buildSarif(scan);
    const html = buildHtmlReport({
      ...scan,
      issues: [
        { ...scan.issues[0], description: "<script>alert(1)</script>" },
      ],
    });
    expect(sarif.version).toBe("2.1.0");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
