import { describe, expect, it } from "vitest";
import {
  describeServerlessFailure,
  validateServerlessBrowserRequest,
} from "../../packages/browser/src/serverless";

describe("hosted Chromium network boundary", () => {
  it("blocks private and metadata destinations on every intercepted request", async () => {
    await expect(
      validateServerlessBrowserRequest("http://127.0.0.1:3000/admin"),
    ).rejects.toThrow(/Private-network|Loopback/);
    await expect(
      validateServerlessBrowserRequest("http://169.254.169.254/latest/meta-data"),
    ).rejects.toThrow(/metadata/);
  });

  it("allows browser-local resources without opening a network connection", async () => {
    await expect(
      validateServerlessBrowserRequest("data:text/plain,hello"),
    ).resolves.toBeUndefined();
    await expect(
      validateServerlessBrowserRequest("about:blank"),
    ).resolves.toBeUndefined();
  });

  it("never returns raw runtime paths or stack details to the caller", () => {
    const result = describeServerlessFailure(
      new Error("Failed at sensitive runtime location: internal stack"),
    );
    expect(result).not.toContain("sensitive runtime location");
    expect(result).not.toContain("internal stack");
    expect(result).toMatch(/hosted browser/i);
  });
});
