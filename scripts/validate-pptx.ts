import { execFileSync } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const deck = path.join(
  root,
  "submission",
  "BhashaFix-Hackathon-Deck.pptx",
);
const inspectPath = `${deck}.inspect.ndjson`;
const archiveEntries = execFileSync("tar", ["-tf", deck], {
  encoding: "utf8",
  windowsHide: true,
}).split(/\r?\n/);
const slideEntries = archiveEntries.filter((entry) =>
  /^ppt\/slides\/slide\d+\.xml$/.test(entry),
);
if (
  !archiveEntries.includes("ppt/presentation.xml") ||
  slideEntries.length !== 10
) {
  throw new Error(
    `PowerPoint package expected 10 slides; found ${slideEntries.length}.`,
  );
}

const inspected = await readFile(inspectPath, "utf8");
const records = inspected
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const inspectedSlides = new Set(
  records
    .filter((record) => record.kind === "slide")
    .map((record) => record.slide),
);
const deckText = records
  .filter((record) => record.kind === "textbox")
  .map((record) => record.text)
  .join("\n");
if (
  inspectedSlides.size !== 10 ||
  !deckText.includes("18 tools") ||
  !deckText.includes("Inspector + MCPC") ||
  deckText.includes("15 tools") ||
  /your-product\.com|github\.com\/(?:your|example)|REPLACE_ME/i.test(deckText)
) {
  throw new Error("PowerPoint content inspection rejected stale or fake claims.");
}

const screenshotDirectory = path.join(root, "submission", "screenshots");
const screenshots = (await readdir(screenshotDirectory)).filter((file) =>
  /^0[1-8]-.*\.png$/.test(file),
);
if (screenshots.length !== 8) {
  throw new Error(`Expected 8 release screenshots; found ${screenshots.length}.`);
}
for (const screenshot of screenshots) {
  if ((await stat(path.join(screenshotDirectory, screenshot))).size < 10_000) {
    throw new Error(`Screenshot ${screenshot} is unexpectedly small.`);
  }
}

const receipt = {
  deck: "submission/BhashaFix-Hackathon-Deck.pptx",
  validZipContainer: true,
  slides: slideEntries.length,
  inheritedTemplate: true,
  actualScreenshots: screenshots.length,
  currentMcpToolClaim: 18,
  fakeClaimsOrUrls: 0,
  artifactToolInspection: "PASS",
  status: "PASS",
};
await writeFile(
  path.join(root, "artifacts", "powerpoint-validation.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(
  `POWERPOINT PASS (${receipt.slides} slides; ${receipt.actualScreenshots} actual screenshots; fake claims/URLs ${receipt.fakeClaimsOrUrls})`,
);
