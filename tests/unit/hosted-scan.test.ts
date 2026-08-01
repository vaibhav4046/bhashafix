import { describe, expect, it } from "vitest";
import {
  discoverInternalUrls,
  robotsAllowsPath,
  runHostedHttpScan,
} from "@bhashafix/crawler";

const pages = new Map([
  [
    "https://product.test/",
    {
      url: "https://product.test/",
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html>
        <html lang="en">
          <head><title>Product home</title></head>
          <body>
            <h1>Real product</h1>
            <p>Move money safely.</p>
            <a href="/pricing?utm_source=test">Pricing</a>
            <a href="/private">Private</a>
            <a href="https://outside.test/">Outside</a>
          </body>
        </html>`,
    },
  ],
  [
    "https://product.test/pricing",
    {
      url: "https://product.test/pricing",
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
        <html lang="de" dir="ltr">
          <body>
            <h1>checkout.pay_now</h1>
            <p>Transparent pricing.</p>
            <img src="/card.png">
          </body>
        </html>`,
    },
  ],
  [
    "https://product.test/robots.txt",
    {
      url: "https://product.test/robots.txt",
      status: 200,
      contentType: "text/plain",
      body: "User-agent: *\nDisallow: /private\nAllow: /private/public",
    },
  ],
]);

const fakeFetch = async (url: string) => {
  const page = pages.get(url);
  if (!page) throw new Error(`Unexpected URL: ${url}`);
  return page;
};

describe("hosted public scan", () => {
  it("discovers bounded same-origin routes and reports only checks it ran", async () => {
    const result = await runHostedHttpScan(
      {
        url: "https://product.test/",
        sourceLocale: "en-GB",
        locales: ["de-DE", "ar-SA"],
        maxRoutes: 5,
      },
      fakeFetch,
    );

    expect(result.mode).toBe("live hosted HTTP scan");
    expect(result.routes.map((route) => route.route)).toEqual(["/", "/pricing"]);
    expect(result.summary.routesChecked).toBe(2);
    expect(result.summary.stringsExtracted).toBeGreaterThan(3);
    expect(result.scope.browserRendered).toBe(false);
    // The hosted path never launches a browser, so it must not claim a live
// browser scan. The origin and the capability flag are asserted together so
// they cannot drift apart again.
    expect(result.origin).toBe("HTTP_PREFLIGHT");
    expect(result.scope.browserRendered).toBe(false);
    expect(result.notRun).toContain("JavaScript browser rendering");
    expect(result.robots.skippedRoutes).toBe(1);
    expect(result.issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        "wrong-page-lang",
        "raw-translation-key",
        "missing-document-title",
        "missing-image-alt",
      ]),
    );
    expect(result.issues.every((issue) => issue.confidence === "verified")).toBe(
      true,
    );
  });

  it("normalises tracking links and ignores assets and other origins", () => {
    expect(
      discoverInternalUrls(
        `<a href="/pricing?utm_source=nav">Pricing</a>
         <a href="/report.pdf">PDF</a>
         <a href="https://other.test/">Other</a>`,
        "https://product.test/",
      ),
    ).toEqual(["https://product.test/pricing"]);
  });

  it("does not treat a dotted product brand as a raw translation key", async () => {
    const brandPages = new Map(pages);
    brandPages.set("https://product.test/", {
      url: "https://product.test/",
      status: 200,
      contentType: "text/html",
      body: `<html lang="en"><title>Brand</title><body>
        <p>Mozilla.ai</p><p>Real product</p><p>Built responsibly</p>
      </body></html>`,
    });
    const result = await runHostedHttpScan(
      {
        url: "https://product.test/",
        sourceLocale: "en-GB",
        locales: ["de-DE"],
      },
      async (url) => {
        const page = brandPages.get(url);
        if (!page) throw new Error(`Unexpected URL: ${url}`);
        return page;
      },
    );

    expect(
      result.issues.filter((issue) => issue.ruleId === "raw-translation-key"),
    ).toEqual([]);
  });

  it("uses the most specific applicable robots rule", () => {
    const robots =
      "User-agent: *\nDisallow: /private\nAllow: /private/public\n";
    expect(robotsAllowsPath(robots, "/private/account")).toBe(false);
    expect(robotsAllowsPath(robots, "/private/public/guide")).toBe(true);
    expect(robotsAllowsPath(robots, "/pricing")).toBe(true);
    expect(
      robotsAllowsPath(
        "User-agent: *\nDisallow: /\nUser-agent: BhashaFix\nAllow: /\n",
        "/pricing",
      ),
    ).toBe(true);
  });
});
