import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:3101";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
page.on("pageerror", (e) => errs.push(e.message));

// 1. Does a rejection alert survive a later successful import?
await page.goto(BASE + "/import");
await page.locator('input[type="file"]').first().setInputFiles({
  name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"hello":"world"}'),
});
await page.waitForSelector('[role="alert"]');
const good = await (await fetch(BASE + "/evidence/scans/browser-8182aab1-c3a2-4296-8380-c9b22aab4a3a/scan.json")).text();
await page.locator('input[type="file"]').first().setInputFiles({
  name: "scan.json", mimeType: "application/json", buffer: Buffer.from(good),
});
await page.waitForSelector(".ls-import-report");
await page.waitForTimeout(300);
const alerts = await page.locator('[role="alert"]').allInnerTexts();
console.log("alerts after successful import:", alerts.length, JSON.stringify(alerts.map(a=>a.replace(/\s+/g," ").slice(0,90))));

// 2. Evidence page: open a BF-A11Y-IMG-ALT-MISSING issue (the rule that records a rect).
await page.goto(BASE + "/evidence");
await page.getByRole("button", { name: /Wikipedia/ }).click();
const labels = await page.locator(".ls-issue-rule").allInnerTexts();
const idx = labels.findIndex((l) => l.includes("IMG-ALT-MISSING"));
console.log("issue rules on Wikipedia scan:", JSON.stringify(labels));
console.log("opening index", idx, labels[idx]);
await page.locator(".ls-issue-list button").nth(idx).click();
await page.waitForSelector(".ls-issue-open");
await page.waitForTimeout(1200);
const markers = await page.locator(".ls-shot-marker").count();
const box = await page.locator(".ls-shot-marker").first().boundingBox().catch(() => null);
console.log("markers drawn:", markers, "boundingBox:", JSON.stringify(box));
console.log("caption:", (await page.locator(".ls-shot figcaption").first().innerText()).replace(/\s+/g," "));
console.log("measured rows:", (await page.locator(".ls-issue-technical dd").first().innerText()).replace(/\s+/g," "));
const drawn = await page.locator('.ls-evidence-line li[data-drawn="true"]').count();
const proof = await page.locator(".ls-evidence-line li").last().innerText();
console.log("evidence-line drawn stages:", drawn, "| proof node:", proof.replace(/\s+/g," "));
console.log("console errors:", errs.length, errs);
await browser.close();
