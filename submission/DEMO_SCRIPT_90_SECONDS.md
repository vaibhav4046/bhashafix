# BhashaFix — 90 second demonstration

Every value below comes from a recorded run in this repository. Nothing is
staged, re-enacted or approximated. The receipts are
`artifacts/nextjs-repair-proof.json`, `artifacts/benchmark.json`,
`artifacts/real-site-scans.json`, `artifacts/pack-verify/receipt.json` and
`artifacts/mcp-stdio-receipt.json`.

---

## 0:00 – 0:10 · The problem

Open `https://bhashafix.vercel.app`.

> "AI can generate every language. It cannot tell you the product still works
> in them. BhashaFix renders each locale in a real browser and measures what
> breaks."

The homepage is one input and one action: paste a URL, or connect a project.

---

## 0:10 – 0:30 · A real browser scan

Run, from a terminal:

```bash
pnpm bhashafix scan --url https://en.wikipedia.org/wiki/Localization --locales en-GB,he-IL --routes "/wiki/Localization" --viewports mobile --verbose
```

Chromium launches. Routes come from the rendered DOM, not from guesswork. Each
render writes a real PNG and a DOM snapshot, and the scan is persisted under its
own ID that another process can read back.

Recorded run — `artifacts/real-site-scans.json`:

| Target | Scan ID | Renders | Screenshots | Issues |
| --- | --- | ---: | ---: | ---: |
| Wikipedia | `browser-8182aab1-c3a2-4296-8380-c9b22aab4a3a` | 4 | 4 | 16 |
| MDN Web Docs | `browser-511d535a-8dd5-4614-884c-6efbfe3fd6b6` | 6 | 6 | 9 |

---

## 0:30 – 0:45 · Two findings, both measured

**A measured visual failure**, from the Next.js proof run:

```
BF-VIS-TEXT-OVERFLOW-X  de-DE  [data-testid="cta-primary"]
  text        "Kostenlos mit Meridian starten"
  scrollWidth 245
  clientWidth 168
  overflowPx  77
  overflowX   hidden        the German label is clipped
  predicate   element.scrollWidth <= element.clientWidth + 2
```

**A locale-integrity failure**, on the same page set:

```
BF-LOC-DIR-MISSING  ar-SA  html
  declaredDir  "ltr"
  expectedDir  "rtl"
  script       Arab
  predicate    document.documentElement.dir === 'rtl' when the locale script is RTL
```

Each carries the number that produced it and the predicate that was evaluated.
Neither is a model's opinion.

---

## 0:45 – 1:05 · A real source repair

Switch to the Next.js project at `fixtures/nextjs-app`:

```bash
pnpm repair:nextjs
```

Three bounded strategies touch three real files:

```diff
--- a/fixtures/nextjs-app/app/[locale]/layout.tsx
+++ b/fixtures/nextjs-app/app/[locale]/layout.tsx
-    <html lang="en">
+    <html lang={locale} dir={textDirection(locale)}>

--- a/fixtures/nextjs-app/app/globals.css
+++ b/fixtures/nextjs-app/app/globals.css
 .cta {
-  width: 168px;
-  white-space: nowrap;
+  max-width: 168px;

--- a/fixtures/nextjs-app/messages/ja-JP.json
+  "cta.primary": "無料で始める"
```

The patch is a genuine unified diff, not a summary of one:

```
$ git apply --check artifacts/nextjs-repair.diff
$ echo $?
0
```

3 files, 10 changed lines, diff hash `f38acc25…`. Dry-run is the default, each
file is pinned by SHA-256 before it is written, and a rollback snapshot is taken
first.

---

## 1:05 – 1:20 · Identical verification

The project is rebuilt and the **same scan configuration** runs again:

| | before | after |
| --- | ---: | ---: |
| Blocking issues | **6** | **0** |
| Source locale `en-GB` | 0 blocking | 0 blocking |
| New blocking issues | — | **0** |

Scan IDs `browser-08293a6a-4b7d-4be0-a7e8-1323900a6284` →
`browser-c0101b7e-a122-4a36-bf70-3ea2c1ab1137`. Both used the same routes,
locales, viewport and axe setting, so the comparison is like for like.

---

## 1:20 – 1:30 · One engine, three surfaces

**CLI, installed outside the monorepo** — `artifacts/pack-verify/receipt.json`:

```
clean consumer   fresh OS temp directory outside the repository
cliDoctor        PASS      browser available: true
fixture scan     10 blocking  →  0 after repair
```

**MCP, driven by an external client** — `artifacts/mcp-stdio-receipt.json`:

```
transport   spawned STDIO process
server      packages/mcp/dist/bin.js
tools       18     resources 4     prompts 5
baseline    10 blocking  →  verified after repair
```

Close on the measured accuracy, from `artifacts/benchmark.json`:

> 70 labelled defects, 12 rule families, 12 locales, 288 real browser renders.
> Recall 100%. Precision 100%. Zero false positives on the clean variant.

> "AI generates every language. BhashaFix proves the product still works."

---

## What the demo deliberately does not claim

- The hosted Vercel scan is `HTTP_PREFLIGHT`: static HTTP only, no browser. A
  Vercel function cannot host a render matrix, so browser work runs in the CLI
  or through a worker at `BHASHAFIX_BROWSER_WS_ENDPOINT`.
- AtlasPay stays in the product as `RECORDED_REPLAY`. It is a genuine fixture
  run, but it is not a live scan and is not the headline proof.
- The real-site scans prove operability, not precision. Those targets carry no
  ground-truth labels, so no accuracy figure is derived from them.
