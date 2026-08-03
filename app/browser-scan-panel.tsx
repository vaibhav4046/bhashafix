"use client";

import { useState } from "react";

/**
 * The hosted quick scan.
 *
 * Everything rendered here comes from the response: the screenshot is the PNG
 * the function captured, the counts are lengths of what it returned, and the
 * measurement under each issue is the one the predicate read. Nothing is
 * synthesised while waiting, and no progress is simulated.
 */
type Render = {
  locale: string;
  viewport: { name: string; width: number; height: number };
  url: string;
  status: number;
  durationMs: number;
  measuredElements: number;
  declaredLang: string | null;
  declaredDir: string | null;
  blockedRequests: number;
  axeViolations: number;
  screenshot: string | null;
  screenshotBytes: number;
};

type Issue = {
  issueId: string;
  ruleId: string;
  locale: string;
  severity: string;
  selector: string | null;
  description: string;
  whyItMatters: string;
  evidence: Record<string, unknown>;
  deterministicPredicate: string | null;
};

type Result = {
  scanId: string;
  origin: string;
  engine: string;
  target: string;
  persisted: boolean;
  persistenceNote: string;
  scope: { browserRendered: boolean; axeExecuted: boolean; locales: number };
  summary: { renders: number; issues: number; blocking: number };
  renders: Render[];
  issues: Issue[];
  notRun: string[];
  limitations: string[];
};

const LOCALE_CHOICES = [
  "en-GB",
  "en-US",
  "hi-IN",
  "ta-IN",
  "ar-SA",
  "he-IL",
  "fa-IR",
  "ja-JP",
  "ko-KR",
  "zh-Hans-CN",
  "zh-Hant-TW",
  "de-DE",
  "fr-FR",
  "es-MX",
  "pt-BR",
  "th-TH",
  "uk-UA",
  "am-ET",
];

const VIEWPORT_LABELS = {
  mobile: "Mobile · 390 × 844",
  tablet: "Tablet · 768 × 1024",
  desktop: "Desktop · 1440 × 900",
} as const;

type ViewportName = keyof typeof VIEWPORT_LABELS;

export function BrowserScanPanel() {
  const [url, setUrl] = useState("https://example.com");
  const [sourceLocale, setSourceLocale] = useState("en-GB");
  const [locale, setLocale] = useState("ar-SA");
  const [viewport, setViewport] = useState<ViewportName>("mobile");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [openIssue, setOpenIssue] = useState<string | null>(null);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/scan/browser", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          sourceLocale,
          locales: Array.from(new Set([sourceLocale, locale])),
          viewport,
        }),
      });
      const payload = (await response.json()) as Result & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The scan did not complete.");
      setResult(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan did not complete.");
    } finally {
      setRunning(false);
    }
  }

  function downloadEvidence() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${result.scanId}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="ls-browser-scan">
      <form className="url-launcher" onSubmit={run}>
        <div className="ls-scan-field ls-scan-url-field">
          <label htmlFor="browser-scan-url">Public URL</label>
          <input
            id="browser-scan-url"
            type="url"
            required
            placeholder="https://www.mozilla.org"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
        <div className="ls-scan-field">
          <label htmlFor="browser-scan-source">Page locale</label>
          <input
            id="browser-scan-source"
            list="browser-scan-locales"
            required
            maxLength={64}
            spellCheck={false}
            value={sourceLocale}
            onChange={(event) => setSourceLocale(event.target.value)}
          />
        </div>
        <div className="ls-scan-field">
          <label htmlFor="browser-scan-locale">Target locale</label>
          <input
            id="browser-scan-locale"
            list="browser-scan-locales"
            required
            maxLength={64}
            spellCheck={false}
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
          />
        </div>
        <datalist id="browser-scan-locales">
          {LOCALE_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </datalist>
        <div className="ls-scan-field">
          <label htmlFor="browser-scan-viewport">Viewport</label>
          <select
            id="browser-scan-viewport"
            value={viewport}
            onChange={(event) => setViewport(event.target.value as ViewportName)}
          >
            {Object.entries(VIEWPORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={running}>
          {running ? "Rendering in Chromium…" : "Render and measure →"}
        </button>
      </form>

      {running ? (
        <div className="ls-scan-pending">
          <p className="ls-caveat" role="status">
            Chromium is starting in the function and rendering {sourceLocale} and {locale}
            at {VIEWPORT_LABELS[viewport]}. A cold start takes a few seconds.
          </p>
          {/* A waiting texture at the screenshot aspect — not a progress
              claim. The status line above is the only statement of state. */}
          <div className="ls-scan-wait" aria-hidden="true">
            <i />
            <i />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="ls-reject" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="ls-browser-result">
          <p className="ls-eyebrow">
            {result.origin} · {result.engine} · {result.summary.renders} renders ·{" "}
            {result.summary.blocking} blocking
          </p>
          <p className="ls-scan-id">{result.scanId}</p>
          <div className="ls-result-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={downloadEvidence}
            >
              Download JSON evidence ↓
            </button>
            <span>Generated from this response · not stored server-side</span>
          </div>

          <div className="ls-render-strip">
            {result.renders.map((render) => (
              <figure key={render.locale}>
                {render.screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={render.screenshot}
                    alt={`${result.target} rendered in ${render.locale} at ${render.viewport.width} by ${render.viewport.height}`}
                    width={195}
                    height={422}
                  />
                ) : (
                  <div className="ls-shot-missing">
                    screenshot above the inline limit
                  </div>
                )}
                <figcaption>
                  <strong>{render.locale}</strong>
                  <span>
                    {render.viewport.width}×{render.viewport.height} · HTTP {render.status} ·{" "}
                    {render.measuredElements} elements ·{" "}
                    {render.durationMs}ms
                  </span>
                  <span>
                    lang {render.declaredLang ?? "unset"} · dir{" "}
                    {render.declaredDir ?? "unset"} · axe {render.axeViolations} · blocked{" "}
                    {render.blockedRequests}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          {result.issues.length === 0 ? (
            <p className="ls-caveat">
              No blocking finding in the checks that ran. That is not a release
              guarantee — read what did not run, below.
            </p>
          ) : (
            <ul className="ls-issue-list">
              {result.issues.map((issue) => (
                <li key={issue.issueId}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIssue(openIssue === issue.issueId ? null : issue.issueId)
                    }
                    aria-expanded={openIssue === issue.issueId}
                  >
                    <span className="ls-rule">{issue.ruleId}</span>
                    <span className="ls-locale">{issue.locale}</span>
                    <span className="ls-severity">{issue.severity}</span>
                  </button>
                  {openIssue === issue.issueId ? (
                    <div className="ls-issue-body">
                      <p>{issue.description}</p>
                      <p className="ls-why">{issue.whyItMatters}</p>
                      <dl>
                        {Object.entries(issue.evidence).map(([key, value]) => (
                          <div key={key}>
                            <dt>{key}</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                      {issue.deterministicPredicate ? (
                        <pre tabIndex={0}>{issue.deterministicPredicate}</pre>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <details className="ls-scan-bounds">
            <summary>What this run did not do</summary>
            <ul>
              {result.notRun.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
              {result.limitations.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
              <li>{result.persistenceNote}</li>
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}
