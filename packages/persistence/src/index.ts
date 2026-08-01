/**
 * Durable scan persistence.
 *
 * The web app previously kept scan history in browser localStorage, so a scan
 * record existed only in the browser that created it and a /scan/<id> link was
 * not shareable. This module owns the authoritative store instead.
 *
 * Two drivers ship:
 *  - `SqliteScanStore` uses the Node built-in `node:sqlite`, so a local run and
 *    the CLI get real durable persistence with no dependency and no service.
 *  - `UnavailableScanStore` is returned when no durable target is configured.
 *    It refuses writes rather than pretending, so a hosted deployment without a
 *    database says so instead of silently losing scans.
 */
import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { Scan, ScanStatus } from "@bhashafix/shared";

export type ScanEvent = {
  scanId: string;
  at: string;
  stage: ScanStatus;
  message: string;
  detail?: Record<string, unknown>;
};

export type ArtifactRecord = {
  scanId: string;
  kind: "screenshot" | "dom" | "trace" | "report" | "patch" | "capsule";
  route: string | null;
  locale: string | null;
  viewport: string | null;
  filePath: string;
  byteLength: number;
  sha256: string;
};

export type ScanSummary = {
  scanId: string;
  origin: Scan["origin"];
  status: ScanStatus;
  target: string;
  startedAt: string;
  completedAt: string | null;
  issueCount: number;
  blockingCount: number;
  routeCount: number;
  localeCount: number;
};

export type ScanRecord = {
  summary: ScanSummary;
  scan: Scan;
  events: ScanEvent[];
  artifacts: ArtifactRecord[];
};

export interface ScanStore {
  readonly driver: string;
  readonly durable: boolean;
  init(): Promise<void>;
  saveScan(scan: Scan): Promise<void>;
  appendEvent(event: ScanEvent): Promise<void>;
  saveArtifact(artifact: ArtifactRecord): Promise<void>;
  getScan(scanId: string): Promise<ScanRecord | null>;
  listScans(limit?: number): Promise<ScanSummary[]>;
  deleteScan(scanId: string): Promise<boolean>;
  close(): Promise<void>;
}

function summarise(scan: Scan): ScanSummary {
  return {
    scanId: scan.scanId,
    origin: scan.origin,
    status: scan.status,
    target: scan.config.url ?? scan.config.projectRoot,
    startedAt: scan.startedAt,
    completedAt: scan.completedAt,
    issueCount: scan.issues.length,
    blockingCount: scan.issues.filter((issue) => issue.severity === "blocking").length,
    routeCount: scan.routesDiscovered.length,
    localeCount: scan.localesTested.length,
  };
}

/** Refuses writes so an unconfigured deployment cannot silently drop scans. */
export class UnavailableScanStore implements ScanStore {
  readonly driver = "unavailable";
  readonly durable = false;
  constructor(private readonly reason: string) {}
  async init() {}
  async saveScan(): Promise<never> {
    throw new Error(`Scan persistence is not configured: ${this.reason}`);
  }
  async appendEvent(): Promise<never> {
    throw new Error(`Scan persistence is not configured: ${this.reason}`);
  }
  async saveArtifact(): Promise<never> {
    throw new Error(`Scan persistence is not configured: ${this.reason}`);
  }
  async getScan() {
    return null;
  }
  async listScans() {
    return [];
  }
  async deleteScan() {
    return false;
  }
  async close() {}
}

type SqliteStatement = {
  run: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
};
type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
  close: () => void;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scans (
  scan_id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  status TEXT NOT NULL,
  target TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  issue_count INTEGER NOT NULL,
  blocking_count INTEGER NOT NULL,
  route_count INTEGER NOT NULL,
  locale_count INTEGER NOT NULL,
  engine_version TEXT NOT NULL,
  document TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scan_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL,
  at TEXT NOT NULL,
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  detail TEXT
);
CREATE TABLE IF NOT EXISTS scan_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  route TEXT,
  locale TEXT,
  viewport TEXT,
  file_path TEXT NOT NULL,
  byte_length INTEGER NOT NULL,
  sha256 TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scan_events_scan ON scan_events (scan_id);
CREATE INDEX IF NOT EXISTS scan_artifacts_scan ON scan_artifacts (scan_id);
CREATE INDEX IF NOT EXISTS scans_started ON scans (started_at DESC);
`;

export class SqliteScanStore implements ScanStore {
  readonly driver = "sqlite";
  readonly durable = true;
  private database: SqliteDatabase | null = null;

  constructor(private readonly file: string) {}

  async init() {
    if (this.database) return;
    await mkdir(path.dirname(this.file), { recursive: true });
    const sqlite = (await import("node:sqlite")) as unknown as {
      DatabaseSync: new (path: string) => SqliteDatabase;
    };
    this.database = new sqlite.DatabaseSync(this.file);
    this.database.exec(SCHEMA);
  }

  private db(): SqliteDatabase {
    if (!this.database) throw new Error("Scan store used before init().");
    return this.database;
  }

  async saveScan(scan: Scan) {
    const summary = summarise(scan);
    this.db()
      .prepare(
        `INSERT INTO scans (scan_id, origin, status, target, started_at, completed_at,
           issue_count, blocking_count, route_count, locale_count, engine_version, document)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scan_id) DO UPDATE SET
           status = excluded.status,
           completed_at = excluded.completed_at,
           issue_count = excluded.issue_count,
           blocking_count = excluded.blocking_count,
           route_count = excluded.route_count,
           locale_count = excluded.locale_count,
           document = excluded.document`,
      )
      .run(
        summary.scanId,
        summary.origin,
        summary.status,
        summary.target,
        summary.startedAt,
        summary.completedAt,
        summary.issueCount,
        summary.blockingCount,
        summary.routeCount,
        summary.localeCount,
        scan.engineVersion,
        JSON.stringify(scan),
      );
  }

  async appendEvent(event: ScanEvent) {
    this.db()
      .prepare(
        `INSERT INTO scan_events (scan_id, at, stage, message, detail) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        event.scanId,
        event.at,
        event.stage,
        event.message,
        event.detail ? JSON.stringify(event.detail) : null,
      );
  }

  async saveArtifact(artifact: ArtifactRecord) {
    this.db()
      .prepare(
        `INSERT INTO scan_artifacts (scan_id, kind, route, locale, viewport, file_path, byte_length, sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        artifact.scanId,
        artifact.kind,
        artifact.route,
        artifact.locale,
        artifact.viewport,
        artifact.filePath,
        artifact.byteLength,
        artifact.sha256,
      );
  }

  async getScan(scanId: string): Promise<ScanRecord | null> {
    const row = this.db()
      .prepare(`SELECT document FROM scans WHERE scan_id = ?`)
      .get(scanId) as { document?: string } | undefined;
    if (!row?.document) return null;
    const scan = JSON.parse(row.document) as Scan;
    const events = (
      this.db()
        .prepare(
          `SELECT scan_id, at, stage, message, detail FROM scan_events WHERE scan_id = ? ORDER BY id ASC`,
        )
        .all(scanId) as Array<{
        scan_id: string;
        at: string;
        stage: string;
        message: string;
        detail: string | null;
      }>
    ).map((event) => ({
      scanId: event.scan_id,
      at: event.at,
      stage: event.stage as ScanStatus,
      message: event.message,
      detail: event.detail ? (JSON.parse(event.detail) as Record<string, unknown>) : undefined,
    }));
    const artifacts = (
      this.db()
        .prepare(
          `SELECT scan_id, kind, route, locale, viewport, file_path, byte_length, sha256
           FROM scan_artifacts WHERE scan_id = ? ORDER BY id ASC`,
        )
        .all(scanId) as Array<Record<string, string | number | null>>
    ).map((artifact) => ({
      scanId: String(artifact.scan_id),
      kind: artifact.kind as ArtifactRecord["kind"],
      route: artifact.route === null ? null : String(artifact.route),
      locale: artifact.locale === null ? null : String(artifact.locale),
      viewport: artifact.viewport === null ? null : String(artifact.viewport),
      filePath: String(artifact.file_path),
      byteLength: Number(artifact.byte_length),
      sha256: String(artifact.sha256),
    }));
    return { summary: summarise(scan), scan, events, artifacts };
  }

  async listScans(limit = 50): Promise<ScanSummary[]> {
    return (
      this.db()
        .prepare(
          `SELECT scan_id, origin, status, target, started_at, completed_at,
                  issue_count, blocking_count, route_count, locale_count
           FROM scans ORDER BY started_at DESC LIMIT ?`,
        )
        .all(limit) as Array<Record<string, string | number | null>>
    ).map((row) => ({
      scanId: String(row.scan_id),
      origin: row.origin as Scan["origin"],
      status: row.status as ScanStatus,
      target: String(row.target),
      startedAt: String(row.started_at),
      completedAt: row.completed_at === null ? null : String(row.completed_at),
      issueCount: Number(row.issue_count),
      blockingCount: Number(row.blocking_count),
      routeCount: Number(row.route_count),
      localeCount: Number(row.locale_count),
    }));
  }

  async deleteScan(scanId: string) {
    const before = this.db()
      .prepare(`SELECT COUNT(*) AS total FROM scans WHERE scan_id = ?`)
      .get(scanId) as { total?: number } | undefined;
    if (!before?.total) return false;
    this.db().prepare(`DELETE FROM scan_events WHERE scan_id = ?`).run(scanId);
    this.db().prepare(`DELETE FROM scan_artifacts WHERE scan_id = ?`).run(scanId);
    this.db().prepare(`DELETE FROM scans WHERE scan_id = ?`).run(scanId);
    return true;
  }

  async close() {
    this.database?.close();
    this.database = null;
  }
}

export type ScanStoreOptions = {
  projectRoot?: string;
  /** Force a driver; otherwise chosen from the environment. */
  driver?: "sqlite" | "unavailable";
  file?: string;
};

export function scanStorePath(projectRoot: string) {
  return path.join(projectRoot, ".bhashafix", "scans.sqlite");
}

/**
 * Choose a store. A writable filesystem gets SQLite; a hosted deployment with
 * no configured database gets a store that refuses writes rather than lying.
 */
export async function createScanStore(
  options: ScanStoreOptions = {},
): Promise<ScanStore> {
  const projectRoot = options.projectRoot ?? process.cwd();
  if (options.driver === "unavailable") {
    return new UnavailableScanStore("driver explicitly disabled");
  }
  if (options.driver === "sqlite" || !process.env.VERCEL) {
    const store = new SqliteScanStore(options.file ?? scanStorePath(projectRoot));
    await store.init();
    return store;
  }
  return new UnavailableScanStore(
    "no DATABASE_URL is configured for this deployment, so hosted scans are returned inline and not stored server-side",
  );
}
