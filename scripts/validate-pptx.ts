import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PLACEHOLDER_PUBLIC_URL } from "./forbidden-patterns";
import { readZipEntries } from "./zip-entries";

const root = process.cwd();
const deck = path.join(
  root,
  "submission",
  "BhashaFix-Hackathon-Deck.pptx",
);
const inspectPath = `${deck}.inspect.ndjson`;
// A .pptx is an OOXML ZIP package. Parse its central directory directly:
// `tar -tf` treats a Windows absolute path as a remote host and fails.
const archiveEntries = readZipEntries(await readFile(deck)).map((entry) => entry.name);
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
  PLACEHOLDER_PUBLIC_URL.test(deckText)
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
// Verify the bytes, not the extension: several release assets have previously
// carried a .png name over JPEG content.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const mislabelled: string[] = [];
for (const screenshot of screenshots) {
  const file = path.join(screenshotDirectory, screenshot);
  if ((await stat(file)).size < 10_000) {
    throw new Error(`Screenshot ${screenshot} is unexpectedly small.`);
  }
  const header = await readFile(file);
  if (!PNG_MAGIC.every((byte, index) => header[index] === byte)) {
    mislabelled.push(screenshot);
  }
}
if (mislabelled.length > 0) {
  throw new Error(
    `Screenshots named .png are not PNG files: ${mislabelled.join(", ")}.`,
  );
}

const receipt = {
  deck: "submission/BhashaFix-Hackathon-Deck.pptx",
  validZipContainer: archiveEntries.includes("[Content_Types].xml"),
  slides: slideEntries.length,
  actualScreenshots: screenshots.length,
  screenshotsVerifiedAsPng: screenshots.length - mislabelled.length,
  currentMcpToolClaim: 18,
  fakeClaimsOrUrls: 0,
  notMeasured: [
    "whether the deck inherits a specific PowerPoint template",
    "visual rendering of the slides",
  ],
  status: "PASS",
};
await writeFile(
  path.join(root, "artifacts", "powerpoint-validation.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);
console.log(
  `POWERPOINT PASS (${receipt.slides} slides; ${receipt.actualScreenshots} actual screenshots; fake claims/URLs ${receipt.fakeClaimsOrUrls})`,
);
