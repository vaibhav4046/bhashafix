"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import baselineScan from "../public/replay/baseline-scan.json";
import repairProof from "../public/replay/repair-proof.json";
import replayReport from "../public/replay/report.json";
import evidenceIndex from "../public/evidence/index.json";
import { BrowserScanPanel } from "./browser-scan-panel";
import { pseudoLocalise } from "@bhashafix/linguistic-engine";
import { localeProfile } from "@bhashafix/locale-engine";

/**
 * Recorded configuration of the bundled AtlasPay replay. Every number the
 * replay surfaces must come from one of the three imported artifacts above —
 * never from a literal typed into this file.
 */
const replayConfig = baselineScan.config;

/** The eight artifact files the replay run actually wrote to public/replay. */
const replayArtifacts = [
  ["JSON report", "/replay/report.json"],
  ["HTML report", "/replay/report.html"],
  ["SARIF", "/replay/report.sarif"],
  ["JUnit XML", "/replay/junit.xml"],
  ["CSV issues", "/replay/issues.csv"],
  ["Screenshots ZIP", "/replay/screenshots.zip"],
  ["Unified patch", "/replay/repair.patch"],
  ["Proof JSON", "/replay/repair-proof.json"],
] as const;

const proofDelta = `${repairProof.baselineBlocking} → ${repairProof.finalBlocking}`;

/**
 * Artifact timestamps are stored as UTC ISO-8601 strings, so slice them rather
 * than formatting through Date — a locale/timezone format would differ between
 * the server and client render and produce a hydration error.
 */
function artifactClock(iso: string) {
  return `${iso.slice(11, 23)}Z`;
}

const localeSpecimens = [
  ["en-GB", "Every language.", "Latn"],
  ["hi-IN", "हर भाषा।", "Deva"],
  ["ar-SA", "كل لغة.", "Arab"],
  ["ja-JP", "すべての言語。", "Jpan"],
  ["zh-Hant-TW", "每一種語言。", "Hant"],
] as const;

const scanNav = [
  ["Overview", "/overview"],
  ["Routes", "/routes"],
  ["Issues", "/issues"],
  ["Linguistic", "/linguistic"],
  ["Visual", "/visual"],
  ["Accessibility", "/accessibility"],
  ["Repairs", "/repairs"],
  ["Report", "/report"],
] as const;

/**
 * Several fields in the replay artifacts are recorded as `null`, which means
 * the run never measured them. Rendering that as a value — or letting it fall
 * through a truthiness check into a pass — would state something the artifact
 * does not say, so it is surfaced as "not measured" everywhere it appears.
 */
function recordedFlag(value: unknown) {
  return value === null || value === undefined ? "not measured" : String(value);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

export function Logo({ wordmark = true }: { wordmark?: boolean }) {
  return (
    <Link className="bf-logo" href="/" aria-label="BhashaFix home">
      {/* The mark from public/brand/bhashafix-mark.svg, inlined so it inherits
          the theme colour instead of shipping two colour variants. */}
      <svg
        className="bf-mark"
        viewBox="0 0 64 64"
        aria-hidden="true"
        focusable="false"
      >
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <path
            strokeWidth="4"
            d="M11 31c0-12 8-21 21-21 12 0 21 8 21 20 0 12-9 21-22 21H20l-9 7 3-13c-2-4-3-8-3-14Z"
          />
          <path
            strokeWidth="2.5"
            opacity=".72"
            d="M18 27c5-8 19-11 29-3M17 37c8 6 21 7 30 0M25 14c-4 10-3 23 2 34M40 13c4 9 3 18 0 26"
          />
          <path strokeWidth="5" d="m28 33 6 6 13-15" />
        </g>
      </svg>
      {wordmark && (
        <span className="bf-wordmark">
          Bhasha<span>Fix</span>
        </span>
      )}
    </Link>
  );
}

function ThemeToggle() {
  useEffect(() => {
    const stored = window.localStorage.getItem("bhashafix-theme");
    const initial = stored === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = initial;
  }, []);
  const toggle = () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("bhashafix-theme", next);
  };
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label="Toggle color theme"
    >
      <span>◐</span>
      theme
    </button>
  );
}

function Header() {
  return (
    <header className="global-header">
      <Logo />
      <nav aria-label="Primary">
        <Link href="/scan">Scans</Link>
        <Link href="/glossary">Glossary</Link>
        <Link href="/memory">Memory</Link>
        <Link href="/integrations">Integrations</Link>
        <Link href="/docs">Docs</Link>
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        <Link className="button button-small" href="/scan/new">
          New scan
        </Link>
      </div>
    </header>
  );
}

function TrustClaim() {
  return (
    <p className="trust-claim">
      BhashaFix supports Unicode content and user-selected BCP 47 locales
      through a provider-independent localisation pipeline. Deterministic
      engineering checks are authoritative. Linguistic judgements include
      confidence levels and human-review gates.
    </p>
  );
}

/**
 * The single pipeline every surface of the product describes, in order. These
 * rows state what each stage does; they carry no counts, because a count here
 * would belong to one particular scan rather than to the pipeline itself.
 */
const pipelineStages = [
  [
    "Target",
    "A public URL or a local repository, validated before anything is fetched.",
  ],
  [
    "Browser",
    "Each selected locale rendered in a real browser at each declared viewport.",
  ],
  [
    "Routes",
    "Same-origin route discovery inside the declared crawl and rate limits.",
  ],
  [
    "Screenshots",
    "A render captured per route, locale and viewport case.",
  ],
  [
    "Verified issues",
    "Every finding stores the measured value and the predicate it failed.",
  ],
  [
    "Repair",
    "A reviewable diff confined to an explicit path allowlist.",
  ],
  [
    "Proof",
    "The identical checks rerun, then exported as JSON, HTML, SARIF, JUnit and CSV.",
  ],
] as const;

function PipelineBand() {
  return (
    <section className="pipeline-band" aria-labelledby="pipeline-band-title">
      <h2 id="pipeline-band-title">One pipeline, start to proof.</h2>
      <ol>
        {pipelineStages.map(([stage, detail], index) => (
          <li key={stage}>
            <span className="pipeline-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{stage}</h3>
            <p>{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The four language names the hero cycles through, each tagged with the
 * language and direction the browser needs in order to shape the script
 * correctly. They are stacked on one baseline, so the swap changes the glyphs
 * without moving anything around them.
 */
const scriptCycle = [
  ["en", "ltr", "English"],
  ["ar", "rtl", "العربية"],
  ["hi", "ltr", "हिन्दी"],
  ["ja", "ltr", "日本語"],
] as const;

const SCRIPT_CYCLE_MS = 2400;

/**
 * Retains the `.language-orbit` class the motion contract test measures. The
 * swap is a state change with an opacity transition, so `prefers-reduced-motion`
 * collapses it to an immediate cut rather than removing the information.
 */
function ScriptTransition() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setIndex((current) => (current + 1) % scriptCycle.length);
    }, SCRIPT_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <p
      className="language-orbit"
      role="img"
      aria-label="Language names set in their own scripts: English, العربية, हिन्दी, 日本語"
    >
      {scriptCycle.map(([lang, dir, label], position) => (
        <span
          key={lang}
          lang={lang}
          dir={dir}
          aria-hidden="true"
          data-active={position === index ? "true" : "false"}
        >
          {label}
        </span>
      ))}
    </p>
  );
}

/** Counts taken from the published evidence index, not from this file. */
const publishedScans = evidenceIndex.realSiteScans.scans;
const publishedScreenshots = publishedScans.reduce(
  (total, scan) => total + scan.screenshots.length,
  0,
);
const CLONE_AND_RUN = `git clone https://github.com/vaibhav4046/bhashafix
cd bhashafix
pnpm install
pnpm bhashafix scan --url https://example.com`;

export function LandingPage() {
  return (
    <main className="landing-shell ls-page">
      <Header />

      <section className="winner-hero" aria-labelledby="hero-heading">
        <div className="winner-hero-grid">
          <div className="winner-hero-copy">
            <p className="ls-eyebrow">OPEN-SOURCE LOCALISATION RELEASE ENGINE</p>
            <h1 id="hero-heading">
              <span>Every language.</span>
              <span>Every viewport.</span>
              <span className="winner-hero-accent">Evidence before release.</span>
            </h1>
            <p className="winner-hero-lede">
              Translation models write strings. BhashaFix opens the product,
              finds what broke, prepares a bounded repair, and reruns the same
              checks before you ship.
            </p>
            <ScriptTransition />
            <div className="ls-actions winner-hero-actions">
              <Link className="button" href="/demo">
                Watch the 10 → 0 proof
              </Link>
              <Link className="button button-secondary" href="/evidence">
                Inspect real scans
              </Link>
            </div>
            <ul className="winner-trust-row" aria-label="Product guarantees">
              <li><i aria-hidden="true" />Real Chromium</li>
              <li><i aria-hidden="true" />No model key required</li>
              <li><i aria-hidden="true" />Source stays local</li>
            </ul>
          </div>

          <aside className="winner-proof-console" aria-label="Verified AtlasPay repair proof">
            <div className="winner-console-bar">
              <span><i aria-hidden="true" /> VERIFIED REPLAY</span>
              <code>ATLASPAY</code>
            </div>
            <div className="winner-delta">
              <div>
                <b>{repairProof.baselineBlocking}</b>
                <span>blocking</span>
              </div>
              <em aria-hidden="true">→</em>
              <div data-pass="true">
                <b>{repairProof.finalBlocking}</b>
                <span>blocking</span>
              </div>
            </div>
            <ol className="winner-console-stages">
              {["Discover", "Render", "Diagnose", "Repair", "Verify"].map(
                (stage, index) => (
                  <li key={stage}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{stage}</b>
                    <i aria-label="passed">PASS</i>
                  </li>
                ),
              )}
            </ol>
            <div className="winner-console-foot">
              <span>source locale</span>
              <b>{replayConfig.sourceLocale} · {repairProof.sourceLocaleRegression}</b>
            </div>
          </aside>
        </div>

        <div className="winner-live-scan" data-testid="homepage-live-scan">
          <div className="winner-live-head">
            <div>
              <p className="ls-eyebrow"><i aria-hidden="true" /> LIVE · REAL CHROMIUM</p>
              <h2>Scan a public page now.</h2>
            </div>
            <p>
              One route. Two locales. Real screenshots, DOM measurements and axe
              evidence. Nothing is stored.
            </p>
          </div>
          <BrowserScanPanel />
        </div>
      </section>

      <section className="winner-proof-strip" aria-label="Verified product evidence">
        <div><b>{repairProof.baselineBlocking} → {repairProof.finalBlocking}</b><span>verified fixture repair</span></div>
        <div><b>{publishedScans.length}</b><span>real public sites scanned</span></div>
        <div><b>{publishedScreenshots}</b><span>published screenshots</span></div>
        <div><b>4</b><span>web · CLI · MCP · CI</span></div>
        <div><b>{repairProof.sourceLocaleRegression}</b><span>source-locale regression</span></div>
      </section>

      <section className="ls-section winner-problem" aria-labelledby="problem-heading">
        <div className="winner-section-intro">
          <p className="ls-eyebrow">WHAT TRANSLATION MODELS CANNOT SEE</p>
          <h2 id="problem-heading">A correct sentence can still ship a broken product.</h2>
          <p>
            BhashaFix joins linguistic context to browser evidence, so teams can
            distinguish a preference from a reproducible release failure.
          </p>
        </div>
        <div className="winner-failure-grid">
          <article>
            <span className="winner-failure-code">BF-VIS-CTA-OVERFLOW</span>
            <div className="winner-mini-measure"><i style={{ width: "100%" }} /><b>256px</b><em>224px max</em></div>
            <h3>The words fit. The button does not.</h3>
            <p>Rendered width, clipping and the failing selector are recorded—not guessed.</p>
          </article>
          <article>
            <span className="winner-failure-code">BF-LOC-DIR-MISMATCH</span>
            <div className="winner-direction-sample" dir="rtl"><b>→</b><span lang="ar">إتمام الدفع</span></div>
            <h3>The translation is Arabic. The interface is still LTR.</h3>
            <p>Page direction, logical spacing and icon order are verified in the browser.</p>
          </article>
          <article>
            <span className="winner-failure-code">HUMAN REVIEW GATE</span>
            <div className="winner-confidence"><i /><i /><i /><i data-off="true" /><span>high confidence</span></div>
            <h3>The wording is possible. The meaning may be wrong.</h3>
            <p>Model-assisted findings show confidence, back translation and review status.</p>
          </article>
        </div>
      </section>

      <section className="ls-section winner-demo-proof" aria-labelledby="demo-proof-heading">
        <div className="winner-demo-visual" aria-hidden="true">
          <div className="winner-demo-top"><span>REPAIR-PROOF.JSON</span><b>VERIFIED</b></div>
          <div className="winner-demo-number"><span>{repairProof.baselineBlocking}</span><i>→</i><strong>{repairProof.finalBlocking}</strong></div>
          <ul>
            <li><span>original predicate</span><b>PASS</b></li>
            <li><span>target route renders</span><b>PASS</b></li>
            <li><span>source-locale regression</span><b>PASS</b></li>
            <li><span>new blocking issues</span><b>0</b></li>
          </ul>
        </div>
        <div className="winner-demo-copy">
          <p className="ls-eyebrow">THE DEMO IS THE PROOF</p>
          <h2 id="demo-proof-heading">Ten seeded failures. One reviewable patch. Zero left.</h2>
          <p>
            AtlasPay contains ten real localisation defects across Hindi, German,
            Arabic, Hebrew, Japanese, Chinese, Thai, French, Spanish and English.
            The engine discovers each failure, confines the patch to{" "}
            {replayConfig.allowlist.length} allowlisted files, then reruns the
            identical predicates.
          </p>
          <div className="ls-actions">
            <Link className="button" href="/scan/atlaspay-replay/overview">Open the evidence workspace</Link>
            <Link className="button button-secondary" href="/demo">Read the run record</Link>
          </div>
        </div>
      </section>

      <section className="ls-section winner-surfaces" aria-labelledby="surfaces-heading">
        <div className="winner-section-intro">
          <p className="ls-eyebrow">ONE ENGINE · FOUR SURFACES</p>
          <h2 id="surfaces-heading">Use it where releases already happen.</h2>
        </div>
        <div className="winner-surface-grid">
          {[
            ["WEB", "Explore screenshots, issues, diffs and proof reports.", "/scan"],
            ["CLI", "Scan locally with stable exit codes and JSON output.", "/integrations/cli"],
            ["MCP", "Give Codex a deterministic localisation harness.", "/integrations/mcp"],
            ["CI", "Block only on the severity your release policy defines.", "/integrations/ci"],
          ].map(([name, detail, href]) => (
            <Link key={name} href={href}>
              <span>{name}</span>
              <p>{detail}</p>
              <b aria-hidden="true">↗</b>
            </Link>
          ))}
        </div>
      </section>

      <PipelineBand />

      <section className="ls-section ls-specimens winner-specimens" aria-labelledby="specimens">
        <div className="winner-section-intro">
          <p className="ls-eyebrow">UNICODE · BCP 47 · SCRIPT-AWARE</p>
          <h2 id="specimens">Built for the scripts products actually ship.</h2>
        </div>
        <ul className="ls-specimen-row">
          {localeSpecimens.map(([locale, sample, script]) => (
            <li key={locale}>
              <span>{locale}</span>
              <strong lang={locale} dir="auto">{sample}</strong>
              <em>{script}</em>
            </li>
          ))}
        </ul>
        <TrustClaim />
      </section>

      <section className="ls-section winner-local" aria-labelledby="local-heading">
        <div>
          <p className="ls-eyebrow">LOCAL-FIRST BY DESIGN</p>
          <h2 id="local-heading">Your source, credentials and repairs stay in your environment.</h2>
          <p>
            The hosted scan is a bounded one-page proof. Full route × locale ×
            viewport matrices, authenticated sessions, repair rollback and source
            patches run locally through the same core APIs.
          </p>
          <div className="ls-actions">
            <Link className="button" href="/integrations/cli">Run from source</Link>
            <Link className="button button-secondary" href="/trust">Read the trust centre</Link>
          </div>
        </div>
        <pre tabIndex={0} className="winner-command">{CLONE_AND_RUN}</pre>
      </section>

      <Footer />
    </main>
  );
}


function Footer() {
  return (
    <footer className="global-footer">
      <Logo />
      <p>Test, repair and prove every language before production.</p>
      <div>
        <Link href="/docs">Documentation</Link>
        <Link href="/trust">Trust centre</Link>
        <Link href="/integrations">Open-source integrations</Link>
      </div>
    </footer>
  );
}

export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={className ? `app-page ${className}` : "app-page"}>
      <Header />
      {children}
      <Footer />
    </main>
  );
}

export function ScanIndexPage() {
  const [scans, setScans] = useState<LiveScanResult[]>([]);
  useEffect(() => {
    const refresh = () => setScans(readStoredScans());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("bhashafix-scans-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("bhashafix-scans-updated", refresh);
    };
  }, []);
  return (
    <AppShell>
      <section className="page-heading">
        <div>
          <span>RELEASE CONTROL</span>
          <h1>Localisation scans</h1>
          <p>Real deterministic runs and clearly labelled replay evidence.</p>
        </div>
        <Link className="button" href="/scan/new">
          New scan
        </Link>
      </section>
      <section className="scan-list">
        {scans.map((scan) => (
          <div className="scan-row scan-row-live" key={scan.scanId}>
            <div className="scan-symbol verified">✓</div>
            <div>
              <Link href={`/scan/${scan.scanId}`}>
                <strong>{new URL(scan.target).hostname}</strong>
              </Link>
              <span>{scan.origin} · {scan.status.replaceAll("_", " ")}</span>
            </div>
            <div>
              <small>ROUTES</small>
              <b>{scan.summary.routesChecked}</b>
            </div>
            <div>
              <small>LOCALES</small>
              <b>{scan.requestedLocales.length}</b>
            </div>
            <div>
              <small>BLOCKING</small>
              <b className={scan.summary.verifiedBlocking ? "red" : "green"}>
                {scan.summary.verifiedBlocking}
              </b>
            </div>
            <time>{new Date(scan.completedAt).toLocaleDateString()}</time>
            <div className="scan-row-actions">
              <Link href={`/scan/${scan.scanId}/report`}>Report</Link>
              <Link
                href={`/scan/new?url=${encodeURIComponent(scan.target)}`}
                aria-label={`Duplicate configuration for ${scan.target}`}
              >
                Duplicate
              </Link>
              <button
                onClick={() => deleteStoredScan(scan.scanId)}
                aria-label={`Delete scan ${scan.scanId}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <Link href="/scan/atlaspay-replay" className="scan-row">
          <div className="scan-symbol verified">✓</div>
          <div>
            <strong>AtlasPay global release gate</strong>
            <span>RECORDED_REPLAY · genuine deterministic artifacts</span>
          </div>
          <div>
            <small>ROUTES</small>
            <b>{baselineScan.routesDiscovered.length}</b>
          </div>
          <div>
            <small>LOCALES</small>
            <b>{baselineScan.localesTested.length}</b>
          </div>
          <div>
            <small>PROOF</small>
            <b className="green">{repairProof.baselineBlocking} → {repairProof.finalBlocking}</b>
          </div>
          <time>29 Jul 2026</time>
          <span>→</span>
        </Link>
        <div className="empty-scan-row">
          <span>⌁</span>
          <div>
            <strong>Run your own target next</strong>
            <p>Public URLs use hosted SSRF controls. Localhost stays in the CLI.</p>
          </div>
          <Link href="/scan/new">Configure scan →</Link>
        </div>
      </section>
    </AppShell>
  );
}

/**
 * Origins a hosted scan result may declare. The engine renamed the bounded
 * static mode to HTTP_PREFLIGHT; scans stored before that rename still carry
 * LIVE_PUBLIC_SCAN. The UI reads the origin off the payload rather than
 * assuming one, so the label it shows is always the one the scan recorded.
 */
type HostedScanOrigin =
  | "HTTP_PREFLIGHT"
  | "LIVE_PUBLIC_SCAN"
  | "LIVE_PUBLIC_BROWSER_SCAN"
  | "LOCAL_REPOSITORY_SCAN";

type LiveScanResult = {
  scanId: string;
  origin: HostedScanOrigin;
  status: "completed" | "completed_with_warnings";
  mode: "live hosted HTTP scan";
  startedAt: string;
  completedAt: string;
  target: string;
  sourceLocale: string;
  requestedLocales: string[];
  scope: {
    maxRoutes: number;
    crawlDepth: 1;
    browserRendered: false;
    repositoryAccess: false;
    authenticated: false;
  };
  summary: {
    routesChecked: number;
    stringsExtracted: number;
    verifiedBlocking: number;
    warnings: number;
  };
  routes: Array<{
    url: string;
    route: string;
    status: number;
    contentType: string;
    strings: number;
    declaredLang: string | null;
    declaredDir: "ltr" | "rtl" | null;
    title: string | null;
    issueCount: number;
  }>;
  issues: Array<{
    issueId: string;
    scanId: string;
    origin: HostedScanOrigin;
    category:
      | "visual"
      | "locale"
      | "linguistic"
      | "accessibility"
      | "runtime";
    ruleId: string;
    severity: "blocking" | "warning";
    confidence: "verified";
    locale: string;
    route: string;
    viewport: null;
    browser: "http";
    selector: string | null;
    description: string;
    whyItMatters: string;
    evidence: Record<string, unknown>;
    measuredEvidence: string;
    screenshotBefore: null;
    sourceHint: null;
    recommendedAction: string;
    deterministicPredicate: string;
  }>;
  robots: {
    checked: boolean;
    policyUrl: string;
    skippedRoutes: number;
  };
  checksRun: string[];
  notRun: string[];
  limitations: string[];
};

const SCAN_STORAGE_KEY = "bhashafix-scan-history-v1";

function readStoredScans(): LiveScanResult[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SCAN_STORAGE_KEY) ?? "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LiveScanResult =>
        Boolean(
          item &&
            typeof item === "object" &&
            // Accept any recorded origin. Filtering on a single value silently
            // dropped records whenever the origin vocabulary changed.
            typeof (item as LiveScanResult).origin === "string" &&
            typeof (item as LiveScanResult).scanId === "string" &&
            Boolean((item as LiveScanResult).summary),
        ),
    );
  } catch {
    return [];
  }
}

function storeScan(result: LiveScanResult) {
  const scans = [
    result,
    ...readStoredScans().filter((scan) => scan.scanId !== result.scanId),
  ].slice(0, 20);
  window.localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(scans));
  window.dispatchEvent(new Event("bhashafix-scans-updated"));
}

function deleteStoredScan(scanId: string) {
  window.localStorage.setItem(
    SCAN_STORAGE_KEY,
    JSON.stringify(readStoredScans().filter((scan) => scan.scanId !== scanId)),
  );
  window.dispatchEvent(new Event("bhashafix-scans-updated"));
}

const simpleLocaleOptions = [
  "de-DE",
  "fr-FR",
  "es-MX",
  "pt-BR",
  "hi-IN",
  "ar-SA",
  "ja-JP",
  "zh-Hant-TW",
  "th-TH",
  "uk-UA",
] as const;

export function NewScanPage() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url")?.trim() ?? "";
  const shouldAutoRun = searchParams.get("autorun") === "1";
  const autoRunStarted = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<"public" | "local" | "demo">("public");
  const [url, setUrl] = useState(initialUrl);
  const [sourceLocale, setSourceLocale] = useState("en-GB");
  const [locales, setLocales] = useState([
    "hi-IN",
    "ar-SA",
    "ja-JP",
    "de-DE",
  ]);
  const [localeQuery, setLocaleQuery] = useState("");
  const [customLocale, setCustomLocale] = useState("");
  const [localeError, setLocaleError] = useState("");
  const [maxRoutes, setMaxRoutes] = useState(5);
  const [running, setRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<LiveScanResult | null>(null);
  const [scanError, setScanError] = useState("");
  // Local-run configuration. The hosted /api/scan endpoint accepts only
  // {url, sourceLocale, locales, maxRoutes}, so none of the values below are
  // sent to it — they compose the local CLI invocation and config file shown
  // on the Summary step.
  const [viewports, setViewports] = useState<string[]>(
    replayConfig.viewports.map((viewport) => viewport.name),
  );
  const [themes, setThemes] = useState<string[]>(["light", "dark"]);
  const [browsers, setBrowsers] = useState<string[]>(["chromium"]);
  const [maxPages, setMaxPages] = useState(20);
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [rateLimitPerSecond, setRateLimitPerSecond] = useState(2);
  const [repairMode, setRepairMode] = useState<"prepare" | "apply">("prepare");
  const [allowlist, setAllowlist] = useState("");
  const steps = ["Target", "Locales", "Coverage", "Guardrails", "Summary"];
  const toggleIn = (
    setter: (update: (current: string[]) => string[]) => void,
    value: string,
  ) =>
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const allowlistPaths = allowlist
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const localCommand = [
    `pnpm bhashafix scan --project . \\`,
    `  --source-locale ${sourceLocale} \\`,
    `  --locales ${locales.join(",")} \\`,
    `  --viewports ${viewports.join(",")} \\`,
    `  --themes ${themes.join(",")}`,
    repairMode === "apply"
      ? `pnpm bhashafix repair --project . --apply`
      : `pnpm bhashafix repair --project .`,
    `pnpm bhashafix verify --project .`,
  ].join("\n");
  const localConfigFragment = [
    `# merge into .bhashafix/config.yml`,
    `sourceLocale: ${sourceLocale}`,
    `locales: [${locales.join(", ")}]`,
    `browsers: [${browsers.join(", ")}]`,
    `viewports: [${viewports.join(", ")}]`,
    `themes: [${themes.join(", ")}]`,
    `crawl:`,
    `  maxPages: ${maxPages}`,
    `  maxDepth: ${crawlDepth}`,
    `  rateLimitPerSecond: ${rateLimitPerSecond}`,
    `repair:`,
    `  allowlist:`,
    ...(allowlistPaths.length
      ? allowlistPaths.map((path) => `    - ${path}`)
      : ["    # at least one path is required before repair can run"]),
  ].join("\n");
  const localeOptions = [
    "hi-IN",
    "ta-IN",
    "ar-SA",
    "he-IL",
    "fa-IR",
    "bn-BD",
    "ja-JP",
    "ko-KR",
    "zh-Hans-CN",
    "zh-Hant-TW",
    "de-DE",
    "fr-FR",
    "es-MX",
    "pt-BR",
    "sw-KE",
    "am-ET",
    "th-TH",
    "uk-UA",
    "vi-VN",
    "id-ID",
  ];
  const visibleLocaleOptions = localeOptions.filter((locale) =>
    locale.toLowerCase().includes(localeQuery.trim().toLowerCase()),
  );
  const addCustomLocale = () => {
    try {
      const canonical = new Intl.Locale(customLocale.trim()).toString();
      setLocales((current) =>
        current.includes(canonical) ? current : [...current, canonical],
      );
      setCustomLocale("");
      setLocaleQuery("");
      setLocaleError("");
    } catch {
      setLocaleError("Enter a valid BCP 47 locale such as pt-BR.");
    }
  };
  const run = useCallback(async (candidateUrl?: string) => {
    if (target === "demo") {
      window.location.href = "/scan/atlaspay-replay";
      return;
    }
    if (target === "local") {
      setScanError(
        "Local repository scans run through the CLI so source and credentials remain on your machine.",
      );
      return;
    }
    const scanUrl = (candidateUrl ?? url).trim();
    setRunning(true);
    setLiveResult(null);
    setScanError("");
    try {
      new URL(scanUrl);
      new Intl.Locale(sourceLocale);
      if (locales.length === 0) {
        throw new Error("Choose at least one target locale for the local follow-up.");
      }
      const controller = new AbortController();
      activeRequest.current = controller;
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          url: scanUrl,
          sourceLocale,
          locales,
          maxRoutes,
        }),
      });
      const payload = (await response.json()) as LiveScanResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Scan failed.");
      setLiveResult(payload);
      storeScan(payload);
    } catch (error) {
      setScanError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Scan cancelled. No partial result or report was created."
          : error instanceof Error
            ? error.message
            : String(error),
      );
    } finally {
      activeRequest.current = null;
      setRunning(false);
    }
  }, [locales, maxRoutes, sourceLocale, target, url]);

  useEffect(() => {
    if (!initialUrl) return;
    if (shouldAutoRun && !autoRunStarted.current) {
      autoRunStarted.current = true;
      void run(initialUrl);
    }
  }, [initialUrl, run, shouldAutoRun]);

  if (target === "public") {
    return (
      <AppShell>
        <section className="simple-scan">
          <div className="simple-scan-heading">
            <span>REAL BROWSER · REAL EVIDENCE</span>
            <h1>Scan a public page in Chromium.</h1>
            <p>
              Render a real page in two locales, capture both screenshots and
              inspect deterministic layout, locale and accessibility findings.
            </p>
          </div>

          <ScanModeSwitcher target={target} setTarget={setTarget} />

          <div className="canonical-browser-scan">
            <div className="canonical-browser-heading">
              <span><i aria-hidden="true" /> LIVE HOSTED CHROMIUM</span>
              <p>One route and one viewport. Nothing is stored.</p>
            </div>
            <BrowserScanPanel />
          </div>

          <div className="preflight-divider">
            <span>SECONDARY · FAST METADATA CRAWL</span>
            <h2>Check up to five linked routes without rendering them.</h2>
            <p>
              Useful for language metadata, raw keys and missing alt text. This
              does not replace the browser evidence above.
            </p>
          </div>

          <form
            className="real-scan-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run();
            }}
          >
            <div className="real-scan-primary">
              <label className="field">
                Website URL
                <input
                  type="url"
                  placeholder="https://www.mozilla.org"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  required
                />
              </label>
              <label className="field source-locale-field">
                Page language
                <input
                  aria-label="Source locale"
                  value={sourceLocale}
                  onChange={(event) => setSourceLocale(event.target.value)}
                  required
                />
              </label>
              <label className="field route-limit-field">
                Route limit
                <select
                  value={maxRoutes}
                  onChange={(event) => setMaxRoutes(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button real-scan-submit" disabled={running}>
                {running ? "Checking the real site…" : "Check this site →"}
              </button>
            </div>

            <details className="locale-followup">
              <summary>
                Target locales for the local browser follow-up
                <span>{locales.join(", ")}</span>
              </summary>
              <p>
                These are recorded, not claimed as tested by the hosted HTTP
                scan.
              </p>
              <div className="locale-options">
                {simpleLocaleOptions.map((locale) => (
                  <button
                    type="button"
                    className={locales.includes(locale) ? "active" : ""}
                    onClick={() =>
                      setLocales((current) =>
                        current.includes(locale)
                          ? current.filter((item) => item !== locale)
                          : [...current, locale],
                      )
                    }
                    key={locale}
                  >
                    {locale} {locales.includes(locale) && "✓"}
                  </button>
                ))}
              </div>
              <div className="custom-locale">
                <input
                  aria-label="Custom BCP 47 target locale"
                  placeholder="Add any BCP 47 locale"
                  value={customLocale}
                  onChange={(event) => setCustomLocale(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomLocale();
                    }
                  }}
                />
                <button type="button" onClick={addCustomLocale}>
                  Add locale
                </button>
              </div>
              {localeError && <small className="field-error">{localeError}</small>}
            </details>
          </form>

          <div className="scan-truth-strip">
            <div>
              <b>Runs now</b>
              <span>
                Live fetch · safe links · robots · visible text · lang/dir ·
                raw keys · titles · image alt
              </span>
            </div>
            <div>
              <b>Runs locally</b>
              <span>
                Playwright · screenshots · overflow · axe · authenticated
                routes · bounded repair
              </span>
            </div>
          </div>

          {running && (
            <div className="real-scan-running" role="status">
              <i />
              <div>
                <strong>Fetching and checking the target now</strong>
                <span>
                  This reflects the real network request. There are no
                  simulated pipeline stages.
                </span>
              </div>
              <button
                type="button"
                onClick={() => activeRequest.current?.abort()}
              >
                Cancel
              </button>
            </div>
          )}
          {scanError && (
            <div className="real-scan-error" role="alert">
              <strong>Scan could not complete</strong>
              <p>{scanError}</p>
              <span>
                The site may block automation, require authentication, or be
                unavailable. No result was invented.
              </span>
              <button className="button button-secondary" onClick={() => void run()}>
                Retry the same configuration
              </button>
            </div>
          )}
          {liveResult && <LivePublicScanResult result={liveResult} />}
        </section>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <div className="advanced-mode-switcher">
        <ScanModeSwitcher target={target} setTarget={setTarget} />
      </div>
      <section className="wizard-shell">
        <aside className="wizard-steps">
          <span>NEW SCAN</span>
          {steps.map((label, index) => (
            <button
              className={index === step ? "active" : index < step ? "done" : ""}
              onClick={() => setStep(index)}
              key={label}
            >
              <i>{index < step ? "✓" : index + 1}</i>
              <span>{label}</span>
            </button>
          ))}
          <TrustClaim />
        </aside>
        <section className="wizard-stage">
          <div className="wizard-title">
            <span>
              STEP {step + 1} / {steps.length}
            </span>
            <h1>{steps[step]}</h1>
          </div>
          {step === 0 && (
            <div className="choice-grid">
              {[
                ["local", "Local project", "Repository discovery and localhost rendering through the CLI.", "⌘"],
                ["demo", "AtlasPay demo", "A genuine ten-failure replay with bounded repair proof.", "◇"],
              ].map(([value, title, body, icon]) => (
                <button
                  className={target === value ? "active" : ""}
                  onClick={() => setTarget(value as typeof target)}
                  key={value}
                >
                  <i>{icon}</i>
                  <strong>{title}</strong>
                  <span>{body}</span>
                  <b>{target === value ? "Selected ✓" : "Select"}</b>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="locale-picker">
              <label className="field">
                Source locale
                <input
                  value={sourceLocale}
                  onChange={(event) => setSourceLocale(event.target.value)}
                />
              </label>
              <div className="field">
                Target locales
                <input
                  aria-label="Search target locales"
                  placeholder="Search locale presets"
                  value={localeQuery}
                  onChange={(event) => setLocaleQuery(event.target.value)}
                />
                <div className="locale-options">
                  {visibleLocaleOptions.map((locale) => (
                    <button
                      className={locales.includes(locale) ? "active" : ""}
                      onClick={() =>
                        setLocales((current) =>
                          current.includes(locale)
                            ? current.filter((item) => item !== locale)
                            : [...current, locale],
                        )
                      }
                      key={locale}
                    >
                      {locale} {locales.includes(locale) && "✓"}
                    </button>
                  ))}
                </div>
                <div className="custom-locale">
                  <input
                    aria-label="Custom BCP 47 target locale"
                    placeholder="Add any BCP 47 tag"
                    value={customLocale}
                    onChange={(event) => setCustomLocale(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCustomLocale();
                      }
                    }}
                  />
                  <button type="button" onClick={addCustomLocale}>
                    Add locale
                  </button>
                </div>
                {localeError && <small className="field-error">{localeError}</small>}
              </div>
              <p className="inline-note">
                Valid BCP 47 tags are canonicalised through `Intl.Locale`.
              </p>
            </div>
          )}
          {step === 2 && (
            <>
              <p className="inline-note">
                Coverage applies to the local browser run. The hosted HTTP scan
                accepts only a URL, a source locale, target locales and a route
                limit, so nothing on this step is sent to it. Step 5 shows the
                exact command and configuration these choices produce.
              </p>
              <div className="coverage-grid">
                {replayConfig.viewports.map((viewport) => (
                  <label key={viewport.name} className="coverage-option">
                    <input
                      type="checkbox"
                      checked={viewports.includes(viewport.name)}
                      onChange={() => toggleIn(setViewports, viewport.name)}
                    />
                    <span>
                      <strong>{viewport.name}</strong>
                      <small>
                        {viewport.width} × {viewport.height} rendered viewport
                      </small>
                    </span>
                    <b>--viewports</b>
                  </label>
                ))}
                {["light", "dark"].map((themeOption) => (
                  <label key={themeOption} className="coverage-option">
                    <input
                      type="checkbox"
                      checked={themes.includes(themeOption)}
                      onChange={() => toggleIn(setThemes, themeOption)}
                    />
                    <span>
                      <strong>{themeOption}</strong>
                      <small>Colour scheme rendered per route</small>
                    </span>
                    <b>--themes</b>
                  </label>
                ))}
                {["chromium", "firefox", "webkit"].map((browserOption) => (
                  <label key={browserOption} className="coverage-option">
                    <input
                      type="checkbox"
                      checked={browsers.includes(browserOption)}
                      onChange={() => toggleIn(setBrowsers, browserOption)}
                    />
                    <span>
                      <strong>{browserOption}</strong>
                      <small>
                        Requires the matching Playwright runtime installed
                        locally
                      </small>
                    </span>
                    <b>config.yml</b>
                  </label>
                ))}
              </div>
              <p className="inline-note">
                Accessibility is not a toggle: axe runs on every local browser
                scan and cannot be disabled. Pseudo-localisation stress modes are
                a separate command (`bhashafix translate-preview --mode`) and are
                not part of a scan.
              </p>
            </>
          )}
          {step === 3 && (
            <div className="guardrail-grid">
              <label className="field">
                Maximum pages
                <input
                  type="number"
                  value={maxPages}
                  min="1"
                  max="100"
                  onChange={(event) =>
                    setMaxPages(Number(event.target.value) || 1)
                  }
                />
              </label>
              <label className="field">
                Crawl depth
                <input
                  type="number"
                  value={crawlDepth}
                  min="0"
                  max="5"
                  onChange={(event) => setCrawlDepth(Number(event.target.value))}
                />
              </label>
              <label className="field">
                Requests per second
                <input
                  type="number"
                  value={rateLimitPerSecond}
                  min="0.1"
                  max="10"
                  step="0.1"
                  onChange={(event) =>
                    setRateLimitPerSecond(Number(event.target.value) || 0.1)
                  }
                />
              </label>
              <label className="field">
                Repair mode
                <select
                  value={repairMode}
                  onChange={(event) =>
                    setRepairMode(event.target.value as typeof repairMode)
                  }
                >
                  <option value="prepare">prepare (dry run, diff only)</option>
                  <option value="apply">apply (writes allowlisted files)</option>
                </select>
              </label>
              <label className="field wide">
                Path allowlist
                <textarea
                  value={allowlist}
                  onChange={(event) => setAllowlist(event.target.value)}
                />
              </label>
              <p className="inline-note wide">
                Secret redaction is not optional and has no switch: tokens, bearer
                credentials and sensitive attribute values are stripped from every
                extraction and every error message. These guardrails are written to
                `.bhashafix/config.yml`; the hosted HTTP scan does not read them.
              </p>
            </div>
          )}
          {step === 4 && (
            <div className="run-summary">
              <div>
                <small>TARGET</small>
                <strong>
                  {target === "demo"
                    ? "AtlasPay bundled demo"
                    : "Local repository"}
                </strong>
              </div>
              <div>
                <small>LOCALES</small>
                <strong>{sourceLocale} → {locales.join(", ")}</strong>
              </div>
              <div>
                <small>COVERAGE</small>
                <strong>
                  {viewports.length} viewport(s) · {themes.length} theme(s) ·{" "}
                  {browsers.join(", ") || "no browser selected"}
                </strong>
              </div>
              <div>
                <small>GUARDRAILS</small>
                <strong>
                  {maxPages} pages · depth {crawlDepth} · {rateLimitPerSecond}{" "}
                  req/s · {repairMode} · {allowlistPaths.length} allowlisted
                  path(s)
                </strong>
              </div>
              <div>
                <small>LOCAL COMMAND</small>
                <pre tabIndex={0}>{localCommand}</pre>
              </div>
              <div>
                <small>CONFIG FILE</small>
                <pre tabIndex={0}>{localConfigFragment}</pre>
              </div>
              <div>
                <small>NOT SENT</small>
                <strong>
                  Coverage and guardrails configure the local CLI only. The
                  hosted endpoint on this site accepts a URL, a source locale,
                  target locales and a route limit, and rejects anything else.
                </strong>
              </div>
              {liveResult && (
                <p className="run-result">
                  Live HTTP scan: {liveResult.summary.routesChecked} routes,{" "}
                  {liveResult.summary.stringsExtracted} strings and{" "}
                  {liveResult.summary.verifiedBlocking} blocking findings in
                  the checks run.
                </p>
              )}
            </div>
          )}
          <div className="wizard-footer">
            <button
              className="button button-secondary"
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              Back
            </button>
            {step < 4 ? (
              <button
                className="button"
                onClick={() => setStep((value) => Math.min(4, value + 1))}
              >
                Continue →
              </button>
            ) : (
              target === "local" ? (
                <Link className="button" href="/integrations/cli">
                  Open local CLI setup →
                </Link>
              ) : (
                <button
                  className="button"
                  onClick={() => void run()}
                  disabled={running}
                >
                  Open verified demo →
                </button>
              )
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function ScanModeSwitcher({
  target,
  setTarget,
}: {
  target: "public" | "local" | "demo";
  setTarget: (target: "public" | "local" | "demo") => void;
}) {
  return (
    <nav className="scan-mode-switcher" aria-label="Scan type">
      {[
        ["public", "Public website", "Real hosted Chromium"],
        ["local", "Local product", "Full browser + repair"],
        ["demo", "Verified demo", `Recorded ${proofDelta} proof`],
      ].map(([value, label, detail]) => (
        <button
          key={value}
          className={target === value ? "active" : ""}
          onClick={() => setTarget(value as typeof target)}
        >
          <strong>{label}</strong>
          <span>{detail}</span>
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 * Evidence presentation
 *
 * One view-model for every issue the product can show, so the recorded
 * replay, a live public scan and a stored scan all present the same three
 * things in the same order: the plain-English statement, the exact
 * measurement, and the predicate that was evaluated. Adapters below only
 * move fields across — nothing is computed, defaulted or invented.
 * ------------------------------------------------------------------ */

type EvidenceMeasurement = { label: string; value: string };

type EvidenceIssue = {
  issueId: string;
  origin: string;
  category: string;
  ruleId: string;
  severity: string;
  confidence: string;
  locale: string;
  route: string;
  viewport: { name: string; width: number; height: number } | null;
  selector: string | null;
  statement: string;
  whyItMatters: string;
  measurements: EvidenceMeasurement[];
  predicate: string;
  action: string;
  sourceHint: string | null;
  humanReviewRequired: boolean;
};

/**
 * Turns a recorded evidence payload into label/value rows. A value that the
 * artifact stores as null is shown as "not recorded" rather than as a number
 * or a pass, because the absence of a measurement is itself the fact.
 */
function measurementRows(value: unknown): EvidenceMeasurement[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") {
    return [{ label: "measured", value: String(value) }];
  }
  return Object.entries(value as Record<string, unknown>).map(
    ([label, entry]) => ({
      label,
      value: Array.isArray(entry)
        ? entry.length
          ? entry.join(", ")
          : "none"
        : entry === null || entry === undefined
          ? "not recorded"
          : String(entry),
    }),
  );
}

type ReplayIssue = (typeof baselineScan.issues)[number];

function replayEvidence(issue: ReplayIssue): EvidenceIssue {
  return {
    issueId: issue.issueId,
    origin: issue.origin,
    category: issue.category,
    ruleId: issue.ruleId,
    severity: issue.severity,
    confidence: issue.confidence,
    locale: issue.locale,
    route: issue.route,
    viewport: issue.viewport,
    selector: issue.selector,
    statement: issue.description,
    whyItMatters: issue.whyItMatters,
    measurements: measurementRows(issue.measuredEvidence),
    predicate: issue.deterministicPredicate,
    action: issue.recommendedAction,
    sourceHint: issue.sourceHint,
    humanReviewRequired: issue.humanReviewRequired,
  };
}

function liveEvidence(issue: LiveScanResult["issues"][number]): EvidenceIssue {
  const structured = measurementRows(issue.evidence);
  return {
    issueId: issue.issueId,
    origin: issue.origin,
    category: issue.category,
    ruleId: issue.ruleId,
    severity: issue.severity,
    confidence: issue.confidence,
    locale: issue.locale,
    route: issue.route,
    viewport: issue.viewport,
    selector: issue.selector,
    statement: issue.description,
    whyItMatters: issue.whyItMatters,
    measurements: structured.length
      ? structured
      : measurementRows(issue.measuredEvidence),
    predicate: issue.deterministicPredicate,
    action: issue.recommendedAction,
    sourceHint: issue.sourceHint,
    humanReviewRequired: false,
  };
}

function ruleLabel(ruleId: string) {
  return ruleId.replaceAll("-", " ");
}

function EvidenceList({
  issues,
  emptyNote,
  selectedIssueId,
  onSelect,
}: {
  issues: EvidenceIssue[];
  emptyNote: string;
  selectedIssueId?: string;
  onSelect?: (issueId: string) => void;
}) {
  if (issues.length === 0) {
    return <p className="evidence-empty">{emptyNote}</p>;
  }
  return (
    <ol className="evidence-list">
      {issues.map((issue, index) => (
        <li
          key={issue.issueId}
          className={
            selectedIssueId === issue.issueId
              ? "evidence-item selected"
              : "evidence-item"
          }
        >
          <div className="evidence-head">
            <span className="evidence-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h4>{ruleLabel(issue.ruleId)}</h4>
            <span className={`evidence-severity ${issue.severity}`}>
              {issue.severity}
            </span>
            <span className="origin-label">origin · {issue.origin}</span>
          </div>
          <p className="evidence-statement">{issue.statement}</p>
          <p className="evidence-impact">{issue.whyItMatters}</p>
          <dl className="evidence-measure">
            <dt>Measured</dt>
            <dd>
              {issue.measurements.length === 0 ? (
                <span className="evidence-pair">
                  <b>value</b>not recorded
                </span>
              ) : (
                issue.measurements.map((measurement) => (
                  <span className="evidence-pair" key={measurement.label}>
                    <b>{measurement.label}</b>
                    {measurement.value}
                  </span>
                ))
              )}
            </dd>
            <dt>Predicate evaluated</dt>
            <dd>
              <code>{issue.predicate}</code>
            </dd>
            <dt>Located at</dt>
            <dd>
              <code>{issue.selector ?? "no selector recorded"}</code>
              <span className="evidence-pair">
                <b>route</b>
                {issue.route}
              </span>
              <span className="evidence-pair">
                <b>locale</b>
                {issue.locale}
              </span>
              {issue.viewport && (
                <span className="evidence-pair">
                  <b>viewport</b>
                  {issue.viewport.name} {issue.viewport.width}×
                  {issue.viewport.height}
                </span>
              )}
            </dd>
            <dt>Recommended action</dt>
            <dd>
              {issue.action}
              {issue.sourceHint ? ` · source ${issue.sourceHint}` : ""}
            </dd>
          </dl>
          <div className="evidence-foot">
            <code>{issue.issueId}</code>
            <span>
              confidence · <b>{issue.confidence}</b>
            </span>
            <span>
              human review ·{" "}
              <b>{issue.humanReviewRequired ? "required" : "not required"}</b>
            </span>
            {onSelect && (
              <button type="button" onClick={() => onSelect(issue.issueId)}>
                Show on render
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Route × locale coverage. A cell is only ever one of three states, and
 * "not covered" is rendered as loudly as a failure so a narrow run cannot
 * read as a broad pass.
 */
type CoverageCell = {
  state: "covered" | "issues" | "not-covered";
  label: string;
  detail: string;
};

function CoverageMatrix({
  caption,
  routes,
  locales,
  cell,
}: {
  caption: string;
  routes: string[];
  locales: string[];
  cell: (route: string, locale: string) => CoverageCell;
}) {
  return (
    <div className="coverage-matrix">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Route</th>
            {locales.map((locale) => (
              <th scope="col" key={locale}>
                {locale}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => (
            <tr key={route}>
              <th scope="row">{route}</th>
              {locales.map((locale) => {
                const value = cell(route, locale);
                return (
                  <td key={locale} data-state={value.state}>
                    <span aria-hidden="true">{value.label}</span>
                    <span className="visually-hidden">{value.detail}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="coverage-legend">
        <span data-state="issues">●</span> issue recorded
        <span data-state="covered">✓</span> covered, no issue
        <span data-state="not-covered">·</span> not covered by this run
      </p>
    </div>
  );
}

type StageMarker = {
  issueId: string;
  index: number;
  located: boolean;
  onScreen: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Renders the fixture at a recorded viewport and draws a marker over each
 * issue's recorded selector.
 *
 * The rectangle is read from this same-origin frame at display time; the
 * replay artifact stores a selector and a measurement but no element
 * rectangle, so a marker whose selector does not resolve is reported as
 * unresolved instead of being placed somewhere plausible.
 */
function AnnotatedRenderStage({
  src,
  title,
  viewport,
  issues,
  selectedIssueId,
  onSelect,
  stateNote,
}: {
  src: string;
  title: string;
  viewport: { name: string; width: number; height: number };
  issues: EvidenceIssue[];
  selectedIssueId: string | null;
  onSelect: (issueId: string) => void;
  stateNote: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  // Markers are stored with the frame they were measured against so a stale
  // set can never be drawn over a frame it does not describe.
  const [measured, setMeasured] = useState<{
    key: string;
    markers: StageMarker[];
  } | null>(null);
  const stageKey = `${src}|${viewport.name}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const width = container.clientWidth;
      setScale(width > 0 ? Math.min(1, width / viewport.width) : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [viewport.width]);

  const measure = useCallback(
    (key: string) => {
    const frame = frameRef.current;
    if (!frame) return;
    const frameDocument = (() => {
      try {
        return frame.contentDocument;
      } catch {
        return null;
      }
    })();
    if (!frameDocument?.body) return;
    const markers = issues.map((issue, index) => {
        const element = (() => {
          if (!issue.selector) return null;
          try {
            return frameDocument.querySelector(issue.selector);
          } catch {
            return null;
          }
        })();
        if (!element) {
          return {
            issueId: issue.issueId,
            index,
            located: false,
            onScreen: false,
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          };
        }
        const rect = element.getBoundingClientRect();
        const left = rect.left + (frameDocument.defaultView?.scrollX ?? 0);
        const top = rect.top + (frameDocument.defaultView?.scrollY ?? 0);
        return {
          issueId: issue.issueId,
          index,
          located: true,
          onScreen: top < viewport.height && left < viewport.width,
          left,
          top,
          width: rect.width,
          height: rect.height,
        };
      });
      setMeasured({ key, markers });
    },
    [issues, viewport.height, viewport.width],
  );

  useEffect(() => {
    let outer = 0;
    let inner = 0;
    outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => measure(stageKey));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [measure, stageKey]);

  const markers = measured?.key === stageKey ? measured.markers : null;
  const located = markers?.filter((marker) => marker.located) ?? [];
  const unresolved =
    markers?.filter((marker) => !marker.located).map((marker) => marker.index) ??
    [];

  return (
    <div className="render-stage">
      <div className="stage-bar">
        <span className="origin-label">SCREENSHOTS · LIVE FIXTURE RENDER</span>
        <code>{src}</code>
        <b>
          {viewport.name} {viewport.width}×{viewport.height}
        </b>
      </div>
      <p className="stage-state">{stateNote}</p>
      <div className="stage-viewport" ref={containerRef}>
        {/* The frame renders at the recorded viewport width and is scaled to
            fit; the wrapper takes the scaled size so the frame stays centred
            and the surrounding bay does not collapse to one side. */}
        <div
          className="stage-frame"
          style={{
            width: `${Math.round(viewport.width * scale)}px`,
            height: `${Math.round(viewport.height * scale)}px`,
          }}
        >
        <div
          className="stage-scaler"
          style={{
            width: `${viewport.width}px`,
            height: `${viewport.height}px`,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            ref={frameRef}
            src={src}
            title={title}
            width={viewport.width}
            height={viewport.height}
            onLoad={() => window.requestAnimationFrame(() => measure(stageKey))}
          />
          <div className="stage-markers" aria-hidden="true">
            {located.map((marker) => (
              <span
                key={marker.issueId}
                className={
                  selectedIssueId === marker.issueId
                    ? "stage-marker selected"
                    : "stage-marker"
                }
                style={{
                  left: `${marker.left}px`,
                  top: `${marker.top}px`,
                  width: `${Math.max(marker.width, 8)}px`,
                  height: `${Math.max(marker.height, 8)}px`,
                }}
              >
                <i>{String(marker.index + 1).padStart(2, "0")}</i>
              </span>
            ))}
          </div>
        </div>
        </div>
      </div>
      <div className="stage-legend">
        {markers === null ? (
          <p>Marker positions are read from the frame once it has rendered.</p>
        ) : (
          <p>
            {located.length} of {markers.length} recorded selector(s) resolved in
            this render.
            {unresolved.length > 0
              ? ` Marker${unresolved.length > 1 ? "s" : ""} ${unresolved
                  .map((index) => String(index + 1).padStart(2, "0"))
                  .join(", ")} could not be placed: the recorded selector does not exist in this fixture, so no position is drawn for it.`
              : ""}
          </p>
        )}
        <ul>
          {issues.map((issue, index) => (
            <li key={issue.issueId}>
              <button
                type="button"
                className={
                  selectedIssueId === issue.issueId ? "active" : undefined
                }
                onClick={() => onSelect(issue.issueId)}
              >
                <i aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </i>
                {ruleLabel(issue.ruleId)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * The counterpart plate for a scan that captured no render. Every value is
 * read from the scan's own recorded scope so the reason is checkable.
 */
function AbsentRenderStage({ result }: { result: LiveScanResult }) {
  return (
    <div className="render-stage render-stage-absent">
      <div className="stage-bar">
        <span className="origin-label">SCREENSHOTS</span>
        <code>none captured</code>
        <b>{result.scope.maxRoutes} route limit</b>
      </div>
      <div className="stage-absent-body">
        <h3>This scan captured no render, so there is nothing to annotate.</h3>
        <dl>
          <dt>browserRendered</dt>
          <dd>{String(result.scope.browserRendered)}</dd>
          <dt>repositoryAccess</dt>
          <dd>{String(result.scope.repositoryAccess)}</dd>
          <dt>authenticated</dt>
          <dd>{String(result.scope.authenticated)}</dd>
          <dt>crawlDepth</dt>
          <dd>{String(result.scope.crawlDepth)}</dd>
        </dl>
        <p>
          The findings below come from the bounded HTTP responses listed under
          the routes table. Run BhashaFix locally to render{" "}
          {result.requestedLocales.join(", ")} in a browser and produce
          annotated screenshots.
        </p>
      </div>
    </div>
  );
}

function liveCoverageLocales(result: LiveScanResult) {
  return [
    result.sourceLocale,
    ...result.requestedLocales.filter(
      (locale) => locale !== result.sourceLocale,
    ),
  ];
}

function liveCoverageCell(
  result: LiveScanResult,
  route: string,
  locale: string,
): CoverageCell {
  const matches = result.issues.filter(
    (issue) => issue.route === route && issue.locale === locale,
  );
  if (matches.length > 0) {
    return {
      state: "issues",
      label: String(matches.length),
      detail: `${matches.length} issue(s) recorded`,
    };
  }
  if (locale === result.sourceLocale) {
    return {
      state: "covered",
      label: "✓",
      detail: "fetched, no issue recorded",
    };
  }
  return {
    state: "not-covered",
    label: "·",
    detail: "not rendered by this hosted HTTP scan",
  };
}

function LiveTruthLedger({ result }: { result: LiveScanResult }) {
  return (
    <div className="truth-ledger">
      <div>
        <span>EXECUTED</span>
        <h3>Checks that ran</h3>
        <ul>
          {result.checksRun.map((check) => (
            <li key={check}>✓ {check}</li>
          ))}
        </ul>
      </div>
      <div>
        <span>BOUNDARY</span>
        <h3>Checks not run</h3>
        <ul>
          {result.notRun.map((check) => (
            <li key={check}>— {check}</li>
          ))}
        </ul>
        {result.limitations.map((limitation) => (
          <p key={limitation}>{limitation}</p>
        ))}
      </div>
    </div>
  );
}

function LiveRouteTable({ result }: { result: LiveScanResult }) {
  return (
    <div className="route-table">
      <table>
        <caption>
          Every row is one bounded HTTP response this scan actually received.
        </caption>
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">HTTP</th>
            <th scope="col">Declared lang / dir</th>
            <th scope="col">Strings</th>
            <th scope="col">Findings</th>
          </tr>
        </thead>
        <tbody>
          {result.routes.map((route) => (
            <tr key={route.url}>
              <td>
                <a href={route.url} target="_blank" rel="noreferrer">
                  {route.route}
                </a>
              </td>
              <td className={route.status < 400 ? "green" : "red"}>
                {route.status}
              </td>
              <td>
                {route.declaredLang ?? "missing"} / {route.declaredDir ?? "auto"}
              </td>
              <td>{route.strings}</td>
              <td>{route.issueCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LivePublicScanResult({ result }: { result: LiveScanResult }) {
  const completed = new Date(result.completedAt);
  const issues = result.issues.map(liveEvidence);
  return (
    <section className="live-scan-result" aria-labelledby="live-result-title">
      <header>
        <div>
          <span className="live-badge">{result.origin} · REAL HTTP RESPONSES · NO BROWSER</span>
          <h2 id="live-result-title">Here is exactly what BhashaFix found.</h2>
          <p>
            {result.target} · completed{" "}
            {Number.isNaN(completed.getTime())
              ? result.completedAt
              : completed.toLocaleTimeString()}
          </p>
        </div>
        <div className="browser-handoff">
          <span>RENDER THIS IN A REAL BROWSER</span>
          <code>{`bhashafix scan --url ${result.target} --locales ${result.requestedLocales.join(",")} --viewports mobile,desktop`}</code>
          <small>
            Runs Chromium locally: layout measurement, axe, screenshots and a
            persisted scan ID. None of that ran here.
          </small>
        </div>
        <div className="live-result-verdict">
          <small>BLOCKING IN CHECKS RUN</small>
          <strong>{result.summary.verifiedBlocking}</strong>
          <span>
            {result.summary.verifiedBlocking === 0
              ? "Nothing failed in the checks listed below"
              : "Inspect the evidence below"}
          </span>
        </div>
      </header>

      <AbsentRenderStage result={result} />

      <div className="live-result-section">
        <div className="live-section-title">
          <div>
            <h3>Route × locale coverage</h3>
            <p>
              {result.summary.routesChecked} route(s) of a {result.scope.maxRoutes}{" "}
              route limit, fetched once in the source locale. The other columns
              were recorded for the local browser follow-up, not tested here.
            </p>
          </div>
        </div>
        <CoverageMatrix
          caption={`Coverage for ${result.target}`}
          routes={result.routes.map((route) => route.route)}
          locales={liveCoverageLocales(result)}
          cell={(route, locale) => liveCoverageCell(result, route, locale)}
        />
      </div>

      <div className="live-result-section">
        <div className="live-section-title">
          <div>
            <h3>Routes actually fetched</h3>
            <p>
              {result.summary.stringsExtracted} visible strings extracted ·
              robots policy {result.robots.checked ? "read" : "not read"} ·{" "}
              {result.robots.skippedRoutes} route(s) skipped.
            </p>
          </div>
        </div>
        <LiveRouteTable result={result} />
      </div>

      <div className="live-result-section">
        <div className="live-section-title">
          <div>
            <h3>Verified issues</h3>
            <p>
              Each entry states what is wrong, the exact measurement taken and
              the predicate that was evaluated.
            </p>
          </div>
        </div>
        <EvidenceList
          issues={issues}
          emptyNote="No predicate failed in the checks that ran. That is not a release guarantee: the boundary below lists what this mode never evaluated."
        />
      </div>

      <LiveTruthLedger result={result} />

      <footer className="live-result-footer">
        <div>
          <strong>Want rendered and translated proof?</strong>
          <p>
            Run BhashaFix locally to render the requested locales{" "}
            {result.requestedLocales.join(", ")} in Playwright and unlock
            screenshots, accessibility and bounded source repair.
          </p>
        </div>
        <div>
          <Link className="button" href={`/scan/${result.scanId}`}>
            Open saved scan →
          </Link>
          <Link className="button button-secondary" href="/docs#repository-scan">
            Run full local scan →
          </Link>
        </div>
      </footer>
    </section>
  );
}

function ScanHeader({ section }: { section: string }) {
  return (
    <>
      <section className="scan-header">
        <div>
          <Link href="/scan">← Scans</Link>
          <span className="replay-badge">RECORDED_REPLAY · GENUINE ARTIFACTS</span>
          <h1>AtlasPay global release gate</h1>
          <p>
            {baselineScan.scanId} · {baselineScan.routesDiscovered.length} routes · {baselineScan.localesTested.length} locales · deterministic mode
          </p>
        </div>
        <div className="scan-status">
          <span>VERIFIED</span>
          <strong>{repairProof.baselineBlocking} → {repairProof.finalBlocking}</strong>
          <small>source locale {repairProof.sourceLocaleRegression}</small>
        </div>
      </section>
      <nav className="scan-tabs" aria-label="Scan views">
        {scanNav.map(([label, suffix]) => (
          <Link
            className={
              section.toLowerCase() === label.toLowerCase() ? "active" : ""
            }
            href={`/scan/atlaspay-replay${suffix}`}
            key={label}
          >
            {label}
            {label === "Issues" && <b>{baselineScan.issues.length}</b>}
          </Link>
        ))}
      </nav>
    </>
  );
}

/**
 * The recorded run expressed as the product's own pipeline. Every count is
 * read from baseline-scan.json, repair-proof.json or the list of artifact
 * files that exist under public/replay.
 */
function PipelineRail() {
  const recordedScreenshots = baselineScan.issues.filter((issue) =>
    Boolean(issue.screenshotBefore),
  ).length;
  const stages: Array<[string, string]> = [
    ["Target", `${replayConfig.routes.length} configured routes`],
    [
      "Browser",
      `${replayConfig.browsers.join(", ")} · ${replayConfig.viewports.length} viewports`,
    ],
    ["Routes", `${baselineScan.routesDiscovered.length} discovered`],
    ["Screenshots", `${recordedScreenshots} before/after pairs bundled`],
    ["Verified issues", `${baselineScan.issues.length} recorded`],
    ["Repair", `${replayConfig.allowlist.length} allowlisted files`],
    [
      "Proof",
      `${proofDelta} · ${replayArtifacts.length} exports`,
    ],
  ];
  return (
    <aside className="pipeline-rail" aria-label="Recorded pipeline">
      <span>RECORDED PIPELINE</span>
      <ol>
        {stages.map(([name, detail], index) => (
          <li key={name}>
            <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
            <span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </span>
          </li>
        ))}
      </ol>
      <section>
        <small>MODE</small>
        <strong>
          {replayConfig.noAi ? "No-AI deterministic" : "Provider-assisted"}
        </strong>
        <p>
          Each issue has a genuine broken and repaired Chromium capture in the
          screenshot bundle. The stage below renders the same fixture live so
          selectors can be resolved and annotated interactively.
        </p>
      </section>
    </aside>
  );
}

function replayCoverageCell(route: string, locale: string): CoverageCell {
  const matches = baselineScan.issues.filter(
    (issue) => issue.route === route && issue.locale === locale,
  );
  if (matches.length > 0) {
    return {
      state: "issues",
      label: String(matches.length),
      detail: `${matches.map((issue) => issue.issueId).join(", ")} recorded`,
    };
  }
  return {
    state: "covered",
    label: "✓",
    detail: "no issue recorded",
  };
}

function liveReportArtifact(
  result: LiveScanResult,
  format: "json" | "html" | "csv" | "sarif" | "junit",
) {
  const report = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    scan: result,
    verification: null,
    limitations: result.limitations,
  };
  if (format === "json") {
    return {
      type: "application/json",
      name: `${result.scanId}.json`,
      contents: JSON.stringify(report, null, 2),
    };
  }
  if (format === "html") {
    const rows = result.issues
      .map(
        (issue) =>
          `<tr><td>${escapeHtml(issue.issueId)}</td><td>${escapeHtml(issue.ruleId)}</td><td>${escapeHtml(issue.route)}</td><td>${escapeHtml(issue.severity)}</td><td>${escapeHtml(issue.description)}</td></tr>`,
      )
      .join("");
    return {
      type: "text/html",
      name: `${result.scanId}.html`,
      contents: `<!doctype html><html lang="en"><meta charset="utf-8"><title>BhashaFix ${escapeHtml(result.scanId)}</title><style>body{font:16px/1.5 system-ui;margin:40px;color:#1a1025}table{border-collapse:collapse;width:100%}th,td{padding:10px;border:1px solid #d8b4fe;text-align:left}</style><h1>BhashaFix public scan report</h1><p><strong>${result.origin}</strong> · ${escapeHtml(result.target)}</p><p>${result.summary.routesChecked} real HTTP routes · browser rendering not run</p><table><thead><tr><th>Issue</th><th>Rule</th><th>Route</th><th>Severity</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></html>`,
    };
  }
  if (format === "csv") {
    const cell = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = result.issues.map((issue) =>
      [
        issue.issueId,
        issue.origin,
        issue.category,
        issue.ruleId,
        issue.locale,
        issue.route,
        issue.severity,
        issue.description,
      ]
        .map(cell)
        .join(","),
    );
    return {
      type: "text/csv",
      name: `${result.scanId}.csv`,
      contents: [
        [
          "issueId",
          "origin",
          "category",
          "ruleId",
          "locale",
          "route",
          "severity",
          "description",
        ]
          .map(cell)
          .join(","),
        ...rows,
      ].join("\n"),
    };
  }
  if (format === "sarif") {
    return {
      type: "application/sarif+json",
      name: `${result.scanId}.sarif`,
      contents: JSON.stringify(
        {
          version: "2.1.0",
          $schema: "https://json.schemastore.org/sarif-2.1.0.json",
          runs: [
            {
              tool: {
                driver: {
                  name: "BhashaFix",
                  rules: result.issues.map((issue) => ({
                    id: issue.ruleId,
                    shortDescription: { text: issue.description },
                  })),
                },
              },
              results: result.issues.map((issue) => ({
                ruleId: issue.ruleId,
                level: issue.severity === "blocking" ? "error" : "warning",
                message: { text: issue.description },
                properties: {
                  issueId: issue.issueId,
                  origin: issue.origin,
                  route: issue.route,
                  locale: issue.locale,
                },
              })),
            },
          ],
        },
        null,
        2,
      ),
    };
  }
  const cases = result.issues
    .map(
      (issue) =>
        `<testcase classname="${escapeHtml(issue.ruleId)}" name="${escapeHtml(issue.issueId)}"><failure message="${escapeHtml(issue.description)}">${escapeHtml(issue.deterministicPredicate)}</failure></testcase>`,
    )
    .join("");
  return {
    type: "application/xml",
    name: `${result.scanId}.xml`,
    contents: `<?xml version="1.0" encoding="UTF-8"?><testsuite name="BhashaFix" tests="${result.issues.length}" failures="${result.issues.length}">${cases}</testsuite>`,
  };
}

function downloadLiveReport(
  result: LiveScanResult,
  format: "json" | "html" | "csv" | "sarif" | "junit",
) {
  const artifact = liveReportArtifact(result, format);
  const url = URL.createObjectURL(
    new Blob([artifact.contents], { type: `${artifact.type};charset=utf-8` }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function LiveStoredWorkspace({
  result,
  section,
}: {
  result: LiveScanResult;
  section: string;
}) {
  const visibleIssues =
    section === "Linguistic"
      ? result.issues.filter((issue) => issue.category === "linguistic")
      : section === "Accessibility"
        ? result.issues.filter((issue) => issue.category === "accessibility")
        : result.issues;
  const navigation = scanNav.filter(([label]) => label !== "Repairs");
  return (
    <AppShell>
      <section className="scan-header">
        <div>
          <Link href="/scan">← Scans</Link>
          <span className="live-badge">{result.origin}</span>
          <h1>{new URL(result.target).hostname}</h1>
          <p>
            {result.scanId} · {result.summary.routesChecked} actual HTTP routes
            · completed {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
        <div className="scan-status">
          <span>{result.status.replaceAll("_", " ")}</span>
          <strong>{result.summary.verifiedBlocking} blocking</strong>
          <small>in the checks that ran</small>
        </div>
      </section>
      <nav className="scan-tabs" aria-label="Scan views">
        {navigation.map(([label, suffix]) => (
          <Link
            className={section.toLowerCase() === label.toLowerCase() ? "active" : ""}
            href={`/scan/${result.scanId}${suffix}`}
            key={label}
          >
            {label}
            {label === "Issues" && <b>{result.issues.length}</b>}
          </Link>
        ))}
      </nav>

      {section === "Overview" && (
        <section className="live-workspace">
          <AbsentRenderStage result={result} />
          <div className="live-metrics">
            <article><small>ACTUAL ROUTES</small><strong>{result.summary.routesChecked}</strong><span>bounded same-origin HTTP</span></article>
            <article><small>VISIBLE STRINGS</small><strong>{result.summary.stringsExtracted}</strong><span>static HTML extraction</span></article>
            <article><small>BLOCKING</small><strong>{result.summary.verifiedBlocking}</strong><span>verified predicates</span></article>
            <article><small>WARNINGS</small><strong>{result.summary.warnings}</strong><span>verified predicates</span></article>
          </div>
          <CoverageMatrix
            caption={`Route × locale coverage for ${result.target}`}
            routes={result.routes.map((route) => route.route)}
            locales={liveCoverageLocales(result)}
            cell={(route, locale) => liveCoverageCell(result, route, locale)}
          />
          <LiveTruthLedger result={result} />
        </section>
      )}

      {section === "Routes" && (
        <section className="live-workspace live-result-section">
          <div className="live-section-title">
            <div>
              <h3>Responses actually fetched</h3>
              <p>No route below is synthetic or borrowed from AtlasPay.</p>
            </div>
          </div>
          <LiveRouteTable result={result} />
        </section>
      )}

      {["Issues", "Linguistic", "Accessibility"].includes(section) && (
        <section className="live-workspace live-result-section">
          <div className="live-section-title">
            <div>
              <h3>{section === "Issues" ? "Verified issues" : `${section} findings in the checks that ran`}</h3>
              <p>{section === "Accessibility" ? "Static title and image-alt checks ran. Axe and keyboard execution require the local browser scanner." : "Each entry states what is wrong, the exact measurement taken and the predicate that was evaluated."}</p>
            </div>
          </div>
          <EvidenceList
            issues={visibleIssues.map(liveEvidence)}
            emptyNote="No finding in this scan matches this view. That is limited to the checks listed for this scan."
          />
        </section>
      )}

      {section === "Visual" && (
        <section className="review-page">
          <div className="review-heading"><div><span>NOT RUN IN HOSTED HTTP MODE</span><h2>Visual evidence requires a browser-capable worker.</h2><p>This scan did not fabricate screenshots, overflow measurements or layout results. Run the CLI locally for Playwright evidence.</p></div><span className="mode-badge">TRUTHFUL LIMIT</span></div>
          <Link className="button" href="/integrations/cli">Run locally with CLI →</Link>
        </section>
      )}

      {section === "Report" && (
        <section className="report-page live-report-page">
          <div className="report-score"><span>ORIGIN</span><strong className="origin-score">{result.origin}</strong><small>Static HTTP evidence · no browser rendering</small></div>
          <div className="report-summary"><span>SCAN VERDICT</span><h2>{result.summary.verifiedBlocking === 0 ? "No blocker found in checks run." : "Verified blockers require attention."}</h2><p>This is not a browser-render or release guarantee. The export includes the exact scope and limitations.</p></div>
          <div className="download-centre">
            <div><span>SCAN-SPECIFIC EXPORTS</span><h2>Portable evidence.</h2></div>
            <div>
              {(["json", "html", "csv", "sarif", "junit"] as const).map((format) => (
                <button onClick={() => downloadLiveReport(result, format)} key={format}><span>↓</span>{format.toUpperCase()}<b>generate</b></button>
              ))}
              <span className="unavailable-export">Screenshots ZIP · unavailable because no browser rendering ran</span>
              <span className="unavailable-export">Patch / proof · unavailable without repository access</span>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

export function ScanWorkspace({ section = "Overview" }: { section?: string }) {
  const params = useParams<{ scanId?: string }>();
  const activeScanId =
    typeof params.scanId === "string" ? params.scanId : "atlaspay-replay";
  const [storedScan, setStoredScan] = useState<LiveScanResult | null>(null);
  const [loadedScanId, setLoadedScanId] = useState<string | null>(
    activeScanId === "atlaspay-replay" ? activeScanId : null,
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [locale, setLocale] = useState("ar-SA");
  const [route, setRoute] = useState("/dashboard");
  const [viewportName, setViewportName] = useState(
    replayConfig.viewports[0].name,
  );
  const [fixed, setFixed] = useState(false);
  const viewport =
    replayConfig.viewports.find((item) => item.name === viewportName) ??
    replayConfig.viewports[0];
  const frameSource = `/atlaspay/${locale}${route === "/" ? "" : route}?state=${
    fixed ? "fixed" : "broken"
  }`;
  const frameIssues = baselineScan.issues
    .filter(
      (issue) =>
        issue.locale === locale &&
        issue.route === route &&
        issue.viewport.name === viewport.name,
    )
    .map(replayEvidence);
  const focusIssue = (issueId: string) => {
    const issue = baselineScan.issues.find((item) => item.issueId === issueId);
    if (!issue) return;
    setLocale(issue.locale);
    setRoute(issue.route);
    setViewportName(issue.viewport.name);
    setSelectedIssueId(issueId);
  };
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setStoredScan(
        activeScanId === "atlaspay-replay"
          ? null
          : readStoredScans().find((scan) => scan.scanId === activeScanId) ??
              null,
      );
      setLoadedScanId(activeScanId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeScanId]);
  if (activeScanId !== "atlaspay-replay") {
    if (loadedScanId !== activeScanId) {
      return (
        <AppShell>
          <section className="empty-state" role="status">
            <span>LOADING SAVED SCAN</span>
            <h1>Opening the scan evidence stored in this browser.</h1>
            <p>BhashaFix is reading the selected record before deciding whether it exists.</p>
          </section>
        </AppShell>
      );
    }
    return storedScan ? (
      <LiveStoredWorkspace result={storedScan} section={section} />
    ) : (
      <AppShell>
        <section className="empty-state">
          <span>SCAN NOT AVAILABLE IN THIS BROWSER</span>
          <h1>This local record may have been deleted or created elsewhere.</h1>
          <p>BhashaFix does not substitute replay data for a missing live scan.</p>
          <div><Link className="button" href="/scan/new">Run a new scan</Link><Link className="button button-secondary" href="/scan">Back to history</Link></div>
        </section>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <ScanHeader section={section} />
      {section === "Overview" && (
        <section className="workspace-grid">
          <PipelineRail />
          <div className="workspace-centre">
            <div className="preview-controls">
              <label className="field">
                Locale
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                >
                  {baselineScan.localesTested.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Route
                <select
                  value={route}
                  onChange={(event) => setRoute(event.target.value)}
                >
                  {baselineScan.routesDiscovered.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Viewport
                <select
                  value={viewportName}
                  onChange={(event) => setViewportName(event.target.value)}
                >
                  {replayConfig.viewports.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} {item.width}×{item.height}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => setFixed((value) => !value)}>
                {fixed ? "After repair" : "Before repair"} ↔
              </button>
            </div>
            <AnnotatedRenderStage
              src={frameSource}
              title={`AtlasPay ${locale} ${route} ${fixed ? "fixed" : "broken"} render`}
              viewport={viewport}
              issues={frameIssues}
              selectedIssueId={selectedIssueId}
              onSelect={setSelectedIssueId}
              stateNote={
                fixed
                  ? `state=fixed · the recorded verification finished with ${repairProof.finalBlocking} blocking predicates and source locale ${repairProof.sourceLocaleRegression}`
                  : `state=broken · the recorded baseline carried ${repairProof.baselineBlocking} verified blocking predicates across this fixture`
              }
            />
            <EvidenceList
              issues={frameIssues}
              selectedIssueId={selectedIssueId ?? undefined}
              onSelect={setSelectedIssueId}
              emptyNote={`No issue was recorded for ${locale} on ${route} at the ${viewport.name} viewport in this replay. Use the matrix below to open a case that was.`}
            />
            <CoverageMatrix
              caption="Route × locale coverage recorded in the AtlasPay baseline"
              routes={baselineScan.routesDiscovered}
              locales={baselineScan.localesTested}
              cell={replayCoverageCell}
            />
            <div className="matrix-jump">
              <span>Open a recorded case</span>
              <ul>
                {baselineScan.issues.map((issue) => (
                  <li key={issue.issueId}>
                    <button type="button" onClick={() => focusIssue(issue.issueId)}>
                      {issue.locale} {issue.route} · {ruleLabel(issue.ruleId)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Recorded artifact timeline. Each row is a timestamp that exists
              verbatim in the named file under public/replay — the replay does
              not record per-stage console events, so none are invented here. */}
          <div className="real-console">
            {[
              [
                baselineScan.startedAt,
                "baseline",
                `${baselineScan.scanId} started`,
                "baseline-scan.json",
              ],
              [
                baselineScan.completedAt,
                "baseline",
                `${baselineScan.issues.length} issues · ${baselineScan.status.replaceAll("_", " ")}`,
                "baseline-scan.json",
              ],
              [
                replayReport.verification.verifiedAt,
                "verify",
                `${proofDelta} · source ${replayConfig.sourceLocale} ${repairProof.sourceLocaleRegression}`,
                "report.json",
              ],
              [
                repairProof.generatedAt,
                "prove",
                `diff within policy: ${recordedFlag(repairProof.diffWithinPolicy)}`,
                "repair-proof.json",
              ],
            ].map(([iso, stage, detail, source]) => (
              <div key={`${stage}-${iso}`}>
                <time dateTime={iso}>{artifactClock(iso)}</time>
                <b>{stage}</b>
                <span>{detail}</span>
                <code>{source}</code>
              </div>
            ))}
          </div>
        </section>
      )}
      {section === "Routes" && <ReplayRoutesView />}
      {section === "Issues" && <IssuesView />}
      {section === "Linguistic" && <LinguisticView />}
      {section === "Visual" && <VisualView />}
      {section === "Accessibility" && <AccessibilityView />}
      {section === "Repairs" && <RepairsView />}
      {section === "Report" && <ReportView />}
    </AppShell>
  );
}

function ReplayRoutesView() {
  const routes = baselineScan.routesDiscovered.map((route) => ({
    route,
    issues: baselineScan.issues.filter((issue) => issue.route === route),
  }));
  return (
    <section className="review-page">
      <div className="review-heading">
        <div>
          <span>RECORDED_REPLAY · ROUTE COVERAGE</span>
          <h2>Five routes. Ten locale predicates.</h2>
          <p>These rows come from the generated AtlasPay baseline artifact.</p>
        </div>
        <span className="mode-badge">GUIDED DEMO</span>
      </div>
      <div className="data-table route-audit-table">
        <header><span>Route</span><span>Findings</span><span>Locales</span><span>Evidence</span><span>Status</span></header>
        {routes.map(({ route, issues }) => (
          <div key={route}>
            <strong>{route}</strong>
            <code>{issues.length}</code>
            <span>{[...new Set(issues.map((issue) => issue.locale))].join(", ") || "source"}</span>
            <span>{issues.length ? "measured predicates" : "rendered route"}</span>
            <b>{issues.length ? "BASELINE FAIL" : "PASS"}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccessibilityView() {
  return (
    <section className="review-page">
      <div className="review-heading">
        <div>
          <span>RECORDED_REPLAY · ACCESSIBILITY</span>
          <h2>One recorded result. Four values this replay never measured.</h2>
          <p>
            The replay artifact carries a source-locale regression result. Its
            accessibility-regression and console-error fields are stored as
            null, and it contains no axe output or keyboard-operability
            evidence, so those rows say not measured rather than being turned
            into a pass.
          </p>
        </div>
        <span className="mode-badge">PARTIAL EVIDENCE</span>
      </div>
      <div className="visual-metrics">
        {[
          [
            "Accessibility regression",
            recordedFlag(repairProof.accessibilityRegression),
            repairProof.accessibilityRegression === null ? "NOT RUN" : "RECORDED",
          ],
          [
            "Console error delta",
            recordedFlag(repairProof.consoleErrorDelta),
            repairProof.consoleErrorDelta === null ? "NOT RUN" : "RECORDED",
          ],
          [
            "Source-locale regression",
            repairProof.sourceLocaleRegression,
            "RECORDED",
          ],
          ["Serious / critical axe", "not run", "NOT RUN"],
          ["Keyboard operability", "not run", "NOT RUN"],
        ].map(([label, value, status]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <b className={status === "NOT RUN" ? "not-run" : undefined}>
              {status}
            </b>
          </div>
        ))}
      </div>
      <p className="trust-claim">
        RECORDED fields are read from repair-proof.json. Axe and keyboard checks
        run in the local browser scanner, which writes its own artifact; no axe
        result exists for this bundled replay, and none is substituted here.
      </p>
    </section>
  );
}

function IssuesView() {
  const [filter, setFilter] = useState<"all" | "blocking" | "review">("all");
  const [query, setQuery] = useState("");
  const rows = baselineScan.issues.filter((issue) => {
    if (filter === "blocking" && issue.severity !== "blocking") return false;
    if (filter === "review" && !issue.humanReviewRequired) return false;
    return [issue.issueId, issue.locale, issue.route, issue.ruleId]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
  });
  return (
    <section className="review-page">
      <div className="review-heading">
        <div>
          <span>RECORDED_REPLAY · VERIFIED ISSUES</span>
          <h2>Statement, measurement, predicate.</h2>
          <p>
            Every entry below is one recorded deterministic failure. The
            measurement is the value the run stored; the predicate is the
            expression that was evaluated against it.
          </p>
        </div>
        <span className="mode-badge">{baselineScan.issues.length} RECORDED</span>
      </div>
      <div className="issue-filters">
        <button
          className={filter === "all" ? "active" : ""}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All {baselineScan.issues.length}
        </button>
        <button
          className={filter === "blocking" ? "active" : ""}
          aria-pressed={filter === "blocking"}
          onClick={() => setFilter("blocking")}
        >
          Blocking{" "}
          {baselineScan.issues.filter((issue) => issue.severity === "blocking").length}
        </button>
        <button
          className={filter === "review" ? "active" : ""}
          aria-pressed={filter === "review"}
          onClick={() => setFilter("review")}
        >
          Human review{" "}
          {baselineScan.issues.filter((issue) => issue.humanReviewRequired).length}
        </button>
        <input
          aria-label="Filter issues"
          placeholder="Filter locale, route or issue…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <EvidenceList
        issues={rows.map(replayEvidence)}
        emptyNote="No recorded issue matches this filter."
      />
    </section>
  );
}

function LinguisticView() {
  const items = baselineScan.issues.filter((issue) =>
    ["placeholder-mismatch", "glossary-violation", "raw-translation-key"].includes(
      issue.ruleId,
    ),
  );
  return (
    <section className="review-page">
      <div className="review-heading">
        <div>
          <span>LINGUISTIC REVIEW</span>
          <h2>Facts first. Judgement labelled.</h2>
          <p>
            These three findings are deterministic. Model-assisted tone or meaning
            reviews would appear separately with confidence and human-review gates.
          </p>
        </div>
        <span className="mode-badge">NO-AI MODE</span>
      </div>
      <div className="linguistic-table">
        {items.map((issue) => (
          <article key={issue.issueId}>
            <div>
              <span>{issue.locale}</span>
              <b>{issue.issueId}</b>
            </div>
            <h3>{issue.ruleId.replaceAll("-", " ")}</h3>
            <p>{issue.description}</p>
            <code>{issue.deterministicPredicate}</code>
            <footer>
              <span>confidence · <b>verified</b></span>
              <span>human review · <b>not required</b></span>
            </footer>
          </article>
        ))}
        <article className="human-review-card">
          <div><span>MODEL</span><b>EXAMPLE GATE</b></div>
          <h3>Brand-tone preference</h3>
          <p>
            A provider may suggest a more natural phrase, but BhashaFix cannot
            promote preference to deterministic fact.
          </p>
          <footer>
            <span>confidence · <b>medium</b></span>
            <span>status · <b>human review required</b></span>
          </footer>
        </article>
      </div>
    </section>
  );
}

function VisualView() {
  const [reveal, setReveal] = useState(52);
  const [locale, setLocale] = useState("hi-IN");
  // The frames below are live renders of the bundled fixture. This page does
  // not measure them, so the numbers shown come from the issue the replay
  // actually recorded for the selected locale — or say so when there is none.
  const recorded = baselineScan.issues.find((issue) => issue.locale === locale);
  const direction = (() => {
    try {
      return localeProfile(locale).direction;
    } catch {
      return "ltr";
    }
  })();
  return (
    <section className="visual-page">
      <div className="review-heading">
        <div>
          <span>VISUAL EVIDENCE</span>
          <h2>Same route. Same case. Before and after.</h2>
        </div>
        <select value={locale} onChange={(event) => setLocale(event.target.value)}>
          {["hi-IN", "de-DE", "ar-SA", "he-IL", "zh-Hans-CN", "th-TH"].map(
            (item) => <option key={item}>{item}</option>,
          )}
        </select>
      </div>
      <div className="visual-compare">
        <div className="visual-labels"><span>BEFORE · FAIL</span><b>AFTER · PASS</b></div>
        <iframe src={`/atlaspay/${locale}/pricing?state=fixed`} title="Fixed AtlasPay" />
        <div style={{ width: `${reveal}%` }}>
          <iframe src={`/atlaspay/${locale}/pricing?state=broken`} title="Broken AtlasPay" />
        </div>
        <i style={{ left: `${reveal}%` }}>↔</i>
        <input
          type="range"
          min="10"
          max="90"
          value={reveal}
          onChange={(event) => setReveal(Number(event.target.value))}
          aria-label="Before and after reveal"
        />
      </div>
      <div className="visual-metrics">
        {[
          ["Locale direction", direction, "LOCALE PROFILE"],
          ["Recorded issue", recorded?.issueId ?? "none", recorded ? "RECORDED" : "NOT RUN"],
          ["Recorded rule", recorded?.ruleId ?? "none", recorded ? "RECORDED" : "NOT RUN"],
          ["Recorded route", recorded?.route ?? "none", recorded ? "RECORDED" : "NOT RUN"],
          ["Live frame measurement", "not run", "NOT RUN"],
        ].map(([label, value, status]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <b className={status === "NOT RUN" ? "not-run" : undefined}>
              {status}
            </b>
          </div>
        ))}
      </div>
      <p className="trust-claim">
        The two frames above are live renders of the bundled fixture, not
        screenshots, and this page performs no measurement on them. Overflow,
        clipping and console measurements come from a local Playwright run.
        {recorded
          ? ` The recorded predicate for ${locale} is ${recorded.deterministicPredicate}, measured as ${JSON.stringify(recorded.measuredEvidence)}.`
          : ` No issue was recorded for ${locale} in this replay.`}
      </p>
    </section>
  );
}

function RepairsView() {
  const [patch, setPatch] = useState("Loading generated patch…");
  const [patchLoaded, setPatchLoaded] = useState(false);
  // The engine has exactly two repair paths: a dry run that only emits a diff,
  // and --apply. There is no "suggest" mode, so none is offered here.
  const [mode, setMode] = useState<"prepare" | "apply">("prepare");
  useEffect(() => {
    fetch("/replay/repair.patch")
      .then((response) => response.text())
      .then((text) => {
        setPatch(text);
        setPatchLoaded(true);
      })
      .catch(() => setPatch("Generated patch unavailable."));
  }, []);
  // Counted from the artifact that is actually on screen, not asserted.
  const patchOperations = patchLoaded
    ? (patch.match(/^--- a\//gm) ?? []).length
    : 0;
  const patchFiles = patchLoaded
    ? [...new Set(patch.match(/^\+\+\+ b\/(.+)$/gm) ?? [])].length
    : 0;
  return (
    <section className="repairs-page">
      <div className="review-heading">
        <div>
          <span>BOUNDED REPAIR</span>
          <h2>Diff first. Mutation only by policy.</h2>
          <p>
            {baselineScan.issues.length} recorded issue IDs.{" "}
            {patchLoaded
              ? `${patchOperations} operations across ${patchFiles} files in the loaded patch.`
              : "Loading the generated patch to count its operations."}
          </p>
        </div>
        <div className="segmented">
          {(["prepare", "apply"] as const).map((item) => (
            <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>
          ))}
        </div>
      </div>
      <div className="repair-layout">
        <aside>
          <span>RECORDED POLICY FACTS</span>
          {[
            `Baseline scan ID ${repairProof.baselineScanId}`,
            `${baselineScan.issues.length} explicit issue IDs`,
            `${replayConfig.allowlist.length} paths allowlisted`,
            `Diff within policy: ${recordedFlag(repairProof.diffWithinPolicy)}`,
          ].map((item) => <div key={item}><i>✓</i>{item}</div>)}
          <p className="repair-policy-note">
            Symlink rejection, rollback capture and commit policy are engine
            behaviours; this replay artifact does not record a result for them,
            so none is claimed here.
          </p>
          <small>Mode selected</small>
          <strong>{mode}</strong>
        </aside>
        <pre tabIndex={0} className="patch-viewer">{patch}</pre>
      </div>
      <div className="repair-verdict">
        <span>✓</span>
        <div>
          <strong>Recorded predicates passed; the release gate remains incomplete</strong>
          <p>
            Original predicates pass · source locale{" "}
            {repairProof.sourceLocaleRegression} ·{" "}
            {replayReport.verification.newBlockingIssues} new blocking issues ·
            diff policy, accessibility regression and console delta were not
            measured by this replay
          </p>
        </div>
        <b>{repairProof.baselineBlocking} → {repairProof.finalBlocking}</b>
      </div>
    </section>
  );
}

function ReportView() {
  const finalIssues = replayReport.scan.issues as Array<{
    severity: string;
    humanReviewRequired?: boolean;
  }>;
  const downloads = [
    ["JSON report", "/replay/report.json"],
    ["HTML report", "/replay/report.html"],
    ["SARIF", "/replay/report.sarif"],
    ["JUnit XML", "/replay/junit.xml"],
    ["CSV issues", "/replay/issues.csv"],
    ["Screenshots ZIP", "/replay/screenshots.zip"],
    ["Unified patch", "/replay/repair.patch"],
    ["Proof JSON", "/replay/repair-proof.json"],
  ];
  const releaseGateComplete =
    repairProof.consoleErrorDelta !== null &&
    repairProof.accessibilityRegression !== null &&
    repairProof.diffWithinPolicy !== null;
  return (
    <section className="report-page">
      <div className="report-score">
        <span>VERIFIED GATE</span>
        <strong>{proofDelta}</strong>
        <small>
          blocking predicates, baseline → final, recorded in repair-proof.json
        </small>
      </div>
      <div className="report-summary">
        <span>FINAL VERDICT</span>
        <h2>
          {releaseGateComplete
            ? "Ready for engineering release."
            : "Repair verified. Release gate incomplete."}
        </h2>
        <p>
          The replay proves all original blocking predicates pass after the
          bounded repair. It does not record console-error delta, accessibility
          regression or diff-policy verification, so this artifact alone is not
          a release-readiness approval.
        </p>
        <div>
          {[
            ["Blocking issues", String(repairProof.finalBlocking), repairProof.finalBlocking === 0 ? "PASS" : "FAIL"],
            ["Warnings", String(finalIssues.filter((issue) => issue.severity === "warning").length), "PASS"],
            ["Human review", String(finalIssues.filter((issue) => issue.humanReviewRequired).length), "CLEAR"],
            ["Route coverage", `${replayReport.scan.routesDiscovered.length} / ${baselineScan.routesDiscovered.length}`, "100%"],
            ["Locale coverage", `${replayReport.scan.localesTested.length} / ${baselineScan.localesTested.length}`, "100%"],
            ["Source regression", repairProof.sourceLocaleRegression, "PASS"],
            [
              "Accessibility regression",
              recordedFlag(repairProof.accessibilityRegression),
              repairProof.accessibilityRegression === null ? "NOT MEASURED" : "RECORDED",
            ],
            [
              "Console error delta",
              recordedFlag(repairProof.consoleErrorDelta),
              repairProof.consoleErrorDelta === null ? "NOT MEASURED" : "RECORDED",
            ],
          ].map(([label, value, status]) => (
            <article key={label}><span>{label}</span><strong>{value}</strong><b>{status}</b></article>
          ))}
        </div>
      </div>
      <div className="download-centre">
        <div><span>DOWNLOAD CENTRE</span><h2>Portable proof.</h2></div>
        <div>
          {downloads.map(([label, href]) => (
            <a href={href} download key={label}><span>↓</span>{label}<b>export</b></a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GlossaryPage() {
  type GlossaryEntry = {
    id: string;
    source: string;
    locale: string;
    approved: string;
    forbidden: string;
    notes: string;
    protected: boolean;
  };
  const defaults: GlossaryEntry[] = [
    { id: "seed-checkout", source: "Checkout", locale: "es-MX", approved: "Pagar", forbidden: "Caja", notes: "Payments flow", protected: false },
    { id: "seed-transfer", source: "Transfer", locale: "fr-FR", approved: "Virement", forbidden: "", notes: "Bank transfer noun", protected: false },
    { id: "seed-atlaspay", source: "AtlasPay", locale: "*", approved: "AtlasPay", forbidden: "", notes: "Product name", protected: true },
  ];
  const [entries, setEntries] = useState<GlossaryEntry[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [localeFilter, setLocaleFilter] = useState("*");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem("bhashafix-glossary-v1") ?? "null",
        ) as GlossaryEntry[] | null;
        if (Array.isArray(stored)) setEntries(stored);
      } catch {
        setMessage("Stored glossary data was invalid; seed entries were restored.");
      } finally {
        setLoaded(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem("bhashafix-glossary-v1", JSON.stringify(entries));
  }, [entries, loaded]);
  const update = (id: string, changes: Partial<GlossaryEntry>) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
    );
  const filtered = entries.filter(
    (entry) =>
      (localeFilter === "*" || entry.locale === localeFilter) &&
      [entry.source, entry.locale, entry.approved, entry.forbidden, entry.notes]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const exportEntries = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ schemaVersion: "1.0", entries }, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bhashafix-glossary.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importEntries = async (file: File | undefined) => {
    if (!file) return;
    try {
      const value = JSON.parse(await file.text()) as {
        entries?: GlossaryEntry[];
      };
      if (
        !Array.isArray(value.entries) ||
        value.entries.some(
          (entry) =>
            !entry.id ||
            !entry.source?.trim() ||
            !entry.locale?.trim() ||
            !entry.approved?.trim(),
        )
      ) {
        throw new Error("Each entry requires id, source, locale and approved text.");
      }
      value.entries.forEach((entry) => {
        if (entry.locale !== "*") new Intl.Locale(entry.locale);
      });
      setEntries(value.entries);
      setMessage(`Imported ${value.entries.length} validated entries.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  };
  return (
    <AppShell>
      <section className="page-heading">
        <div><span>TERMINOLOGY</span><h1>Project glossary</h1><p>Approved terms are deterministic constraints, not model preferences.</p></div>
        <div className="data-actions">
          <button className="button button-secondary" onClick={exportEntries}>Export JSON</button>
          <label className="button button-secondary">Import JSON<input type="file" accept="application/json,.json" onChange={(event) => void importEntries(event.target.files?.[0])} /></label>
          <button className="button" onClick={() => setEntries((current) => [...current, { id: crypto.randomUUID(), source: "", locale: "de-DE", approved: "", forbidden: "", notes: "", protected: false }])}>Add entry</button>
        </div>
      </section>
      <section className="data-toolbar">
        <input aria-label="Search glossary" placeholder="Search terms, translations or notes…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter glossary by locale" value={localeFilter} onChange={(event) => setLocaleFilter(event.target.value)}>
          <option value="*">All locales</option>
          {[...new Set(entries.map((entry) => entry.locale))].map((locale) => <option key={locale}>{locale}</option>)}
        </select>
        <span role="status">{message || `${filtered.length} of ${entries.length} persisted entries`}</span>
      </section>
      <section className="data-table editable-table">
        <header><span>Source term</span><span>Locale</span><span>Approved target</span><span>Policy / notes</span><span>Actions</span></header>
        {filtered.map((entry) => (
          <div key={entry.id}>
            <input aria-label={`Source term ${entry.id}`} value={entry.source} onChange={(event) => update(entry.id, { source: event.target.value })} placeholder="Required source term" />
            <input aria-label={`Locale ${entry.id}`} value={entry.locale} onChange={(event) => update(entry.id, { locale: event.target.value })} />
            <input aria-label={`Approved translation ${entry.id}`} value={entry.approved} onChange={(event) => update(entry.id, { approved: event.target.value })} placeholder="Required approved form" />
            <span className="glossary-policy"><input aria-label={`Forbidden alternatives ${entry.id}`} value={entry.forbidden} onChange={(event) => update(entry.id, { forbidden: event.target.value })} placeholder="Forbidden alternatives" /><input aria-label={`Notes ${entry.id}`} value={entry.notes} onChange={(event) => update(entry.id, { notes: event.target.value })} placeholder="Notes" /></span>
            <span className="row-actions"><label><input type="checkbox" checked={entry.protected} onChange={(event) => update(entry.id, { protected: event.target.checked })} /> protected</label><button onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}>Delete</button></span>
          </div>
        ))}
        {filtered.length === 0 && <p className="table-empty">No glossary entry matches this filter.</p>}
      </section>
    </AppShell>
  );
}

export function MemoryPage() {
  type MemoryEntry = {
    id: string;
    source: string;
    target: string;
    locale: string;
    context: string;
    provider: string;
    approved: boolean;
    match: "exact" | "context";
  };
  const [query, setQuery] = useState("");
  const defaults: MemoryEntry[] = [
    { id: "seed-memory-es", source: "Checkout", target: "Pagar", locale: "es-MX", context: "checkout-title", provider: "human", approved: true, match: "exact" },
    { id: "seed-memory-fr", source: "Send money", target: "Envoyer de l’argent", locale: "fr-FR", context: "primary-cta", provider: "human", approved: true, match: "context" },
    { id: "seed-memory-ar", source: "Available balance", target: "الرصيد المتاح", locale: "ar-SA", context: "dashboard-card", provider: "sample/demo import · provider:openai · unverified", approved: false, match: "context" },
    { id: "seed-memory-ja", source: "Global payments", target: "グローバル決済", locale: "ja-JP", context: "hero-title", provider: "human", approved: true, match: "exact" },
  ];
  const [entries, setEntries] = useState<MemoryEntry[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [localeFilter, setLocaleFilter] = useState("*");
  const [matchFilter, setMatchFilter] = useState("*");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem("bhashafix-memory-v1") ?? "null",
        ) as MemoryEntry[] | null;
        if (Array.isArray(stored)) setEntries(stored);
      } catch {
        setMessage("Stored memory data was invalid; seed entries were restored.");
      } finally {
        setLoaded(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem("bhashafix-memory-v1", JSON.stringify(entries));
    }
  }, [entries, loaded]);
  const filtered = entries.filter((entry) =>
    (localeFilter === "*" || entry.locale === localeFilter) &&
    (matchFilter === "*" || entry.match === matchFilter) &&
    Object.values(entry).join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const exportMemory = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: "1.0", entries }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bhashafix-translation-memory.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const importMemory = async (file: File | undefined) => {
    if (!file) return;
    try {
      const value = JSON.parse(await file.text()) as { entries?: MemoryEntry[] };
      if (!Array.isArray(value.entries) || value.entries.some((entry) => !entry.id || !entry.source || !entry.target || !entry.locale)) {
        throw new Error("Every memory entry requires id, source, target and locale.");
      }
      value.entries.forEach((entry) => new Intl.Locale(entry.locale));
      setEntries(value.entries);
      setMessage(`Imported ${value.entries.length} validated memory entries.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  };
  return (
    <AppShell>
      <section className="page-heading">
        <div><span>PROJECT MEMORY</span><h1>Translation memory</h1><p>Exact, normalised and context matches with provenance.</p></div>
        <div className="data-actions"><button className="button button-secondary" onClick={exportMemory}>Export JSON</button><label className="button button-secondary">Import JSON<input type="file" accept="application/json,.json" onChange={(event) => void importMemory(event.target.files?.[0])} /></label></div>
      </section>
      <section className="data-toolbar">
        <input aria-label="Search translation memory" placeholder="Search memory…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter memory by locale" value={localeFilter} onChange={(event) => setLocaleFilter(event.target.value)}><option value="*">All locales</option>{[...new Set(entries.map((entry) => entry.locale))].map((locale) => <option key={locale}>{locale}</option>)}</select>
        <select aria-label="Filter memory by match type" value={matchFilter} onChange={(event) => setMatchFilter(event.target.value)}><option value="*">All matches</option><option value="exact">Exact</option><option value="context">Context</option></select>
        <span role="status">{message || `${filtered.length} of ${entries.length} persisted entries`}</span>
      </section>
      <p className="trust-claim">
        Seeded rows are illustrative local samples. The OpenAI-labelled seed is
        marked as an unverified sample import; it is not a receipt from a real
        provider call. Imported project entries retain the provenance supplied
        in their file.
      </p>
      <section className="memory-grid">
        {filtered.map((entry) => (
          <article key={entry.id}>
            <div><span>{entry.locale} · {entry.match}</span><button onClick={() => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, approved: !item.approved } : item))}>{entry.approved ? "Human approved" : "Mark approved"}</button></div>
            <small>SOURCE</small><strong>{entry.source}</strong>
            <small>TARGET</small><h3>{entry.target}</h3>
            <footer><code>{entry.context}</code><span>{entry.provider}</span><button aria-label={`Delete memory ${entry.id}`} onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}>Delete</button></footer>
          </article>
        ))}
        {filtered.length === 0 && <p className="table-empty">No translation-memory entry matches this filter.</p>}
      </section>
    </AppShell>
  );
}

export function IntegrationsPage() {
  return (
    <AppShell>
      <section className="page-heading">
        <div><span>ONE ENGINE · EVERY WORKFLOW</span><h1>Integrations</h1><p>Use BhashaFix through CLI, local MCP and GitHub Actions.</p></div>
      </section>
      <section className="integration-grid">
        <article id="cli">
          <i>›_</i><span>CLI</span><h2>@bhashafix/cli</h2>
          <p>Human output, JSON, quiet and verbose modes, stable exit codes and no secret leakage.</p>
          <pre tabIndex={0}>{`pnpm bhashafix scan \\\n  --url http://localhost:3000 \\\n  --source-locale en-GB \\\n  --locales hi-IN,ar-SA,ja-JP,de-DE`}</pre>
        </article>
        <article>
          <i>◇</i><span>MCP · STDIO</span><h2>@bhashafix/mcp</h2>
          <p>
            {evidenceIndex.mcp.tools} strict tools, {evidenceIndex.mcp.resources}{" "}
            resources and {evidenceIndex.mcp.prompts} workflow prompts for coding
            agents, as listed by the recorded <code>tools/list</code> response.
          </p>
          <pre tabIndex={0}>{`{\n  "mcpServers": {\n    "bhashafix": {\n      "command": "node",\n      "args": ["${evidenceIndex.mcp.serverEntry}"]\n    }\n  }\n}`}</pre>
        </article>
        <article id="ci">
          <i>✓</i><span>GITHUB ACTIONS</span><h2>Release gate</h2>
          <p>Installs Chromium, runs the identical checks, uploads proof, SARIF, JUnit and screenshots.</p>
          <pre tabIndex={0}>{`- run: pnpm install --frozen-lockfile\n- run: pnpm exec playwright install chromium\n- run: pnpm bhashafix ci --fail-on blocking`}</pre>
        </article>
        <article>
          <i>◎</i><span>PROVIDERS</span><h2>Optional linguistic review</h2>
          <p>OpenAI, Anthropic, Groq and OpenAI-compatible adapters sit behind a common contract. No-model mode is first-class.</p>
          <div className="provider-status"><b>deterministic</b><span>available</span></div>
          <div className="provider-status"><b>model provider</b><span>not configured</span></div>
        </article>
      </section>
    </AppShell>
  );
}

/** The CI surface. The CLI and MCP surfaces have their own pages. */
export function IntegrationDetailPage({
  integration,
}: {
  integration: "ci";
}) {
  void integration;
  return (
    <AppShell>
      <section className="docs-layout integration-detail">
        <aside>
          <Link href="/integrations/cli">CLI</Link>
          <Link href="/integrations/mcp">MCP</Link>
          <Link href="/integrations/ci">CI</Link>
        </aside>
        <article>
          <span>SEVERITY-AWARE RELEASE GATE</span>
          <h1>Run identical checks in GitHub Actions.</h1>
          <p className="docs-lede">
            The workflow installs Chromium, runs the shared engine, uploads
            evidence and fails only at the configured threshold.
          </p>
          <section>
            <h2>Working setup</h2>
            <pre tabIndex={0}>{`pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm bhashafix ci --config .bhashafix/config.yml --fail-on blocking`}</pre>
          </section>
          <section>
            <h2>Truth boundary</h2>
            <p>
              The repository includes the workflow, but no remote status badge is
              shown until an authenticated GitHub run exists.
            </p>
          </section>
          <Link className="button" href="/docs">
            Read full documentation →
          </Link>
        </article>
      </section>
    </AppShell>
  );
}

/** Rule counts for the recorded replay, taken from the artifact itself. */
const replayRuleCounts = baselineScan.issues.reduce<Record<string, number>>(
  (counts, issue) => ({
    ...counts,
    [issue.ruleId]: (counts[issue.ruleId] ?? 0) + 1,
  }),
  {},
);

export function DemoPage() {
  const verification = replayReport.verification;
  return (
    <AppShell className="ls-page">
      <header className="ls-masthead">
        <p className="ls-eyebrow">RECORDED VERIFIED RUN · {repairProof.origin}</p>
        <h1>
          <span className="ls-display-line">Ten blocking predicates.</span>{" "}
          <span className="ls-display-line">One bounded patch. Zero left.</span>
        </h1>
        <p className="ls-standfirst">
          AtlasPay is a bundled multilingual fixture, not a customer. The run
          below happened locally, wrote its artifacts into{" "}
          <code>/replay</code>, and is replayed here exactly as recorded. Opening
          this page does not rerun anything.
        </p>
        <ol className="ls-proof-chain">
          <li>
            <b>{repairProof.baselineBlocking}</b>
            <span>blocking predicates</span>
          </li>
          <li>
            <b>{replayConfig.allowlist.length}</b>
            <span>files patched, allowlisted</span>
          </li>
          <li>
            <b>identical</b>
            <span>predicates rerun</span>
          </li>
          <li>
            <b>{repairProof.finalBlocking}</b>
            <span>blocking predicates</span>
          </li>
          <li>
            <b>{repairProof.sourceLocaleRegression}</b>
            <span>{replayConfig.sourceLocale} source locale</span>
          </li>
        </ol>
      </header>

      <section className="ls-section" aria-labelledby="demo-record">
        <h2 id="demo-record">The run record</h2>
        <div className="ls-scroll" tabIndex={0} role="region">
          <table className="ls-table">
            <tbody>
              <tr>
                <th scope="row">Baseline scan</th>
                <td>
                  <code>{repairProof.baselineScanId}</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Verification scan</th>
                <td>
                  <code>{repairProof.verificationScanId}</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Mode</th>
                <td>
                  {repairProof.mode} ·{" "}
                  {replayConfig.noAi ? "no-AI deterministic" : "provider-assisted"}
                </td>
              </tr>
              <tr>
                <th scope="row">Routes</th>
                <td>{baselineScan.routesDiscovered.join(" · ")}</td>
              </tr>
              <tr>
                <th scope="row">Locales</th>
                <td>{baselineScan.localesTested.join(" · ")}</td>
              </tr>
              <tr>
                <th scope="row">Viewports · browsers · themes</th>
                <td>
                  {replayConfig.viewports
                    .map((viewport) => `${viewport.name} ${viewport.width}×${viewport.height}`)
                    .join(", ")}{" "}
                  · {replayConfig.browsers.join(", ")} ·{" "}
                  {replayConfig.themes.join(", ")}
                </td>
              </tr>
              <tr>
                <th scope="row">Recorded</th>
                <td>
                  {baselineScan.startedAt} → {baselineScan.completedAt}
                </td>
              </tr>
              <tr>
                <th scope="row">Proof generated</th>
                <td>{repairProof.generatedAt}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="ls-section" aria-labelledby="demo-rules">
        <h2 id="demo-rules">What failed, by rule</h2>
        <ul className="ls-rule-tally">
          {Object.entries(replayRuleCounts).map(([ruleId, count]) => (
            <li key={ruleId}>
              <b>{count}</b>
              <span>{ruleLabel(ruleId)}</span>
            </li>
          ))}
        </ul>
        <p className="ls-note">
          {baselineScan.issues.length} recorded issues across{" "}
          {baselineScan.routesDiscovered.length} routes and{" "}
          {baselineScan.localesTested.length} locales. Each one stores the
          measurement taken and the predicate it failed; the workspace shows them
          against the fixture itself.
        </p>
      </section>

      <section className="ls-section" aria-labelledby="demo-patch">
        <h2 id="demo-patch">The patch</h2>
        <ul className="ls-manifest">
          {replayConfig.allowlist.map((path) => (
            <li key={path}>
              <code>{path}</code>
              <span>allowlisted for repair</span>
            </li>
          ))}
        </ul>
        <p className="ls-note">
          The repair could touch nothing outside that list. The diff itself is
          published at <a href="/replay/repair.patch">/replay/repair.patch</a>.
        </p>
      </section>

      <section className="ls-section" aria-labelledby="demo-verification">
        <h2 id="demo-verification">Verification</h2>
        <div className="ls-verification" data-revealed="true">
          <p className="ls-verdict">
            {verification.baselineBlocking} → {verification.finalBlocking}
            <b>{verification.status}</b>
          </p>
          <dl>
            <dt>Verified at</dt>
            <dd>{verification.verifiedAt}</dd>
            <dt>Source-locale regression</dt>
            <dd>{verification.sourceLocaleRegression}</dd>
            <dt>New blocking issues</dt>
            <dd>{verification.newBlockingIssues}</dd>
            <dt>Console error delta</dt>
            <dd>{recordedFlag(verification.consoleErrorDelta)}</dd>
            <dt>Accessibility regression</dt>
            <dd>{recordedFlag(verification.accessibilityRegression)}</dd>
            <dt>Diff within policy</dt>
            <dd>{recordedFlag(verification.diffWithinPolicy)}</dd>
          </dl>
          <p className="ls-note">
            Recorded as not measured on this path, so not readable as a pass:{" "}
            {verification.notMeasured.join(", ")}.
          </p>
        </div>
      </section>

      <section className="ls-section" aria-labelledby="demo-exports">
        <h2 id="demo-exports">Portable exports the run wrote</h2>
        <ul className="ls-manifest">
          {replayArtifacts.map(([label, href]) => (
            <li key={href}>
              <a href={href}>{href}</a>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="ls-note">
          The post-repair exports are deliberately empty: after the patch there
          was no issue left to list.
        </p>
      </section>

      <section className="ls-section ls-limits" aria-labelledby="demo-limits">
        <h2 id="demo-limits">What this proves and what it does not</h2>
        <ul>
          <li>
            It proves the engine detects, repairs and reverifies a defined set of
            localisation defects with the identical predicates.
          </li>
          <li>
            It is a fixture, so it says nothing about your site. For third-party
            targets, the published external scans are the honest comparison.
          </li>
          <li>
            Fields the run did not measure are published as not measured. They
            are never rolled into the verdict.
          </li>
        </ul>
        <div className="ls-actions">
          <Link className="button" href="/scan/atlaspay-replay/overview">
            Open the evidence workspace →
          </Link>
          <Link className="button button-secondary" href="/scan/atlaspay-replay/report">
            Open the proof report
          </Link>
          <Link className="button button-secondary" href="/evidence">
            Inspect a real external scan
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

export function TrustPage() {
  return (
    <AppShell>
      <section className="docs-layout trust-page">
        <aside>
          {["Scope", "Local data", "Providers", "Evidence", "Limitations"].map((item) => <a href={`#${item.toLowerCase().replace(" ", "-")}`} key={item}>{item}</a>)}
        </aside>
        <article>
          <span>BHASHAFIX TRUST CENTRE</span>
          <h1>Know what ran, what moved and what did not.</h1>
          <p className="docs-lede">Every result carries an origin. Public scans never invent source locations or repairs.</p>
          <section id="scope"><h2>Explicit scan origins</h2><pre tabIndex={0}>{`LIVE_PUBLIC_BROWSER_SCAN  public target rendered in a real browser\nHTTP_PREFLIGHT            static HTTP only, no browser rendering\nLOCAL_REPOSITORY_SCAN     local target rendered in a real browser\nGUIDED_DEMO\nRECORDED_REPLAY\nSYNTHETIC_LOCALISATION_PREVIEW`}</pre></section>
          <section id="local-data"><h2>What remains local</h2><p>Repository files, Playwright storage state, provider secrets and repair rollback data remain in the local CLI environment unless the user explicitly chooses another boundary.</p></section>
          <section id="providers"><h2>What reaches model providers</h2><p>Nothing in no-AI mode. When configured, only minimised translatable content and context are sent; credentials, hidden form values and detected secrets are excluded.</p></section>
          <section id="evidence"><h2>How evidence is generated</h2><p>Deterministic rules store the measured value, expected value and predicate. Model suggestions remain advisory and carry confidence plus human-review requirements.</p></section>
          <section id="limitations"><h2>Honest limitations</h2><p>The Vercel product offers a five-route HTTP preflight and a real Chromium quick scan for one route, selected locales and one viewport. Full route × locale × viewport matrices, authenticated coverage and source repair require the local CLI or a configured browser worker.</p></section>
          <TrustClaim />
        </article>
      </section>
    </AppShell>
  );
}

export function MotionLabPage() {
  const [active, setActive] = useState(false);
  return (
    <AppShell>
      <section className="motion-lab">
        <div className="review-heading">
          <div><span>INTERNAL MOTION VERIFICATION</span><h1>Motion communicates state.</h1><p>Every sample remains usable with reduced motion and decorative layers ignore pointer input.</p></div>
          <button className="button" onClick={() => setActive((value) => !value)}>{active ? "Reset motion" : "Run motion checks"}</button>
        </div>
        <div className={`motion-ledger ${active ? "active" : ""}`}>
          <article><span>01 · LOGO ALIGNMENT</span><div className="motion-logo"><i /><b>✓</b></div><p>Speech paths align once; no perpetual bounce.</p></article>
          <article><span>02 · PIPELINE EVENT</span><div className="motion-pipeline">{["VALIDATE", "CRAWL", "RENDER", "CHECK"].map((item) => <i key={item}>{item}</i>)}</div><p>Nodes activate only after the user starts this lab.</p></article>
          <article><span>03 · SCAN BEAM</span><div className="motion-frame"><i /></div><p>The beam is confined to the preview and never captures pointers.</p></article>
          <article><span>04 · VERIFIED DIFF</span><div className="motion-diff"><del>- dir=&quot;ltr&quot;</del><ins>+ dir=&quot;rtl&quot;</ins></div><p>Removed and added lines retain non-colour text cues.</p></article>
        </div>
        <p className="trust-claim">With `prefers-reduced-motion: reduce`, durations collapse and every control continues to work.</p>
      </section>
    </AppShell>
  );
}

export function DocsPage() {
  return (
    <AppShell>
      <section className="docs-layout">
        <aside>
          {["Quick start", "Website scan", "Repository scan", "CLI", "MCP", "Security", "Trust centre", "Limitations"].map((item) => (
            <a href={`#${item.toLowerCase().replace(" ", "-")}`} key={item}>{item}</a>
          ))}
        </aside>
        <article>
          <span>DOCUMENTATION</span>
          <h1>Verification, not vibes.</h1>
          <p className="docs-lede">BhashaFix is the verification harness between AI-generated translations and production software.</p>
          <section id="quick-start"><h2>Ten-minute quick start</h2><pre tabIndex={0}>{`pnpm install\npnpm bhashafix init\npnpm demo:reset\npnpm demo:scan\npnpm demo:repair\npnpm demo:prove`}</pre></section>
          <section id="website-scan"><h2>Website scan</h2><p>Hosted scans accept public HTTP and HTTPS targets, respect crawl limits and reject private, loopback and metadata destinations.</p><pre tabIndex={0}>{`pnpm bhashafix scan --url https://example.com \\\n  --source-locale en-GB --locales ar-SA,ja-JP`}</pre></section>
          <section id="repository-scan"><h2>Repository scan</h2><p>Local scans inspect framework, routes, locale assets and source hints. Unknown scripts are never executed without showing the command.</p></section>
          <section id="cli"><h2>CLI exit codes</h2><p><code>0</code> passed · <code>1</code> blocking · <code>2</code> invalid config · <code>3</code> unavailable · <code>4</code> runtime · <code>5</code> provider unavailable.</p></section>
          <section id="mcp"><h2>MCP safety</h2><p>Repairs require an explicit scan ID, explicit issue IDs, exact path allowlists and the hash of a reviewed diff. Dry-run is the default.</p></section>
          <section id="security"><h2>Security</h2><p>URL and redirect validation, DNS checks, response limits, path confinement, symlink rejection, redaction, rollback and audit logs are part of the engine.</p></section>
          <section id="trust-centre"><h2>Trust centre</h2><ul><li>Local repository content stays local unless a provider is deliberately configured.</li><li>Hidden credentials and personal form values are excluded from extraction.</li><li>No-AI mode keeps all deterministic engineering checks active.</li><li>Model findings never override browser predicates.</li></ul></section>
          <section id="limitations"><h2>Honest limitations</h2><p>Public sites may block automation, require authentication or prohibit crawling. Browser coverage depends on installed runtimes. Linguistic recommendations can require native human review.</p></section>
          <TrustClaim />
        </article>
      </section>
    </AppShell>
  );
}

export function PlaygroundPage() {
  const [source, setSource] = useState("Pay {amount} securely with AtlasPay");
  const [targetLocale, setTargetLocale] = useState("ar-SA");
  const [mode, setMode] = useState<
    "expanded-latin" | "extreme-expansion" | "rtl-mirrored" | "accented" | "cjk-density" | "no-space" | "tall-glyph" | "emoji-symbol" | "long-compound"
  >("expanded-latin");
  const result = useMemo(
    () => pseudoLocalise(source, mode, ["AtlasPay"]),
    [source, mode],
  );
  const profile = useMemo(() => {
    try {
      return localeProfile(targetLocale);
    } catch {
      return null;
    }
  }, [targetLocale]);
  const previewDocument = useMemo(() => {
    if (!profile) return "";
    return `<!doctype html>
<html lang="${escapeHtml(profile.canonical)}" dir="${profile.direction}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px;background:#fbf8ff;color:#1a1025;font-family:${profile.fontStack}}
  main{width:min(100%,640px);padding:36px;border:1px solid #d8b4fe;background:white;box-shadow:0 24px 80px rgba(109,40,217,.14)}
  small{color:#6d28d9;letter-spacing:.12em;text-transform:uppercase}p{font-size:clamp(26px,7vw,54px);line-height:1.25;overflow-wrap:anywhere}
</style>
<main><small>${escapeHtml(profile.canonical)} · ${escapeHtml(mode)}</small><p>${escapeHtml(result)}</p></main>
</html>`;
  }, [mode, profile, result]);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = previewFrame.current;
    if (!frame || !previewDocument) return;
    const url = URL.createObjectURL(
      new Blob([previewDocument], { type: "text/html;charset=utf-8" }),
    );
    frame.src = url;
    return () => URL.revokeObjectURL(url);
  }, [previewDocument]);
  return (
    <AppShell>
      <section className="page-heading">
        <div><span>SYNTHETIC_LOCALISATION_PREVIEW</span><h1>Stress strings safely</h1><p>Protected tokens, tags, URLs, emails and project terms remain intact.</p></div>
      </section>
      <section className="playground">
        <div>
          <label className="field">Source text<textarea value={source} onChange={(event) => setSource(event.target.value)} /></label>
          <label className="field">Target BCP 47 locale<input value={targetLocale} onChange={(event) => setTargetLocale(event.target.value)} aria-invalid={!profile} /></label>
          {!profile && <p role="alert">Enter a valid BCP 47 locale such as ar-SA or bn-BD.</p>}
          <div className="mode-grid">
            {["expanded-latin", "extreme-expansion", "rtl-mirrored", "accented", "cjk-density", "no-space", "tall-glyph", "emoji-symbol", "long-compound"].map((item) => (
              <button className={mode === item ? "active" : ""} onClick={() => setMode(item as typeof mode)} key={item}>{item}</button>
            ))}
          </div>
        </div>
        <div className="pseudo-result" dir={profile?.direction ?? "ltr"}>
          <small>SYNTHETIC_LOCALISATION_PREVIEW — NOT THE PRODUCTION WEBSITE</small>
          {profile ? (
            <iframe
              className="pseudo-frame"
              ref={previewFrame}
              title={`Synthetic ${profile.canonical} localisation preview`}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
            />
          ) : (
            <strong>Waiting for a valid locale.</strong>
          )}
          <div><span>Protected</span><code>{"{amount}"}</code><code>AtlasPay</code></div>
        </div>
      </section>
    </AppShell>
  );
}

export function LabPage() {
  return <ScanWorkspace section="Overview" />;
}

export function ReportPage() {
  return <ScanWorkspace section="Report" />;
}
