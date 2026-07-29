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

function unifiedDiff(operations: RepairOperation[]) {
  return operations
    .map(
      (operation) =>
        [
          `--- a/${normaliseRelative(operation.file)}`,
          `+++ b/${normaliseRelative(operation.file)}`,
          `@@ ${operation.pointer.join(".")} @@`,
          `-${JSON.stringify(operation.before)}`,
          `+${JSON.stringify(operation.after)}`,
        ].join("\n"),
    )
    .join("\n");
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
    unifiedDiff: unifiedDiff(operations),
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
      unifiedDiff: unifiedDiff(selected),
    };
  }

  const rollbackRoot = path.join(
    plan.projectRoot,
    ".bhashafix",
    "rollback",
    plan.scanId,
  );
  await mkdir(rollbackRoot, { recursive: true });

  for (const file of plannedFiles) {
    assertAllowlisted(file, plan.allowlist);
    const target = assertConfinedPath(plan.projectRoot, file);
    await assertNoSymlink(plan.projectRoot, target);
    const rollbackFile = path.join(rollbackRoot, normaliseRelative(file));
    await mkdir(path.dirname(rollbackFile), { recursive: true });
    await copyFile(target, rollbackFile);
    const json = JSON.parse(await readFile(target, "utf8")) as unknown;
    for (const operation of selected.filter((item) => item.file === file)) {
      writePointer(json, operation.pointer, operation.after);
    }
    await writeFile(target, `${JSON.stringify(json, null, 2)}\n`, "utf8");
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
    unifiedDiff: unifiedDiff(selected),
  };
}
