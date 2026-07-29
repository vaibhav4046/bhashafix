# BhashaFix — 3-minute pitch

Localization teams already have strong translation tools. Yet translated
products still ship with clipped Hindi glyphs, truncated Tamil buttons, broken
Urdu direction, raw fallback keys, and inaccessible locale controls.

The missing layer is not another translator. It is a repair loop for the
rendered interface.

BhashaFix opens the real route at the exact locale and viewport, measures the
DOM and metadata, bundles reproducible evidence, applies a path-restricted
source patch, then reruns the same predicates. The model does not get to declare
victory; the browser does.

Our Zariya vertical slice makes this undeniable. It begins with five deliberate
localization defects across Hindi, Tamil, and Urdu. In one run BhashaFix captures
all five, repairs only three allowlisted source files, reaches zero open defects,
and keeps the English control green.

The proof report retains what teams and reviewers need: before/after rendered
evidence, stable issue IDs, source hints, a real unified diff, command exit
codes, and downloadable structured artifacts.

We made one deliberate product decision for reliability: the hosted demo is a
clearly labelled deterministic replay. It requires no browser binary or API key
at request time. The local workflow performs the real bounded source mutation
and proof export. This keeps the judge demo resilient while preserving an
honest technical core.

The roadmap is straightforward: isolated worktrees, framework adapters, CI
gates, screenshot retention, and optional coding-agent integrations. But the
wedge stays the same: do not ask whether every string was translated. Ask
whether every language actually shipped.

Translation tools stop at strings. BhashaFix repairs the product—and proves it.
