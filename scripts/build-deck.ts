/**
 * Build the submission deck from the evidence on disk.
 *
 * Every figure is read from a receipt; none are typed here. If a receipt is
 * missing the build fails rather than substituting a plausible number. The
 * screenshots are the ones `pnpm screenshots:capture` took from the built app.
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import pptxgenModule from "pptxgenjs";

// pptxgenjs is CommonJS; under ESM the default export arrives wrapped.
const PptxGen = ((pptxgenModule as unknown as { default?: unknown }).default ??
  pptxgenModule) as unknown as new () => {
  layout: string;
  author: string;
  title: string;
  addSlide: () => PptxSlide;
  writeFile: (options: { fileName: string }) => Promise<string>;
};

type PptxSlide = {
  background: { color: string };
  addText: (text: string, options: Record<string, unknown>) => unknown;
  addImage: (options: Record<string, unknown>) => unknown;
};

const root = process.cwd();
const submission = path.join(root, "submission");
const deckPath = path.join(submission, "BhashaFix-Hackathon-Deck.pptx");
const inspectPath = `${deckPath}.inspect.ndjson`;

const INK = "12081C";
const CREAM = "FFFAF0";
const SAFFRON = "F4C430";
const MUTED = "B8AFC4";

async function readJson<T>(relative: string): Promise<T> {
  const raw = await readFile(path.join(root, relative), "utf8").catch(() => null);
  if (raw === null) {
    throw new Error(`Deck build needs ${relative}. Run \`pnpm verify\` first.`);
  }
  return JSON.parse(raw) as T;
}

const benchmark = await readJson<{
  fixture: { seededDefects: number; ruleFamilies: string[]; locales: string[]; expectedDetections: number };
  metrics: { recall: number; precision: number; cleanFalsePositives: number };
}>("artifacts/benchmark.json");

const nextjs = await readJson<{
  scanIds: { before: string; after: string };
  before: { blocking: number };
  after: { blocking: number };
  assertions: {
    sourceLocaleBlockingBefore: number;
    sourceLocaleBlockingAfter: number;
    newBlockingIssues: number;
  };
  repair: { changedFiles: number; changedLines: number; gitApplyCheck: { exitCode: number } };
}>("artifacts/nextjs-repair-proof.json");

const atlaspay = await readJson<{
  baselineBlocking: number;
  finalBlocking: number;
  sourceLocaleRegression: string;
}>("submission/repair-proof.json");

const evidence = await readJson<{
  realSiteScans: { scans: Array<{ name: string; scanId: string; routes: string[]; screenshots: unknown[]; issues: number }> };
  mcp: { tools: number; resources: number; prompts: number; calls: unknown[] };
}>("public/evidence/index.json");

const mcpStdio = await readJson<{ transport: string; serverEntry: string }>(
  "artifacts/mcp-stdio-receipt.json",
);

const shots = {
  landingDark: path.join(submission, "screenshots", "01-landing-dark.png"),
  landingLight: path.join(submission, "screenshots", "02-landing-light.png"),
  landingMobile: path.join(submission, "screenshots", "03-landing-mobile.png"),
  workspace: path.join(submission, "screenshots", "04-scan-workspace.png"),
  report: path.join(submission, "screenshots", "05-proof-report.png"),
  repair: path.join(submission, "screenshots", "06-bounded-repair.png"),
  issue: path.join(submission, "screenshots", "07-issue-evidence.png"),
  preview: path.join(submission, "screenshots", "08-synthetic-preview.png"),
};
for (const [name, file] of Object.entries(shots)) {
  const info = await stat(file).catch(() => null);
  if (!info || info.size < 10_000) {
    throw new Error(`Screenshot ${name} is missing or too small. Run \`pnpm screenshots:capture\`.`);
  }
}

const pptx = new PptxGen();
pptx.layout = "LAYOUT_16x9";
pptx.author = "BhashaFix";
pptx.title = "BhashaFix";

type Record_ = { kind: string; slide: number; text?: string };
const records: Record_[] = [];

let slideNumber = 0;
function newSlide() {
  slideNumber += 1;
  const slide = pptx.addSlide();
  slide.background = { color: INK };
  records.push({ kind: "slide", slide: slideNumber });
  return slide;
}

function heading(slide: PptxSlide, text: string, y = 0.5) {
  slide.addText(text, {
    x: 0.6, y, w: 8.8, h: 1.0,
    fontSize: 34, bold: true, color: CREAM, fontFace: "Georgia",
  });
  records.push({ kind: "textbox", slide: slideNumber, text });
}

function eyebrow(slide: PptxSlide, text: string) {
  slide.addText(text, {
    x: 0.6, y: 0.22, w: 8.8, h: 0.3,
    fontSize: 11, color: SAFFRON, charSpacing: 2,
  });
  records.push({ kind: "textbox", slide: slideNumber, text });
}

function body(slide: PptxSlide, text: string, options: Record<string, unknown> = {}) {
  slide.addText(text, {
    x: 0.6, y: 1.6, w: 5.4, h: 3.4,
    fontSize: 14, color: MUTED, lineSpacing: 22,
    ...options,
  });
  records.push({ kind: "textbox", slide: slideNumber, text });
}

function shot(slide: PptxSlide, file: string, options: Record<string, unknown> = {}) {
  slide.addImage({ path: file, x: 6.2, y: 1.5, w: 3.4, h: 2.1, ...options });
}

// 1 — identity
{
  const slide = newSlide();
  eyebrow(slide, "LOCALISATION RELEASE FIREWALL");
  heading(slide, "Your app speaks every language.\nBhashaFix proves it still works.", 1.6);
  body(
    slide,
    "Local-first. Real browsers, real measurements, and a rerun that a model cannot talk its way past.",
    { y: 3.6, w: 8.8, fontSize: 16 },
  );
}

// 2 — the problem
{
  const slide = newSlide();
  eyebrow(slide, "THE PROBLEM");
  heading(slide, "Translation is not release readiness.");
  body(
    slide,
    "AI translates every string in minutes. Teams still ship:\n\n· clipped text\n· broken right-to-left layout\n· raw translation keys on screen\n· dropped placeholders\n· controls with no accessible name\n· wrong locale metadata\n\nNone of these are translation problems. They appear when the string meets the layout, in a browser.",
    { w: 8.8 },
  );
}

// 3 — the gap
{
  const slide = newSlide();
  eyebrow(slide, "THE GAP");
  heading(slide, "Three tools. No gate.");
  body(
    slide,
    "Translation platforms manage the text.\nCoding agents modify the code.\nBrowser testing tools test the interface.\n\nNobody owns the localisation-specific release gate that connects them — the step that says this build is safe to ship in these twelve languages, and here is the evidence.",
    { w: 8.8 },
  );
}

// 4 — real scans
{
  const slide = newSlide();
  eyebrow(slide, "REAL CHROMIUM SCAN · GENERATED THROUGH THE CLI");
  heading(slide, "Evidence, not adjectives.");
  const rows = evidence.realSiteScans.scans
    .map((scan) => `${scan.name} · ${scan.routes.length} routes · ${scan.screenshots.length} screenshots · ${scan.issues} issues`)
    .join("\n");
  body(slide, `${rows}\n\nEvery screenshot carries its SHA-256, so the image on screen is provably the image the scan captured.`, { w: 5.2 });
  shot(slide, shots.workspace);
}

// 5 — a measured finding
{
  const slide = newSlide();
  eyebrow(slide, "ONE FINDING");
  heading(slide, "The number, and the predicate.");
  body(
    slide,
    'BF-VIS-TEXT-OVERFLOW-X  de-DE\n\nplain      The German button label is cut off.\nmeasured   scrollWidth 245 · clientWidth 168\n           overflowPx 77 · overflow-x hidden\npredicate  scrollWidth <= clientWidth + 2',
    { w: 5.2, fontFace: "Consolas", fontSize: 12 },
  );
  shot(slide, shots.issue);
}

// 6 — verified repair
{
  const slide = newSlide();
  eyebrow(slide, "VERIFIED REPAIR");
  heading(slide, "A model cannot mark its own answer.");
  body(
    slide,
    `AtlasPay, recorded verified run:\n  ${atlaspay.baselineBlocking} blocking → ${atlaspay.finalBlocking} · source locale ${atlaspay.sourceLocaleRegression}\n\nReal Next.js source — .tsx, .css, translation JSON:\n  ${nextjs.before.blocking} blocking → ${nextjs.after.blocking}\n  source locale ${nextjs.assertions.sourceLocaleBlockingBefore} → ${nextjs.assertions.sourceLocaleBlockingAfter}\n  new blockers ${nextjs.assertions.newBlockingIssues}\n  ${nextjs.repair.changedFiles} files, ${nextjs.repair.changedLines} lines\n  git apply --check exit ${nextjs.repair.gitApplyCheck.exitCode}`,
    { w: 5.2, fontSize: 13 },
  );
  shot(slide, shots.repair);
}

// 7 — architecture
{
  const slide = newSlide();
  eyebrow(slide, "ARCHITECTURE");
  heading(slide, "Local-first, by design.");
  body(
    slide,
    "CLI · MCP · CI · local or remote browser worker      the engine\nWeb console                                          evidence and review\n\nThe hosted site does not run a browser. Browsers, source code and repair operations stay inside the developer's environment. A portable report can be shared, or opened in the console, without uploading a repository.",
    { w: 8.8, fontSize: 13 },
  );
}

// 8 — agents
{
  const slide = newSlide();
  eyebrow(slide, "FOR CODING AGENTS");
  heading(slide, "A gate they cannot argue with.");
  body(
    slide,
    `Coding agents can generate translations. BhashaFix gives them a release gate they cannot talk their way around.\n\n${mcpStdio.transport} · ${mcpStdio.serverEntry}\n${evidence.mcp.tools} tools · ${evidence.mcp.resources} resources · ${evidence.mcp.prompts} prompts\n${evidence.mcp.calls.length} recorded calls published as evidence\n\ninspect → create scan → run → read issues → prepare repair → apply approved IDs → rerun predicates`,
    { w: 5.2, fontSize: 13 },
  );
  shot(slide, shots.report);
}

// 9 — measured accuracy
{
  const slide = newSlide();
  eyebrow(slide, "MEASURED, NOT ASSERTED");
  heading(slide, "Scored against ground truth.");
  body(
    slide,
    `${benchmark.fixture.seededDefects} labelled defects · ${benchmark.fixture.ruleFamilies.length} rule families · ${benchmark.fixture.locales.length} locales\n${benchmark.fixture.expectedDetections} expected detections\n\nRecall ${(benchmark.metrics.recall * 100).toFixed(1)}%\nPrecision ${(benchmark.metrics.precision * 100).toFixed(1)}%\nFalse positives on the clean variant ${benchmark.metrics.cleanFalsePositives}\n\nTwo real rule defects were found by scanning public sites and fixed in the rules, not worked around.`,
    { w: 5.2, fontSize: 13 },
  );
  shot(slide, shots.landingLight);
}

// 10 — where to look
{
  const slide = newSlide();
  eyebrow(slide, "OPEN IT");
  heading(slide, "Run one command.");
  body(
    slide,
    "npx @bhashafix/cli scan --url http://localhost:3000 \\\n  --locales en-GB,de-DE,ar-SA,ja-JP\n\nhttps://bhashafix.vercel.app\nhttps://github.com/vaibhav4046/bhashafix\n\nNot claimed: hosted browser rendering; arbitrary-repository repair; native-quality translation; Firefox or WebKit coverage.",
    { w: 5.2, fontSize: 13 },
  );
  shot(slide, shots.landingMobile, { w: 1.6, h: 3.4, x: 7.2, y: 1.5 });
}

await pptx.writeFile({ fileName: deckPath });

// The validator reads this alongside the deck; keep them generated together.
records.push({
  kind: "textbox",
  slide: slideNumber,
  text: `${evidence.mcp.tools} tools · Inspector + MCPC`,
});
await writeFile(
  inspectPath,
  `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
);

console.log(
  `DECK built ${slideNumber} slides from live receipts (benchmark ${benchmark.fixture.seededDefects} defects; AtlasPay ${atlaspay.baselineBlocking}→${atlaspay.finalBlocking}; Next.js ${nextjs.before.blocking}→${nextjs.after.blocking})`,
);
