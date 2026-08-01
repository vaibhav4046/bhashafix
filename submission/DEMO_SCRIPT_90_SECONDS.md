# BhashaFix — 90 second demonstration

Every figure below comes from a recorded run in this repository. The receipts
are `public/evidence/index.json`, `artifacts/nextjs-repair-proof.json`,
`artifacts/benchmark.json`, `artifacts/pack-verify/receipt.json` and
`artifacts/mcp-stdio-receipt.json`. Nothing is re-enacted.

---

## 0:00 – 0:10 · The problem

Open `https://bhashafix.vercel.app`.

> "AI can translate every string. It cannot prove the product still works."

The homepage leads with the command you run in your own project, not with a
hosted scan. Browsers, source and repair stay on your machine; the site is the
console you review the evidence in.

---

## 0:10 – 0:25 · A genuine Chromium scan

Open **Inspect a real external scan**. Three scans, all produced by the CLI:

| Target | Scan ID | Routes | Screenshots | Issues | Captured |
| --- | --- | ---: | ---: | ---: | --- |
| BhashaFix production | `browser-bce30786-6142-49c0-910a-e9d9098e41ff` | 3 | 6 | 10 | 2026-08-01T08:48:36Z |
| MDN Web Docs | `browser-511d535a-8dd5-4614-884c-6efbfe3fd6b6` | 3 | 6 | 9 | 2026-08-01T08:48:48Z |
| Wikipedia | `browser-8182aab1-c3a2-4296-8380-c9b22aab4a3a` | 2 | 4 | 16 | 2026-08-01T08:49:15Z |

Real routes, real screenshots, real DOM evidence. Each image carries its
SHA-256, so the picture on screen is provably the picture the scan captured.

---

## 0:25 – 0:40 · One measured finding

Open a visual failure and a locale-integrity failure side by side.

```
BF-VIS-TEXT-OVERFLOW-X  de-DE  [data-testid="cta-primary"]
  plain      The German button label is cut off.
  measured   scrollWidth 245 · clientWidth 168 · overflowPx 77 · overflow-x hidden
  predicate  element.scrollWidth <= element.clientWidth + 2
```

```
BF-LOC-DIR-MISSING  ar-SA  html
  plain      An Arabic page is laid out left to right.
  measured   declaredDir "ltr" · expectedDir "rtl" · script Arab
  predicate  document.documentElement.dir === 'rtl' when the locale script is RTL
```

Each has a beginner explanation and the exact measurement behind it. Neither is
a model's opinion.

---

## 0:40 – 1:00 · A verified repair

Open the AtlasPay proof, labelled `RECORDED VERIFIED RUN`.

```
10 blocking defects
  → real unified diff, git apply --check exits 0
  → identical predicates rerun
  → 0 blocking defects
  → source locale en-GB PASS
```

And the same loop on real Next.js source — `.tsx`, `.css` and a translation
JSON:

```diff
-    <html lang="en">
+    <html lang={locale} dir={textDirection(locale)}>
-  width: 168px; white-space: nowrap;
+  max-width: 168px;
+  "cta.primary": "無料で始める"
```

```
6 blocking → 0 · source locale 0 → 0 · new blockers 0
3 files, 10 lines · diff hash f38acc25… · rollback snapshot taken first
scans browser-08293a6a… → browser-c0101b7e…
```

A model cannot mark its own answer correct. BhashaFix reruns the predicates.

---

## 1:00 – 1:15 · Run it yourself

```
npx @bhashafix/cli scan --url http://localhost:3000 --locales en-GB,de-DE,ar-SA,ja-JP
```

Chromium opens, every locale renders, evidence lands in `.bhashafix/scans/<id>/`
with a persisted scan ID, and the exit code gates your release. `bhashafix open`
opens the report.

---

## 1:15 – 1:25 · The agent gate

> "Coding agents can generate translations. BhashaFix gives them a release gate
> they cannot talk their way around."

From `artifacts/mcp-stdio-receipt.json` — an external client, spawned over
STDIO against `packages/mcp/dist/bin.js`: 18 tools, 4 resources, 5 prompts.
The recorded call sequence is on the site: inspect → create scan → run → read
issues → prepare repair (dry run) → apply approved IDs → rerun predicates. The
agent cannot finish until verification passes.

---

## 1:25 – 1:30 · Close

> 70 labelled defects, 12 rule families, 12 locales, 288 real browser renders.
> Recall 100%. Precision 100%. Zero false positives on the clean variant.

> "AI generates every language. BhashaFix proves the release is safe."

---

## Stated plainly during the demo

- The hosted site does not run a browser. That is the architecture: the engine
  runs locally, the console reviews portable evidence, and no repository is
  uploaded.
- AtlasPay is a recorded fixture run, labelled `RECORDED_REPLAY`. It is genuine,
  and it is not a live scan.
- The real-site scans prove operability, not precision — those targets carry no
  ground-truth labels.
- Verified repair covers locale JSON, `lang`/`dir`, and bounded layout fixes in
  the supported Next.js fixture. Broader TSX and CSS repair is experimental.
