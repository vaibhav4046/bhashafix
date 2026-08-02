# Tooling disclosure: independent audit and hardening pass

This project was built with more than one AI coding agent. Both are disclosed
here so judges can attribute the work accurately. Nothing in this file is
inferred; every claim maps to a commit in `git log`.

## Timeline

| Phase | Agent | Commits |
| --- | --- | --- |
| Planning, initial build, deployment, first submission package | Codex | `e531633` … `a75aa1f` (20 commits) |
| Independent audit and hardening | Claude Opus 5 (Claude Code) | `850ce1b` onwards |

The Codex history has been preserved exactly as written. It has not been
squashed, rewritten or rebased, and no Codex commit has been re-attributed.
`submission/CODEX_USAGE_EVIDENCE.md` remains the record of that phase.

## Why a second pass happened

Codex reached its usage limit with the product in a state the author judged
unfinished: visually complete, but with a large gap between what the interface
claimed and what the code did. A second agent was used specifically to audit
that gap adversarially and close it.

## What the audit found

The audit was run as independent read-only passes over the repository at commit
`a75aa1f`, with a separate adversarial pass tasked with refuting each
conclusion. The full result is in `docs/PRODUCT_TRUTH_MATRIX.md`. The
load-bearing findings:

- **No browser was launched anywhere in the product.** The central claim — that
  BhashaFix renders every locale in a real browser — was not implemented.
  Playwright appeared only in the end-to-end suite and two standalone scripts.
  The "local Playwright tier" that the interface and CLI directed users to did
  not exist.
- `packages/core` evaluated four checked-in JSON files and emitted
  `screenshotBefore` paths into `public/evidence/`, a directory that was never
  created.
- `bhashafix scan --project` failed with `ENOENT` on any project other than the
  bundled fixture.
- The repair engine's "unified diff" used `@@ pointer @@` headers, which
  `git apply` and `patch` both reject.
- The verifier reported three results — console-error delta, accessibility
  regression, diff policy — that were hardcoded literals.
- `bhashafix mcp` started two MCP servers on one stdio pipe, so every tool call,
  including the destructive `apply_repair`, executed twice.
- Several build receipts emitted `"PASS"` values that no check computed.
- The workspace UI displayed an invented console timeline, axe tables where axe
  never ran, and overflow metrics beside iframes that were never measured.
- Eight release screenshots named `.png` contained JPEG data.

## What the hardening pass changed

- Added `packages/browser`: a real Playwright adapter, an in-page measurement
  pass, and 15 deterministic rules driven by those measurements. This wired up
  `detectElementOverflow` and `detectViewportOverflow`, which already existed
  but had no production callers.
- `bhashafix scan --url` now discovers routes from the rendered DOM, renders
  route × locale × viewport, runs axe, and writes real PNG screenshots and DOM
  snapshots. `bhashafix doctor` probes a real browser launch.
- Added a ground-truth benchmark over a generated six-locale fixture site with
  33 labelled defects across 12 rule families. See `submission/EVAL_RESULTS.md`
  for the measured numbers.
- Fixed the MCP double-start and added a subprocess test that would have caught
  it. The pre-existing MCP tests could not, because they drive the server
  in-process.
- Replaced the fabricated receipts, diffs, verifier fields and UI metrics with
  computed values, or with an explicit "not measured" where no measurement
  exists.
- Re-encoded the mislabelled screenshots and added a byte-level check so the
  problem cannot recur silently.

## What is still not claimed

The hardening pass did not make everything true. The following remain
unimplemented and are stated as such throughout the product:

- The hosted Vercel product now includes a bounded real-Chromium quick scan for
  one route and one viewport, alongside the five-route HTTP preflight. Full
  matrices and source repair require the local CLI or a configured worker.
- There is no server-side scan store; web scan history is per browser.
- Repair still only rewrites allowlisted JSON. It cannot repair `.tsx` or CSS.
- `bhashafix scan --project` on an arbitrary repository is still fixture-bound.
- No model provider is configured, so linguistic review is deterministic only.
- Only Chromium has been exercised in this environment.
