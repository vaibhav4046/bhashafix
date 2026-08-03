# BhashaFix — 3-minute pitch

Translation can be correct while the product is still broken.

AI systems and localisation platforms are increasingly good at generating and
managing strings. But production failures happen after that: Devanagari glyphs
clip, German buttons overflow, Arabic remains left-to-right, Hebrew icons point
the wrong way, Japanese keys leak, Chinese fonts miss glyphs, Thai refuses to
wrap, placeholders disappear, terminology drifts, and page metadata lies.

BhashaFix is the verification harness between AI-generated translations and
production software.

It combines a route crawler, contextual string extraction, `Intl`-backed BCP 47
locale intelligence, deterministic linguistic checks, real browser evidence,
bounded source repair, identical-test verification, and portable release proof.
Developers use one shared engine through the web, terminal, GitHub Actions, or
MCP.

The demonstration is deliberately falsifiable. AtlasPay contains ten real
defects across ten locales and five routes. BhashaFix reports stable issue IDs,
locale and route context, a deterministic predicate, measured evidence, and the
owning source file. It then prepares a real patch restricted to three
allowlisted fixture files.

The model never gets to say “fixed.” The same recorded fixture predicates
rerun. The final result is ten blocking failures to zero, with the en-GB source
locale passing. Console-error delta and accessibility regression were not
measured by that deterministic AtlasPay replay, so the report labels them
`not measured` rather than turning them into release claims.

The hosted experience includes two distinct public paths: a bounded real-
Chromium quick scan for one route, selected locales and one viewport, and a
five-route static HTTP preflight. The AtlasPay proof remains a clearly labelled
recorded fixture replay. Full matrices, durable artifacts and repository repair
run locally. The MCP 10-to-0 sequence is also fixture-scoped; it proves guarded
STDIO invocation and repair orchestration, not arbitrary-project mutation. The
report exports JSON, HTML, SARIF, JUnit, CSV, the unified patch, and proof JSON.

The architecture is provider-independent. OpenAI, Anthropic, Groq, or a local
compatible endpoint may evaluate meaning, tone, or cultural risk with a
confidence level and human-review gate. No provider is mandatory, and model
preference never overrides deterministic evidence.

Our wedge is not replacing translation management. It is giving every
translator, developer, QA team, and coding agent a reproducible answer to one
question: is this language safe to release?

BhashaFix supports Unicode content and user-selected BCP 47 locales through a
provider-independent pipeline. It does not promise perfect native-language
quality. It does promise that its engineering checks are measurable, its repair
boundary is visible, and its verification is repeatable.

Test, repair and prove every language before it reaches production.
