import type { Scan } from "@bhashafix/shared";
import { displayPath } from "./display-path";
import { countBySeverity, humanReviewCount } from "./report-html";
import type { ScanStage } from "./scan-stages";

const STAGE_MARK: Record<ScanStage["status"], string> = {
  ok: "✓",
  skipped: "·",
  failed: "✗",
};

const LABEL_WIDTH = 13;
const STAGE_WIDTH = 22;

function field(label: string, value: string): string {
  return `${label.padEnd(LABEL_WIDTH)}${value}`;
}

export type SummaryInput = {
  scan: Scan;
  stages: ScanStage[];
  engine: string;
  remote: boolean;
  /** Absolute path to report.html, or null when it could not be written. */
  reportPath: string | null;
  /** Absolute path to the scan artifact directory. */
  artifactDir: string;
  /** Screenshot files confirmed to exist on disk. */
  screenshots: string[];
  exitCode: number;
};

/** Engine names as their projects spell them. */
const ENGINE_LABELS: Record<string, string> = {
  chromium: "Chromium",
  firefox: "Firefox",
  webkit: "WebKit",
};

/**
 * Render the scan result for a human.
 *
 * Nothing here is decorative. Every line is a value the scan produced: the
 * stage marks come from the render results, the counts come from the issue
 * severities present, and the paths are only printed once the files behind
 * them have been confirmed on disk.
 */
export function formatScanSummary(input: SummaryInput): string {
  const { scan } = input;
  const lines: string[] = [];

  lines.push(`BhashaFix ${scan.engineVersion}`, "");
  lines.push(field("Target", scan.config.url ?? scan.config.projectRoot));
  lines.push(
    field(
      "Mode",
      `Real ${ENGINE_LABELS[input.engine] ?? input.engine}${
        input.remote ? " (remote endpoint)" : ""
      }`,
    ),
  );
  lines.push(field("Browser", scan.config.browsers.join(", ")));
  lines.push(field("Routes", String(scan.routesDiscovered.length)));
  lines.push(field("Locales", scan.localesTested.join(", ")));
  lines.push(
    field("Viewports", scan.config.viewports.map((view) => view.name).join(", ")),
  );

  lines.push("");
  for (const stage of input.stages) {
    lines.push(
      `${STAGE_MARK[stage.status]} ${stage.name.padEnd(STAGE_WIDTH)}${stage.detail}`,
    );
  }

  lines.push("");
  const counts = countBySeverity(scan.issues);
  const humanReview = humanReviewCount(scan.issues);
  if (counts.length === 0) {
    lines.push("No issues found");
  } else {
    for (const entry of counts) lines.push(`${entry.count} ${entry.label}`);
  }
  if (humanReview > 0) {
    lines.push(
      `${humanReview} human review ${humanReview === 1 ? "item" : "items"}`,
    );
  }

  const paths: string[] = [];
  if (input.reportPath) {
    paths.push(field("Report:", displayPath(input.reportPath)));
  }
  if (input.screenshots.length > 0) {
    paths.push(
      field(
        "Screenshots:",
        `${displayPath(input.artifactDir, { directory: true })} (${input.screenshots.length})`,
      ),
    );
  }
  if (paths.length > 0) lines.push("", ...paths);

  lines.push("", `Exit code: ${input.exitCode}`);
  return lines.join("\n");
}
