import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "../../product";

export const metadata: Metadata = {
  title: "Run BhashaFix locally",
  description:
    "Install and run the BhashaFix CLI: clone-and-run, a packed tarball, the scan command, and the artifacts a run writes.",
};

const ROUTES = [
  [
    "1 · Clone and run",
    "Works today, with no package registry involved.",
    `git clone https://github.com/vaibhav4046/bhashafix
cd bhashafix
pnpm install
pnpm exec playwright install chromium
pnpm bhashafix scan --url https://example.com`,
  ],
  [
    "2 · Pack a tarball and install it",
    "Produces the same executable a published package would. `pnpm pack:verify` runs exactly this into a clean temporary consumer outside the repository.",
    `pnpm --filter @bhashafix/cli build
cd packages/cli
pnpm pack --pack-destination ../../artifacts
npm install -g ../../artifacts/bhashafix-cli-0.2.0.tgz
bhashafix scan --url http://localhost:3000 --locales en-GB,de-DE,ar-SA,ja-JP`,
  ],
] as const;

const WRITES = [
  [
    "scan.json",
    "the scan record: config, routes discovered, locales tested, every issue with its measurement and the predicate it failed",
  ],
  [
    "renders.json",
    "one row per render: route, locale, viewport, theme, HTTP status, duration, elements measured, console errors, failed requests, axe violations",
  ],
  ["screenshots/", "one PNG per render, referenced by every issue measured in it"],
  [
    "report.json · report.html · report.sarif · junit.xml · issues.csv",
    "portable exports of the same scan",
  ],
  ["repair.patch", "the unified diff a repair proposes, confined to the allowlist"],
  [
    "repair-proof.json",
    "the proof capsule: baseline blocking, final blocking, source-locale regression, and which fields were not measured",
  ],
] as const;

const COMPARISON = [
  ["Real HTTP responses, metadata, static translation signals", "yes", "yes"],
  ["Chromium rendering per locale and viewport", "no", "yes"],
  ["Full-page screenshots", "no", "yes"],
  ["Layout overflow and clipping measurement", "no", "yes"],
  ["axe accessibility execution", "no", "yes"],
  ["Console errors and failed requests", "no", "yes"],
  ["Authenticated routes", "no", "yes"],
  ["Bounded source repair and rerun", "no", "yes"],
] as const;

export default function CliSetupPage() {
  return (
    <AppShell className="ls-page">
      <header className="ls-masthead">
        <p className="ls-eyebrow">COMMAND LINE · YOUR MACHINE · YOUR REPOSITORY</p>
        <h1>
          <span className="ls-display-line">The engine runs where</span>{" "}
          <span className="ls-display-line">your browsers are.</span>
        </h1>
        <p className="ls-standfirst">
          BhashaFix opens real browsers, renders every selected locale at every
          declared viewport, measures what breaks and writes the evidence beside
          your code. Source, credentials and repair operations stay inside your
          environment; the report bundle is the part you share.
        </p>
      </header>

      <section className="ls-section" aria-labelledby="one-command">
        <h2 id="one-command">One command, in your project</h2>
        <pre className="ls-command ls-command-lead">
          npx @bhashafix/cli scan --url http://localhost:3000 --locales
          en-GB,de-DE,ar-SA,ja-JP
        </pre>
        <p className="ls-caveat">
          <b>Not on npm yet.</b> That is the shape the CLI is built and packaged
          for — a <code>bhashafix</code> binary, public access — but{" "}
          <code>@bhashafix/cli</code> has not been published to a registry, so
          today it runs from a clone or from a tarball you pack yourself. Both
          routes are below, and both are exercised by the repository&rsquo;s own
          checks.
        </p>
      </section>

      <section className="ls-section" aria-labelledby="routes">
        <h2 id="routes">Two working routes</h2>
        <ol className="ls-steps">
          {ROUTES.map(([title, note, command]) => (
            <li key={title}>
              <h3>{title}</h3>
              <p className="ls-note">{note}</p>
              <pre className="ls-command">{command}</pre>
            </li>
          ))}
        </ol>
      </section>

      <section className="ls-section" aria-labelledby="scope">
        <h2 id="scope">What the local run adds</h2>
        <div className="ls-scroll">
          <table className="ls-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Hosted HTTP preflight</th>
                <th scope="col">Local CLI</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([capability, hosted, local]) => (
                <tr key={capability}>
                  <th scope="row">{capability}</th>
                  <td data-answer={hosted}>{hosted}</td>
                  <td data-answer={local}>{local}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ls-section" aria-labelledby="repair">
        <h2 id="repair">Repair and prove</h2>
        <pre className="ls-command">{`pnpm bhashafix repair --project .          # dry run: writes the diff, changes nothing
pnpm bhashafix repair --project . --apply  # applies only allowlisted paths
pnpm bhashafix verify --project .          # reruns the identical predicates`}</pre>
        <p className="ls-note">
          A repair needs an explicit scan ID, explicit issue IDs and an exact
          path allowlist. The dry run is the default, and an applied change is
          checked with <code>git apply --check</code> before it lands.
        </p>
      </section>

      <section className="ls-section" aria-labelledby="artifacts">
        <h2 id="artifacts">What a run writes</h2>
        <dl className="ls-definition">
          {WRITES.map(([file, description]) => (
            <div key={file}>
              <dt>
                <code>{file}</code>
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
        <p className="ls-note">
          Exit codes: <code>0</code> passed · <code>1</code> blocking ·{" "}
          <code>2</code> invalid config · <code>3</code> unavailable ·{" "}
          <code>4</code> runtime · <code>5</code> provider unavailable.
        </p>
      </section>

      <section className="ls-section ls-limits" aria-labelledby="limits">
        <h2 id="limits">Honest limits</h2>
        <ul>
          <li>
            Browser coverage depends on the Playwright runtimes installed.
            Chromium is verified; Firefox and WebKit are environment-dependent.
          </li>
          <li>
            Public sites may block automation, require authentication or
            prohibit crawling. A run that cannot fetch reports that, rather than
            producing a result.
          </li>
          <li>
            Linguistic judgements carry confidence and can require native human
            review. The deterministic engineering checks are the authoritative
            ones.
          </li>
        </ul>
        <div className="ls-actions">
          <Link className="button" href="/import">
            Open a report you produced →
          </Link>
          <Link className="button button-secondary" href="/evidence">
            See published run artifacts
          </Link>
          <Link className="button button-secondary" href="/integrations/mcp">
            Connect through MCP
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
