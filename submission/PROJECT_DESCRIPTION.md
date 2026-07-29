# BhashaFix

AI systems can generate translations, but they cannot see every clipped
button, broken RTL layout, corrupted placeholder, glossary violation, font
failure, or accessibility regression. BhashaFix provides the specialised
testing harness.

A user enters a public URL or connects a local project. The shared engine
discovers routes and localisation infrastructure, canonicalises user-selected
BCP 47 locales, extracts contextual strings, runs deterministic linguistic and
locale checks, renders browser evidence, prepares an allowlisted repair, reruns
the identical predicates, protects the source locale, and exports JSON, HTML,
SARIF, JUnit, CSV, screenshots, and a unified patch.

The same core is available through a premium web workspace, `@bhashafix/cli`,
`@bhashafix/mcp`, and GitHub Actions. No model provider is mandatory. Provider
output can explain or recommend; it cannot declare a deterministic failure
fixed.

The bundled AtlasPay application contains ten intentional failures across
Hindi, German, Arabic, Hebrew, Japanese, Simplified Chinese, Thai, French,
Spanish, and English. The genuine demo sequence is:

```text
10 verified failures
→ inspect measured evidence
→ prepare a three-file bounded repair
→ show the real unified diff
→ apply
→ rerun identical checks
→ 0 blocking failures
→ en-GB regression PASS
```

The hosted demo uses replay artifacts generated from that real run and labels
them clearly. The local CLI and MCP tests execute the actual scan,
prepare/apply, and verification functions.

BhashaFix supports Unicode content and user-selected BCP 47 locales through a
provider-independent localisation pipeline. Deterministic engineering checks
are authoritative. Linguistic judgements include confidence levels and
human-review gates. It does not claim perfect native-language quality or
unrestricted access to every website or codebase.
