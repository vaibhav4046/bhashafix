"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import baselineScan from "../public/replay/baseline-scan.json";
import repairProof from "../public/replay/repair-proof.json";
import replayReport from "../public/replay/report.json";
import { pseudoLocalise } from "@bhashafix/linguistic-engine";
import { localeProfile } from "@bhashafix/locale-engine";

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

const issueTone: Record<string, string> = {
  "vertical-clipping": "Visual",
  "cta-overflow": "Visual",
  "wrong-direction": "Locale",
  "rtl-icon-order": "RTL",
  "raw-translation-key": "Content",
  "font-coverage": "Font",
  "line-breaking": "Visual",
  "placeholder-mismatch": "Integrity",
  "glossary-violation": "Linguistic",
  "wrong-page-lang": "Metadata",
};

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
      <span className="bf-mark" aria-hidden="true">
        <i />
        <b>✓</b>
      </span>
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

function LanguageStream() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % localeSpecimens.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="language-orbit" aria-label="Rotating multilingual specimen">
      <div className="orbit-rings" />
      <div className="orbit-core">
        <span>{localeSpecimens[index][0]}</span>
        <strong key={localeSpecimens[index][0]}>
          {localeSpecimens[index][1]}
        </strong>
        <small>{localeSpecimens[index][2]} · rendered specimen</small>
      </div>
      {localeSpecimens.map(([locale], specimenIndex) => (
        <i
          className={specimenIndex === index ? "active" : ""}
          style={{ "--orbit-index": specimenIndex } as React.CSSProperties}
          key={locale}
        >
          {locale}
        </i>
      ))}
      <div className="scan-arc" />
    </div>
  );
}

function ProofConsole() {
  const issues = baselineScan.issues.slice(0, 5);
  return (
    <div className="hero-console">
      <div className="console-bar">
        <span className="traffic-lights">● ● ●</span>
        <code>atlaspay.local / checkout / es-MX</code>
        <b>RECORDED_REPLAY</b>
      </div>
      <div className="console-body">
        <aside>
          <small>PIPELINE</small>
          {["Discover", "Render", "Stress", "Repair", "Verify"].map(
            (step, index) => (
              <div key={step} className={index < 4 ? "done" : "current"}>
                <i>{index < 4 ? "✓" : "5"}</i>
                <span>{step}</span>
              </div>
            ),
          )}
        </aside>
        <div className="console-preview">
          <div className="preview-nav">
            <b>AtlasPay</b>
            <span>es-MX · 390×844</span>
          </div>
          <small>PAGOS GLOBALES</small>
          <h3>Finalizar compra</h3>
          <p>Envía dinero a cualquier lugar con total claridad.</p>
          <button>Pagar £1,299.50</button>
          <div className="annotation-line" />
        </div>
        <div className="console-evidence">
          <span>VERIFIED EVIDENCE</span>
          <b>{issues[4].issueId}</b>
          <h4>{issues[4].ruleId.replaceAll("-", " ")}</h4>
          <p>{issues[4].description}</p>
          <code>{issues[4].deterministicPredicate}</code>
          <small>confidence · verified</small>
        </div>
      </div>
      <div className="console-command">
        <span>$</span>
        <code>bhashafix verify --changed-only</code>
        <b>10 → 0 · EN-GB PASS</b>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [url, setUrl] = useState("");
  return (
    <main className="landing-shell">
      <Header />
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> OPEN-SOURCE LOCALISATION RELEASE ENGINEERING
          </span>
          <h1>
            Every language.
            <br />
            Every viewport.
            <br />
            <em>Evidence before release.</em>
          </h1>
          <p>
            Paste a website and find localisation, layout, accessibility and
            language-quality failures before users do.
          </p>
          <form
            className="url-launcher"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.href = `/scan/new?url=${encodeURIComponent(url)}&autorun=1`;
            }}
          >
            <span aria-hidden="true">⌁</span>
            <input
              type="url"
              placeholder="Paste a public HTTPS website URL"
              aria-label="Public website URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
            <button type="submit">Run real scan →</button>
          </form>
          <div className="hero-actions">
            <Link className="text-action" href="/demo/atlaspay">
              ▶ Try the guided demo
            </Link>
            <Link className="text-action" href="/integrations/cli">
              ›_ Run locally with CLI
            </Link>
            <Link className="text-action" href="/integrations/mcp">
              ◇ Connect through MCP
            </Link>
          </div>
          <div className="proof-line">
            <span>✓</span>
            Public URL mode diagnoses served pages. Repository access is
            required to prepare source repairs.
          </div>
        </div>
        <LanguageStream />
      </section>

      <section className="guided-proof">
        <header>
          <span>GUIDED PRODUCT PROOF</span>
          <strong>AtlasPay fixture · genuine recorded artifacts</strong>
          <Link href="/demo/atlaspay">Open guided proof →</Link>
        </header>
        <div className="proof-ribbon">
          <div>
            <span>RECORDED REPLAY · BASELINE</span>
            <strong>{repairProof.baselineBlocking}</strong>
            <small>verified failures</small>
          </div>
          <div className="ribbon-flow">
            <i />
            <span>IDENTICAL TESTS</span>
            <i />
          </div>
          <div>
            <span>RECORDED REPLAY · FINAL</span>
            <strong className="green">{repairProof.finalBlocking}</strong>
            <small>blocking failures</small>
          </div>
          <div className="regression-seal">
            <b>✓</b>
            <span>
              SOURCE LOCALE
              <strong>REGRESSION {repairProof.sourceLocaleRegression}</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="product-story">
        <div className="section-intro">
          <span>THE SPECIALISED HARNESS</span>
          <h2>
            AI translates the strings.
            <br />
            <em>BhashaFix tests the product.</em>
          </h2>
          <p>
            General coding agents reason broadly. BhashaFix gives them browser
            evidence, locale constraints, terminology, memory and pass/fail
            verification.
          </p>
        </div>
        <ProofConsole />
      </section>

      <section className="workflow-section">
        <div className="section-intro compact">
          <span>ONE ENGINE · FOUR SURFACES</span>
          <h2>Use the same truth everywhere.</h2>
        </div>
        <div className="surface-grid">
          {[
            ["Web", "Review routes, locales, screenshots and bounded repairs.", "/scan"],
            ["CLI", "Gate releases locally with stable exit codes and JSON.", "/docs#cli"],
            ["MCP", "Give coding agents strict evidence and repair tools.", "/integrations"],
            ["CI", "Upload reports, screenshots, SARIF and JUnit artifacts.", "/integrations#ci"],
          ].map(([title, body, href], index) => (
            <Link href={href} key={title} className="surface-card">
              <span>0{index + 1}</span>
              <i>{["⌁", "›_", "◇", "✓"][index]}</i>
              <h3>{title}</h3>
              <p>{body}</p>
              <b>Explore →</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="locale-matrix">
        <div className="section-intro compact">
          <span>LOCALE-AGNOSTIC BY DESIGN</span>
          <h2>Standards, scripts and evidence.</h2>
          <p>
            The representative registry spans Latin, Cyrillic, Arabic, Hebrew,
            Persian, Devanagari, Bengali, Tamil, Ethiopic, Han, Japanese,
            Korean, Thai, Vietnamese and Indonesian.
          </p>
        </div>
        <div className="script-stream" aria-label="Representative locales">
          {[
            "en-GB",
            "hi-IN",
            "ta-IN",
            "ar-SA",
            "he-IL",
            "fa-IR",
            "bn-BD",
            "zh-Hans-CN",
            "zh-Hant-TW",
            "ja-JP",
            "ko-KR",
            "th-TH",
            "uk-UA",
            "am-ET",
            "vi-VN",
            "id-ID",
          ].map((locale) => (
            <span key={locale}>{locale}</span>
          ))}
        </div>
        <TrustClaim />
      </section>

      <section className="landing-cta">
        <div>
          <span>SHIP THE RENDERED PRODUCT</span>
          <h2>
            Test. Repair.
            <br />
            <em>Prove it.</em>
          </h2>
        </div>
        <div>
          <Link className="button" href="/scan/new">
            Start a scan →
          </Link>
          <Link className="button button-secondary" href="/scan/atlaspay-replay/report">
            View 10 → 0 proof
          </Link>
        </div>
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

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-page">
      <Header />
      {children}
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

type LiveScanResult = {
  scanId: string;
  origin: "LIVE_PUBLIC_SCAN";
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
    origin: "LIVE_PUBLIC_SCAN";
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
            (item as LiveScanResult).origin === "LIVE_PUBLIC_SCAN" &&
            typeof (item as LiveScanResult).scanId === "string",
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
  const steps = ["Target", "Locales", "Coverage", "Guardrails", "Summary"];
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
            <span>START WITH THE TRUTH</span>
            <h1>Check a real public website.</h1>
            <p>
              This scan runs here now. Browser screenshots, accessibility and
              source repairs run locally where Playwright and your repository
              are available.
            </p>
          </div>

          <ScanModeSwitcher target={target} setTarget={setTarget} />

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
                {running ? "Checking the real site…" : "Run real scan →"}
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
                ["public", "Public URL", "Hosted crawl with SSRF, redirect and response limits.", "◎"],
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
            <div className="coverage-grid">
              {[
                ["Routes", "Sitemap + internal links", "5 max for this run"],
                ["Viewports", "390×844 · 768×1024 · 1440×900", "All selected"],
                ["Browsers", "Chromium", "Firefox/WebKit optional"],
                ["Themes", "Light · Dark", "Both selected"],
                ["Accessibility", "Keyboard · labels · serious axe checks", "Enabled"],
                ["Stress", "Expansion · RTL · tall glyph · no-space", "Enabled"],
              ].map(([title, body, status]) => (
                <label key={title} className="coverage-option">
                  <input type="checkbox" defaultChecked />
                  <span>
                    <strong>{title}</strong>
                    <small>{body}</small>
                  </span>
                  <b>{status}</b>
                </label>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="guardrail-grid">
              <label className="field">
                Maximum pages
                <input type="number" defaultValue="20" min="1" max="100" />
              </label>
              <label className="field">
                Crawl depth
                <input type="number" defaultValue="2" min="0" max="5" />
              </label>
              <label className="field">
                Requests per second
                <input type="number" defaultValue="2" min="0.2" max="10" />
              </label>
              <label className="field">
                Repair mode
                <select defaultValue="prepare">
                  <option>suggest</option>
                  <option value="prepare">prepare</option>
                  <option>apply</option>
                </select>
              </label>
              <label className="field wide">
                Path allowlist
                <textarea defaultValue={"src/locales/**\nsrc/styles/**"} />
              </label>
              <label className="coverage-option wide">
                <input type="checkbox" defaultChecked />
                <span>
                  <strong>Sensitive-data exclusion</strong>
                  <small>Redact tokens, secrets and personal form values.</small>
                </span>
                <b>Required</b>
              </label>
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
                <strong>3 viewports · 2 themes · Chromium · accessibility</strong>
              </div>
              <div>
                <small>POLICY</small>
                <strong>No-AI · prepare repairs · bounded crawl</strong>
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
              <button
                className="button"
                onClick={() => void run()}
                disabled={running}
              >
                {running ? "Inspecting target…" : "Run scan →"}
              </button>
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
        ["public", "Public website", "Real hosted HTTP scan"],
        ["local", "Local product", "Full browser + repair"],
        ["demo", "Verified demo", "Real 10 → 0 proof"],
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

function LivePublicScanResult({ result }: { result: LiveScanResult }) {
  const completed = new Date(result.completedAt);
  return (
    <section className="live-scan-result" aria-labelledby="live-result-title">
      <header>
        <div>
          <span className="live-badge">{result.origin} · REAL HTTP RESPONSES</span>
          <h2 id="live-result-title">Here is exactly what BhashaFix found.</h2>
          <p>
            {result.target} · completed{" "}
            {Number.isNaN(completed.getTime())
              ? result.completedAt
              : completed.toLocaleTimeString()}
          </p>
        </div>
        <div className="live-result-verdict">
          <small>BLOCKING IN CHECKS RUN</small>
          <strong>{result.summary.verifiedBlocking}</strong>
          <span>
            {result.summary.verifiedBlocking === 0
              ? "No blockers found — not a release guarantee"
              : "Inspect the evidence below"}
          </span>
        </div>
      </header>

      <div className="live-metrics">
        <article>
          <small>REAL ROUTES CHECKED</small>
          <strong>{result.summary.routesChecked}</strong>
          <span>of {result.scope.maxRoutes} maximum</span>
        </article>
        <article>
          <small>VISIBLE STRINGS</small>
          <strong>{result.summary.stringsExtracted}</strong>
          <span>static HTML extraction</span>
        </article>
        <article>
          <small>WARNINGS</small>
          <strong>{result.summary.warnings}</strong>
          <span>verified predicates</span>
        </article>
        <article>
          <small>ROBOTS POLICY</small>
          <strong>{result.robots.checked ? "READ" : "N/A"}</strong>
          <span>{result.robots.skippedRoutes} route(s) skipped</span>
        </article>
      </div>

      <div className="live-result-section">
        <div className="live-section-title">
          <span>01</span>
          <div>
            <h3>Routes actually fetched</h3>
            <p>Every row below came from a real bounded HTTP response.</p>
          </div>
        </div>
        <div className="live-route-table" role="table" aria-label="Fetched routes">
          <div className="live-route-head" role="row">
            <span role="columnheader">Route</span>
            <span role="columnheader">HTTP</span>
            <span role="columnheader">Lang / dir</span>
            <span role="columnheader">Strings</span>
            <span role="columnheader">Findings</span>
          </div>
          {result.routes.map((route) => (
            <div className="live-route-row" role="row" key={route.url}>
              <a href={route.url} target="_blank" rel="noreferrer" role="cell">
                {route.route}
              </a>
              <span role="cell" className={route.status < 400 ? "green" : "red"}>
                {route.status}
              </span>
              <span role="cell">
                {route.declaredLang ?? "missing"} / {route.declaredDir ?? "auto"}
              </span>
              <span role="cell">{route.strings}</span>
              <strong role="cell">{route.issueCount}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="live-result-section">
        <div className="live-section-title">
          <span>02</span>
          <div>
            <h3>Evidence-backed findings</h3>
            <p>
              Deterministic means the measured predicate failed—not that a
              model preferred different wording.
            </p>
          </div>
        </div>
        {result.issues.length === 0 ? (
          <div className="no-live-issues">
            <b>✓ No issues found in the checks that ran.</b>
            <span>
              This does not cover browser layout, accessibility, translations
              generated by JavaScript or authenticated routes.
            </span>
          </div>
        ) : (
          <div className="live-issue-list">
            {result.issues.map((issue) => (
              <article key={issue.issueId}>
                <div>
                  <span className={`severity-dot ${issue.severity}`} />
                  <small>{issue.severity} · verified</small>
                  <code>{issue.issueId}</code>
                </div>
                <h4>{issue.ruleId.replaceAll("-", " ")}</h4>
                <p>{issue.description}</p>
                <dl>
                  <div>
                    <dt>Route</dt>
                    <dd>{issue.route}</dd>
                  </div>
                  <div>
                    <dt>Selector</dt>
                    <dd>{issue.selector}</dd>
                  </div>
                  <div>
                    <dt>Measured evidence</dt>
                    <dd>{issue.measuredEvidence}</dd>
                  </div>
                  <div>
                    <dt>Why it matters</dt>
                    <dd>{issue.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt>Predicate</dt>
                    <dd>{issue.deterministicPredicate}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="truth-ledger">
        <div>
          <span>03</span>
          <h3>What ran</h3>
          <ul>
            {result.checksRun.map((check) => (
              <li key={check}>✓ {check}</li>
            ))}
          </ul>
        </div>
        <div>
          <span>04</span>
          <h3>What did not run here</h3>
          <ul>
            {result.notRun.map((check) => (
              <li key={check}>— {check}</li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="live-result-footer">
        <div>
          <strong>Want visual and translation proof?</strong>
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
          <Link className="button" href="/docs#repository-scan">
            Run full local scan →
          </Link>
          <Link className="button button-secondary" href="/playground">
            Try synthetic stress preview
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

function PipelineRail() {
  const stages = [
    ["Discover", `${baselineScan.routesDiscovered.length} routes`, "✓"],
    ["Extract", "34 strings", "✓"],
    ["Render", "30 cases", "✓"],
    ["Stress", "8 modes", "✓"],
    ["Diagnose", `${baselineScan.issues.length} issues`, "✓"],
    ["Repair", "3 files", "✓"],
    ["Verify", `${repairProof.finalBlocking} blocking`, "✓"],
    ["Prove", "8 artifacts", "✓"],
  ];
  return (
    <aside className="pipeline-rail">
      <span>PIPELINE</span>
      {stages.map(([name, detail, state]) => (
        <div key={name}>
          <i>{state}</i>
          <span>
            <strong>{name}</strong>
            <small>{detail}</small>
          </span>
        </div>
      ))}
      <section>
        <small>MODE</small>
        <strong>No-AI deterministic</strong>
        <p>No provider key required.</p>
      </section>
    </aside>
  );
}

function RouteLocaleMatrix() {
  const routes = ["/", "/pricing", "/dashboard", "/checkout", "/settings"];
  const locales = ["hi", "de", "ar", "he", "ja", "zh", "th", "fr", "es", "en"];
  return (
    <div className="matrix">
      <div className="matrix-head">
        <span>ROUTE × LOCALE</span>
        {locales.map((locale) => (
          <b key={locale}>{locale}</b>
        ))}
      </div>
      {routes.map((route, routeIndex) => (
        <div className="matrix-row" key={route}>
          <strong>{route}</strong>
          {locales.map((locale, localeIndex) => {
            const issue = baselineScan.issues.find(
              (item) =>
                item.route === route &&
                item.locale.toLowerCase().startsWith(locale),
            );
            return (
              <i
                className={issue ? "fixed" : "pass"}
                title={issue ? `${issue.issueId} repaired` : "Passed"}
                key={`${routeIndex}-${localeIndex}`}
              >
                {issue ? "●" : "✓"}
              </i>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EvidenceCard({ issueIndex = 0 }: { issueIndex?: number }) {
  const issue = baselineScan.issues[issueIndex] ?? baselineScan.issues[0];
  return (
    <aside className="evidence-card">
      <div>
        <span>{issueTone[issue.ruleId] ?? "Issue"}</span>
        <b>{issue.issueId}</b>
      </div>
      <h2>{issue.ruleId.replaceAll("-", " ")}</h2>
      <p>{issue.description}</p>
      <dl>
        <div>
          <dt>Locale</dt>
          <dd>{issue.locale}</dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{issue.route}</dd>
        </div>
        <div>
          <dt>Viewport</dt>
          <dd>{issue.viewport.width} × {issue.viewport.height}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd className="green">{issue.confidence}</dd>
        </div>
      </dl>
      <section>
        <small>MEASURED EVIDENCE</small>
        <code>{JSON.stringify(issue.measuredEvidence, null, 2)}</code>
      </section>
      <section>
        <small>DETERMINISTIC PREDICATE</small>
        <code>{issue.deterministicPredicate}</code>
      </section>
      <section>
        <small>SOURCE HINT</small>
        <code>{issue.sourceHint}</code>
      </section>
      <Link href="/scan/atlaspay-replay/repairs">Inspect bounded repair →</Link>
    </aside>
  );
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
          <div className="live-metrics">
            <article><small>ACTUAL ROUTES</small><strong>{result.summary.routesChecked}</strong><span>bounded same-origin HTTP</span></article>
            <article><small>VISIBLE STRINGS</small><strong>{result.summary.stringsExtracted}</strong><span>static HTML extraction</span></article>
            <article><small>BLOCKING</small><strong>{result.summary.verifiedBlocking}</strong><span>verified predicates</span></article>
            <article><small>WARNINGS</small><strong>{result.summary.warnings}</strong><span>verified predicates</span></article>
          </div>
          <div className="truth-ledger">
            <div><span>ACTUAL EXECUTION</span><h3>Checks that ran</h3><ul>{result.checksRun.map((item) => <li key={item}>✓ {item}</li>)}</ul></div>
            <div><span>HONEST BOUNDARY</span><h3>Checks not run</h3><ul>{result.notRun.map((item) => <li key={item}>— {item}</li>)}</ul></div>
          </div>
        </section>
      )}

      {section === "Routes" && (
        <section className="live-workspace live-result-section">
          <div className="live-section-title"><span>ROUTES</span><div><h3>Responses actually fetched</h3><p>No route below is synthetic or borrowed from AtlasPay.</p></div></div>
          <div className="live-route-table" role="table" aria-label="Fetched routes">
            <div className="live-route-head" role="row"><span>Route</span><span>HTTP</span><span>Lang / dir</span><span>Strings</span><span>Findings</span></div>
            {result.routes.map((route) => (
              <div className="live-route-row" role="row" key={route.url}>
                <a href={route.url} target="_blank" rel="noreferrer">{route.route}</a>
                <span>{route.status}</span><span>{route.declaredLang ?? "missing"} / {route.declaredDir ?? "auto"}</span>
                <span>{route.strings}</span><strong>{route.issueCount}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {["Issues", "Linguistic", "Accessibility"].includes(section) && (
        <section className="live-workspace live-result-section">
          <div className="live-section-title">
            <span>{section.toUpperCase()}</span>
            <div>
              <h3>{section === "Issues" ? "Evidence-backed findings" : `${section} findings in the checks that ran`}</h3>
              <p>{section === "Accessibility" ? "Static title and image-alt checks ran. Axe and keyboard execution require the local browser scanner." : "Every finding carries a stable rule, user impact and measured predicate."}</p>
            </div>
          </div>
          {visibleIssues.length === 0 ? (
            <div className="no-live-issues"><b>✓ No matching findings.</b><span>This is limited to the checks listed for this scan.</span></div>
          ) : (
            <div className="live-issue-list">
              {visibleIssues.map((issue) => (
                <article key={issue.issueId}>
                  <div><span className={`severity-dot ${issue.severity}`} /><small>{issue.severity} · {issue.confidence}</small><code>{issue.issueId}</code></div>
                  <h4>{issue.ruleId.replaceAll("-", " ")}</h4>
                  <p>{issue.description}</p>
                  <dl>
                    <div><dt>Why it matters</dt><dd>{issue.whyItMatters}</dd></div>
                    <div><dt>Evidence</dt><dd>{issue.measuredEvidence}</dd></div>
                    <div><dt>Action</dt><dd>{issue.recommendedAction}</dd></div>
                    <div><dt>Source hint</dt><dd>Not available for a public URL scan</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
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
          <div className="report-score"><span>ORIGIN</span><strong className="origin-score">LIVE</strong><small>Static HTTP evidence</small></div>
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
  const [selectedIssue, setSelectedIssue] = useState(0);
  const [locale, setLocale] = useState("ar-SA");
  const [device, setDevice] = useState("390×844");
  const [theme, setTheme] = useState("dark");
  const [fixed, setFixed] = useState(false);
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
              <select value={device} onChange={(event) => setDevice(event.target.value)}>
                <option>390×844</option>
                <option>768×1024</option>
                <option>1440×900</option>
              </select>
              <select value={locale} onChange={(event) => setLocale(event.target.value)}>
                {["hi-IN", "de-DE", "ar-SA", "he-IL", "ja-JP", "zh-Hans-CN", "th-TH", "fr-FR", "es-MX", "en-GB"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select value={theme} onChange={(event) => setTheme(event.target.value)}>
                <option>dark</option>
                <option>light</option>
              </select>
              <button onClick={() => setFixed((value) => !value)}>
                {fixed ? "After repair" : "Before repair"} ↔
              </button>
            </div>
            <div className={`browser-stage ${theme}`}>
              <div className="browser-chrome">
                <span>● ● ●</span>
                <code>atlaspay.local/{locale}/dashboard</code>
                <b>{device}</b>
              </div>
              <iframe
                src={`/atlaspay/${locale}/dashboard?state=${fixed ? "fixed" : "broken"}`}
                title={`AtlasPay ${locale} ${fixed ? "fixed" : "broken"} preview`}
              />
              <div className={`frame-verdict ${fixed ? "pass" : "fail"}`}>
                {fixed ? "✓ IDENTICAL PREDICATE PASS" : "! VERIFIED FAILURE"}
              </div>
            </div>
            <RouteLocaleMatrix />
          </div>
          <EvidenceCard issueIndex={selectedIssue} />
          <div className="real-console">
            {[
              ["13:07:12.044", "discover", "5 routes from configured route list", "0"],
              ["13:07:12.181", "render", "Chromium · 390×844 · ar-SA", "0"],
              ["13:07:12.296", "diagnose", "BF-LOC-AR-003 wrong-direction", "1"],
              ["13:07:12.411", "verify", "10 → 0 · source en-GB PASS", "0"],
            ].map(([time, stage, event, exit]) => (
              <button
                onClick={() =>
                  setSelectedIssue(
                    Math.min(
                      baselineScan.issues.length - 1,
                      stage === "diagnose" ? 2 : selectedIssue,
                    ),
                  )
                }
                key={time}
              >
                <time>{time}</time>
                <b>{stage}</b>
                <span>{event}</span>
                <code>exit {exit}</code>
              </button>
            ))}
          </div>
        </section>
      )}
      {section === "Routes" && <ReplayRoutesView />}
      {section === "Issues" && <IssuesView selected={selectedIssue} onSelect={setSelectedIssue} />}
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
          <h2>No accessibility regression after repair.</h2>
          <p>
            The AtlasPay verification run recorded zero new serious axe
            findings, zero console-error delta and keyboard-operable controls.
          </p>
        </div>
        <span className="mode-badge">VERIFIED</span>
      </div>
      <div className="visual-metrics">
        {[
          ["Serious axe findings", "0", "PASS"],
          ["Critical axe findings", "0", "PASS"],
          ["Console error delta", "0", "PASS"],
          ["Keyboard controls", "operable", "PASS"],
          ["Source-locale regression", repairProof.sourceLocaleRegression, "PASS"],
        ].map(([label, value, status]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong><b>{status}</b></div>
        ))}
      </div>
      <p className="trust-claim">
        This evidence belongs to the bundled AtlasPay browser run. It is not
        carried into unrelated public URL scans.
      </p>
    </section>
  );
}

function IssuesView({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect(index: number): void;
}) {
  const [filter, setFilter] = useState<"all" | "blocking" | "review">("all");
  const [query, setQuery] = useState("");
  const rows = baselineScan.issues
    .map((issue, index) => ({ issue, index }))
    .filter(({ issue }) => {
      if (filter === "blocking" && issue.severity !== "blocking") return false;
      if (filter === "review" && !issue.humanReviewRequired) return false;
      return [issue.issueId, issue.locale, issue.route, issue.ruleId]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    });
  return (
    <section className="issues-layout">
      <div className="issue-browser">
        <div className="issue-filters">
          <button className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {baselineScan.issues.length}</button>
          <button className={filter === "blocking" ? "active" : ""} aria-pressed={filter === "blocking"} onClick={() => setFilter("blocking")}>Blocking {baselineScan.issues.filter((issue) => issue.severity === "blocking").length}</button>
          <button className={filter === "review" ? "active" : ""} aria-pressed={filter === "review"} onClick={() => setFilter("review")}>Human review {baselineScan.issues.filter((issue) => issue.humanReviewRequired).length}</button>
          <input aria-label="Filter issues" placeholder="Filter locale, route or issue…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        {rows.map(({ issue, index }) => (
          <button
            className={index === selected ? "active" : ""}
            onClick={() => onSelect(index)}
            key={issue.issueId}
          >
            <i>!</i>
            <span>
              <strong>{issue.ruleId.replaceAll("-", " ")}</strong>
              <small>{issue.issueId} · {issue.route}</small>
            </span>
            <b>{issue.locale}</b>
            <em>{issueTone[issue.ruleId]}</em>
          </button>
        ))}
        {rows.length === 0 && <p className="table-empty">No issues match this filter.</p>}
      </div>
      <EvidenceCard issueIndex={selected} />
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
          ["Viewport overflow", "0px", "PASS"],
          ["Element clipping", "0", "PASS"],
          ["Direction", locale.startsWith("ar") || locale.startsWith("he") ? "rtl" : "ltr", "PASS"],
          ["Console errors", "0", "PASS"],
          ["Accessibility delta", "0", "PASS"],
        ].map(([label, value, status]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong><b>{status}</b></div>
        ))}
      </div>
    </section>
  );
}

function RepairsView() {
  const [patch, setPatch] = useState("Loading generated patch…");
  const [mode, setMode] = useState<"suggest" | "prepare" | "apply">("prepare");
  useEffect(() => {
    fetch("/replay/repair.patch")
      .then((response) => response.text())
      .then(setPatch)
      .catch(() => setPatch("Generated patch unavailable."));
  }, []);
  return (
    <section className="repairs-page">
      <div className="review-heading">
        <div>
          <span>BOUNDED REPAIR</span>
          <h2>Diff first. Mutation only by policy.</h2>
          <p>Ten issue IDs resolve to ten operations across three allowlisted fixture files.</p>
        </div>
        <div className="segmented">
          {(["suggest", "prepare", "apply"] as const).map((item) => (
            <button className={mode === item ? "active" : ""} onClick={() => setMode(item)} key={item}>{item}</button>
          ))}
        </div>
      </div>
      <div className="repair-layout">
        <aside>
          <span>POLICY CHECKS</span>
          {[
            "Explicit scan ID",
            "10 explicit issue IDs",
            "3 paths allowlisted",
            "No symlinks",
            "No business logic",
            "Rollback written",
            "No automatic commit",
          ].map((item) => <div key={item}><i>✓</i>{item}</div>)}
          <small>Mode selected</small>
          <strong>{mode}</strong>
        </aside>
        <pre className="patch-viewer">{patch}</pre>
      </div>
      <div className="repair-verdict">
        <span>✓</span>
        <div><strong>Verification accepted the repair</strong><p>Original predicates pass · source locale PASS · no new blocking issue · diff within policy</p></div>
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
  const readiness =
    repairProof.finalBlocking === 0 &&
    repairProof.sourceLocaleRegression === "PASS"
      ? 100
      : 0;
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
  return (
    <section className="report-page">
      <div className="report-score">
        <span>RELEASE READINESS</span>
        <strong>{readiness}</strong>
        <small>Verified deterministic gate</small>
      </div>
      <div className="report-summary">
        <span>FINAL VERDICT</span>
        <h2>Ready for engineering release.</h2>
        <p>
          The replay proves all original blocking predicates pass after a bounded
          repair. Linguistic preference still requires human review when present.
        </p>
        <div>
          {[
            ["Blocking issues", String(repairProof.finalBlocking), repairProof.finalBlocking === 0 ? "PASS" : "FAIL"],
            ["Warnings", String(finalIssues.filter((issue) => issue.severity === "warning").length), "PASS"],
            ["Human review", String(finalIssues.filter((issue) => issue.humanReviewRequired).length), "CLEAR"],
            ["Route coverage", `${replayReport.scan.routesDiscovered.length} / ${baselineScan.routesDiscovered.length}`, "100%"],
            ["Locale coverage", `${replayReport.scan.localesTested.length} / ${baselineScan.localesTested.length}`, "100%"],
            ["Source regression", repairProof.sourceLocaleRegression, "✓"],
            ["Accessibility", repairProof.accessibilityRegression ? "REGRESSION" : "PASS", "✓"],
            ["Console errors", String(repairProof.consoleErrorDelta), "✓"],
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
    { id: "seed-memory-ar", source: "Available balance", target: "الرصيد المتاح", locale: "ar-SA", context: "dashboard-card", provider: "provider:openai", approved: false, match: "context" },
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
          <pre>{`pnpm bhashafix scan \\\n  --url http://localhost:3000 \\\n  --source-locale en-GB \\\n  --locales hi-IN,ar-SA,ja-JP,de-DE`}</pre>
        </article>
        <article>
          <i>◇</i><span>MCP · STDIO</span><h2>@bhashafix/mcp</h2>
          <p>Eighteen strict tools, seven resource patterns and five workflow prompts for coding agents.</p>
          <pre>{`{\n  "mcpServers": {\n    "bhashafix": {\n      "command": "node",\n      "args": ["packages/mcp/dist/server.js"]\n    }\n  }\n}`}</pre>
        </article>
        <article id="ci">
          <i>✓</i><span>GITHUB ACTIONS</span><h2>Release gate</h2>
          <p>Installs Chromium, runs the identical checks, uploads proof, SARIF, JUnit and screenshots.</p>
          <pre>{`- run: pnpm install --frozen-lockfile\n- run: pnpm exec playwright install chromium\n- run: pnpm bhashafix ci --fail-on blocking`}</pre>
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

export function IntegrationDetailPage({
  integration,
}: {
  integration: "cli" | "mcp" | "ci";
}) {
  const content = {
    cli: {
      eyebrow: "LOCAL AND CI EXECUTION",
      title: "Run the full browser scanner locally.",
      body: "The CLI keeps repository source and credentials on your machine, renders with Playwright and returns stable exit codes.",
      command: `pnpm bhashafix scan --url http://localhost:3000 \\\n+  --source-locale en-GB --locales hi-IN,ar-SA,ja-JP,de-DE \\\n+  --viewports mobile,desktop --no-ai`,
    },
    mcp: {
      eyebrow: "STRUCTURED AGENT INTEGRATION",
      title: "Give coding agents evidence, not guesses.",
      body: "The local STDIO server exposes strict scan, issue, report, dry-run repair and identical-verification tools.",
      command: `{\n  "mcpServers": {\n    "bhashafix": {\n      "command": "node",\n      "args": ["packages/mcp/dist/server.js"]\n    }\n  }\n}`,
    },
    ci: {
      eyebrow: "SEVERITY-AWARE RELEASE GATE",
      title: "Run identical checks in GitHub Actions.",
      body: "The workflow installs Chromium, runs the shared engine, uploads evidence and fails only at the configured threshold.",
      command: `pnpm install --frozen-lockfile\npnpm exec playwright install chromium\npnpm bhashafix ci --config .bhashafix/config.yml --fail-on blocking`,
    },
  }[integration];
  return (
    <AppShell>
      <section className="docs-layout integration-detail">
        <aside>
          <Link href="/integrations/cli">CLI</Link>
          <Link href="/integrations/mcp">MCP</Link>
          <Link href="/integrations/ci">CI</Link>
        </aside>
        <article>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p className="docs-lede">{content.body}</p>
          <section><h2>Working setup</h2><pre>{content.command}</pre></section>
          <section><h2>Truth boundary</h2><p>{integration === "cli" ? "Local browser support depends on installed Playwright runtimes. Provider-backed linguistic review remains optional." : integration === "mcp" ? "STDIO is the supported MVP transport. Repair tools require an explicit scan, issue IDs, allowlisted paths and dry-run review." : "The repository includes the workflow, but no remote status badge is shown until an authenticated GitHub run exists."}</p></section>
          <Link className="button" href="/docs">Read full documentation →</Link>
        </article>
      </section>
    </AppShell>
  );
}

export function DemoPage() {
  return (
    <AppShell>
      <section className="demo-index">
        <span>GUIDED_DEMO</span>
        <h1>See a real repair proof without pretending it is your website.</h1>
        <p>
          AtlasPay is a bundled multilingual fixture with ten deterministic
          failures, a bounded source patch and an identical-test rerun.
        </p>
        <div className="demo-proof-strip">
          <article><small>BASELINE</small><strong>{repairProof.baselineBlocking}</strong><span>verified blocking predicates</span></article>
          <i>→</i>
          <article><small>FINAL</small><strong>{repairProof.finalBlocking}</strong><span>blocking predicates</span></article>
          <article><small>SOURCE LOCALE</small><strong>{repairProof.sourceLocaleRegression}</strong><span>regression result</span></article>
        </div>
        <div className="hero-actions">
          <Link className="button" href="/scan/atlaspay-replay/overview">Open evidence workspace →</Link>
          <Link className="button button-secondary" href="/demo/atlaspay/report">Open proof report</Link>
        </div>
        <p className="trust-claim">Origin shown in exports: RECORDED_REPLAY. The fixture run is genuine; opening this page does not rerun it.</p>
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
          <section id="scope"><h2>Five explicit origins</h2><pre>{`LIVE_PUBLIC_SCAN\nLOCAL_REPOSITORY_SCAN\nGUIDED_DEMO\nRECORDED_REPLAY\nSYNTHETIC_LOCALISATION_PREVIEW`}</pre></section>
          <section id="local-data"><h2>What remains local</h2><p>Repository files, Playwright storage state, provider secrets and repair rollback data remain in the local CLI environment unless the user explicitly chooses another boundary.</p></section>
          <section id="providers"><h2>What reaches model providers</h2><p>Nothing in no-AI mode. When configured, only minimised translatable content and context are sent; credentials, hidden form values and detected secrets are excluded.</p></section>
          <section id="evidence"><h2>How evidence is generated</h2><p>Deterministic rules store the measured value, expected value and predicate. Model suggestions remain advisory and carry confidence plus human-review requirements.</p></section>
          <section id="limitations"><h2>Honest limitations</h2><p>The Vercel-hosted path performs bounded static HTTP checks. Full rendered screenshots, axe execution and source repair require the local CLI or a configured browser worker.</p></section>
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
          <section id="quick-start"><h2>Ten-minute quick start</h2><pre>{`pnpm install\npnpm bhashafix init\npnpm demo:reset\npnpm demo:scan\npnpm demo:repair\npnpm demo:prove`}</pre></section>
          <section id="website-scan"><h2>Website scan</h2><p>Hosted scans accept public HTTP and HTTPS targets, respect crawl limits and reject private, loopback and metadata destinations.</p><pre>{`pnpm bhashafix scan --url https://example.com \\\n  --source-locale en-GB --locales ar-SA,ja-JP`}</pre></section>
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
