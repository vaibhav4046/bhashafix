import path from "node:path";
import type { Issue, Scan, Severity } from "@bhashafix/shared";
import type { ScanStage } from "./scan-stages";

/**
 * One rendered page, reduced to what the report shows. Screenshot and DOM
 * references are file names because the report is written into the same
 * directory as the artifacts it links to, so it opens from disk with no server.
 */
export type ReportRender = {
  route: string;
  locale: string;
  viewport: string;
  theme: string;
  url: string;
  status: number;
  durationMs: number;
  measuredElements: number;
  consoleErrors: number;
  failedRequests: number;
  axeViolations: number;
  screenshotFile: string | null;
  domFile: string | null;
};

export type ReportInput = {
  scan: Scan;
  stages: ScanStage[];
  renders: ReportRender[];
  generatedAt: string;
};

export const SEVERITY_ORDER: readonly Severity[] = [
  "blocking",
  "serious",
  "warning",
  "review",
  "advisory",
];

const SEVERITY_LABEL: Record<Severity, [string, string]> = {
  blocking: ["blocking issue", "blocking issues"],
  serious: ["serious issue", "serious issues"],
  warning: ["warning", "warnings"],
  review: ["review item", "review items"],
  advisory: ["advisory note", "advisory notes"],
};

export function countBySeverity(issues: Issue[]): Array<{
  severity: Severity;
  count: number;
  label: string;
}> {
  return SEVERITY_ORDER.map((severity) => {
    const count = issues.filter((issue) => issue.severity === severity).length;
    const [singular, plural] = SEVERITY_LABEL[severity];
    return { severity, count, label: count === 1 ? singular : plural };
  }).filter((entry) => entry.count > 0);
}

export function humanReviewCount(issues: Issue[]): number {
  return issues.filter((issue) => issue.humanReviewRequired).length;
}

/** Turn an absolute artifact path into a file name relative to the report. */
export function artifactFileName(file: string | null): string | null {
  return file ? path.basename(file) : null;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attribute(value: string): string {
  return escapeHtml(value).replaceAll("\n", " ");
}

const STAGE_MARK: Record<ScanStage["status"], string> = {
  ok: "&#10003;",
  skipped: "&#183;",
  failed: "&#10007;",
};

const STYLE = `
:root{
  color-scheme:light dark;
  --bg:#fbfaf7;--panel:#ffffff;--ink:#171320;--muted:#5d566e;--line:#e2ddf0;
  --accent:#5b2bd9;--ok:#116149;--skip:#6b6478;--fail:#a4123f;
  --blocking:#a4123f;--serious:#b4530c;--warning:#8a6a00;--review:#3f4fa8;--advisory:#5d566e;
  --mono:ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){
  :root{
    --bg:#131019;--panel:#1c1826;--ink:#f2eefb;--muted:#a79fbb;--line:#2f2842;
    --accent:#b49bff;--ok:#5fd3ab;--skip:#8b83a0;--fail:#ff8098;
    --blocking:#ff8098;--serious:#ffab5e;--warning:#e8c65a;--review:#9fb0ff;--advisory:#a79fbb;
  }
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.55 ui-sans-serif,system-ui,"Segoe UI",Roboto,sans-serif}
main{max-width:1140px;margin:0 auto;padding:clamp(24px,4vw,64px) clamp(16px,4vw,40px) 96px}
a{color:var(--accent)}
h1{font-size:clamp(1.9rem,1.2rem+2.4vw,3rem);line-height:1.05;letter-spacing:-.02em;margin:0}
h2{font-size:1.05rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
  margin:56px 0 16px;font-weight:600}
h3{font-size:1rem;margin:0 0 6px}
header p{color:var(--muted);margin:10px 0 0}
.id{font-family:var(--mono);font-size:.8rem;color:var(--muted);word-break:break-all}
.rule{height:1px;background:var(--line);border:0;margin:28px 0 0}
.meta{display:grid;gap:0;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
  border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--panel);margin-top:28px}
.meta div{padding:14px 18px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.meta dt{font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 4px}
.meta dd{margin:0;font-family:var(--mono);font-size:.85rem;word-break:break-word}
.stages{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.stages li{display:grid;grid-template-columns:1.4rem minmax(150px,auto) 1fr;gap:12px;align-items:baseline;
  padding:11px 16px;background:var(--panel);border:1px solid var(--line);border-radius:11px}
.stages .mark{font-weight:700}
.stages .ok .mark{color:var(--ok)}
.stages .skipped .mark{color:var(--skip)}
.stages .failed .mark{color:var(--fail)}
.stages .detail{color:var(--muted);font-family:var(--mono);font-size:.82rem}
.tally{display:flex;flex-wrap:wrap;gap:10px;margin:0;padding:0;list-style:none}
.tally li{border:1px solid var(--line);border-radius:999px;padding:7px 16px;background:var(--panel);
  font-family:var(--mono);font-size:.85rem}
.tally b{font-size:1.05rem}
.tally .blocking b{color:var(--blocking)}.tally .serious b{color:var(--serious)}
.tally .warning b{color:var(--warning)}.tally .review b{color:var(--review)}
.tally .advisory b{color:var(--advisory)}.tally .human b{color:var(--accent)}
.clean{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;color:var(--muted)}
.issue{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:0 0 12px}
.issue.blocking{border-left:4px solid var(--blocking)}
.issue.serious{border-left:4px solid var(--serious)}
.issue.warning{border-left:4px solid var(--warning)}
.issue.review{border-left:4px solid var(--review)}
.issue.advisory{border-left:4px solid var(--advisory)}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0;font-family:var(--mono);font-size:.76rem;color:var(--muted)}
.tags span{border:1px solid var(--line);border-radius:6px;padding:2px 8px}
.sev{font-family:var(--mono);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase}
.issue.blocking .sev{color:var(--blocking)}.issue.serious .sev{color:var(--serious)}
.issue.warning .sev{color:var(--warning)}.issue.review .sev{color:var(--review)}
.issue.advisory .sev{color:var(--advisory)}
.issue dl{display:grid;grid-template-columns:minmax(130px,auto) 1fr;gap:6px 18px;margin:14px 0 0;font-size:.9rem}
.issue dt{color:var(--muted);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase}
.issue dd{margin:0}
code{font-family:var(--mono);font-size:.82rem;word-break:break-word}
.shots{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));padding:0;margin:0;list-style:none}
.shots figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.shots img{display:block;width:100%;height:auto;background:#fff}
.shots figcaption{padding:12px 16px;font-family:var(--mono);font-size:.78rem;color:var(--muted);
  border-top:1px solid var(--line)}
.shots strong{color:var(--ink);font-weight:600}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;min-width:660px;font-size:.85rem;background:var(--panel)}
th,td{padding:10px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600}
td{font-family:var(--mono);font-size:.8rem}
footer{margin-top:64px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
`;

function renderStages(stages: ScanStage[]): string {
  return stages
    .map(
      (stage) => `<li class="${stage.status}"><span class="mark">${
        STAGE_MARK[stage.status]
      }</span><span>${escapeHtml(stage.name)}</span><span class="detail">${escapeHtml(
        stage.detail,
      )}</span></li>`,
    )
    .join("");
}

function renderIssue(issue: Issue): string {
  const rows: Array<[string, string]> = [
    ["Why it matters", escapeHtml(issue.whyItMatters)],
    ["Recommended action", escapeHtml(issue.recommendedAction)],
  ];
  if (issue.selector) {
    rows.push(["Selector", `<code>${escapeHtml(issue.selector)}</code>`]);
  }
  if (issue.deterministicPredicate) {
    rows.push(["Predicate", `<code>${escapeHtml(issue.deterministicPredicate)}</code>`]);
  }
  const screenshot = artifactFileName(issue.screenshotBefore);
  if (screenshot) {
    rows.push([
      "Screenshot",
      `<a href="${attribute(screenshot)}">${escapeHtml(screenshot)}</a>`,
    ]);
  }
  rows.push([
    "Evidence",
    `<code>${escapeHtml(JSON.stringify(issue.measuredEvidence))}</code>`,
  ]);
  return `<article class="issue ${escapeHtml(issue.severity)}">
<p class="sev">${escapeHtml(issue.severity)} &middot; ${escapeHtml(issue.confidence)}${
    issue.humanReviewRequired ? " &middot; human review required" : ""
  }</p>
<h3>${escapeHtml(issue.description)}</h3>
<p class="tags"><span>${escapeHtml(issue.ruleId)}</span><span>${escapeHtml(
    issue.category,
  )}</span><span>${escapeHtml(issue.locale)}</span><span>${escapeHtml(
    issue.route,
  )}</span><span>${escapeHtml(issue.viewport.name)} ${issue.viewport.width}&times;${
    issue.viewport.height
  }</span><span>${escapeHtml(issue.browser)}</span></p>
<dl>${rows
    .map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${value}</dd>`)
    .join("")}</dl>
</article>`;
}

function renderScreenshots(renders: ReportRender[]): string {
  const withShots = renders.filter((render) => render.screenshotFile);
  if (withShots.length === 0) {
    return `<p class="clean">No screenshot was captured for this scan.</p>`;
  }
  return `<ul class="shots">${withShots
    .map(
      (render) => `<li><figure>
<a href="${attribute(render.screenshotFile!)}"><img src="${attribute(
        render.screenshotFile!,
      )}" alt="${attribute(
        `${render.route} rendered in ${render.locale} at ${render.viewport}`,
      )}" loading="lazy"></a>
<figcaption><strong>${escapeHtml(render.route)}</strong> &middot; ${escapeHtml(
        render.locale,
      )} &middot; ${escapeHtml(render.viewport)} &middot; ${escapeHtml(
        render.theme,
      )}<br>HTTP ${render.status} &middot; ${render.measuredElements} elements &middot; ${
        render.durationMs
      } ms</figcaption>
</figure></li>`,
    )
    .join("")}</ul>`;
}

function renderRenderTable(renders: ReportRender[]): string {
  return `<div class="scroll"><table>
<thead><tr><th>Route</th><th>Locale</th><th>Viewport</th><th>Theme</th><th>HTTP</th><th>Elements</th><th>Console</th><th>Failed</th><th>axe</th><th>Duration</th><th>DOM</th></tr></thead>
<tbody>${renders
    .map(
      (render) => `<tr>
<td>${escapeHtml(render.route)}</td><td>${escapeHtml(render.locale)}</td>
<td>${escapeHtml(render.viewport)}</td><td>${escapeHtml(render.theme)}</td>
<td>${render.status}</td><td>${render.measuredElements}</td>
<td>${render.consoleErrors}</td><td>${render.failedRequests}</td>
<td>${render.axeViolations}</td><td>${render.durationMs} ms</td>
<td>${
        render.domFile
          ? `<a href="${attribute(render.domFile)}">${escapeHtml(render.domFile)}</a>`
          : "&mdash;"
      }</td>
</tr>`,
    )
    .join("")}</tbody></table></div>`;
}

/**
 * Build the offline scan report.
 *
 * Everything is inline: no stylesheet request, no font request, no script. The
 * only external references are the screenshots and DOM snapshots that sit
 * beside the file, addressed by name, so the report opens straight off disk.
 */
export function renderScanReportHtml(input: ReportInput): string {
  const { scan, renders, stages } = input;
  const counts = countBySeverity(scan.issues);
  const humanReview = humanReviewCount(scan.issues);
  const tally = [
    ...counts.map(
      (entry) =>
        `<li class="${escapeHtml(entry.severity)}"><b>${entry.count}</b> ${escapeHtml(
          entry.label,
        )}</li>`,
    ),
    ...(humanReview > 0
      ? [
          `<li class="human"><b>${humanReview}</b> human review ${
            humanReview === 1 ? "item" : "items"
          }</li>`,
        ]
      : []),
  ].join("");
  const issuesBySeverity = SEVERITY_ORDER.flatMap((severity) =>
    scan.issues.filter((issue) => issue.severity === severity),
  );
  const meta: Array<[string, string]> = [
    ["Target", scan.config.url ?? scan.config.projectRoot],
    ["Origin", scan.origin],
    ["Status", scan.status],
    ["Browser", scan.config.browsers.join(", ")],
    ["Source locale", scan.config.sourceLocale],
    ["Locales", scan.localesTested.join(", ")],
    ["Routes", scan.routesDiscovered.join(", ")],
    [
      "Viewports",
      scan.config.viewports
        .map((viewport) => `${viewport.name} ${viewport.width}×${viewport.height}`)
        .join(", "),
    ],
    ["Themes", scan.config.themes.join(", ")],
    ["Started", scan.startedAt],
    ["Completed", scan.completedAt],
    ["Engine", `BhashaFix ${scan.engineVersion}`],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BhashaFix scan ${escapeHtml(scan.scanId)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<header>
<h1>Localisation scan</h1>
<p>${escapeHtml(scan.config.url ?? scan.config.projectRoot)}</p>
<p class="id">${escapeHtml(scan.scanId)} &middot; generated ${escapeHtml(
    input.generatedAt,
  )}</p>
<hr class="rule">
<dl class="meta">${meta
    .map(
      ([term, value]) =>
        `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`,
    )
    .join("")}</dl>
</header>

<h2>What ran</h2>
<ul class="stages">${renderStages(stages)}</ul>

<h2>What was found</h2>
${
  tally
    ? `<ul class="tally">${tally}</ul>`
    : `<p class="clean">No issue was measured on any rendered page.</p>`
}

${
  issuesBySeverity.length > 0
    ? `<h2>Issues</h2>${issuesBySeverity.map(renderIssue).join("")}`
    : ""
}

<h2>Screenshots</h2>
${renderScreenshots(renders)}

<h2>Renders</h2>
${renderRenderTable(renders)}

<footer>
<p>Deterministic engineering checks are authoritative. Linguistic judgements
carry a confidence level and are gated for human review where indicated.
Every count on this page was measured on a page rendered in
${escapeHtml(scan.config.browsers.join(", "))}.</p>
</footer>
</main>
</body>
</html>
`;
}
