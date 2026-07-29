# BhashaFix

Translation can be correct while the product is still broken.

BhashaFix is an open-source localization repair agent that renders a real app in
Hindi, Tamil, and Urdu; catches clipped glyphs, truncated controls, broken RTL,
raw keys, metadata mistakes, and accessibility failures; applies a bounded
source repair; then reruns the exact same browser predicates.

Our bundled Zariya demonstration begins with five reproducible defects. The
repair is constrained to three allowlisted files and produces a real unified
patch. The same checks rerun, the defect count falls to zero, and an English
regression control remains green. The final report includes before/after
evidence, source changes, command receipts, and downloadable JSON and patch
artifacts.

Existing localization products are excellent at translating and managing
strings. BhashaFix focuses on the next failure boundary: whether the translated
product actually renders correctly. A model may diagnose or propose a repair,
but only the deterministic browser check is allowed to accept it.

The hackathon MVP is intentionally narrow and honest: one polished target app,
four languages, two viewports, five canonical defects, a strict repair
allowlist, and a no-secret hosted replay.
