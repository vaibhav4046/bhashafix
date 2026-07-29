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
      "inspect",
      "crawl",
      "extract",
      "scan",
      "translate",
      "diagnose",
      "repair",
      "verify",
      "report",
      "ci",
      "mcp",
      "doctor",
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
});
