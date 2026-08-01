/**
 * Path guards shared by every repair path.
 *
 * A repair may only ever write a file that is (a) named on the caller-supplied
 * allowlist, (b) inside the declared project root once resolved, and (c) not a
 * symlink pointing anywhere else. These three checks are the whole reason a
 * repair can be trusted to stay inside the project it was asked to fix.
 */

import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export function normaliseRelative(file: string) {
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

export async function assertNoSymlink(projectRoot: string, target: string) {
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
