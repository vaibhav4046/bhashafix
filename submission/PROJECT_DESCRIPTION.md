# BhashaFix

**A local-first localisation release firewall for developers, CI pipelines and
coding agents, with a web evidence and review console.**

## The problem

AI can translate every string in a product in minutes. Teams still ship:

- clipped text
- broken right-to-left layout
- raw translation keys in the interface
- invalid or dropped placeholders
- controls with no accessible name
- wrong or missing locale metadata

None of those are translation problems. They are rendering problems, and they
only appear once the translated string meets the actual layout in an actual
browser.

## The gap

Translation platforms manage the text. Coding agents modify the code. Browser
testing tools test the interface. No one owns the localisation-specific release
gate that connects the three — the step that says *this build is safe to ship in
these twelve languages, and here is the evidence*.

## What BhashaFix does

It runs inside the developer's environment and, for every route × locale ×
viewport:

```
Discovers → Renders → Measures → Explains → Repairs → Verifies → Proves
```

Every finding carries the number that produced it and the predicate that was
evaluated. For example:

```
BF-VIS-TEXT-OVERFLOW-X  de-DE  [data-testid="cta-primary"]
  text        "Kostenlos mit Meridian starten"
  scrollWidth 245
  clientWidth 168
  overflowPx  77
  predicate   element.scrollWidth <= element.clientWidth + 2
```

## The differentiator

A model cannot mark its own answer correct. After a repair, BhashaFix reruns the
same deterministic browser predicates on the rebuilt project and compares like
for like. A repair is only accepted when the original predicate passes, the
source locale still passes, and no new blocking issue has appeared.

Measured on the bundled Next.js fixture: 6 blocking issues before, 0 after, the
source locale unchanged at 0, and 0 new blockers — across two scans with
identical configuration.

## Architecture, and why it is local-first

```
CLI  ·  MCP  ·  CI  ·  local or remote browser worker      the engine
Web console                                                 evidence and review
```

The hosted site runs a **bounded** quick scan: Chromium starts inside the
serverless function, renders the submitted URL in two locales at 390x844,
measures the DOM and runs axe. The function has a 60 second ceiling, so it is
one route, one viewport, and nothing is stored.

Everything that needs scale or trust stays local by design: **the full route ×
locale × viewport matrix, persisted artifacts, your source code and every repair
operation run inside your environment.** A portable report can be shared with
the team, or opened in the web console, without uploading a repository
anywhere.

## Measured accuracy

Scored against a labelled corpus, not asserted:

| | |
| --- | ---: |
| Labelled defects | 70 |
| Rule families | 12 |
| Locales | 12 |
| Real browser renders per run | 288 |
| Recall | 100% |
| Precision | 100% |
| False positives on the clean variant | 0 |

Two real rule defects were found by scanning public sites and fixed in the
rules, not worked around: Wikipedia's 1px visually-hidden pattern produced 64
false "clipped text" findings, and accessible-name computation ignored a
control's descendant `img[alt]`.

## What it does not claim

- The hosted quick scan renders one route in two locales at one viewport and
  persists nothing. It is not a substitute for a CLI run.
- The MCP 10-to-0 repair receipt is AtlasPay-fixture evidence. MCP transport,
  schemas, inspection and guarded mutation are verified, but arbitrary-project
  MCP repair is not claimed.
- Verified repair covers locale JSON, `lang`/`dir` metadata, and bounded layout
  fixes in the supported Next.js fixture. Arbitrary TSX and CSS repair, and
  other frameworks, are experimental.
- Real-site scans prove operability, not precision — those targets carry no
  ground-truth labels, so no accuracy figure is derived from them.
- No model provider is configured; linguistic review is deterministic only.
- Chromium, Firefox and WebKit have each been exercised. On an identical
  configuration all three agree on the deterministic rules; Firefox reports one
  extra axe finding, because that check depends on computed scroll state. Only
  Chromium has been run across the full 288-render benchmark.
- It does not claim native-quality translation in any language.
