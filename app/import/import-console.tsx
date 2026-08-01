"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readArtifactText,
  type ImportedIssue,
  type NormalisedReport,
} from "../lib/artifact-schema";
import {
  formatBytes,
  readZipDirectory,
  readZipEntry,
  sha256Hex,
  ZipReadError,
  type ZipEntry,
} from "../lib/zip";

/**
 * Report import console.
 *
 * Everything here happens inside the page: files are read with the File API,
 * validated against the artifact schemas, and rendered. Nothing is uploaded and
 * no server is contacted. A file that fails validation is reported with the
 * reason and the failing fields — the console never renders a partial or
 * assumed report.
 */

const HISTORY_KEY = "bhashafix-imported-reports-v1";
const HISTORY_LIMIT = 12;

type HistoryEntry = {
  fileName: string;
  kind: string;
  label: string;
  scanId: string | null;
  issues: number;
  sha256: string | null;
  importedAt: string;
};

type ShotPreview = {
  name: string;
  url: string;
  bytes: number;
  crc32: string;
  sha256: string | null;
};

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(HISTORY_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is HistoryEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as HistoryEntry).fileName === "string" &&
        typeof (entry as HistoryEntry).importedAt === "string",
    );
  } catch {
    return [];
  }
}

function IssueRows({ issues, empty }: { issues: ImportedIssue[]; empty: string }) {
  if (issues.length === 0) return <p className="ls-note">{empty}</p>;
  return (
    <ol className="ls-import-issues">
      {issues.map((issue) => (
        <li key={issue.issueId}>
          <div>
            <b>{issue.ruleId}</b>
            <span data-severity={issue.severity}>{issue.severity}</span>
            <span>
              {issue.route} · {issue.locale}
              {issue.viewport ? ` · ${issue.viewport.name}` : ""} · {issue.browser}
            </span>
          </div>
          <p>{issue.description}</p>
          <p className="ls-note">{issue.whyItMatters}</p>
          <dl>
            <dt>Measured</dt>
            <dd>
              {issue.evidence && Object.keys(issue.evidence).length > 0 ? (
                Object.entries(issue.evidence).map(([label, value]) => (
                  <span className="ls-pair" key={label}>
                    <b>{label}</b>
                    {typeof value === "object" && value !== null
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                ))
              ) : typeof issue.measuredEvidence === "string" ? (
                <span>{issue.measuredEvidence}</span>
              ) : (
                <span>not recorded</span>
              )}
            </dd>
            <dt>Predicate</dt>
            <dd>
              <code>{issue.deterministicPredicate ?? "none recorded"}</code>
            </dd>
            <dt>Selector</dt>
            <dd>
              <code>{issue.selector ?? "none recorded"}</code>
            </dd>
            <dt>Identity</dt>
            <dd>
              <span className="ls-pair">
                <b>issue</b>
                <code>{issue.issueId}</code>
              </span>
              <span className="ls-pair">
                <b>confidence</b>
                {issue.confidence}
              </span>
            </dd>
          </dl>
        </li>
      ))}
    </ol>
  );
}

function ReportView({
  report,
  fileName,
  fileBytes,
  fileHash,
}: {
  report: NormalisedReport;
  fileName: string;
  fileBytes: number;
  fileHash: string | null;
}) {
  // The verification block appears only when the artifact actually carries a
  // recorded result, so a bundle without one never flashes a verdict. This is
  // derived from the report, so it is computed during render rather than
  // synchronised through an effect.
  const proofRevealed = Boolean(report.verification);

  return (
    <div className="ls-import-report">
      <header>
        <p className="ls-eyebrow">{report.label.toUpperCase()} · READ IN THIS BROWSER</p>
        <h2>{report.scanId ?? fileName}</h2>
        <dl className="ls-masthead-meta">
          <div>
            <dt>File</dt>
            <dd>
              {fileName} · {formatBytes(fileBytes)}
            </dd>
          </div>
          <div>
            <dt>Origin</dt>
            <dd>{report.origin ?? "not recorded"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{report.status?.replaceAll("_", " ") ?? "not recorded"}</dd>
          </div>
          <div>
            <dt>Issues</dt>
            <dd>{report.issues.length}</dd>
          </div>
        </dl>
        <p className="ls-hash">
          <b>SHA-256 of this file</b>
          <code>{fileHash ?? "not available in this browser context"}</code>
        </p>
      </header>

      <div className="ls-scroll">
        <table className="ls-table">
          <tbody>
            <tr>
              <th scope="row">Target</th>
              <td>{report.target ?? "not recorded in this artifact"}</td>
            </tr>
            <tr>
              <th scope="row">Source locale</th>
              <td>{report.sourceLocale ?? "not recorded"}</td>
            </tr>
            <tr>
              <th scope="row">Routes</th>
              <td>{report.routes.length ? report.routes.join(" · ") : "none recorded"}</td>
            </tr>
            <tr>
              <th scope="row">Locales</th>
              <td>{report.locales.length ? report.locales.join(" · ") : "none recorded"}</td>
            </tr>
            <tr>
              <th scope="row">Browsers</th>
              <td>{report.browsers.length ? report.browsers.join(", ") : "none recorded"}</td>
            </tr>
            <tr>
              <th scope="row">Viewports</th>
              <td>
                {report.viewports.length
                  ? report.viewports
                      .map((viewport) => `${viewport.name} ${viewport.width}×${viewport.height}`)
                      .join(", ")
                  : "none recorded"}
              </td>
            </tr>
            <tr>
              <th scope="row">Themes</th>
              <td>{report.themes.length ? report.themes.join(", ") : "none recorded"}</td>
            </tr>
            <tr>
              <th scope="row">Screenshots referenced</th>
              <td>
                {report.screenshotNames.length
                  ? report.screenshotNames.join(" · ")
                  : "none referenced"}
              </td>
            </tr>
            <tr>
              <th scope="row">Recorded</th>
              <td>
                {report.startedAt ?? "—"}
                {report.completedAt ? ` → ${report.completedAt}` : ""}
                {report.generatedAt ? ` · generated ${report.generatedAt}` : ""}
              </td>
            </tr>
            <tr>
              <th scope="row">Engine</th>
              <td>{report.engineVersion ?? "not recorded"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <section className="ls-section">
        <h3>Issues</h3>
        <IssueRows issues={report.issues} empty="This artifact records no issues." />
      </section>

      <section className="ls-section">
        <h3>Accessibility findings</h3>
        <IssueRows
          issues={report.axeFindings}
          empty="No accessibility rule fired in this artifact."
        />
      </section>

      <section className="ls-section">
        <h3>Runtime failures</h3>
        <IssueRows
          issues={report.runtimeFailures}
          empty="No runtime failure was recorded in this artifact."
        />
      </section>

      <section className="ls-section">
        <h3>Repair patch</h3>
        {report.repair ? (
          <>
            <p className="ls-note">
              {report.repair.files.length} file(s), confined to{" "}
              {report.repair.allowlist.length} allowlisted path(s).
            </p>
            <pre className="ls-diff">
              {(report.repair.unifiedDiff ?? "").split("\n").map((line, index) => (
                <span
                  key={`${index}-${line}`}
                  data-hunk={
                    line.startsWith("+++") || line.startsWith("---")
                      ? "meta"
                      : line.startsWith("@@")
                        ? "range"
                        : line.startsWith("+")
                          ? "add"
                          : line.startsWith("-")
                            ? "remove"
                            : "context"
                  }
                >
                  {line || " "}
                </span>
              ))}
            </pre>
          </>
        ) : (
          <p className="ls-note">This artifact carries no repair plan or diff.</p>
        )}
      </section>

      <section className="ls-section">
        <h3>Verification</h3>
        {report.verification ? (
          <div className="ls-verification" data-revealed={proofRevealed ? "true" : "false"}>
            <p className="ls-verdict">
              {report.verification.baselineBlocking} → {report.verification.finalBlocking}
              <b>{report.verification.status}</b>
            </p>
            <dl>
              <dt>Verified at</dt>
              <dd>{report.verification.verifiedAt}</dd>
              <dt>Source-locale regression</dt>
              <dd>{report.verification.sourceLocaleRegression}</dd>
              <dt>New blocking issues</dt>
              <dd>
                {report.verification.newBlockingIssues === null
                  ? "not recorded"
                  : report.verification.newBlockingIssues}
              </dd>
              <dt>Console error delta</dt>
              <dd>
                {report.verification.consoleErrorDelta === null
                  ? "not measured"
                  : report.verification.consoleErrorDelta}
              </dd>
              <dt>Accessibility regression</dt>
              <dd>
                {report.verification.accessibilityRegression === null
                  ? "not measured"
                  : String(report.verification.accessibilityRegression)}
              </dd>
              <dt>Diff within policy</dt>
              <dd>
                {report.verification.diffWithinPolicy === null
                  ? "not measured"
                  : String(report.verification.diffWithinPolicy)}
              </dd>
            </dl>
            {report.verification.notMeasured.length > 0 && (
              <p className="ls-note">
                Recorded as not measured, so not readable as a pass:{" "}
                {report.verification.notMeasured.join(", ")}.
              </p>
            )}
          </div>
        ) : (
          <p className="ls-note">This artifact carries no verification result.</p>
        )}
      </section>

      {report.absent.length > 0 && (
        <section className="ls-section ls-limits">
          <h3>Not in this file</h3>
          <ul>
            {report.absent.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function ImportConsole() {
  const [report, setReport] = useState<NormalisedReport | null>(null);
  const [reportFile, setReportFile] = useState<{
    name: string;
    bytes: number;
    hash: string | null;
  } | null>(null);
  const [reportError, setReportError] = useState<{
    reason: string;
    details: string[];
  } | null>(null);
  const [shots, setShots] = useState<ShotPreview[]>([]);
  const [zipInfo, setZipInfo] = useState<{ name: string; entries: ZipEntry[] } | null>(
    null,
  );
  const [zipError, setZipError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const shotUrls = useRef<string[]>([]);

  // localStorage is not available during the server render, so the history is
  // read after mount. The update is queued rather than applied synchronously
  // inside the effect body.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setHistory(readHistory());
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () => {
      for (const url of shotUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const remember = useCallback((entry: HistoryEntry) => {
    const next = [entry, ...readHistory()].slice(0, HISTORY_LIMIT);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
  }, []);

  const importReport = useCallback(
    async (file: File) => {
      setReport(null);
      setReportError(null);
      setReportFile(null);
      const buffer = await file.arrayBuffer();
      const outcome = readArtifactText(new TextDecoder().decode(buffer));
      if (!outcome.ok) {
        setReportError({ reason: outcome.reason, details: outcome.details });
        return;
      }
      const hash = await sha256Hex(buffer);
      setReport(outcome.report);
      setReportFile({ name: file.name, bytes: file.size, hash });
      remember({
        fileName: file.name,
        kind: outcome.report.kind,
        label: outcome.report.label,
        scanId: outcome.report.scanId,
        issues: outcome.report.issues.length,
        sha256: hash,
        importedAt: new Date().toISOString(),
      });
    },
    [remember],
  );

  const importScreenshots = useCallback(async (file: File) => {
    setZipError(null);
    setZipInfo(null);
    for (const url of shotUrls.current) URL.revokeObjectURL(url);
    shotUrls.current = [];
    setShots([]);
    try {
      const buffer = await file.arrayBuffer();
      const entries = readZipDirectory(buffer);
      const images = entries.filter((entry) =>
        /\.(png|jpe?g|webp|avif)$/i.test(entry.name),
      );
      if (entries.length === 0) {
        setZipError("The archive is valid but contains no members.");
        return;
      }
      setZipInfo({ name: file.name, entries });
      const previews: ShotPreview[] = [];
      for (const entry of images) {
        const bytes = await readZipEntry(buffer, entry);
        const blob = new Blob([bytes as BlobPart], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        shotUrls.current.push(url);
        previews.push({
          name: entry.name,
          url,
          bytes: entry.uncompressedSize,
          crc32: entry.crc32,
          sha256: await sha256Hex(bytes),
        });
      }
      setShots(previews);
      if (images.length === 0) {
        setZipError(
          `The archive holds ${entries.length} member(s) but none is an image, so nothing is previewed.`,
        );
      }
    } catch (error) {
      setZipError(
        error instanceof ZipReadError
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error),
      );
    }
  }, []);

  return (
    <>
      <header className="ls-masthead">
        <p className="ls-eyebrow">LOCAL FILE · NOTHING IS UPLOADED</p>
        <h1>
          <span className="ls-display-line">Run it on your machine.</span>{" "}
          <span className="ls-display-line">Review it here.</span>
        </h1>
        <p className="ls-standfirst">
          BhashaFix writes its report, its screenshots and its proof capsule into
          your project. Open them in this console to read them, then hand the
          same files to a reviewer. The files are parsed by this page in your
          browser; they never leave it.
        </p>
      </header>

      <section className="ls-section" aria-labelledby="import-report">
        <h2 id="import-report">1 · Report JSON</h2>
        <p className="ls-note">
          Accepts <code>report.json</code>, a CLI <code>scan.json</code>, a hosted
          preflight export, a repair plan, or <code>repair-proof.json</code>.
        </p>
        <label className="ls-drop">
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importReport(file);
            }}
          />
          <span>Choose a report file</span>
        </label>
        {reportError && (
          <div className="ls-reject" role="alert">
            <strong>Rejected — nothing was rendered from this file.</strong>
            <p>{reportError.reason}</p>
            <ul>
              {reportError.details.map((detail) => (
                <li key={detail}>
                  <code>{detail}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {report && reportFile && (
        <ReportView
          report={report}
          fileName={reportFile.name}
          fileBytes={reportFile.bytes}
          fileHash={reportFile.hash}
        />
      )}

      <section className="ls-section" aria-labelledby="import-shots">
        <h2 id="import-shots">2 · Screenshots ZIP</h2>
        <p className="ls-note">
          Reads the archive directory, then decodes each image from the bytes and
          hashes it here. Stored and deflated members are supported.
        </p>
        <label className="ls-drop">
          <input
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importScreenshots(file);
            }}
          />
          <span>Choose a screenshots archive</span>
        </label>
        {zipError && (
          <div className="ls-reject" role="alert">
            <strong>Archive not read.</strong>
            <p>{zipError}</p>
          </div>
        )}
        {zipInfo && (
          <p className="ls-note">
            {zipInfo.name} · {zipInfo.entries.length} member(s) listed in the
            central directory.
          </p>
        )}
        {shots.length > 0 && (
          <ul className="ls-render-strip">
            {shots.map((shot) => (
              <li key={shot.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot.url} alt={`Imported screenshot ${shot.name}`} />
                <div>
                  <b>{shot.name}</b>
                  <span>
                    {formatBytes(shot.bytes)} · CRC-32 {shot.crc32}
                  </span>
                  <code>{shot.sha256 ?? "SHA-256 unavailable in this context"}</code>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ls-section" aria-labelledby="import-history">
        <h2 id="import-history">Imported in this browser</h2>
        <p className="ls-note">
          LOCAL BROWSER STORAGE — this list lives in this browser only. It is not
          synced, shared or sent anywhere, and clearing site data removes it.
        </p>
        {history.length === 0 ? (
          <p className="ls-note">Nothing imported in this browser yet.</p>
        ) : (
          <div className="ls-scroll">
            <table className="ls-table ls-hash-table">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Scan</th>
                  <th scope="col">Issues</th>
                  <th scope="col">SHA-256</th>
                  <th scope="col">Imported</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={`${entry.fileName}-${entry.importedAt}`}>
                    <td>{entry.fileName}</td>
                    <td>{entry.label}</td>
                    <td>
                      <code>{entry.scanId ?? "—"}</code>
                    </td>
                    <td>{entry.issues}</td>
                    <td>
                      <code>{entry.sha256 ?? "—"}</code>
                    </td>
                    <td>{entry.importedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {history.length > 0 && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              window.localStorage.removeItem(HISTORY_KEY);
              setHistory([]);
            }}
          >
            Clear local browser storage
          </button>
        )}
      </section>

      <section className="ls-section ls-limits">
        <h2>Where these files come from</h2>
        <ul>
          <li>
            <code>pnpm bhashafix scan</code> writes the scan record and the
            screenshots into your project.
          </li>
          <li>
            <code>pnpm bhashafix repair</code> writes the repair plan and diff.
          </li>
          <li>
            <code>pnpm bhashafix verify</code> writes the proof capsule.
          </li>
        </ul>
        <div className="ls-actions">
          <Link className="button" href="/integrations/cli">
            Get the commands →
          </Link>
          <Link className="button button-secondary" href="/evidence">
            See a published example
          </Link>
        </div>
      </section>
    </>
  );
}
