# BhashaFix

**Ship every language without breaking the UI.**

BhashaFix is an open-source localization repair agent. It renders a real
multilingual app, detects defects that string-level translation tools miss,
applies a bounded source repair, reruns the same browser predicates, and exports
proof.

The bundled Zariya demo deliberately contains five defects:

- Hindi heading clipping
- Tamil CTA truncation
- broken Urdu RTL direction
- a leaked Tamil translation key
- invalid locale metadata and an unnamed language switcher

The judge moment is one deterministic run:

> **5 reproducible defects → bounded repair → 0 defects → English PASS**

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, then visit:

- `/` — pitch and product story
- `/lab` — live browser-measured repair replay
- `/report/demo-run` — before/after evidence, diff, receipts, exports
- `/zariya/hi?state=broken` — bundled broken target
- `/zariya/hi?state=fixed` — repaired target

## Deterministic source repair

```bash
npm run demo:reset
npm run demo:scan
npm run demo:repair
npm run demo:prove
```

The repair changes only three allowlisted files under `demo/`, emits a unified
patch, and rejects proof if any canonical predicate remains.

## Quality gate

```bash
npm run verify
```

This runs lint, TypeScript, the production build, server-rendered route tests,
and the complete local 5 → 0 proof loop.

## Why this matters

Translation tools operate on strings. Production failures happen in rendered
interfaces: clipped glyphs, fixed-width controls, incorrect direction,
fallback keys, metadata mistakes, and accessibility regressions. BhashaFix
closes the loop from evidence to source patch to verified browser outcome.

## Honest scope

This hackathon MVP supports one polished vertical slice: the bundled Zariya
app, English plus Hindi/Tamil/Urdu, two canonical viewports, a strict three-file
repair boundary, and a hosted deterministic replay. It does not claim arbitrary
repository repair, auto-merge, translation management, authentication, or team
workspaces.

## License

MIT
