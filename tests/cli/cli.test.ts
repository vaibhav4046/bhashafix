import { describe, expect, it } from "vitest";
import { EXIT, runCli } from "../../packages/cli/src/cli";

function capture() {
  const output: string[] = [];
  const errors: string[] = [];
  return {
    output,
    errors,
    io: {
      out: (message: string) => output.push(message),
      error: (message: string) => errors.push(message),
    },
  };
}

describe("CLI contract", () => {
  it("documents all commands and stable exit codes", async () => {
    const captured = capture();
    expect(await runCli(["--help"], captured.io)).toBe(EXIT.passed);
    for (const command of [
      "init",
      "doctor",
      "inspect",
      "locales",
      "crawl",
      "extract",
      "scan",
      "translate-preview",
      "issues",
      "translate",
      "diagnose",
      "repair",
      "verify",
      "report",
      "ci",
      "mcp",
    ]) {
      expect(captured.output.join("\n")).toContain(command);
    }
  });

  it("returns configuration and provider exit codes without leaking secrets", async () => {
    const invalid = capture();
    expect(await runCli(["unknown-command"], invalid.io)).toBe(
      EXIT.invalidConfig,
    );
    const provider = capture();
    expect(await runCli(["translate", "--no-ai"], provider.io)).toBe(
      EXIT.provider,
    );
    expect(provider.errors.join(" ")).not.toContain("sk-");
  });

  it("returns exit 1 when verified blocking issues exist", async () => {
    const captured = capture();
    expect(
      await runCli(["scan", "--quiet", "--project", process.cwd()], captured.io),
    ).toBe(EXIT.blocking);
  });

  it("lists the global registry and preserves preview placeholders", async () => {
    const locales = capture();
    expect(await runCli(["locales", "--json"], locales.io)).toBe(EXIT.passed);
    const registry = JSON.parse(locales.output.join("\n"));
    expect(registry.locales).toHaveLength(17);
    expect(registry.locales.map((item: { canonical: string }) => item.canonical)).toEqual(
      expect.arrayContaining(["fa-IR", "bn-BD", "vi-VN", "id-ID"]),
    );

    const preview = capture();
    expect(
      await runCli(
        [
          "translate-preview",
          "--json",
          "--locale",
          "ar-SA",
          "--text",
          "Pay {amount} with AtlasPay",
        ],
        preview.io,
      ),
    ).toBe(EXIT.passed);
    const result = JSON.parse(preview.output.join("\n"));
    expect(result.label).toContain("not the production website");
    expect(result.placeholders.valid).toBe(true);
    expect(result.target).toContain("{amount}");
    expect(result.target).toContain("AtlasPay");
  });
});
