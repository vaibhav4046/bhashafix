import {
  appendFile,
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { loadDemoPredicates } from "@bhashafix/core";
import {
  RepairPlanSchema,
  type RepairOperation,
  type RepairPlan,
  type Scan,
} from "@bhashafix/shared";

const DIFF_CONTEXT_LINES = 3;
const NO_NEWLINE_MARKER = "\\ No newline at end of file";
/** Guard against a pathological O(n*m) LCS table if a very large file is ever allowlisted. */
const MAX_LCS_CELLS = 4_000_000;

function normaliseRelative(file: string) {
  return file.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

export function assertAllowlisted(file: string, allowlist: string[]) {
  const normalized = normaliseRelative(file);
  if (!allowlist.map(normaliseRelative).includes(normalized)) {
    throw new Error(`Repair rejected: ${file} is outside the path allowlist.`);
  }
}

export function assertConfinedPath(projectRoot: string, file: string) {
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, file);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Repair rejected: ${file} escapes the project root.`);
  }
  return target;
}

async function assertNoSymlink(projectRoot: string, target: string) {
  const rootReal = await realpath(projectRoot);
  const parentReal = await realpath(path.dirname(target));
  const relative = path.relative(rootReal, parentReal);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Repair rejected: resolved parent escapes the project root.");
  }
  const stats = await lstat(target);
  if (stats.isSymbolicLink()) {
    throw new Error("Repair rejected: allowlisted target must not be a symlink.");
  }
}

function readPointer(value: unknown, pointer: string[]) {
  let current = value;
  for (const segment of pointer) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function writePointer(value: unknown, pointer: string[], after: unknown) {
  let current = value as Record<string, unknown>;
  for (const segment of pointer.slice(0, -1)) {
    const child = current[segment];
    if (!child || typeof child !== "object") {
      throw new Error(`Repair pointer does not exist: ${pointer.join(".")}`);
    }
    current = child as Record<string, unknown>;
  }
  current[pointer.at(-1)!] = after;
}

type DiffLine = { readonly text: string; readonly lastWithoutNewline: boolean };
type DiffEdit = {
  readonly kind: "equal" | "delete" | "insert";
  readonly line: DiffLine;
};

/** Split file text into diffable lines, remembering an absent final newline. */
function toDiffLines(text: string): DiffLine[] {
  if (text === "") return [];
  const endsWithNewline = text.endsWith("\n");
  const raw = text.split("\n");
  if (endsWithNewline) raw.pop();
  return raw.map((line, index) => ({
    text: line,
    lastWithoutNewline: !endsWithNewline && index === raw.length - 1,
  }));
}

/** Comparison identity: a final line without a newline never equals one with it. */
function diffLineKey(line: DiffLine) {
  return `${line.lastWithoutNewline ? "1" : "0"}${line.text}`;
}

/** Classic longest-common-subsequence backtrack over two line arrays. */
function lcsEdits(before: DiffLine[], after: DiffLine[]): DiffEdit[] {
  const rows = before.length;
  const columns = after.length;
  const lengths = Array.from(
    { length: rows + 1 },
    () => new Uint32Array(columns + 1),
  );
  for (let row = rows - 1; row >= 0; row--) {
    for (let column = columns - 1; column >= 0; column--) {
      lengths[row][column] =
        diffLineKey(before[row]) === diffLineKey(after[column])
          ? lengths[row + 1][column + 1] + 1
          : Math.max(lengths[row + 1][column], lengths[row][column + 1]);
    }
  }
  const edits: DiffEdit[] = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    if (diffLineKey(before[row]) === diffLineKey(after[column])) {
      edits.push({ kind: "equal", line: before[row] });
      row += 1;
      column += 1;
    } else if (lengths[row + 1][column] >= lengths[row][column + 1]) {
      edits.push({ kind: "delete", line: before[row] });
      row += 1;
    } else {
      edits.push({ kind: "insert", line: after[column] });
      column += 1;
    }
  }
  while (row < rows) edits.push({ kind: "delete", line: before[row++] });
  while (column < columns) edits.push({ kind: "insert", line: after[column++] });
  return edits;
}

/** Trim the shared head and tail so the LCS table only covers the changed middle. */
function diffEdits(before: DiffLine[], after: DiffLine[]): DiffEdit[] {
  let head = 0;
  while (
    head < before.length &&
    head < after.length &&
    diffLineKey(before[head]) === diffLineKey(after[head])
  ) {
    head += 1;
  }
  let tail = 0;
  while (
    tail < before.length - head &&
    tail < after.length - head &&
    diffLineKey(before[before.length - 1 - tail]) ===
      diffLineKey(after[after.length - 1 - tail])
  ) {
    tail += 1;
  }
  const beforeMiddle = before.slice(head, before.length - tail);
  const afterMiddle = after.slice(head, after.length - tail);
  const middle =
    beforeMiddle.length * afterMiddle.length > MAX_LCS_CELLS
      ? [
          ...beforeMiddle.map((line) => ({ kind: "delete" as const, line })),
          ...afterMiddle.map((line) => ({ kind: "insert" as const, line })),
        ]
      : lcsEdits(beforeMiddle, afterMiddle);
  return [
    ...before.slice(0, head).map((line) => ({ kind: "equal" as const, line })),
    ...middle,
    ...before
      .slice(before.length - tail)
      .map((line) => ({ kind: "equal" as const, line })),
  ];
}

/** Group changed edits into hunks carrying DIFF_CONTEXT_LINES of surrounding context. */
function hunkRanges(edits: DiffEdit[]) {
  const changed: Array<{ start: number; end: number }> = [];
  edits.forEach((edit, index) => {
    if (edit.kind === "equal") return;
    const open = changed.at(-1);
    if (open && index - open.end <= DIFF_CONTEXT_LINES * 2) open.end = index;
    else changed.push({ start: index, end: index });
  });
  return changed.map((range) => ({
    start: Math.max(0, range.start - DIFF_CONTEXT_LINES),
    end: Math.min(edits.length - 1, range.end + DIFF_CONTEXT_LINES),
  }));
}

/**
 * Render a real, `git apply`-compatible unified diff for one file.
 * Returns "" when the two texts are identical.
 */
export function buildUnifiedDiff(
  file: string,
  beforeText: string,
  afterText: string,
): string {
  const edits = diffEdits(toDiffLines(beforeText), toDiffLines(afterText));
  const ranges = hunkRanges(edits);
  if (!ranges.length) return "";

  const beforeLineNumbers: number[] = [];
  const afterLineNumbers: number[] = [];
  let beforeLine = 1;
  let afterLine = 1;
  for (const edit of edits) {
    beforeLineNumbers.push(beforeLine);
    afterLineNumbers.push(afterLine);
    if (edit.kind !== "insert") beforeLine += 1;
    if (edit.kind !== "delete") afterLine += 1;
  }

  const relative = normaliseRelative(file);
  const hunks = ranges.map((range) => {
    const rendered: string[] = [];
    let beforeCount = 0;
    let afterCount = 0;
    for (let index = range.start; index <= range.end; index += 1) {
      const edit = edits[index];
      const marker =
        edit.kind === "equal" ? " " : edit.kind === "delete" ? "-" : "+";
      rendered.push(`${marker}${edit.line.text}`);
      if (edit.line.lastWithoutNewline) rendered.push(NO_NEWLINE_MARKER);
      if (edit.kind !== "insert") beforeCount += 1;
      if (edit.kind !== "delete") afterCount += 1;
    }
    const beforeStart = beforeCount
      ? beforeLineNumbers[range.start]
      : beforeLineNumbers[range.start] - 1;
    const afterStart = afterCount
      ? afterLineNumbers[range.start]
      : afterLineNumbers[range.start] - 1;
    return [
      `@@ -${beforeStart},${beforeCount} +${afterStart},${afterCount} @@`,
      ...rendered,
    ].join("\n");
  });

  return `${[`--- a/${relative}`, `+++ b/${relative}`, ...hunks].join("\n")}\n`;
}

/** Serialise the file exactly the way applyRepair writes it back to disk. */
function serialiseRepairedJson(json: unknown, operations: RepairOperation[]) {
  for (const operation of operations) {
    writePointer(json, operation.pointer, operation.after);
  }
  return `${JSON.stringify(json, null, 2)}\n`;
}

/** Diff each touched file's real on-disk content against its post-repair content. */
async function buildOperationsDiff(
  projectRoot: string,
  operations: RepairOperation[],
) {
  const files = [...new Set(operations.map((operation) => operation.file))];
  const perFile = await Promise.all(
    files.map(async (file) => {
      const target = assertConfinedPath(projectRoot, file);
      const beforeText = await readFile(target, "utf8");
      const afterText = serialiseRepairedJson(
        JSON.parse(beforeText) as unknown,
        operations.filter((operation) => operation.file === file),
      );
      return buildUnifiedDiff(file, beforeText, afterText);
    }),
  );
  return perFile.join("");
}

export async function prepareRepair(
  projectRoot: string,
  scan: Scan,
): Promise<RepairPlan> {
  if (!scan.scanId) throw new Error("An explicit scan ID is required.");
  if (!scan.issues.length) throw new Error("The scan has no issues to repair.");
  const predicates = await loadDemoPredicates(projectRoot);
  const issueIds = new Set(scan.issues.map((issue) => issue.issueId));
  const operations: RepairOperation[] = [];
  for (const predicate of predicates) {
    if (!issueIds.has(predicate.issueId)) continue;
    assertAllowlisted(predicate.repair.file, scan.config.allowlist);
    const target = assertConfinedPath(projectRoot, predicate.repair.file);
    const json = JSON.parse(await readFile(target, "utf8")) as unknown;
    operations.push({
      issueId: predicate.issueId,
      file: predicate.repair.file,
      pointer: predicate.repair.pointer,
      before: readPointer(json, predicate.repair.pointer),
      after: predicate.repair.after,
      reason: predicate.recommendedAction,
    });
  }
  return RepairPlanSchema.parse({
    scanId: scan.scanId,
    createdAt: new Date().toISOString(),
    projectRoot,
    allowlist: scan.config.allowlist,
    operations,
    unifiedDiff: await buildOperationsDiff(projectRoot, operations),
  });
}

export async function applyRepair(
  plan: RepairPlan,
  options: { dryRun?: boolean; issueIds?: string[] } = {},
) {
  RepairPlanSchema.parse(plan);
  const selected = options.issueIds
    ? plan.operations.filter((operation) =>
        options.issueIds!.includes(operation.issueId),
      )
    : plan.operations;
  if (!selected.length) throw new Error("At least one issue ID is required.");
  const plannedFiles = [...new Set(selected.map((operation) => operation.file))];
  if (options.dryRun) {
    return {
      applied: false,
      dryRun: true,
      files: plannedFiles,
      unifiedDiff: await buildOperationsDiff(plan.projectRoot, selected),
    };
  }

  const rollbackRoot = path.join(
    plan.projectRoot,
    ".bhashafix",
    "rollback",
    plan.scanId,
  );
  await mkdir(rollbackRoot, { recursive: true });

  const appliedDiffs: string[] = [];
  for (const file of plannedFiles) {
    assertAllowlisted(file, plan.allowlist);
    const target = assertConfinedPath(plan.projectRoot, file);
    await assertNoSymlink(plan.projectRoot, target);
    const rollbackFile = path.join(rollbackRoot, normaliseRelative(file));
    await mkdir(path.dirname(rollbackFile), { recursive: true });
    await copyFile(target, rollbackFile);
    const beforeText = await readFile(target, "utf8");
    const afterText = serialiseRepairedJson(
      JSON.parse(beforeText) as unknown,
      selected.filter((item) => item.file === file),
    );
    appliedDiffs.push(buildUnifiedDiff(file, beforeText, afterText));
    await writeFile(target, afterText, "utf8");
  }

  const auditRecord = JSON.stringify({
    at: new Date().toISOString(),
    action: "apply_repair",
    scanId: plan.scanId,
    issueIds: selected.map((operation) => operation.issueId),
    files: plannedFiles,
    committed: false,
  });
  await appendFile(
    path.join(plan.projectRoot, ".bhashafix", "audit.log"),
    `${auditRecord}\n`,
    "utf8",
  );
  return {
    applied: true,
    dryRun: false,
    files: plannedFiles,
    rollbackRoot,
    unifiedDiff: appliedDiffs.join(""),
  };
}
