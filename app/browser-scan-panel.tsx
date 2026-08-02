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
  url: string;
  status: number;
  durationMs: number;
  measuredElements: number;
  declaredLang: string | null;
  declaredDir: string | null;
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

const LOCALE_CHOICES = ["ar-SA", "de-DE", "ja-JP", "hi-IN", "he-IL"];

export function BrowserScanPanel() {
  const [url, setUrl] = useState("");
  const [locale, setLocale] = useState("ar-SA");
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
          sourceLocale: "en-GB",
          locales: ["en-GB", locale],
          viewport: "mobile",
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

  return (
    <div className="ls-browser-scan">
      <form className="url-launcher" onSubmit={run}>
        <label htmlFor="browser-scan-url">Public URL</label>
        <input
          id="browser-scan-url"
          type="url"
          required
          placeholder="https://www.mozilla.org"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <label htmlFor="browser-scan-locale">Locale to test</label>
        <select
          id="browser-scan-locale"
          value={locale}
          onChange={(event) => setLocale(event.target.value)}
        >
          {LOCALE_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </select>
        <button type="submit" disabled={running}>
          {running ? "Rendering in Chromium…" : "Render and measure →"}
        </button>
      </form>

      {running ? (
        <p className="ls-caveat" role="status">
          Chromium is starting in the function and rendering en-GB and {locale}.
          A cold start takes a few seconds.
        </p>
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

          <div className="ls-render-strip">
            {result.renders.map((render) => (
              <figure key={render.locale}>
                {render.screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={render.screenshot}
                    alt={`${result.target} rendered in ${render.locale} at 390 by 844`}
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
                    HTTP {render.status} · {render.measuredElements} elements ·{" "}
                    {render.durationMs}ms
                  </span>
                  <span>
                    lang {render.declaredLang ?? "unset"} · dir{" "}
                    {render.declaredDir ?? "unset"} · axe {render.axeViolations}
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
