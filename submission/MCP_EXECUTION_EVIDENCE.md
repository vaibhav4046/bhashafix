# MCP execution evidence

Generated: 2026-08-03T08:28:14.704Z

This evidence was produced by an independent MCP TypeScript client connected to
the built `@bhashafix/mcp` server over a spawned STDIO process.

The 10-to-0 scan, repair and verification counts below are explicitly scoped
to the bundled AtlasPay fixture. They prove the built STDIO transport, schemas,
explicit-ID repair guardrails and fixture workflow; they do not claim
arbitrary-project source repair.

| Operation | Result |
| --- | --- |
| Tools/list | PASS · 18 tools |
| Project inspection | PASS · nextjs |
| Create scan | PASS · scan_b60794695e0d4623bf3600f76fd1bfc0 |
| Run scan | PASS · 10 verified issues |
| Issue listing | PASS · 10 issues |
| Report generation | PASS · 5 files |
| Repair dry run | PASS · applied=false |
| Explicit repair application | PASS · applied=true |
| Identical verification | verified · 0 blocking · source locale PASS |

Structured, redacted outputs are stored in `submission/mcp-output/`. Local
absolute project paths are replaced with `<PROJECT_ROOT>`.
