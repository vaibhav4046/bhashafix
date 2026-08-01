import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:3101";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto(BASE + "/import");
const dump = async (label) => console.log(label, await p.evaluate(() =>
  [...document.querySelectorAll('[role="alert"]')].map((e) => ({
    tag: e.tagName, cls: String(e.className), id: e.id, text: (e.textContent||"").slice(0,50),
    parent: e.parentElement?.tagName + "." + String(e.parentElement?.className).slice(0,30),
  }))));
await dump("fresh:");
await p.locator('input[type="file"]').first().setInputFiles({ name:"bad.json", mimeType:"application/json", buffer: Buffer.from('{"hello":"world"}') });
await p.waitForSelector('[role="alert"]');
await dump("after reject:");
const good = await (await fetch(BASE + "/evidence/scans/browser-8182aab1-c3a2-4296-8380-c9b22aab4a3a/scan.json")).text();
await p.locator('input[type="file"]').first().setInputFiles({ name:"scan.json", mimeType:"application/json", buffer: Buffer.from(good) });
await p.waitForSelector(".ls-import-report");
await p.waitForTimeout(400);
await dump("after accept:");
await b.close();
