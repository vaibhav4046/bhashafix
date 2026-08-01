/**
 * Source-file repair plans.
 *
 * The JSON-pointer engine in `./index.ts` can only assign values inside data
 * files. This module carries the same safety contract - explicit project root,
 * explicit issue IDs, path allowlist, symlink rejection, bounded diff, diff
 * hash, dry-run default, rollback snapshot and audit log - over arbitrary text
 * files, so a real `.tsx` or `.css` defect can be repaired.
 *
 * Validation is hand-written rather than schema-driven: `@bhashafix/shared`
 * owns the zod dependency, and this package deliberately does not take one.
 */

import { createHash } from "node:crypto";
import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { Scan } from "@bhashafix/shared";
import { buildUnifiedDiff } from "./diff.js";
import {
  assertAllowlisted,
  assertConfinedPath,
  assertNoSymlink,
  normaliseRelative,
} from "./safety.js";
import {
  applySourceStrategy,
  describeStrategy,
  SourceRepairError,
  type SourceRepairStrategy,
} from "./source-strategies.js";

/** Matches the verifier's default blast-radius budget. */
export const DEFAULT_MAX_CHANGED_LINES = 200;
/** A repair that needs more than this is not a targeted codemod. */
export const DEFAULT_MAX_DIFF_BYTES = 20_000;

const SHA256 = /^[a-f0-9]{64}$/;

export type SourceRepairOperation = {
  /** Measured issues this operation closes. Never empty, never inferred. */
  readonly issueIds: string[];
  readonly ruleId: string;
  readonly file: string;
  readonly strategy: SourceRepairStrategy;
  readonly reason: string;
  readonly beforeSha256: string;
  readonly afterSha256: string;
};

export type SourceRepairPlan = {
  readonly scanId: string;
  readonly createdAt: string;
  readonly projectRoot: string;
  readonly allowlist: string[];
  readonly operations: SourceRepairOperation[];
  readonly unifiedDiff: string;
  readonly diffHash: string;
  readonly changedFiles: number;
  readonly changedLines: number;
  readonly maxChangedFiles: number;
  readonly maxChangedLines: number;
  readonly maxDiffBytes: number;
};

/** One requested codemod, tied to the measured issues that justify it. */
export type SourceRepairRequest = {
  readonly issueIds: string[];
  readonly ruleId: string;
  /** Path relative to `projectRoot`. Must be on the allowlist. */
  readonly file: string;
  readonly strategy: SourceRepairStrategy;
  readonly reason?: string;
};

export type PrepareSourceRepairOptions = {
  /** Defaults to `scan.config.allowlist`. Must be non-empty either way. */
  readonly allowlist?: string[];
  readonly maxChangedLines?: number;
  readonly maxChangedFiles?: number;
  readonly maxDiffBytes?: number;
};

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function countChangedDiffLines(unifiedDiff: string): number {
  return unifiedDiff
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") && !line.startsWith("+++")) ||
        (line.startsWith("-") && !line.startsWith("---")),
    ).length;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new SourceRepairError(message);
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  assert(typeof value === "string" && value.length > 0, `${field} must be a non-empty string.`);
}

function assertPositiveInteger(value: unknown, field: string): asserts value is number {
  assert(
    typeof value === "number" && Number.isInteger(value) && value > 0,
    `${field} must be a positive integer.`,
  );
}

/** Validate an untrusted strategy object, narrowing it for use. */
export function parseSourceRepairStrategy(value: unknown): SourceRepairStrategy {
  assert(!!value && typeof value === "object", "strategy must be an object.");
  const candidate = value as Record<string, unknown>;
  switch (candidate.kind) {
    case "jsx-open-tag": {
      assertNonEmptyString(candidate.expect, "strategy.expect");
      assertNonEmptyString(candidate.replace, "strategy.replace");
      const named = candidate.ensureNamedImport;
      if (named !== undefined) {
        assert(!!named && typeof named === "object", "strategy.ensureNamedImport must be an object.");
        const request = named as Record<string, unknown>;
        assertNonEmptyString(request.module, "strategy.ensureNamedImport.module");
        assertNonEmptyString(request.name, "strategy.ensureNamedImport.name");
        return {
          kind: "jsx-open-tag",
          expect: candidate.expect,
          replace: candidate.replace,
          ensureNamedImport: { module: request.module, name: request.name },
        };
      }
      return { kind: "jsx-open-tag", expect: candidate.expect, replace: candidate.replace };
    }
    case "css-relax-text-clamp":
      assertNonEmptyString(candidate.selector, "strategy.selector");
      return { kind: "css-relax-text-clamp", selector: candidate.selector };
    case "translation-key":
      assertNonEmptyString(candidate.key, "strategy.key");
      assertNonEmptyString(candidate.value, "strategy.value");
      return { kind: "translation-key", key: candidate.key, value: candidate.value };
    default:
      throw new SourceRepairError(`unknown strategy kind "${String(candidate.kind)}".`);
  }
}

/** Validate an untrusted plan object before anything reads it as trusted. */
export function parseSourceRepairPlan(value: unknown): SourceRepairPlan {
  assert(!!value && typeof value === "object", "the repair plan must be an object.");
  const plan = value as Record<string, unknown>;
  assertNonEmptyString(plan.scanId, "plan.scanId");
  assertNonEmptyString(plan.createdAt, "plan.createdAt");
  assert(
    !Number.isNaN(Date.parse(plan.createdAt)),
    "plan.createdAt must be an ISO timestamp.",
  );
  assertNonEmptyString(plan.projectRoot, "plan.projectRoot");
  assertNonEmptyString(plan.unifiedDiff, "plan.unifiedDiff");
  assertNonEmptyString(plan.diffHash, "plan.diffHash");
  assert(SHA256.test(plan.diffHash), "plan.diffHash must be a sha256 hex digest.");
  assert(
    Array.isArray(plan.allowlist) && plan.allowlist.length > 0,
    "plan.allowlist must be a non-empty array.",
  );
  const allowlist = plan.allowlist.map((entry, index) => {
    assertNonEmptyString(entry, `plan.allowlist[${index}]`);
    return entry;
  });
  assert(
    Array.isArray(plan.operations) && plan.operations.length > 0,
    "plan.operations must be a non-empty array.",
  );
  const operations = plan.operations.map((entry, index) => {
    assert(!!entry && typeof entry === "object", `plan.operations[${index}] must be an object.`);
    const operation = entry as Record<string, unknown>;
    assert(
      Array.isArray(operation.issueIds) && operation.issueIds.length > 0,
      `plan.operations[${index}].issueIds must be a non-empty array.`,
    );
    const issueIds = operation.issueIds.map((issueId, position) => {
      assertNonEmptyString(issueId, `plan.operations[${index}].issueIds[${position}]`);
      return issueId;
    });
    assertNonEmptyString(operation.ruleId, `plan.operations[${index}].ruleId`);
    assertNonEmptyString(operation.file, `plan.operations[${index}].file`);
    assertNonEmptyString(operation.reason, `plan.operations[${index}].reason`);
    assertNonEmptyString(operation.beforeSha256, `plan.operations[${index}].beforeSha256`);
    assertNonEmptyString(operation.afterSha256, `plan.operations[${index}].afterSha256`);
    assert(
      SHA256.test(operation.beforeSha256) && SHA256.test(operation.afterSha256),
      `plan.operations[${index}] must carry sha256 hex digests.`,
    );
    return {
      issueIds,
      ruleId: operation.ruleId,
      file: operation.file,
      strategy: parseSourceRepairStrategy(operation.strategy),
      reason: operation.reason,
      beforeSha256: operation.beforeSha256,
      afterSha256: operation.afterSha256,
    } satisfies SourceRepairOperation;
  });
  assertPositiveInteger(plan.changedFiles, "plan.changedFiles");
  assertPositiveInteger(plan.changedLines, "plan.changedLines");
  assertPositiveInteger(plan.maxChangedFiles, "plan.maxChangedFiles");
  assertPositiveInteger(plan.maxChangedLines, "plan.maxChangedLines");
  assertPositiveInteger(plan.maxDiffBytes, "plan.maxDiffBytes");
  return {
    scanId: plan.scanId,
    createdAt: plan.createdAt,
    projectRoot: plan.projectRoot,
    allowlist,
    operations,
    unifiedDiff: plan.unifiedDiff,
    diffHash: plan.diffHash,
    changedFiles: plan.changedFiles,
    changedLines: plan.changedLines,
    maxChangedFiles: plan.maxChangedFiles,
    maxChangedLines: plan.maxChangedLines,
    maxDiffBytes: plan.maxDiffBytes,
  };
}

/**
 * Read a file, run every requested strategy for it in order, and return both
 * texts. Every guard in the safety contract that can be checked without
 * mutating anything runs here.
 */
async function transformFile(
  projectRoot: string,
  file: string,
  allowlist: string[],
  strategies: SourceRepairStrategy[],
) {
  assertAllowlisted(file, allowlist);
  const target = assertConfinedPath(projectRoot, file);
  await assertNoSymlink(projectRoot, target);
  const beforeText = await readFile(target, "utf8");
  let afterText = beforeText;
  for (const strategy of strategies) {
    afterText = applySourceStrategy(afterText, strategy);
  }
  return { target, beforeText, afterText };
}

/**
 * Build a source repair plan without touching the working tree.
 *
 * Throws unless every issue ID is present in `scan`, every file is on the
 * allowlist and inside the project root, every strategy anchor is unambiguous,
 * and the resulting diff is inside the configured blast radius.
 */
export async function prepareSourceRepair(
  projectRoot: string,
  scan: Scan,
  requests: SourceRepairRequest[],
  options: PrepareSourceRepairOptions = {},
): Promise<SourceRepairPlan> {
  assertNonEmptyString(scan.scanId, "an explicit scan ID");
  assert(requests.length > 0, "at least one repair request is required.");

  const known = new Set(scan.issues.map((issue) => issue.issueId));
  for (const request of requests) {
    assert(request.issueIds.length > 0, `${request.ruleId} names no issue ID.`);
    for (const issueId of request.issueIds) {
      assert(
        known.has(issueId),
        `issue ${issueId} is not present in scan ${scan.scanId}.`,
      );
    }
    parseSourceRepairStrategy(request.strategy);
  }

  const allowlist = options.allowlist ?? scan.config.allowlist;
  assert(allowlist.length > 0, "the path allowlist is empty.");
  const maxChangedLines = options.maxChangedLines ?? DEFAULT_MAX_CHANGED_LINES;
  const maxChangedFiles = options.maxChangedFiles ?? allowlist.length;
  const maxDiffBytes = options.maxDiffBytes ?? DEFAULT_MAX_DIFF_BYTES;

  const files = [...new Set(requests.map((request) => request.file))];
  assert(
    files.length <= maxChangedFiles,
    `the repair touches ${files.length} file(s); the limit is ${maxChangedFiles}.`,
  );

  const operations: SourceRepairOperation[] = [];
  const diffs: string[] = [];
  for (const file of files) {
    const forFile = requests.filter((request) => request.file === file);
    const { beforeText, afterText } = await transformFile(
      projectRoot,
      file,
      allowlist,
      forFile.map((request) => request.strategy),
    );
    const diff = buildUnifiedDiff(file, beforeText, afterText);
    assert(diff.length > 0, `${file} produced an empty diff.`);
    diffs.push(diff);
    // Hashes are of the whole file, so a plan can only be applied to the exact
    // bytes it was prepared against.
    operations.push(
      ...forFile.map((request) => ({
        issueIds: [...request.issueIds],
        ruleId: request.ruleId,
        file,
        strategy: request.strategy,
        reason: request.reason ?? describeStrategy(request.strategy),
        beforeSha256: sha256(beforeText),
        afterSha256: sha256(afterText),
      })),
    );
  }

  const unifiedDiff = diffs.join("");
  const changedLines = countChangedDiffLines(unifiedDiff);
  assert(
    changedLines <= maxChangedLines,
    `the repair changes ${changedLines} line(s); the limit is ${maxChangedLines}.`,
  );
  const diffBytes = Buffer.byteLength(unifiedDiff, "utf8");
  assert(
    diffBytes <= maxDiffBytes,
    `the diff is ${diffBytes} byte(s); the limit is ${maxDiffBytes}.`,
  );

  return parseSourceRepairPlan({
    scanId: scan.scanId,
    createdAt: new Date().toISOString(),
    projectRoot,
    allowlist,
    operations,
    unifiedDiff,
    diffHash: sha256(unifiedDiff),
    changedFiles: files.length,
    changedLines,
    maxChangedFiles,
    maxChangedLines,
    maxDiffBytes,
  });
}

export type ApplySourceRepairOptions = {
  /** Mutation is opt-in: omitting this leaves the working tree untouched. */
  readonly dryRun?: boolean;
  /** Restrict the apply to these measured issue IDs. */
  readonly issueIds?: string[];
  /** When supplied, must equal the recomputed diff hash or the apply aborts. */
  readonly expectedDiffHash?: string;
};

export type ApplySourceRepairResult = {
  readonly applied: boolean;
  readonly dryRun: boolean;
  readonly files: string[];
  readonly unifiedDiff: string;
  readonly diffHash: string;
  readonly changedLines: number;
  readonly rollbackRoot: string | null;
};

function rollbackRootFor(plan: SourceRepairPlan): string {
  return path.join(plan.projectRoot, ".bhashafix", "rollback", `source-${plan.scanId}`);
}

/**
 * Apply a prepared source repair. Dry-run is the default.
 *
 * The result is re-derived from the current bytes on disk. If any target moved
 * since `prepareSourceRepair`, the recomputed hash stops matching and nothing
 * is written.
 */
export async function applySourceRepair(
  plan: SourceRepairPlan,
  options: ApplySourceRepairOptions = {},
): Promise<ApplySourceRepairResult> {
  const parsed = parseSourceRepairPlan(plan);
  const dryRun = options.dryRun ?? true;
  const selected = options.issueIds
    ? parsed.operations.filter((operation) =>
        operation.issueIds.some((issueId) => options.issueIds!.includes(issueId)),
      )
    : parsed.operations;
  assert(selected.length > 0, "at least one issue ID is required.");

  const files = [...new Set(selected.map((operation) => operation.file))];
  const rendered: Array<{ file: string; target: string; afterText: string; diff: string }> = [];
  for (const file of files) {
    const forFile = selected.filter((operation) => operation.file === file);
    const { target, beforeText, afterText } = await transformFile(
      parsed.projectRoot,
      file,
      parsed.allowlist,
      forFile.map((operation) => operation.strategy),
    );
    assert(
      sha256(beforeText) === forFile[0].beforeSha256,
      `${file} changed since the plan was prepared; re-run prepareSourceRepair.`,
    );
    assert(
      sha256(afterText) === forFile[0].afterSha256,
      `${file} did not reproduce the planned result.`,
    );
    rendered.push({
      file,
      target,
      afterText,
      diff: buildUnifiedDiff(file, beforeText, afterText),
    });
  }

  const unifiedDiff = rendered.map((entry) => entry.diff).join("");
  const diffHash = sha256(unifiedDiff);
  const changedLines = countChangedDiffLines(unifiedDiff);
  if (options.expectedDiffHash) {
    assert(
      options.expectedDiffHash === diffHash,
      `the diff hash changed: expected ${options.expectedDiffHash}, recomputed ${diffHash}.`,
    );
  }
  if (!options.issueIds) {
    assert(
      diffHash === parsed.diffHash,
      `the plan's diff no longer reproduces: ${parsed.diffHash} became ${diffHash}.`,
    );
  }
  assert(
    changedLines <= parsed.maxChangedLines,
    `the repair changes ${changedLines} line(s); the limit is ${parsed.maxChangedLines}.`,
  );
  assert(
    Buffer.byteLength(unifiedDiff, "utf8") <= parsed.maxDiffBytes,
    "the diff exceeds the configured byte budget.",
  );

  if (dryRun) {
    return {
      applied: false,
      dryRun: true,
      files,
      unifiedDiff,
      diffHash,
      changedLines,
      rollbackRoot: null,
    };
  }

  const rollbackRoot = rollbackRootFor(parsed);
  await mkdir(rollbackRoot, { recursive: true });
  for (const entry of rendered) {
    const rollbackFile = path.join(rollbackRoot, normaliseRelative(entry.file));
    await mkdir(path.dirname(rollbackFile), { recursive: true });
    await copyFile(entry.target, rollbackFile);
  }
  for (const entry of rendered) {
    await writeFile(entry.target, entry.afterText, "utf8");
  }

  await mkdir(path.join(parsed.projectRoot, ".bhashafix"), { recursive: true });
  await appendFile(
    path.join(parsed.projectRoot, ".bhashafix", "audit.log"),
    `${JSON.stringify({
      at: new Date().toISOString(),
      action: "apply_source_repair",
      scanId: parsed.scanId,
      issueIds: selected.flatMap((operation) => operation.issueIds),
      ruleIds: [...new Set(selected.map((operation) => operation.ruleId))],
      strategies: [...new Set(selected.map((operation) => operation.strategy.kind))],
      files,
      diffHash,
      changedLines,
      rollbackRoot,
      committed: false,
    })}\n`,
    "utf8",
  );

  return { applied: true, dryRun: false, files, unifiedDiff, diffHash, changedLines, rollbackRoot };
}

/** Restore every file a source repair rewrote from its rollback snapshot. */
export async function restoreSourceRepair(plan: SourceRepairPlan): Promise<string[]> {
  const parsed = parseSourceRepairPlan(plan);
  const rollbackRoot = rollbackRootFor(parsed);
  const restored: string[] = [];
  for (const file of [...new Set(parsed.operations.map((operation) => operation.file))]) {
    assertAllowlisted(file, parsed.allowlist);
    const target = assertConfinedPath(parsed.projectRoot, file);
    await assertNoSymlink(parsed.projectRoot, target);
    await copyFile(path.join(rollbackRoot, normaliseRelative(file)), target);
    restored.push(file);
  }
  await appendFile(
    path.join(parsed.projectRoot, ".bhashafix", "audit.log"),
    `${JSON.stringify({
      at: new Date().toISOString(),
      action: "restore_source_repair",
      scanId: parsed.scanId,
      files: restored,
      rollbackRoot,
    })}\n`,
    "utf8",
  );
  return restored;
}

/** List the files held in a plan's rollback snapshot, for audit purposes. */
export async function listRollbackSnapshot(plan: SourceRepairPlan): Promise<string[]> {
  const root = rollbackRootFor(plan);
  const walk = async (dir: string): Promise<string[]> => {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory()
          ? walk(full)
          : [normaliseRelative(path.relative(root, full))];
      }),
    );
    return nested.flat();
  };
  return (await walk(root)).sort();
}

export * from "./source-strategies.js";
