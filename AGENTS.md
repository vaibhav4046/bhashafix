# BhashaFix repository guardrails

- Read `BHASHAFIX_WINNER_GRADE_COMPLETION_PROMPT.md` before release work and
  treat sections 23–25 as the mandatory hostile-audit contract.
- Preserve the canonical AtlasPay contract: exactly 10 verified baseline
  failures become 0 blocking failures and the en-GB source regression passes.
- Never replace deterministic predicates with model confidence, mocked browser
  evidence, or hard-coded success.
- Keep repair operations inside the allowlist under
  `apps/demo-target/data/`; require explicit scan and issue IDs.
- The hosted experience is a clearly labelled replay generated from a genuine
  local run and must work without secrets or a model provider.
- Treat linguistic recommendations as confidence-scoped findings with
  human-review gates.
- Preserve locale-agnostic BCP 47/Unicode handling. Do not add per-language
  engine condition chains for the fixture defects.
- Never weaken tests, suppress type errors, delete assertions, hide console
  failures, leak secrets, or fabricate command receipts.
- Run the narrow relevant test after each change and `pnpm verify` before a
  release claim.
- P2 features such as teams, billing, SSO, remote MCP, and automatic arbitrary
  source repair remain roadmap work unless the specification changes.
