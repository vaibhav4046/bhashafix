/**
 * Re-encode release screenshots whose bytes do not match their extension.
 *
 * Several assets were shipped as `.png` while holding JPEG data. Rather than
 * renaming them (which would break every reference), decode and re-encode to
 * genuine PNG using the browser already required by the scanner.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function matches(bytes: Buffer, magic: number[]) {
  return magic.every((byte, index) => bytes[index] === byte);
}

const directories = process.argv.slice(2);
if (directories.length === 0) {
  throw new Error("Usage: normalise-screenshots.ts <directory> [<directory>...]");
}

const browser = await chromium.launch();
const page = await browser.newPage();
const converted: string[] = [];
const alreadyValid: string[] = [];

try {
  for (const directory of directories) {
    const absolute = path.resolve(directory);
    for (const file of await readdir(absolute)) {
      if (!file.toLowerCase().endsWith(".png")) continue;
      const target = path.join(absolute, file);
      const bytes = await readFile(target);
      if (matches(bytes, PNG_MAGIC)) {
        alreadyValid.push(file);
        continue;
      }
      if (!matches(bytes, JPEG_MAGIC)) {
        throw new Error(`${file} is neither PNG nor JPEG; refusing to guess.`);
      }
      const dataUri = `data:image/jpeg;base64,${bytes.toString("base64")}`;
      const encoded = await page.evaluate(async (source: string) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D context unavailable.");
        context.drawImage(image, 0, 0);
        return canvas.toDataURL("image/png").split(",")[1];
      }, dataUri);
      await writeFile(target, Buffer.from(encoded, "base64"));
      converted.push(file);
    }
  }
} finally {
  await browser.close();
}

console.log(
  `SCREENSHOTS re-encoded ${converted.length} JPEG-in-PNG file(s); ${alreadyValid.length} already valid.` +
    (converted.length ? `\nConverted: ${converted.join(", ")}` : ""),
);
