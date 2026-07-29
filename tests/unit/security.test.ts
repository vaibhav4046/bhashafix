import { describe, expect, it } from "vitest";
import { isPrivateAddress, validateTargetUrl } from "@bhashafix/crawler";
import {
  assertAllowlisted,
  assertConfinedPath,
} from "@bhashafix/repair-engine";
import { redactSecrets } from "@bhashafix/extractor";

describe("security boundaries", () => {
  it("rejects private, loopback, metadata and unsupported URL targets", async () => {
    expect(isPrivateAddress("10.1.2.3")).toBe(true);
    expect(isPrivateAddress("192.168.1.2")).toBe(true);
    await expect(
      validateTargetUrl("http://127.0.0.1:3000", {
        hosted: true,
        allowLocalhost: false,
      }),
    ).rejects.toThrow(/Private-network|Loopback/);
    await expect(
      validateTargetUrl("http://169.254.169.254/latest/meta-data", {
        hosted: true,
        allowLocalhost: false,
      }),
    ).rejects.toThrow(/metadata/);
    await expect(
      validateTargetUrl("file:///etc/passwd", {
        hosted: true,
        allowLocalhost: false,
      }),
    ).rejects.toThrow(/Protocol/);
  });

  it("confines repair paths and enforces exact allowlists", () => {
    expect(() => assertConfinedPath("C:\\project", "..\\secret")).toThrow(
      /escapes/,
    );
    expect(() =>
      assertAllowlisted("src/business.ts", ["translations/en.json"]),
    ).toThrow(/allowlist/);
  });

  it("redacts common secret shapes", () => {
    expect(redactSecrets("Authorization: Bearer abc.def.ghi")).not.toContain(
      "abc.def.ghi",
    );
    expect(redactSecrets('api_key="secret-value"')).toContain("[REDACTED]");
  });
});
