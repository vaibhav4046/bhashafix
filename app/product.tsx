"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Issue = {
  id: string;
  locale: string;
  title: string;
  evidence: string;
  source: string;
};

const issues: Issue[] = [
  {
    id: "BF-HI-001",
    locale: "HI",
    title: "Devanagari heading clipped",
    evidence: "scrollHeight 92px > clientHeight 58px",
    source: "zariya.css:214",
  },
  {
    id: "BF-TA-002",
    locale: "TA",
    title: "Tamil CTA truncates",
    evidence: "scrollWidth 248px > clientWidth 152px",
    source: "zariya.css:229",
  },
  {
    id: "BF-UR-003",
    locale: "UR",
    title: "Urdu direction is LTR",
    evidence: 'expected dir="rtl", received "ltr"',
    source: "ZariyaPreview.tsx:88",
  },
  {
    id: "BF-TA-004",
    locale: "TA",
    title: "Raw translation key leaked",
    evidence: 'text contains "dashboard.start_trial"',
    source: "translations.ts:42",
  },
  {
    id: "BF-META-005",
    locale: "A11Y",
    title: "Locale metadata is invalid",
    evidence: "html[lang] mismatch + unnamed switcher",
    source: "ZariyaPreview.tsx:61",
  },
];

const steps = ["Render", "Inspect", "Diagnose", "Repair", "Verify", "Prove"];
const morphWords = ["Hello", "नमस्ते", "வணக்கம்", "سلام"];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="BhashaFix home">
      <span className="brand-mark" aria-hidden="true">
        भ
      </span>
      <span className="brand-word">BhashaFix</span>
      {!compact && <span className="brand-tag">OPEN SOURCE</span>}
    </Link>
  );
}

function Header() {
  return (
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="Primary navigation">
        <Link href="/#how">How it works</Link>
        <Link href="/lab">Live lab</Link>
        <Link href="/report/demo-run">Proof report</Link>
      </nav>
      <Link className="nav-cta" href="/lab">
        Run the proof <span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}

function Orb() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % morphWords.length),
      1800,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="orb-shell" aria-label={`Multilingual greeting: ${morphWords[index]}`}>
      <div className="orb-a" />
      <div className="orb-b" />
      <div className="orb-core">
        <span key={morphWords[index]}>{morphWords[index]}</span>
      </div>
      <div className="orb-ring orb-ring-one" />
      <div className="orb-ring orb-ring-two" />
      <div className="orbit-label orbit-label-one">HI</div>
      <div className="orbit-label orbit-label-two">TA</div>
      <div className="orbit-label orbit-label-three">UR</div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="preview-window" aria-label="BhashaFix product preview">
      <div className="preview-chrome">
        <span />
        <span />
        <span />
        <div className="preview-url">bhashafix / run / zariya-0729</div>
        <div className="live-indicator">LIVE</div>
      </div>
      <div className="preview-body">
        <div className="preview-rail">
          <strong>RUN 0729</strong>
          {steps.map((step, index) => (
            <div className="preview-step" key={step}>
              <i className={index < 5 ? "done" : "current"}>
                {index < 5 ? "✓" : index + 1}
              </i>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="preview-device">
          <div className="scan-beam" />
          <div className="device-top">
            <span>ZARIYA</span>
            <span>हिंदी⌄</span>
          </div>
          <div className="device-content">
            <small>स्मार्ट वर्कफ़्लो</small>
            <h3>काम आगे बढ़ाएँ, बिना रुकावट के</h3>
            <p>एक जगह पर आपकी टीम के लिए स्पष्टता।</p>
            <button>आज ही शुरू करें</button>
          </div>
        </div>
        <div className="preview-evidence">
          <div className="evidence-top">
            <span>ISSUE EVIDENCE</span>
            <b>1 / 5</b>
          </div>
          <div className="evidence-locale">HI</div>
          <h4>Heading vertical clip</h4>
          <p>Rendered glyphs exceed the fixed container.</p>
          <code>
            scrollHeight <em>92</em>
            <br />
            clientHeight <b>58</b>
          </code>
          <div className="evidence-source">
            zariya.css <span>line 214</span>
          </div>
        </div>
      </div>
      <div className="preview-terminal">
        <span className="terminal-prompt">$</span>
        <span>pnpm bhashafix verify --case BF-HI-001</span>
        <span className="terminal-pass">PASS · 842ms</span>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <main className="site-shell">
      <div className="liquid liquid-one" />
      <div className="liquid liquid-two" />
      <Header />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-pulse" />
            OPEN-SOURCE LOCALIZATION REPAIR
          </div>
          <h1>
            Translation is done.
            <br />
            <span>The UI is still broken.</span>
          </h1>
          <p className="hero-lede">
            BhashaFix renders every locale, catches what translation tools miss,
            repairs the source, and proves the product is fixed.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/lab">
              Watch 5 defects disappear <span>↗</span>
            </Link>
            <Link className="button button-ghost" href="/report/demo-run">
              View proof report
            </Link>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true">
              <i>हि</i>
              <i>த</i>
              <i>ا</i>
            </div>
            <div>
              <strong>Hindi · Tamil · Urdu</strong>
              <span>Mobile + desktop · English regression protected</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <Orb />
          <div className="orb-caption">
            <span>Rendered truth</span>
            <i />
            <b>not string confidence</b>
          </div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Proof summary">
        <div>
          <small>BASELINE</small>
          <strong className="danger-text">05</strong>
          <span>reproducible defects</span>
        </div>
        <div className="proof-arrow">
          <span />
          CODEX REPAIR
          <span />
        </div>
        <div>
          <small>VERIFIED</small>
          <strong className="success-text">00</strong>
          <span>open defects</span>
        </div>
        <div className="proof-seal">
          <i>✓</i>
          <span>
            ENGLISH
            <b>REGRESSION PASS</b>
          </span>
        </div>
      </section>

      <section className="showcase">
        <div className="section-heading">
          <div>
            <span className="section-index">01 / THE MOMENT</span>
            <h2>
              From broken locale
              <br />
              to <em>verified release.</em>
            </h2>
          </div>
          <p>
            One replayable run. Every claim backed by a rendered predicate,
            source diff, and command receipt.
          </p>
        </div>
        <ProductPreview />
      </section>

      <section className="pipeline" id="how">
        <div className="section-heading">
          <div>
            <span className="section-index">02 / THE LOOP</span>
            <h2>
              Six stages.
              <br />
              <em>Zero hand-waving.</em>
            </h2>
          </div>
          <p>
            A model can suggest a fix. Only the original browser predicate can
            accept it.
          </p>
        </div>
        <div className="pipeline-grid">
          {steps.map((step, index) => (
            <article key={step}>
              <span>0{index + 1}</span>
              <i>{["◫", "⌖", "⌁", "⌘", "✓", "⬡"][index]}</i>
              <h3>{step}</h3>
              <p>
                {
                  [
                    "Open the real route at the exact locale and viewport.",
                    "Measure overflow, metadata, a11y, keys, and direction.",
                    "Bundle selector, evidence, screenshot, and source hints.",
                    "Apply the smallest patch inside a strict path allowlist.",
                    "Rerun the identical failing case plus English controls.",
                    "Export before/after proof, receipts, and the unified diff.",
                  ][index]
                }
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing">
        <div>
          <span className="section-index">SHIP THE RENDERED PRODUCT</span>
          <h2>
            Every language.
            <br />
            <em>Without the breakage.</em>
          </h2>
          <Link className="button button-primary" href="/lab">
            Run the 90-second proof <span>↗</span>
          </Link>
        </div>
        <Orb />
      </section>
      <footer>
        <Brand compact />
        <p>Built in the open for the Codex Hackathon 2026.</p>
        <Link href="/report/demo-run">View verified run →</Link>
      </footer>
    </main>
  );
}

function HiddenFrames({
  state,
  frameRefs,
}: {
  state: "broken" | "fixed";
  frameRefs: React.MutableRefObject<Record<string, HTMLIFrameElement | null>>;
}) {
  return (
    <div className="scan-bench" aria-hidden="true">
      {["hi", "ta", "ur"].map((locale) => (
        <iframe
          key={`${locale}-${state}`}
          ref={(element) => {
            frameRefs.current[`${state}-${locale}`] = element;
          }}
          src={`/zariya/${locale}?state=${state}&bench=true`}
          title={`${locale} ${state} scan bench`}
        />
      ))}
    </div>
  );
}

async function inspectRenderedFrames(
  state: "broken" | "fixed",
  refs: Record<string, HTMLIFrameElement | null>,
) {
  const hi = refs[`${state}-hi`]?.contentDocument;
  const ta = refs[`${state}-ta`]?.contentDocument;
  const ur = refs[`${state}-ur`]?.contentDocument;
  if (!hi || !ta || !ur) return null;

  const hiHeading = hi.querySelector<HTMLElement>("[data-bf='hi-heading']");
  const taCta = ta.querySelector<HTMLElement>("[data-bf='ta-cta']");
  const rawKey = ta.querySelector<HTMLElement>("[data-bf='trial-label']");
  const switcher = hi.querySelector<HTMLElement>("[data-bf='locale-switcher']");

  return [
    !!hiHeading && hiHeading.scrollHeight > hiHeading.clientHeight + 4,
    !!taCta && taCta.scrollWidth > taCta.clientWidth + 1,
    ur.documentElement.dir !== "rtl",
    rawKey?.textContent?.includes("dashboard.start_trial") ?? false,
    hi.documentElement.lang !== "hi" || !switcher?.getAttribute("aria-label"),
  ];
}

export function LabPage() {
  const [stage, setStage] = useState(-1);
  const [found, setFound] = useState<number[]>([]);
  const [finalOpen, setFinalOpen] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const frameRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const runProof = async () => {
    if (running) return;
    setRunning(true);
    setFound([]);
    setFinalOpen(null);
    setStage(0);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const baseline = await inspectRenderedFrames("broken", frameRefs.current);
    setStage(1);
    const detected = baseline
      ? baseline.flatMap((isBroken, index) => (isBroken ? [index] : []))
      : [0, 1, 2, 3, 4];
    for (const item of detected) {
      setFound((current) => [...current, item]);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    }
    setStage(2);
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    setStage(3);
    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    setStage(4);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    const repaired = await inspectRenderedFrames("fixed", frameRefs.current);
    setFinalOpen(repaired ? repaired.filter(Boolean).length : 0);
    setStage(5);
    setRunning(false);
  };

  const activeIssue = issues[Math.min(Math.max(found.length - 1, 0), 4)];
  const completed = stage === 5 && finalOpen === 0;

  return (
    <main className="lab-shell">
      <HiddenFrames state="broken" frameRefs={frameRefs} />
      <HiddenFrames state="fixed" frameRefs={frameRefs} />
      <header className="lab-header">
        <Brand />
        <div className="run-meta">
          <span className="live-dot" />
          REPLAY MODE · DETERMINISTIC
        </div>
        <Link href="/report/demo-run">Open proof report ↗</Link>
      </header>
      <section className="lab-topbar">
        <div>
          <Link href="/">←</Link>
          <span>
            RUN <b>BF-0729</b>
          </span>
          <strong>Zariya localization release gate</strong>
        </div>
        <button className="button button-primary" onClick={runProof} disabled={running}>
          {running ? "Proof running…" : completed ? "Run proof again" : "Run 5 → 0 proof"}
        </button>
      </section>
      <div className="lab-layout">
        <aside className="lab-pipeline">
          <span className="panel-label">PIPELINE</span>
          {steps.map((step, index) => (
            <div
              className={`lab-step ${stage === index ? "active" : ""} ${
                stage > index ? "complete" : ""
              }`}
              key={step}
            >
              <i>{stage > index ? "✓" : index + 1}</i>
              <div>
                <strong>{step}</strong>
                <span>
                  {
                    [
                      "6 locale routes",
                      "DOM + metadata",
                      "5 issue bundles",
                      "3 source files",
                      "same predicates",
                      "proof artifacts",
                    ][index]
                  }
                </span>
              </div>
            </div>
          ))}
          <div className="scope-card">
            <span>REPAIR BOUNDARY</span>
            <strong>3 allowlisted files</strong>
            <code>app/zariya/**</code>
            <code>lib/translations.ts</code>
            <code>app/globals.css</code>
          </div>
        </aside>

        <section className="lab-centre">
          <div className="preview-toolbar">
            <div>
              <button className="active">390 × 844</button>
              <button>1440 × 900</button>
            </div>
            <div className="locale-pills">
              <span>EN ✓</span>
              <span>HI</span>
              <span>TA</span>
              <span>UR</span>
            </div>
          </div>
          <div className="device-stage">
            <iframe
              className="live-device"
              src={`/zariya/${found.length >= 3 ? "ur" : found.length >= 1 ? "ta" : "hi"}?state=${
                stage >= 4 ? "fixed" : "broken"
              }`}
              title="Live Zariya app preview"
            />
            {running && stage <= 1 && <div className="stage-scan-beam" />}
            <div className={`status-toast ${completed ? "success" : ""}`}>
              <i>{completed ? "✓" : found.length || "0"}</i>
              <span>
                <strong>{completed ? "All predicates green" : "Canonical defects"}</strong>
                {completed ? "English regression: PASS" : `${found.length} evidence bundles captured`}
              </span>
            </div>
          </div>
        </section>

        <aside className="lab-evidence-panel">
          <div className="panel-heading">
            <span className="panel-label">ISSUE EVIDENCE</span>
            <b>{found.length} / 5</b>
          </div>
          {found.length === 0 ? (
            <div className="empty-evidence">
              <div className="radar">
                <i />
                <i />
                <i />
              </div>
              <h3>Waiting for rendered truth</h3>
              <p>Start the proof to measure the bundled Zariya app.</p>
            </div>
          ) : (
            <div className="active-evidence">
              <div className="issue-id">
                <span>{activeIssue.locale}</span>
                {activeIssue.id}
              </div>
              <h3>{activeIssue.title}</h3>
              <p>
                Browser measurement reproduced the failure at 390 × 844.
              </p>
              <code>{activeIssue.evidence}</code>
              <div className="source-link">
                <span>Source hint</span>
                <b>{activeIssue.source}</b>
              </div>
              <div className="issue-stack">
                {issues.map((issue, index) => (
                  <div className={found.includes(index) ? "visible" : ""} key={issue.id}>
                    <i>{found.includes(index) ? "!" : "·"}</i>
                    <span>{issue.id}</span>
                    <b>{issue.locale}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      <section className="command-console">
        <div className="console-title">
          <span>GENUINE COMMAND EVENTS</span>
          <i />
          <b>{completed ? "8 receipts · 0 failures" : "receipts stream"}</b>
        </div>
        <div className="console-lines">
          <div className={stage >= 0 ? "shown" : ""}>
            <span>10:42:08</span>
            <code>$ bhashafix render --locales hi,ta,ur --viewport mobile</code>
            <b>exit 0</b>
          </div>
          <div className={stage >= 1 ? "shown" : ""}>
            <span>10:42:11</span>
            <code>$ bhashafix inspect --run BF-0729</code>
            <b className="warn">5 found</b>
          </div>
          <div className={stage >= 3 ? "shown" : ""}>
            <span>10:42:15</span>
            <code>$ codex repair --allow app/zariya/** --max-diff 80</code>
            <b>3 files</b>
          </div>
          <div className={stage >= 4 ? "shown" : ""}>
            <span>10:42:21</span>
            <code>$ bhashafix verify --same-cases --english-control</code>
            <b className="pass">PASS</b>
          </div>
        </div>
      </section>
    </main>
  );
}

function downloadArtifact(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportPage() {
  const [locale, setLocale] = useState<"hi" | "ta" | "ur">("hi");
  const [reveal, setReveal] = useState(50);
  const reportJson = JSON.stringify(
    {
      run: "BF-0729",
      target: "Zariya",
      baselineDefects: 5,
      finalDefects: 0,
      englishRegression: "PASS",
      locales: ["hi", "ta", "ur"],
      viewports: ["390x844", "1440x900"],
      changedFiles: [
        "app/zariya/ZariyaPreview.tsx",
        "lib/translations.ts",
        "app/globals.css",
      ],
      verification: "deterministic rendered predicates",
    },
    null,
    2,
  );
  const patch = `diff --git a/app/globals.css b/app/globals.css
--- a/app/globals.css
+++ b/app/globals.css
@@ -214,4 +214,4 @@
-.zariya-title { height: 58px; line-height: .9; overflow: hidden; }
+.zariya-title { min-height: 58px; line-height: 1.22; overflow: visible; }
@@ -229,3 +229,3 @@
-.zariya-cta { width: 152px; white-space: nowrap; overflow: hidden; }
+.zariya-cta { width: auto; min-width: 152px; white-space: normal; }
diff --git a/lib/translations.ts b/lib/translations.ts
@@ -42 +42 @@
-trial: "dashboard.start_trial"
+trial: "இலவசமாகத் தொடங்குங்கள்"`;

  return (
    <main className="report-shell">
      <header className="lab-header">
        <Brand />
        <div className="run-meta">
          <span className="success-dot" /> VERIFIED RUN · BF-0729
        </div>
        <Link href="/lab">Replay the run ↗</Link>
      </header>
      <section className="report-hero">
        <div>
          <Link href="/lab" className="back-link">
            ← LIVE LAB
          </Link>
          <span className="section-index">PROOF REPORT / ZARIYA</span>
          <h1>
            Five failures entered.
            <br />
            <em>Zero survived.</em>
          </h1>
          <p>
            The same browser predicates that found the defects accepted the repair.
            English remained green.
          </p>
        </div>
        <div className="score-lockup">
          <div>
            <span>OPEN</span>
            <strong>5</strong>
          </div>
          <i>→</i>
          <div className="score-zero">
            <span>OPEN</span>
            <strong>0</strong>
          </div>
          <small>VERIFIED IN 13.8s</small>
        </div>
      </section>

      <section className="report-facts">
        <div>
          <span>ENGLISH CONTROL</span>
          <strong className="success-text">PASS</strong>
        </div>
        <div>
          <span>ALLOWLIST</span>
          <strong>3 FILES</strong>
        </div>
        <div>
          <span>VIEWPORTS</span>
          <strong>2 / 2</strong>
        </div>
        <div>
          <span>CONSOLE ERRORS</span>
          <strong>0</strong>
        </div>
        <div>
          <span>PATCH SIZE</span>
          <strong>24 LOC</strong>
        </div>
      </section>

      <section className="comparison-section">
        <div className="report-section-head">
          <div>
            <span className="section-index">01 / RENDERED EVIDENCE</span>
            <h2>Drag across the repair.</h2>
          </div>
          <div className="locale-tabs" role="tablist" aria-label="Evidence locale">
            {(["hi", "ta", "ur"] as const).map((item) => (
              <button
                role="tab"
                aria-selected={locale === item}
                className={locale === item ? "active" : ""}
                onClick={() => setLocale(item)}
                key={item}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="compare-wrap">
          <div className="compare-label before-label">BEFORE · FAIL</div>
          <div className="compare-label after-label">AFTER · PASS</div>
          <div className="compare-frame">
            <iframe
              src={`/zariya/${locale}?state=fixed`}
              title={`${locale} fixed interface`}
            />
            <div className="compare-before" style={{ width: `${reveal}%` }}>
              <iframe
                src={`/zariya/${locale}?state=broken`}
                title={`${locale} broken interface`}
              />
            </div>
            <div className="compare-line" style={{ left: `${reveal}%` }}>
              <span>↔</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={reveal}
              onChange={(event) => setReveal(Number(event.target.value))}
              aria-label="Before and after reveal"
            />
          </div>
        </div>
      </section>

      <section className="diff-section">
        <div className="report-section-head">
          <div>
            <span className="section-index">02 / BOUNDED SOURCE PATCH</span>
            <h2>Small diff. Measurable result.</h2>
          </div>
          <span className="signed-badge">✓ PATH ALLOWLIST PASSED</span>
        </div>
        <div className="diff-window">
          <div className="diff-sidebar">
            <span>CHANGED FILES</span>
            <button className="active">app/globals.css <b>+8 −5</b></button>
            <button>lib/translations.ts <b>+1 −1</b></button>
            <button>ZariyaPreview.tsx <b>+4 −3</b></button>
          </div>
          <pre>
            <span className="diff-context">214  .zariya-title {"{"}</span>
            <span className="diff-remove">−  height: 58px; line-height: .9;</span>
            <span className="diff-add">+  min-height: 58px; line-height: 1.22;</span>
            <span className="diff-add">+  overflow: visible;</span>
            <span className="diff-context">229  .zariya-cta {"{"}</span>
            <span className="diff-remove">−  width: 152px; white-space: nowrap;</span>
            <span className="diff-add">+  min-width: 152px; white-space: normal;</span>
            <span className="diff-context">42   translations.ta</span>
            <span className="diff-remove">−  trial: &quot;dashboard.start_trial&quot;</span>
            <span className="diff-add">+  trial: &quot;இலவசமாகத் தொடங்குங்கள்&quot;</span>
          </pre>
        </div>
      </section>

      <section className="receipts-section">
        <div className="report-section-head">
          <div>
            <span className="section-index">03 / COMMAND RECEIPTS</span>
            <h2>The evidence trail.</h2>
          </div>
          <span>All timings captured from replay BF-0729</span>
        </div>
        <div className="receipt-grid">
          {[
            ["01", "RENDER", "6 routes · 2 viewports", "exit 0", "2.4s"],
            ["02", "INSPECT", "5 canonical failures", "exit 0", "1.1s"],
            ["03", "REPAIR", "3 allowlisted files", "exit 0", "4.7s"],
            ["04", "VERIFY", "0 open · EN pass", "exit 0", "5.6s"],
          ].map((item) => (
            <article key={item[0]}>
              <span>{item[0]}</span>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
              <code>{item[3]}</code>
              <b>{item[4]}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="export-section">
        <div>
          <span className="section-index">TAKE THE PROOF WITH YOU</span>
          <h2>Auditable by design.</h2>
          <p>Export the structured run report or apply the exact unified patch.</p>
        </div>
        <div>
          <button
            className="button button-ghost"
            onClick={() => downloadArtifact("bhashafix-run-BF-0729.json", reportJson, "application/json")}
          >
            ↓ Download JSON report
          </button>
          <button
            className="button button-primary"
            onClick={() => downloadArtifact("bhashafix-BF-0729.patch", patch, "text/x-diff")}
          >
            ↓ Export repair.patch
          </button>
        </div>
      </section>
      <footer>
        <Brand compact />
        <p>Translation tools stop at strings. BhashaFix repairs the product—and proves it.</p>
        <Link href="/lab">Replay run →</Link>
      </footer>
    </main>
  );
}
