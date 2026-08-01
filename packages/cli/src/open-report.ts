import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const REPORT_FILE = "report.html";

export type ResolvedReport = {
  scanId: string;
  reportPath: string;
  /** How the scan was found, so the CLI can say what it resolved. */
  source: "requested" | "store" | "directory";
};

export function scansDirectory(projectRoot: string): string {
  return path.join(projectRoot, ".bhashafix", "scans");
}

async function reportIn(
  projectRoot: string,
  scanId: string,
): Promise<string | null> {
  const file = path.join(scansDirectory(projectRoot), scanId, REPORT_FILE);
  try {
    const info = await stat(file);
    return info.isFile() && info.size > 0 ? file : null;
  } catch {
    return null;
  }
}

/** Scan ids that have a directory on disk, newest modification first. */
async function scanIdsByRecency(projectRoot: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(scansDirectory(projectRoot), { withFileTypes: true });
  } catch {
    return [];
  }
  const dated: Array<{ scanId: string; at: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const info = await stat(path.join(scansDirectory(projectRoot), entry.name));
      dated.push({ scanId: entry.name, at: info.mtimeMs });
    } catch {
      // A directory that cannot be inspected cannot be offered as a result.
    }
  }
  return dated.sort((a, b) => b.at - a.at).map((entry) => entry.scanId);
}

/** Scan ids the durable store knows about, newest first; empty if unavailable. */
async function scanIdsFromStore(projectRoot: string): Promise<string[]> {
  try {
    const { createScanStore, scanStorePath } = await import(
      "@bhashafix/persistence"
    );
    // Opening the store creates the database file. `open` only reads, so it
    // must not leave one behind in a directory that has never been scanned.
    await stat(scanStorePath(projectRoot));
    const store = await createScanStore({ projectRoot });
    try {
      const scans = await store.listScans();
      return scans.map((scan) => scan.scanId);
    } finally {
      await store.close();
    }
  } catch {
    // No durable store on this machine is not an error: fall back to disk.
    return [];
  }
}

/**
 * Find the report to open.
 *
 * The durable store is authoritative for recency because it records the scan
 * start time; the scan directories are the fallback when no store is
 * configured. Either way a candidate only wins once its `report.html` has been
 * confirmed on disk, so `open` never announces a file that is not there.
 */
export async function resolveReport(
  projectRoot: string,
  requestedScanId?: string,
): Promise<ResolvedReport | null> {
  if (requestedScanId) {
    const reportPath = await reportIn(projectRoot, requestedScanId);
    return reportPath
      ? { scanId: requestedScanId, reportPath, source: "requested" }
      : null;
  }
  for (const [source, ids] of [
    ["store", await scanIdsFromStore(projectRoot)],
    ["directory", await scanIdsByRecency(projectRoot)],
  ] as const) {
    for (const scanId of ids) {
      const reportPath = await reportIn(projectRoot, scanId);
      if (reportPath) return { scanId, reportPath, source };
    }
  }
  return null;
}

/**
 * Hand the file to the platform opener.
 *
 * On Windows `start` is a `cmd.exe` builtin rather than an executable, so the
 * command line is passed verbatim with the path quoted; that keeps spaces and
 * shell metacharacters in the project path from being re-parsed.
 */
export type ViewerCommand = { command: string; args: string[]; windows: boolean };

/**
 * Build the opener invocation for a platform.
 *
 * Split out from the spawn so the macOS and Linux forms can be asserted from
 * a Windows machine, where they cannot otherwise be exercised.
 */
export function viewerCommand(
  platform: NodeJS.Platform,
  target: string,
): ViewerCommand {
  const windows = platform === "win32";
  if (windows) {
    return { command: "cmd.exe", args: ["/c", `start "" "${target}"`], windows };
  }
  return {
    command: platform === "darwin" ? "open" : "xdg-open",
    args: [target],
    windows,
  };
}

export async function openInViewer(target: string): Promise<void> {
  const { command, args, windows } = viewerCommand(process.platform, target);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: !windows,
      stdio: "ignore",
      windowsHide: true,
      windowsVerbatimArguments: windows,
    });
    child.once("error", (error: NodeJS.ErrnoException) => {
      reject(
        new Error(
          error.code === "ENOENT"
            ? `No "${command}" opener is available on this system.`
            : `"${command}" could not open the report: ${error.message}`,
        ),
      );
    });
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
