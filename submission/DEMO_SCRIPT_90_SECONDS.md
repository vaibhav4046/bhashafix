# BhashaFix — 90-second demo

**0–10s — Show the breakage**

“These translations are correct. The product is not.” Show the Hindi heading
clip, Tamil CTA truncation, and Urdu page flowing left-to-right.

**10–22s — State the gap**

“Translation tools stop at strings. BhashaFix tests the rendered product.”

**22–40s — Run the scan**

Open `/lab` and select **Run 5 → 0 proof**. Point out that each issue has a
locale, browser measurement, stable ID, and source hint.

**40–57s — Show the bounded repair**

Follow the pipeline into Repair. Call out the three-file allowlist and the
command receipt. “The model can propose a patch; it cannot mark itself correct.”

**57–73s — Verify**

The same predicates rerun. Show **All predicates green**, **English regression:
PASS**, and zero command failures.

**73–86s — Prove**

Open the report. Drag the before/after reveal, switch locale tabs, show the
unified diff, then download the JSON proof or patch.

**86–90s — Close**

“Translation tools stop at strings. BhashaFix repairs the product—and proves
it.”
