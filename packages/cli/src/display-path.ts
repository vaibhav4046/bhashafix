import path from "node:path";

/**
 * Render a real filesystem path for a human reader.
 *
 * The CLI is packed and run from arbitrary directories, so paths are always
 * absolute internally. Printing the absolute form is correct but noisy when the
 * file sits under the working directory, so the shorter of the two is shown.
 * Separators are normalised to `/`, which both PowerShell and POSIX shells
 * accept, so a printed path can be pasted back into either shell.
 */
export function displayPath(
  absolute: string,
  options: { cwd?: string; directory?: boolean } = {},
): string {
  const cwd = options.cwd ?? process.cwd();
  const suffix = options.directory ? "/" : "";
  const absoluteDisplay = absolute.split(path.sep).join("/") + suffix;
  let relative: string;
  try {
    relative = path.relative(cwd, absolute);
  } catch {
    return absoluteDisplay;
  }
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return absoluteDisplay;
  }
  const posix = relative.split(path.sep).join("/");
  const candidate = `${posix.startsWith("./") ? posix : `./${posix}`}${suffix}`;
  return candidate.length < absoluteDisplay.length ? candidate : absoluteDisplay;
}
