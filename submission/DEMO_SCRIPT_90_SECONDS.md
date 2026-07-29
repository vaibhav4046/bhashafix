# BhashaFix — 90-second demo

## 0–12 seconds — the gap

Open AtlasPay broken in Arabic, Hindi, and German.

“These strings were translated. The product is still broken: direction,
glyphs, layout, placeholders, terminology, metadata.”

## 12–24 seconds — the product

Open `/`.

“BhashaFix is the verification harness between AI translation and production.
It tests the rendered product through web, CLI, CI, or MCP.”

## 24–42 seconds — evidence

Open `/scan/atlaspay-replay`.

“This is a clearly labelled replay of a genuine deterministic run: five routes,
ten locales, three viewports, ten stable failures. Every issue has a selector,
source hint, measurement, screenshot context, and pass predicate.”

Change locale and viewport; toggle **Before repair** to **After repair**.

## 42–60 seconds — bounded repair

Open **Repairs**.

“The repair requires a scan ID and issue IDs, can touch only three allowlisted
JSON files, rejects traversal and symlinks, and shows the unified diff before
application. A model cannot mark itself correct.”

## 60–77 seconds — identical verification

Return to **Overview**, then open **Report**.

“The exact predicates rerun. Ten blocking failures become zero. en-GB
regression passes. Accessibility and console checks do not regress.”

## 77–90 seconds — portable proof

Show the JSON, HTML, SARIF, JUnit, CSV, patch, and proof downloads.

“General coding agents reason broadly. BhashaFix gives them a specialised,
reproducible localisation harness. Every language. Every viewport. Evidence
before release.”
