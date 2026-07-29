import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the judge-facing BhashaFix pitch", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /BhashaFix/);
  assert.match(html, /Translation is done/);
  assert.match(html, /Watch 5 defects disappear/);
  assert.doesNotMatch(html, /codex-preview/);
});

test("renders the live lab and proof report routes", async () => {
  for (const path of ["/lab", "/report/demo-run"]) {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /BhashaFix/);
  }
});

test("renders all bundled Zariya locales", async () => {
  for (const locale of ["en", "hi", "ta", "ur"]) {
    const response = await render(`/zariya/${locale}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /zariya/i);
  }
});
