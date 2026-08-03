# AI tooling and release-ownership disclosure

This project was built with more than one AI coding agent. Both are disclosed
so judges can attribute the work accurately. Claims below map to repository
history, executable evidence, or the final release audit.

## Timeline

| Phase | Agent | Evidence |
| --- | --- | --- |
| Planning, initial build, first deployment and first submission package | Codex | `e531633` through `a75aa1f` |
| Independent adversarial audit and browser-engine hardening | Claude Opus 5 (Claude Code) | the post-`a75aa1f` hardening sequence before final integration |
| Final integration, hosted security hardening, product refinement, release verification and deployment | Codex | `d682470` and the final release increment |

The history was preserved rather than rewritten to make the project look
single-agent. `submission/CODEX_USAGE_EVIDENCE.md` records Codex's baseline and
final release work; this document also credits the independent Claude Code
audit and implementation pass that Codex reviewed and integrated.

## Why the independent pass happened

The initial product needed an adversarial review of the gap between interface
claims and executable evidence. Claude Code was used for that second
perspective and implemented substantial browser-engine, benchmark and protocol
work. Codex then resumed as release owner: it reviewed the inherited changes,
closed the hosted security and product gaps, reran the complete contract,
reconciled the submission narrative and deployed the integrated result.

## What the independent audit found

The audit examined the repository as it existed after the initial build. The
full historical record remains in `docs/PRODUCT_TRUTH_MATRIX.md`. Its
load-bearing findings included:

- The original production packages did not launch a browser even though the UI
  described a browser-backed local tier.
- AtlasPay scan results were fixture predicates with dangling screenshot paths,
  not browser measurements.
- `bhashafix scan --project` was fixture-bound.
- The original repair diff was not accepted by `git apply`.
- Three verifier fields were hard-coded rather than measured.
- The CLI MCP entrypoint started two servers on one STDIO pipe.
- Several receipts and UI metrics asserted checks that had not run.
- Eight files named `.png` actually contained JPEG bytes.

## What the independent hardening pass contributed

- Added the Playwright browser adapter, rendered-DOM measurement, axe execution,
  route discovery, real PNG screenshots and DOM snapshots.
- Wired `bhashafix scan --url`, browser-aware doctor output and cross-engine
  selection.
- Added a ground-truth benchmark over a generated 12-locale fixture site with
  70 labelled defects across 12 rule families.
- Fixed the MCP double-start and added a real subprocess regression test.
- Replaced unsupported receipts, diffs, verifier fields and UI metrics with
  computed values or explicit `not measured` states.
- Added cross-engine checks and real-site scans that exposed and corrected rule
  false positives.

## What Codex final integration contributed

- Reviewed and preserved valid independent-agent work instead of replacing it,
  then reconciled it with the shared web, CLI, MCP and CI contracts.
- Hardened hosted Chromium so every redirect, frame and subrequest is checked
  against the SSRF policy; capped requests and origins; redacted failed-request
  query strings; removed stack leakage; and closed a concurrency race.
- Refined the live quick-scan experience, BCP 47 inputs, viewport selection,
  evidence download, accessibility and truthful scope labels.
- Fixed a real light-theme accessibility regression and reduced generated-file
  lint noise without weakening any rule or assertion.
- Ran the full release contract, production build, packed CLI/MCP clients, MCP
  Inspector, MCPC, browser E2E, the AtlasPay 10-to-0 proof, the Next.js 6-to-0
  proof, the 70-defect benchmark, hostile audit and production smoke.
- Reconciled the final submission artifacts and public deployment with the
  behavior that was actually verified.

## What is still not claimed

- The hosted Vercel product includes a bounded real-Chromium quick scan for one
  route, up to three locales and one viewport, alongside a separate five-route
  static HTTP preflight. Full matrices, persisted artifacts and source repair
  remain local CLI responsibilities.
- There is no server-side scan store; hosted results are not durable.
- The canonical AtlasPay and MCP 10-to-0 repair proof is fixture-scoped.
- General `scan --project` and arbitrary TSX/CSS repair remain limited or
  experimental beyond the verified Next.js fixture path.
- No model provider is configured, so linguistic review is deterministic-only.
- Chromium, Firefox and WebKit were exercised on the same bounded configuration;
  only Chromium ran the complete 288-render benchmark.
