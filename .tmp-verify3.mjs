import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
await p.goto("http://127.0.0.1:3101/import");
console.log(await p.evaluate(() =>
  [...document.querySelectorAll('[role="alert"]')].map((e) => ({
    tag: e.tagName, parent: e.parentElement?.tagName, cls: e.className, text: e.textContent?.slice(0,40),
  }))
));
// Same check on a page with no console of ours at all:
await p.goto("http://127.0.0.1:3101/docs");
console.log("on /docs:", await p.evaluate(() => document.querySelectorAll('[role="alert"]').length));
await b.close();
