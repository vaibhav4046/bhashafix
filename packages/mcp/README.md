# @bhashafix/mcp

Strict local STDIO MCP server for BhashaFix evidence, locale review, bounded
repair planning/application, verification, and reports.

```bash
bhashafix-mcp
```

Mutation tools require explicit scan and issue IDs, enforce project-root and
allowlist policy, support dry run, and return verification rather than an
unsupported success claim. Requires Node.js 22+. Licensed under Apache-2.0.

The built server exposes 18 strict tools, including explicit create/run scan
operations and a protected synthetic-localisation preview. Release verification
uses the official MCP Inspector, the TypeScript client over a spawned STDIO
process, and `@apify/mcpc`.
