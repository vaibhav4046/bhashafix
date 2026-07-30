"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import baselineScan from "../public/replay/baseline-scan.json";
import repairProof from "../public/replay/repair-proof.json";
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
  ["Overview", ""],
  ["Issues", "/issues"],
  ["Linguistic", "/linguistic"],
  ["Visual", "/visual"],
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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("bhashafix-theme");
    const initial = stored === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = initial;
  }, []);
  const toggle = () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("bhashafix-theme", next);
  };
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}
    >
      <span>{theme === "dark" ? "☼" : "◐"}</span>
      {theme}
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
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % localeSpecimens.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="language-orbit" aria-live="polite">
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
        <b>REPLAY</b>
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
          <h4>{issues[4].category.replaceAll("-", " ")}</h4>
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
            <i /> OPEN-SOURCE LOCALISATION ENGINEERING
          </span>
          <h1>
            Every language.
            <br />
            Every viewport.
            <br />
            <em>Evidence before release.</em>
          </h1>
          <p>
            BhashaFix scans translated products for linguistic, visual,
            accessibility and locale failures—then verifies the repair.
          </p>
          <form
            className="url-launcher"
            onSubmit={(event) => {
              event.preventDefault();
              window.location.href = `/scan/new${url ? `?url=${encodeURIComponent(url)}` : ""}`;
            }}
          >
            <span aria-hidden="true">⌁</span>
            <input
              type="url"
              placeholder="Paste a public HTTPS website URL"
              aria-label="Public website URL"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <button type="submit">Scan a website →</button>
          </form>
          <div className="hero-actions">
            <Link className="text-action" href="/docs#repository">
              ⌘ Connect a repository
            </Link>
            <Link className="text-action" href="/scan/atlaspay-replay">
              ▶ Open verified replay
            </Link>
          </div>
          <div className="proof-line">
            <span>✓</span>
            Linguistic quality + browser evidence + verified repair
          </div>
        </div>
        <LanguageStream />
      </section>

      <section className="proof-ribbon">
        <div>
          <span>BASELINE</span>
          <strong>10</strong>
          <small>verified failures</small>
        </div>
        <div className="ribbon-flow">
          <i />
          <span>IDENTICAL TESTS</span>
          <i />
        </div>
        <div>
          <span>FINAL</span>
          <strong className="green">0</strong>
          <small>blocking failures</small>
        </div>
        <div className="regression-seal">
          <b>✓</b>
          <span>
            SOURCE LOCALE
            <strong>REGRESSION PASS</strong>
          </span>
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
        <Link href="/docs#security">Trust centre</Link>
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
        <Link href="/scan/atlaspay-replay" className="scan-row">
          <div className="scan-symbol verified">✓</div>
          <div>
            <strong>AtlasPay global release gate</strong>
            <span>Replay of genuine deterministic artifacts</span>
          </div>
          <div>
            <small>ROUTES</small>
            <b>5</b>
          </div>
          <div>
            <small>LOCALES</small>
            <b>10</b>
          </div>
          <div>
            <small>PROOF</small>
            <b className="green">10 → 0</b>
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

export function NewScanPage() {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<"public" | "local" | "demo">("demo");
  const [url, setUrl] = useState("");
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
  const [running, setRunning] = useState(false);
  const [liveResult, setLiveResult] = useState<string | null>(null);
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
  const run = async () => {
    if (target === "demo") {
      window.location.href = "/scan/atlaspay-replay";
      return;
    }
    if (target === "local") {
      setLiveResult(
        "Local repository scans run through the CLI so source and credentials remain on your machine.",
      );
      return;
    }
    setRunning(true);
    setLiveResult(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, sourceLocale, locales }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Scan failed.");
      setLiveResult(
        `Live inspection completed: ${payload.routes.length} route, ${payload.strings} visible strings, ${payload.issues.length} deterministic content findings.`,
      );
    } catch (error) {
      setLiveResult(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };
  return (
    <AppShell>
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
              {target === "public" && (
                <label className="field wide">
                  Public website URL
                  <input
                    type="url"
                    placeholder="Paste a public HTTPS website URL"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </label>
              )}
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
                <strong>{target === "demo" ? "AtlasPay bundled demo" : target === "public" ? url || "Public URL" : "Local repository"}</strong>
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
              {liveResult && <p className="run-result">{liveResult}</p>}
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
              <button className="button" onClick={run} disabled={running}>
                {running ? "Inspecting target…" : "Run scan →"}
              </button>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function ScanHeader({ section }: { section: string }) {
  return (
    <>
      <section className="scan-header">
        <div>
          <Link href="/scan">← Scans</Link>
          <span className="replay-badge">REPLAY · GENUINE ARTIFACTS</span>
          <h1>AtlasPay global release gate</h1>
          <p>
            {baselineScan.scanId} · 5 routes · 10 locales · deterministic mode
          </p>
        </div>
        <div className="scan-status">
          <span>VERIFIED</span>
          <strong>10 → 0</strong>
          <small>source locale PASS</small>
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
            {label === "Issues" && <b>10</b>}
          </Link>
        ))}
      </nav>
    </>
  );
}

function PipelineRail() {
  const stages = [
    ["Discover", "5 routes", "✓"],
    ["Extract", "34 strings", "✓"],
    ["Render", "30 cases", "✓"],
    ["Stress", "8 modes", "✓"],
    ["Diagnose", "10 issues", "✓"],
    ["Repair", "3 files", "✓"],
    ["Verify", "0 blocking", "✓"],
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
        <span>{issueTone[issue.category] ?? "Issue"}</span>
        <b>{issue.issueId}</b>
      </div>
      <h2>{issue.category.replaceAll("-", " ")}</h2>
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

export function ScanWorkspace({ section = "Overview" }: { section?: string }) {
  const [selectedIssue, setSelectedIssue] = useState(0);
  const [locale, setLocale] = useState("ar-SA");
  const [device, setDevice] = useState("390×844");
  const [theme, setTheme] = useState("dark");
  const [fixed, setFixed] = useState(false);
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
      {section === "Issues" && <IssuesView selected={selectedIssue} onSelect={setSelectedIssue} />}
      {section === "Linguistic" && <LinguisticView />}
      {section === "Visual" && <VisualView />}
      {section === "Repairs" && <RepairsView />}
      {section === "Report" && <ReportView />}
    </AppShell>
  );
}

function IssuesView({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect(index: number): void;
}) {
  return (
    <section className="issues-layout">
      <div className="issue-browser">
        <div className="issue-filters">
          <button className="active">All 10</button>
          <button>Blocking 10</button>
          <button>Human review 0</button>
          <input placeholder="Filter locale, route or issue…" />
        </div>
        {baselineScan.issues.map((issue, index) => (
          <button
            className={index === selected ? "active" : ""}
            onClick={() => onSelect(index)}
            key={issue.issueId}
          >
            <i>!</i>
            <span>
              <strong>{issue.category.replaceAll("-", " ")}</strong>
              <small>{issue.issueId} · {issue.route}</small>
            </span>
            <b>{issue.locale}</b>
            <em>{issueTone[issue.category]}</em>
          </button>
        ))}
      </div>
      <EvidenceCard issueIndex={selected} />
    </section>
  );
}

function LinguisticView() {
  const items = baselineScan.issues.filter((issue) =>
    ["placeholder-mismatch", "glossary-violation", "raw-translation-key"].includes(
      issue.category,
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
            <h3>{issue.category.replaceAll("-", " ")}</h3>
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
  const downloads = [
    ["JSON report", "/replay/report.json"],
    ["HTML report", "/replay/report.html"],
    ["SARIF", "/replay/report.sarif"],
    ["JUnit XML", "/replay/junit.xml"],
    ["CSV issues", "/replay/issues.csv"],
    ["Unified patch", "/replay/repair.patch"],
    ["Proof JSON", "/replay/repair-proof.json"],
  ];
  return (
    <section className="report-page">
      <div className="report-score">
        <span>RELEASE READINESS</span>
        <strong>100</strong>
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
            ["Blocking issues", "0", "PASS"],
            ["Warnings", "0", "PASS"],
            ["Human review", "0", "CLEAR"],
            ["Route coverage", "5 / 5", "100%"],
            ["Locale coverage", "10 / 10", "100%"],
            ["Source regression", "PASS", "✓"],
            ["Accessibility", "PASS", "✓"],
            ["Console errors", "0", "✓"],
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
  const [entries, setEntries] = useState([
    { source: "Checkout", locale: "es-MX", approved: "Pagar", domain: "Payments", status: "Approved" },
    { source: "Transfer", locale: "fr-FR", approved: "Virement", domain: "Payments", status: "Approved" },
    { source: "AtlasPay", locale: "*", approved: "Do not translate", domain: "Brand", status: "Protected" },
  ]);
  return (
    <AppShell>
      <section className="page-heading">
        <div><span>TERMINOLOGY</span><h1>Project glossary</h1><p>Approved terms are deterministic constraints, not model preferences.</p></div>
        <button
          className="button"
          onClick={() => setEntries((current) => [...current, { source: "New term", locale: "de-DE", approved: "Review required", domain: "General", status: "Draft" }])}
        >
          Add entry
        </button>
      </section>
      <section className="data-table">
        <header><span>Source term</span><span>Locale</span><span>Approved target</span><span>Domain</span><span>Status</span></header>
        {entries.map((entry, index) => (
          <div key={`${entry.source}-${index}`}>
            <strong>{entry.source}</strong><code>{entry.locale}</code><span>{entry.approved}</span><span>{entry.domain}</span><b>{entry.status}</b>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

export function MemoryPage() {
  const [query, setQuery] = useState("");
  const entries = [
    ["Checkout", "Pagar", "es-MX", "checkout-title", "human", "Approved"],
    ["Send money", "Envoyer de l’argent", "fr-FR", "primary-cta", "human", "Approved"],
    ["Available balance", "الرصيد المتاح", "ar-SA", "dashboard-card", "provider:openai", "Review"],
    ["Global payments", "グローバル決済", "ja-JP", "hero-title", "human", "Approved"],
  ];
  const filtered = entries.filter((entry) =>
    entry.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <AppShell>
      <section className="page-heading">
        <div><span>PROJECT MEMORY</span><h1>Translation memory</h1><p>Exact, normalised and context matches with provenance.</p></div>
        <input className="page-search" placeholder="Search memory…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </section>
      <section className="memory-grid">
        {filtered.map(([source, target, locale, context, provider, status]) => (
          <article key={`${source}-${locale}`}>
            <div><span>{locale}</span><b>{status}</b></div>
            <small>SOURCE</small><strong>{source}</strong>
            <small>TARGET</small><h3>{target}</h3>
            <footer><code>{context}</code><span>{provider}</span></footer>
          </article>
        ))}
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
        <div><span>SYNTHETIC LOCALISATION PREVIEW</span><h1>Stress strings safely</h1><p>Protected tokens, tags, URLs, emails and project terms remain intact.</p></div>
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
          <small>SYNTHETIC LOCALISATION PREVIEW — NOT THE PRODUCTION WEBSITE</small>
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
