/** Real, `git apply`-compatible unified diff rendering. */

import { normaliseRelative } from "./safety.js";

const DIFF_CONTEXT_LINES = 3;
const NO_NEWLINE_MARKER = "\\ No newline at end of file";
/** Guard against a pathological O(n*m) LCS table if a very large file is ever allowlisted. */
const MAX_LCS_CELLS = 4_000_000;

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
