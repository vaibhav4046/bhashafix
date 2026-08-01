import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanDemoProject } from "@bhashafix/core";
import { buildUnifiedDiff, prepareRepair } from "@bhashafix/repair-engine";

const root = process.cwd();
const fixtureFiles = [
  "layout.json",
  "locale-state.json",
  "translations.json",
  "glossary.json",
];

async function resetFixtures() {
  await Promise.all(
    fixtureFiles.map((file) =>
      copyFile(
        path.join(root, "fixtures/multilingual-demo/baseline", file),
        path.join(root, "apps/demo-target/data", file),
      ),
    ),
  );
}

function git(cwd: string, args: string[]) {
  const run = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (run.error) throw run.error;
  if (run.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} exited ${run.status}\n${run.stdout}${run.stderr}`,
    );
  }
  // `git apply --verbose` reports progress on stderr, so return both streams.
  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

/**
 * Stage the given files in a throwaway git repository and apply the patch with
 * the real `git apply`. core.autocrlf is forced off so the bytes we assert on
 * are the bytes the patch produced.
 */
async function applyPatchInTempRepo(
  files: Record<string, string>,
  patch: string,
) {
  const repo = await mkdtemp(path.join(tmpdir(), "bhashafix-patch-"));
  git(repo, ["init", "--quiet"]);
  git(repo, ["config", "core.autocrlf", "false"]);
  for (const [file, contents] of Object.entries(files)) {
    const target = path.join(repo, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
  }
  const patchFile = path.join(repo, "repair.patch");
  await writeFile(patchFile, patch, "utf8");
  const check = git(repo, ["apply", "--check", "--verbose", "repair.patch"]);
  const apply = git(repo, ["apply", "--verbose", "repair.patch"]);
  const applied: Record<string, string> = {};
  for (const file of Object.keys(files)) {
    applied[file] = await readFile(path.join(repo, file), "utf8");
  }
  return { repo, check, apply, applied };
}

describe("unified diff is a real, appliable patch", () => {
  beforeAll(resetFixtures);
  afterAll(resetFixtures);

  it("emits git-format headers and real line-numbered hunks", async () => {
    const baseline = await scanDemoProject(root);
    const plan = await prepareRepair(root, baseline);

    expect(plan.unifiedDiff).toContain("--- a/apps/demo-target/data/layout.json");
    expect(plan.unifiedDiff).toContain("+++ b/apps/demo-target/data/layout.json");
    // Real hunk headers carry line numbers and counts, not a JSON pointer.
    expect(plan.unifiedDiff).toMatch(/^@@ -\d+,\d+ \+\d+,\d+ @@$/m);
    expect(plan.unifiedDiff).not.toMatch(/^@@ [a-zA-Z]/m);
    expect(plan.unifiedDiff.endsWith("\n")).toBe(true);
  });

  it("applies cleanly with the real `git apply --check` and reproduces the repair", async () => {
    const baseline = await scanDemoProject(root);
    const plan = await prepareRepair(root, baseline);
    const touched = [...new Set(plan.operations.map((operation) => operation.file))];

    const before: Record<string, string> = {};
    for (const file of touched) {
      before[file] = await readFile(path.join(root, file), "utf8");
    }

    const { check, apply, applied } = await applyPatchInTempRepo(
      before,
      plan.unifiedDiff,
    );
    expect(check.status).toBe(0);
    expect(check.output).toContain("Checking patch");
    expect(apply.status).toBe(0);

    // Independent oracle: parse the ORIGINAL text, write the pointers ourselves,
    // and serialise the way applyRepair documents it writes files back.
    for (const file of touched) {
      const expected = JSON.parse(before[file]) as Record<string, unknown>;
      for (const operation of plan.operations.filter(
        (item) => item.file === file,
      )) {
        let node = expected;
        for (const segment of operation.pointer.slice(0, -1)) {
          node = node[segment] as Record<string, unknown>;
        }
        node[operation.pointer.at(-1)!] = operation.after;
      }
      expect(applied[file]).toBe(`${JSON.stringify(expected, null, 2)}\n`);
    }
  });

  it("survives a missing trailing newline on the original file", async () => {
    const before = '{\n  "a": 1\n}';
    const after = '{\n  "a": 2\n}\n';
    const patch = buildUnifiedDiff("data/sample.json", before, after);

    expect(patch).toContain("\\ No newline at end of file");
    const { applied } = await applyPatchInTempRepo(
      { "data/sample.json": before },
      patch,
    );
    expect(applied["data/sample.json"]).toBe(after);
  });

  it("emits separate hunks for changes that are far apart", async () => {
    const lines = Array.from({ length: 40 }, (_, index) => `line ${index}`);
    const before = `${lines.join("\n")}\n`;
    const changed = [...lines];
    changed[2] = "line 2 changed";
    changed[34] = "line 34 changed";
    const after = `${changed.join("\n")}\n`;
    const patch = buildUnifiedDiff("data/sample.txt", before, after);

    expect(patch.match(/^@@ /gm)).toHaveLength(2);
    const { applied } = await applyPatchInTempRepo(
      { "data/sample.txt": before },
      patch,
    );
    expect(applied["data/sample.txt"]).toBe(after);
  });

  it("handles pure insertion and pure deletion at the end of a file", async () => {
    const before = "alpha\nbravo\n";
    const grown = "alpha\nbravo\ncharlie\ndelta\n";
    const insertion = buildUnifiedDiff("data/list.txt", before, grown);
    const deletion = buildUnifiedDiff("data/list.txt", grown, before);

    const inserted = await applyPatchInTempRepo(
      { "data/list.txt": before },
      insertion,
    );
    expect(inserted.applied["data/list.txt"]).toBe(grown);

    const deleted = await applyPatchInTempRepo(
      { "data/list.txt": grown },
      deletion,
    );
    expect(deleted.applied["data/list.txt"]).toBe(before);
  });

  it("returns an empty diff when nothing changed", () => {
    expect(buildUnifiedDiff("data/same.json", "{}\n", "{}\n")).toBe("");
  });
});
