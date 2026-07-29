# Security policy

## Supported version

The latest `main` branch and latest tagged release receive security fixes.

## Report a vulnerability

Do not open a public issue for an exploitable vulnerability. Use GitHub private
vulnerability reporting when the public repository is available, or contact the
maintainer privately. Include affected versions, reproduction steps, impact,
and a minimal proof of concept. Do not include real secrets or third-party data.

## Trust boundaries

- Hosted URLs allow HTTP(S) only and block loopback, private, link-local, and
  cloud metadata destinations after DNS resolution and redirects.
- Localhost is permitted only in explicit local CLI mode.
- Crawls enforce route, depth, rate, redirect, response-size, and timeout limits.
- Extracted content is redacted before provider use; hidden credentials and form
  values are excluded.
- Repairs require explicit scan and issue IDs, a project-root path, an exact
  allowlist, regular files, and no symlink traversal.
- A unified diff is produced before application. Rollback data and an audit
  record are retained locally.
- Provider failure is reported truthfully. No model message can mark verification
  successful.
- The web app uses a restrictive content security policy, referrer policy,
  MIME protections, same-origin framing, and a minimal permissions policy.

## Provider data

No provider is required. In no-AI mode, no content is sent to a model. When a
provider is configured, BhashaFix should send only the source/target/context
needed for the requested assessment, never credentials or unrelated repository
content. Operators remain responsible for provider retention and regional
policies.

## Known MVP limits

The hosted scanner is intentionally bounded and does not provide an isolation
container for arbitrary browser-executed websites. Automatic source repair is
limited to the bundled allowlisted target. Production multi-tenant use requires
stronger process isolation, tenant authentication, quotas, and centralized
audit storage.
