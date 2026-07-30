# Product truth matrix

| Capability | Release status | Evidence | Claim boundary |
| --- | --- | --- | --- |
| AtlasPay deterministic scan | Verified | Ten stable predicates and measured evidence | Bundled target, not arbitrary-source inference |
| Bounded repository repair | Verified | Unified diff, three allowlisted files, rollback and audit record | Never mutates public websites |
| Identical-test verification | Verified | 10 blocking to 0; en-GB regression PASS | Model messages are not proof |
| Web replay | Verified genuine replay | `public/replay/` generated from a real local run | Clearly labelled replay |
| Public URL quick scan | Working limited release | Hosted SSRF-safe fetch, extraction and deterministic metadata/raw-key checks | One public route; full browser coverage is local/worker work |
| Synthetic localisation preview | Working deterministic preview | Protected-token pseudo-localisation in a sandboxed frame | Not the production website and not human translation |
| BCP 47 registry | Verified | `Intl.Locale`, plural, date, number and direction tests | No perfect-language-quality claim |
| Browser evidence | Verified for release browser | Chromium Playwright, axe, console, mobile/desktop/themes/reduced-motion | Firefox/WebKit depend on installed runtimes |
| CLI source execution | Verified | CLI contract tests and demo commands | Provider-backed translation requires configuration |
| CLI packed execution | Release gate | Clean temporary install from tarballs | Tarballs must not depend on unpublished workspace packages |
| MCP in-memory tests | Verified | Strict-schema scan/repair/verify test | Not sufficient as external invocation evidence |
| MCP Inspector | Release gate | Official Inspector CLI against built STDIO server | Local transport only in MVP |
| MCPC | Release gate | Independent `mcpc` tools-list and scan call | Local STDIO session |
| AI providers | Adapter contract | No-model deterministic path and truthful unavailable result | No provider success fabricated |
| Vercel deployment | Verified | `https://bhashafix.vercel.app` | Heavy browser worker is not hosted on Vercel |
| Dockerised scanner worker | Architecture roadmap | Documented separation boundary | Not presented as deployed |
| GitHub repository | External authentication required | `MANUAL_AUTH_REQUIRED.md` | No invented repository URL |
| Organiser submission | Manual login required | Ready-to-paste form and validated PPTX | No submission confirmation claimed |
