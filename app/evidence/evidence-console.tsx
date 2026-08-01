"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EvidenceIssue, EvidenceScan } from "../lib/evidence";

/**
 * Renders the published external-scan evidence. Every string and number comes
 * from the props, which a server component read out of `public/evidence/`.
 * Nothing here derives a rate, score or total that the run did not record.
 */

const STAGES = ["Target", "Route", "Locale", "Viewport", "Issue", "Proof"] as const;

function shortHash(value: string) {
  return `${value.slice(0, 12)}…${value.slice(-6)}`;
}

function clock(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}Z`;
}

/**
 * A recorded full-page render, windowed to the element the issue measured.
 *
 * The PNG is 390 CSS pixels wide and thousands tall, so it is scaled to the
 * available width and offset so the recorded rectangle sits in view. Where the
 * rule recorded no rectangle, the top of the render is shown and the absence is
 * stated instead of a marker being placed somewhere plausible.
 */
function AnnotatedShot({
  issue,
  capturedWidth,
}: {
  issue: EvidenceIssue;
  capturedWidth: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setWidth(frame.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  if (!issue.screenshotUrl) {
    return (
      <div className="ls-shot ls-shot-absent">
        <p>This issue records no screenshot file.</p>
      </div>
    );
  }

  const scale = natural && width ? width / natural.w : 0;
  const offset =
    issue.rect && scale ? Math.max(0, issue.rect.y * scale - 140) : 0;

  return (
    <figure className="ls-shot">
      <div className="ls-shot-frame" ref={frameRef}>
        <div className="ls-shot-slide" style={{ transform: `translateY(${-offset}px)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={issue.screenshotUrl}
            alt={`Recorded render of ${issue.route} in ${issue.locale} at ${issue.viewport.name}`}
            onLoad={(event) =>
              setNatural({
                w: event.currentTarget.naturalWidth,
                h: event.currentTarget.naturalHeight,
              })
            }
          />
          {issue.rect && scale > 0 && (
            <span
              className="ls-shot-marker"
              aria-hidden="true"
              style={{
                left: `${issue.rect.x * scale}px`,
                top: `${issue.rect.y * scale}px`,
                width: `${Math.max(issue.rect.width * scale, 6)}px`,
                height: `${Math.max(issue.rect.height * scale, 6)}px`,
              }}
            />
          )}
        </div>
      </div>
      <figcaption>
        {issue.rect ? (
          <>
            Marked at x {issue.rect.x}, y {issue.rect.y}, {issue.rect.width}×
            {issue.rect.height} in the recorded {capturedWidth}px-wide render.
          </>
        ) : (
          <>
            This rule recorded no element rectangle, so no marker is drawn. The
            render is shown from the top of the page.
          </>
        )}
      </figcaption>
    </figure>
  );
}

function IssuePanel({ issue, capturedWidth }: { issue: EvidenceIssue; capturedWidth: number }) {
  return (
    <div className="ls-issue-open">
      <AnnotatedShot issue={issue} capturedWidth={capturedWidth} />
      <div className="ls-issue-technical">
        <h4>{issue.description}</h4>
        <p>{issue.whyItMatters}</p>
        <dl>
          <dt>Measured</dt>
          <dd>
            {issue.measurements.length === 0 ? (
              <span>not recorded</span>
            ) : (
              issue.measurements.map((measurement) => (
                <span className="ls-pair" key={measurement.label}>
                  <b>{measurement.label}</b>
                  {measurement.value}
                </span>
              ))
            )}
          </dd>
          <dt>Predicate</dt>
          <dd>
            <code>{issue.deterministicPredicate}</code>
          </dd>
          <dt>Selector</dt>
          <dd>
            <code>{issue.selector ?? "no selector recorded"}</code>
          </dd>
          <dt>Recommended action</dt>
          <dd>{issue.recommendedAction}</dd>
          <dt>Identity</dt>
          <dd>
            <span className="ls-pair">
              <b>issue</b>
              <code>{issue.issueId}</code>
            </span>
            <span className="ls-pair">
              <b>severity</b>
              {issue.severity}
            </span>
            <span className="ls-pair">
              <b>confidence</b>
              {issue.confidence}
            </span>
            <span className="ls-pair">
              <b>browser</b>
              {issue.browser}
            </span>
            <span className="ls-pair">
              <b>human review</b>
              {issue.humanReviewRequired ? "required" : "not required"}
            </span>
          </dd>
        </dl>
      </div>
    </div>
  );
}

export function EvidenceConsole({
  generatedAt,
  limitations,
  scans,
}: {
  generatedAt: string;
  limitations: string[];
  scans: EvidenceScan[];
}) {
  const [activeScanId, setActiveScanId] = useState(scans[0].scanId);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const scan = useMemo(
    () => scans.find((entry) => entry.scanId === activeScanId) ?? scans[0],
    [activeScanId, scans],
  );
  const openIssue = scan.issues.find((issue) => issue.issueId === openIssueId) ?? null;
  // The evidence line draws as far as the reader has actually gone: a scan is
  // always chosen, an issue only once one is opened.
  const reached = openIssue ? STAGES.length : 4;
  const captured = scan.viewports[0];

  return (
    <>
      <header className="ls-masthead">
        <p className="ls-eyebrow">REAL CHROMIUM SCAN · Generated through the BhashaFix CLI</p>
        <h1>
          <span className="ls-display-line">Three public sites.</span>{" "}
          <span className="ls-display-line">One recorded run each.</span>
        </h1>
        <p className="ls-standfirst">
          These are the artifacts of a local CLI run, published byte for byte.
          Open a scan to read the routes it fetched, the locales it rendered, the
          screenshots it captured and the SHA-256 of every image.
        </p>
        <dl className="ls-masthead-meta">
          <div>
            <dt>Published</dt>
            <dd>{clock(generatedAt)}</dd>
          </div>
          <div>
            <dt>Scans</dt>
            <dd>{scans.length}</dd>
          </div>
          <div>
            <dt>Screenshots</dt>
            <dd>
              {scans.reduce((total, entry) => total + entry.screenshots.length, 0)}
            </dd>
          </div>
          <div>
            <dt>Issues recorded</dt>
            <dd>{scans.reduce((total, entry) => total + entry.issues.length, 0)}</dd>
          </div>
        </dl>
      </header>

      <nav className="ls-run-index" aria-label="Recorded runs">
        {scans.map((entry) => (
          <button
            type="button"
            key={entry.scanId}
            aria-pressed={entry.scanId === scan.scanId}
            className={entry.scanId === scan.scanId ? "active" : undefined}
            onClick={() => {
              setActiveScanId(entry.scanId);
              setOpenIssueId(null);
            }}
          >
            <strong>{entry.name}</strong>
            <span>{entry.target}</span>
            <em>
              {entry.routes.length} routes · {entry.locales.length} locales ·{" "}
              {entry.renders.length} renders · {entry.issues.length} issues
            </em>
          </button>
        ))}
      </nav>

      <ol className="ls-evidence-line" aria-label="Evidence chain">
        {STAGES.map((stage, index) => (
          <li key={stage} data-drawn={index < reached ? "true" : "false"}>
            <i aria-hidden="true" />
            <span>{stage}</span>
            <b>
              {stage === "Target"
                ? new URL(scan.target).hostname
                : stage === "Route"
                  ? openIssue?.route ?? `${scan.routes.length} fetched`
                  : stage === "Locale"
                    ? openIssue?.locale ?? scan.locales.join(" · ")
                    : stage === "Viewport"
                      ? `${captured.name} ${captured.width}×${captured.height}`
                      : stage === "Issue"
                        ? openIssue?.ruleId ?? "open one below"
                        : openIssue?.screenshotUrl
                          ? shortHash(
                              scan.screenshots.find(
                                (shot) => shot.url === openIssue.screenshotUrl,
                              )?.sha256 ?? "",
                            )
                          : "artifact hash"}
            </b>
          </li>
        ))}
      </ol>

      <section className="ls-section" aria-labelledby="run-record">
        <h2 id="run-record">The run record</h2>
        <div className="ls-scroll">
          <table className="ls-table">
            <caption>{scan.note}</caption>
            <tbody>
              <tr>
                <th scope="row">Scan ID</th>
                <td>
                  <code>{scan.scanId}</code>
                </td>
              </tr>
              <tr>
                <th scope="row">Origin · status</th>
                <td>
                  {scan.origin} · {scan.status.replaceAll("_", " ")}
                </td>
              </tr>
              <tr>
                <th scope="row">Target</th>
                <td>
                  <a href={scan.target} target="_blank" rel="noreferrer">
                    {scan.target}
                  </a>
                </td>
              </tr>
              <tr>
                <th scope="row">Started · completed</th>
                <td>
                  {clock(scan.startedAt)} → {clock(scan.completedAt)}
                </td>
              </tr>
              <tr>
                <th scope="row">Routes</th>
                <td>{scan.routes.join(" · ")}</td>
              </tr>
              <tr>
                <th scope="row">Locales</th>
                <td>{scan.locales.join(" · ")}</td>
              </tr>
              <tr>
                <th scope="row">Browsers · viewports · themes</th>
                <td>
                  {scan.browsers.join(", ")} ·{" "}
                  {scan.viewports
                    .map((viewport) => `${viewport.name} ${viewport.width}×${viewport.height}`)
                    .join(", ")}{" "}
                  · {scan.themes.join(", ")}
                </td>
              </tr>
              <tr>
                <th scope="row">Crawl bounds</th>
                <td>
                  maxPages {scan.crawl.maxPages} · maxDepth {scan.crawl.maxDepth} ·{" "}
                  {scan.crawl.rateLimitPerSecond}/s · noAi {String(scan.noAi)}
                </td>
              </tr>
              <tr>
                <th scope="row">Engine</th>
                <td>{scan.engineVersion}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="ls-section" aria-labelledby="coverage">
        <h2 id="coverage">Route × locale</h2>
        <p className="ls-note">
          A cell counts the issues this run recorded for that pair. Every pair
          below was rendered; nothing is inferred from a pair that was not.
        </p>
        <div className="ls-scroll">
          <table className="ls-matrix">
            <thead>
              <tr>
                <th scope="col">Route</th>
                {scan.locales.map((locale) => (
                  <th scope="col" key={locale}>
                    {locale}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scan.routes.map((route) => (
                <tr key={route}>
                  <th scope="row">{route}</th>
                  {scan.locales.map((locale) => {
                    const cell = scan.matrix.find(
                      (entry) => entry.route === route && entry.locale === locale,
                    );
                    const state = !cell?.rendered
                      ? "not-rendered"
                      : cell.issues > 0
                        ? "issues"
                        : "clean";
                    return (
                      <td key={locale} data-state={state}>
                        <span aria-hidden="true">
                          {state === "not-rendered" ? "·" : state === "issues" ? cell?.issues : "✓"}
                        </span>
                        <span className="visually-hidden">
                          {state === "not-rendered"
                            ? "not rendered by this run"
                            : `${cell?.issues ?? 0} issue(s) recorded`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ls-section" aria-labelledby="renders">
        <h2 id="renders">Renders captured</h2>
        <ul className="ls-render-strip">
          {scan.renders.map((render) => (
            <li key={`${render.route}-${render.locale}-${render.screenshot}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={render.screenshotUrl}
                alt={`Top of the recorded ${render.locale} render of ${render.route}`}
                loading="lazy"
              />
              <div>
                <b>{render.route}</b>
                <span>
                  {render.locale} · {render.viewport.name} {render.viewport.width}×
                  {render.viewport.height} · {render.theme}
                </span>
                <span>
                  HTTP {render.status} · {render.durationMs} ms ·{" "}
                  {render.measuredElements} elements measured
                </span>
                <span>
                  console errors {render.consoleErrors} · failed requests{" "}
                  {render.failedRequests} · axe violations {render.axeViolations}
                </span>
                <span>{clock(render.renderedAt)}</span>
                {render.sha256 && <code>{render.sha256}</code>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ls-section" aria-labelledby="issues">
        <h2 id="issues">Issues recorded</h2>
        <p className="ls-note">
          {scan.issues.length} issues, each holding the measurement taken and the
          predicate that failed. Open one to see the render it was measured in.
        </p>
        <ol className="ls-issue-list">
          {scan.issues.map((issue, index) => {
            const open = issue.issueId === openIssueId;
            return (
              <li key={issue.issueId} data-open={open ? "true" : "false"}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIssueId(open ? null : issue.issueId)}
                >
                  <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
                  <span className="ls-issue-rule">{issue.ruleId}</span>
                  <span className="ls-issue-where">
                    {issue.route} · {issue.locale}
                  </span>
                  <span className="ls-issue-severity" data-severity={issue.severity}>
                    {issue.severity}
                  </span>
                </button>
                {open && <IssuePanel issue={issue} capturedWidth={captured.width} />}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="ls-section" aria-labelledby="manifest">
        <h2 id="manifest">Artifact manifest</h2>
        <p className="ls-note">
          Every file below is served from this deployment. The hash beside each
          image is the one <code>pnpm evidence:publish</code> recorded.
        </p>
        <ul className="ls-manifest">
          <li>
            <a href={`/evidence/scans/${scan.scanId}/scan.json`}>scan.json</a>
            <span>the full scan record for {scan.scanId}</span>
          </li>
          <li>
            <a href={`/evidence/scans/${scan.scanId}/renders.json`}>renders.json</a>
            <span>one row per render, with timings and counts</span>
          </li>
          <li>
            <a href="/evidence/index.json">index.json</a>
            <span>the published index for all three scans</span>
          </li>
        </ul>
        <div className="ls-scroll">
          <table className="ls-table ls-hash-table">
            <thead>
              <tr>
                <th scope="col">Screenshot</th>
                <th scope="col">Bytes</th>
                <th scope="col">SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {scan.screenshots.map((shot) => (
                <tr key={shot.file}>
                  <td>
                    <a href={shot.url}>{shot.file}</a>
                  </td>
                  <td>{shot.bytes}</td>
                  <td>
                    <code>{shot.sha256}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ls-section ls-limits" aria-labelledby="limits">
        <h2 id="limits">What these scans do not establish</h2>
        <ul>
          {limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
          <li>
            No repair was prepared or applied against a third-party site, so
            these runs carry no verification result. The repaired-and-reverified
            path is the AtlasPay demo.
          </li>
        </ul>
        <div className="ls-actions">
          <Link className="button" href="/integrations/cli">
            Run BhashaFix locally →
          </Link>
          <Link className="button button-secondary" href="/demo">
            See the verified demo
          </Link>
          <Link className="button button-secondary" href="/import">
            Open a report of your own
          </Link>
        </div>
      </section>
    </>
  );
}
