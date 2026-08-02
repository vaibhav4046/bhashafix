import { describe, expect, it } from "vitest";
import {
  MEASUREMENT_GLOBAL,
  MEASUREMENT_SCRIPT,
} from "../../packages/browser/src/measure-script.generated";
import {
  GLOBAL_NAME,
  compileMeasurementScript,
  renderModule,
} from "../../scripts/build-measurement-script";
import { readFile } from "node:fs/promises";
import path from "node:path";

const generated = path.join(
  process.cwd(),
  "packages",
  "browser",
  "src",
  "measure-script.generated.ts",
);

describe("in-page measurement script", () => {
  it("is in sync with measure.ts", async () => {
    // The script is generated, so it can silently rot. Recompile and compare:
    // a stale build would ship a measurement that no longer matches the source.
    const rebuilt = renderModule(await compileMeasurementScript());
    const onDisk = await readFile(generated, "utf8");
    expect(
      onDisk,
      "measure-script.generated.ts is stale — run `pnpm measure:build`",
    ).toBe(rebuilt);
  }, 30_000);

  it("exposes the collector on the agreed global", () => {
    expect(MEASUREMENT_GLOBAL).toBe(GLOBAL_NAME);
    expect(MEASUREMENT_SCRIPT).toContain(MEASUREMENT_GLOBAL);
    expect(MEASUREMENT_SCRIPT).toContain("collectPageMeasurement");
  });

  it("carries no bundler helper the page would not have", () => {
    // `t is not defined` on Vercel came from exactly this: a minified body
    // referencing module scope. The generated script must stand alone.
    expect(MEASUREMENT_SCRIPT).not.toContain("__name(");
    expect(MEASUREMENT_SCRIPT).not.toMatch(/\brequire\(/);
    expect(MEASUREMENT_SCRIPT).not.toMatch(/\bimport\s*\(/);
    // A self-contained IIFE assigned to the agreed global, nothing hoisted in
    // from a module wrapper.
    expect(MEASUREMENT_SCRIPT).toContain(`var ${MEASUREMENT_GLOBAL} = (() => {`);
  });
});
