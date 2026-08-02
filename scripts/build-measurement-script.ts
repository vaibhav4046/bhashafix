/**
 * Compile the in-page measurement into a plain-JavaScript string.
 *
 * The measurement runs inside the scanned page, so it cannot arrive there as a
 * bundled closure: a production bundler minifies it and rewrites references to
 * module-scope bindings that do not exist in the browser realm. On Vercel that
 * surfaced as `t is not defined` the moment the function was serialised.
 *
 * A string is data. No bundler rewrites it. This keeps `measure.ts` as the
 * single source of truth and emits the browser-ready form beside it;
 * `tests/unit/measurement-script.test.ts` fails if the two drift.
 */
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const entry = path.join(root, "packages", "browser", "src", "measure.ts");
const output = path.join(root, "packages", "browser", "src", "measure-script.generated.ts");

export const GLOBAL_NAME = "__bhashafixMeasure";

export async function compileMeasurementScript(): Promise<string> {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "iife",
    globalName: GLOBAL_NAME,
    platform: "browser",
    target: "es2020",
    // Names are kept off deliberately: the `__name` helper esbuild emits for
    // keepNames is exactly the kind of out-of-scope reference this file exists
    // to avoid.
    keepNames: false,
    minify: false,
    legalComments: "none",
  });
  const [file] = result.outputFiles;
  if (!file) throw new Error("esbuild produced no output for the measurement script.");
  return file.text;
}

export function renderModule(script: string): string {
  return `/**
 * GENERATED FILE - do not edit.
 *
 * Built from packages/browser/src/measure.ts by scripts/build-measurement-script.ts.
 * Regenerate with \`pnpm measure:build\`.
 *
 * This is the measurement as plain JavaScript, ready to be evaluated inside a
 * scanned page. It is a string so that no bundler can rewrite it.
 */
export const MEASUREMENT_GLOBAL = ${JSON.stringify(GLOBAL_NAME)};

export const MEASUREMENT_SCRIPT = ${JSON.stringify(script)};
`;
}

/** The expression a driver evaluates to run the measurement in a page. */
export function measurementExpression(limits: {
  maxElements: number;
  maxTextLength: number;
}): string {
  return `${GLOBAL_NAME}.collectPageMeasurement(${JSON.stringify(limits)})`;
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("build-measurement-script.ts")) {
  const script = await compileMeasurementScript();
  const rendered = renderModule(script);
  const existing = await readFile(output, "utf8").catch(() => null);
  if (existing === rendered) {
    console.log(`MEASUREMENT SCRIPT unchanged (${script.length} bytes).`);
  } else {
    await writeFile(output, rendered);
    console.log(`MEASUREMENT SCRIPT written (${script.length} bytes) to ${path.relative(root, output)}`);
  }
}
