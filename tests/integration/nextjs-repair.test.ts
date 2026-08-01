/**
 * Invariants of the Next.js source-repair proof.
 *
 * The receipt is produced by `pnpm repair:nextjs`. This suite does not trust it
 * on its own: every claim that can be re-derived from the working tree is
 * re-derived here - the diff is re-hashed, `git apply --check` is re-run, the
 * per-file hashes are checked against the real fixture source, and both scans
 * are read back from `.bhashafix/scans/<id>/scan.json`.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applySourceStrategy, SourceRepairError } from "@bhashafix/repair-engine";
import type { Scan } from "@bhashafix/shared";

const root = process.cwd();
const receiptPath = path.join(root, "artifacts", "nextjs-repair-proof.json");

const REPAIRED_RULES = [
  "BF-LOC-LANG-MISMATCH",
  "BF-LOC-DIR-MISSING",
  "BF-VIS-TEXT-OVERFLOW-X",
  "BF-LNG-RAW-KEY",
] as const;

type Receipt = {
  fixture: string;
  servingApproach: string;
  scanIds: { before: string; after: string };
  before: { scanId: string; total: number; blocking: number; blockingByRule: Record<string, number> };
  after: { scanId: string; total: number; blocking: number; blockingByRule: Record<string, number> };
  detections: Record<
    string,
    Array<{ issueId: string; locale: string; selector: string | null; measuredEvidence: Record<string, unknown> }>
  >;
  repair: {
    diffHash: string;
    changedFiles: number;
    changedLines: number;
    maxChangedFiles: number;
    maxChangedLines: number;
    maxDiffBytes: number;
    allowlist: string[];
    files: string[];
    strategies: Array<{
      ruleId: string;
      file: string;
      kind: string;
      issueIds: string[];
      beforeSha256: string;
      afterSha256: string;
    }>;
    dryRunFirst: boolean;
    gitApplyCheck: { exitCode: number };
    rollbackSnapshot: string[];
    diffPath: string;
  };
  assertions: {
    sourceLocaleBlockingBefore: number;
    sourceLocaleBlockingAfter: number;
    newBlockingIssues: number;
    repairedRuleBlockingAfter: Record<string, number>;
    totalBlockingBefore: number;
    totalBlockingAfter: number;
  };
  fixtureRestoredFromRollback: boolean;
  status: string;
  failures: string[];
};

function loadReceipt(): Receipt {
  if (!existsSync(receiptPath)) {
    throw new Error(
      `Missing ${receiptPath}. Generate it with: pnpm repair:nextjs`,
    );
  }
  return JSON.parse(readFileSync(receiptPath, "utf8")) as Receipt;
}

function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function loadScan(scanId: string): Scan {
  const file = path.join(root, ".bhashafix", "scans", scanId, "scan.json");
  return JSON.parse(readFileSync(file, "utf8")) as Scan;
}

describe("next.js source repair proof", () => {
  const receipt = loadReceipt();

  it("reports a verified run with no failures", () => {
    expect(receipt.status).toBe("verified");
    expect(receipt.failures).toEqual([]);
    expect(receipt.fixture).toBe("fixtures/nextjs-app");
    expect(receipt.servingApproach).toContain("next build");
  });

  it("detected all three seeded defect classes from measured evidence", () => {
    const lang = receipt.detections["BF-LOC-LANG-MISMATCH"];
    const dir = receipt.detections["BF-LOC-DIR-MISSING"];
    const overflow = receipt.detections["BF-VIS-TEXT-OVERFLOW-X"];
    const rawKey = receipt.detections["BF-LNG-RAW-KEY"];

    // A. wrong lang, missing dir
    expect(lang.map((entry) => entry.locale).sort()).toEqual(["ar-SA", "de-DE", "ja-JP"]);
    for (const entry of lang) {
      expect(entry.measuredEvidence.declaredLang).toBe("en");
      expect(entry.measuredEvidence.requestedLocale).toBe(entry.locale);
    }
    expect(dir).toHaveLength(1);
    expect(dir[0].locale).toBe("ar-SA");
    expect(dir[0].measuredEvidence).toMatchObject({ expectedDir: "rtl", script: "Arab" });
    expect(dir[0].measuredEvidence.declaredDir).not.toBe("rtl");

    // B. text overflow measured in real pixels, and actually clipped
    expect(overflow).toHaveLength(1);
    expect(overflow[0].locale).toBe("de-DE");
    expect(overflow[0].selector).toBe('[data-testid="cta-primary"]');
    const evidence = overflow[0].measuredEvidence as {
      scrollWidth: number;
      clientWidth: number;
      overflowPx: number;
      whiteSpace: string;
      overflowX: string;
      clipped: boolean;
    };
    expect(evidence.scrollWidth).toBeGreaterThan(evidence.clientWidth);
    expect(evidence.overflowPx).toBe(evidence.scrollWidth - evidence.clientWidth);
    expect(evidence.overflowPx).toBeGreaterThan(2);
    expect(evidence.whiteSpace).toBe("nowrap");
    expect(evidence.overflowX).toBe("hidden");
    expect(evidence.clipped).toBe(true);

    // C. raw translation key visible to users
    expect(rawKey).toHaveLength(1);
    expect(rawKey[0].locale).toBe("ja-JP");
    expect(rawKey[0].measuredEvidence.visibleText).toBe("cta.primary");
  });

  it("went from blocking issues to none without regressing the source locale", () => {
    expect(receipt.before.blocking).toBeGreaterThan(0);
    expect(receipt.before.blocking).toBe(receipt.assertions.totalBlockingBefore);
    expect(receipt.after.blocking).toBe(0);
    expect(receipt.after.total).toBe(0);
    expect(receipt.assertions.totalBlockingAfter).toBe(0);
    expect(receipt.assertions.newBlockingIssues).toBe(0);
    expect(receipt.assertions.sourceLocaleBlockingBefore).toBe(0);
    expect(receipt.assertions.sourceLocaleBlockingAfter).toBe(0);
    for (const ruleId of REPAIRED_RULES) {
      expect(receipt.before.blockingByRule[ruleId]).toBeGreaterThan(0);
      expect(receipt.assertions.repairedRuleBlockingAfter[ruleId]).toBe(0);
    }
  });

  it("records two distinct scans that match the scans written to disk", () => {
    expect(receipt.scanIds.before).not.toBe(receipt.scanIds.after);
    expect(receipt.before.scanId).toBe(receipt.scanIds.before);
    expect(receipt.after.scanId).toBe(receipt.scanIds.after);

    const before = loadScan(receipt.scanIds.before);
    const after = loadScan(receipt.scanIds.after);
    expect(before.issues).toHaveLength(receipt.before.total);
    expect(after.issues).toHaveLength(receipt.after.total);
    expect(before.issues.filter((issue) => issue.severity === "blocking")).toHaveLength(
      receipt.before.blocking,
    );
    expect(after.issues.filter((issue) => issue.severity === "blocking")).toHaveLength(0);
    // The two scans must be the same measurement, not two different questions.
    expect(after.config.locales).toEqual(before.config.locales);
    expect(after.config.routes).toEqual(before.config.routes);
    expect(after.config.viewports).toEqual(before.config.viewports);
    expect(after.config.sourceLocale).toEqual(before.config.sourceLocale);

    // Every issue the repair claimed to close was really in the before scan.
    const beforeIssueIds = new Set(before.issues.map((issue) => issue.issueId));
    for (const strategy of receipt.repair.strategies) {
      for (const issueId of strategy.issueIds) {
        expect(beforeIssueIds.has(issueId)).toBe(true);
      }
    }
  });

  it("carries a bounded diff whose hash matches the written patch", () => {
    const diff = readFileSync(path.join(root, receipt.repair.diffPath), "utf8");
    expect(sha256(diff)).toBe(receipt.repair.diffHash);
    expect(receipt.repair.diffHash).toMatch(/^[a-f0-9]{64}$/);

    const changedLines = diff
      .split("\n")
      .filter(
        (line) =>
          (line.startsWith("+") && !line.startsWith("+++")) ||
          (line.startsWith("-") && !line.startsWith("---")),
      ).length;
    expect(changedLines).toBe(receipt.repair.changedLines);
    expect(changedLines).toBeGreaterThan(0);
    expect(changedLines).toBeLessThanOrEqual(receipt.repair.maxChangedLines);
    expect(Buffer.byteLength(diff, "utf8")).toBeLessThanOrEqual(receipt.repair.maxDiffBytes);

    // The patch edits real source, not translation data alone.
    expect(diff).toContain("--- a/fixtures/nextjs-app/app/[locale]/layout.tsx");
    expect(diff).toContain("--- a/fixtures/nextjs-app/app/globals.css");
    expect(diff).toContain("--- a/fixtures/nextjs-app/messages/ja-JP.json");
    expect(diff).toContain('-    <html lang="en">');
    expect(diff).toContain("+    <html lang={locale} dir={textDirection(locale)}>");
    expect(diff).toContain("-  width: 168px;");
    expect(diff).toContain("-  white-space: nowrap;");
    expect(diff).toContain("+  max-width: 168px;");
    expect(diff).toContain('+  "cta.primary"');
  });

  it("stayed inside the allowlist and left a rollback snapshot", () => {
    expect(receipt.repair.dryRunFirst).toBe(true);
    expect(receipt.repair.gitApplyCheck.exitCode).toBe(0);
    expect(receipt.repair.changedFiles).toBe(receipt.repair.files.length);
    expect(receipt.repair.changedFiles).toBeLessThanOrEqual(receipt.repair.maxChangedFiles);
    for (const file of receipt.repair.files) {
      expect(receipt.repair.allowlist).toContain(file);
    }
    expect([...receipt.repair.rollbackSnapshot].sort()).toEqual([...receipt.repair.files].sort());
    expect(receipt.fixtureRestoredFromRollback).toBe(true);

    const kinds = receipt.repair.strategies.map((strategy) => strategy.kind).sort();
    expect(kinds).toEqual(["css-relax-text-clamp", "jsx-open-tag", "translation-key"]);
    for (const strategy of receipt.repair.strategies) {
      expect(strategy.issueIds.length).toBeGreaterThan(0);
      expect(strategy.beforeSha256).not.toBe(strategy.afterSha256);
    }
  });

  it("was measured against the fixture source that is on disk now", () => {
    // Binds the receipt to the working tree: a stale receipt cannot pass.
    for (const strategy of receipt.repair.strategies) {
      const current = readFileSync(path.join(root, strategy.file), "utf8");
      expect(sha256(current)).toBe(strategy.beforeSha256);
    }
  });

  it("produces a patch that still applies cleanly to the restored fixture", () => {
    const diffPath = path.join(root, receipt.repair.diffPath);
    expect(() =>
      execFileSync("git", ["apply", "--check", diffPath], { cwd: root, stdio: "pipe" }),
    ).not.toThrow();
  });
});

describe("source repair strategies fail loudly", () => {
  const layout = readFileSync(
    path.join(root, "fixtures/nextjs-app/app/[locale]/layout.tsx"),
    "utf8",
  );
  const css = readFileSync(path.join(root, "fixtures/nextjs-app/app/globals.css"), "utf8");
  const messages = readFileSync(
    path.join(root, "fixtures/nextjs-app/messages/ja-JP.json"),
    "utf8",
  );

  it("refuses a JSX anchor that is absent or already repaired", () => {
    expect(() =>
      applySourceStrategy(layout, {
        kind: "jsx-open-tag",
        expect: '<html lang="fr">',
        replace: "<html lang={locale}>",
      }),
    ).toThrow(SourceRepairError);

    const repaired = applySourceStrategy(layout, {
      kind: "jsx-open-tag",
      expect: '<html lang="en">',
      replace: "<html lang={locale} dir={textDirection(locale)}>",
      ensureNamedImport: { module: "../../lib/i18n", name: "textDirection" },
    });
    expect(repaired).toContain("import { LOCALES, textDirection }");
    // Re-running against the repaired text must throw, never silently no-op.
    expect(() =>
      applySourceStrategy(repaired, {
        kind: "jsx-open-tag",
        expect: '<html lang="en">',
        replace: "<html lang={locale} dir={textDirection(locale)}>",
      }),
    ).toThrow(/already contains/);
    // And a missing anchor is reported as a missing anchor.
    expect(() =>
      applySourceStrategy(repaired, {
        kind: "jsx-open-tag",
        expect: '<html lang="en">',
        replace: '<html lang="en-GB">',
      }),
    ).toThrow(/occurs 0 time\(s\)/);
  });

  it("refuses an ambiguous anchor rather than picking the first match", () => {
    const duplicated = `${layout}\n// <html lang="en">\n`;
    expect(() =>
      applySourceStrategy(duplicated, {
        kind: "jsx-open-tag",
        expect: '<html lang="en">',
        replace: "<html lang={locale}>",
      }),
    ).toThrow(/occurs 2 time\(s\)/);
  });

  it("refuses to invent an import statement that does not exist", () => {
    expect(() =>
      applySourceStrategy(layout, {
        kind: "jsx-open-tag",
        expect: '<html lang="en">',
        replace: "<html lang={locale} dir={rtl(locale)}>",
        ensureNamedImport: { module: "../../lib/nowhere", name: "rtl" },
      }),
    ).toThrow(/exactly one named import/);
  });

  it("refuses a CSS selector that is missing or does not clamp text", () => {
    expect(() =>
      applySourceStrategy(css, { kind: "css-relax-text-clamp", selector: ".nope" }),
    ).toThrow(/found 0/);
    expect(() =>
      applySourceStrategy(css, { kind: "css-relax-text-clamp", selector: ".page" }),
    ).toThrow(/neither a fixed width nor white-space: nowrap/);

    const relaxed = applySourceStrategy(css, {
      kind: "css-relax-text-clamp",
      selector: ".cta",
    });
    expect(relaxed).toContain("max-width: 168px;");
    expect(relaxed).not.toContain("white-space: nowrap;");
    // Nothing outside the matched rule may move.
    expect(relaxed).toContain(".cta-note {");
    expect(relaxed.replace("max-width: 168px;\n  ", "width: 168px;\n  white-space: nowrap;\n  ")).toBe(css);
  });

  it("refuses to overwrite an existing key or reformat a non-canonical file", () => {
    expect(() =>
      applySourceStrategy(messages, {
        kind: "translation-key",
        key: "cta.note",
        value: "x",
      }),
    ).toThrow(/already present/);
    expect(() =>
      applySourceStrategy(`  ${messages}`, {
        kind: "translation-key",
        key: "cta.primary",
        value: "無料で始める",
      }),
    ).toThrow(/canonical two-space JSON/);

    const inserted = JSON.parse(
      applySourceStrategy(messages, {
        kind: "translation-key",
        key: "cta.primary",
        value: "無料で始める",
      }),
    ) as Record<string, string>;
    expect(inserted["cta.primary"]).toBe("無料で始める");
    expect(inserted["cta.note"]).toBe(JSON.parse(messages)["cta.note"]);
  });

  // A checkout with core.autocrlf=true hands every strategy CRLF text. Rewriting
  // it as LF would turn a one-line insert into a whole-file diff.
  it("preserves CRLF line endings instead of reformatting the file", () => {
    const crlfMessages = messages.replaceAll("\n", "\r\n");
    const result = applySourceStrategy(crlfMessages, {
      kind: "translation-key",
      key: "cta.primary",
      value: "無料で始める",
    });
    expect(result.includes("\n")).toBe(true);
    expect(result.replaceAll("\r\n", "")).not.toContain("\n");
    expect(JSON.parse(result)["cta.primary"]).toBe("無料で始める");
    // Only the insert differs; every original line survives byte for byte.
    expect(result.replace(',\r\n  "cta.primary": "無料で始める"', "")).toBe(crlfMessages);
  });

  it("relaxes CRLF stylesheets and CRLF JSX without touching anything else", () => {
    const crlfCss = css.replaceAll("\n", "\r\n");
    const relaxed = applySourceStrategy(crlfCss, {
      kind: "css-relax-text-clamp",
      selector: ".cta",
    });
    expect(relaxed).toContain("max-width: 168px;");
    expect(relaxed).not.toContain("white-space: nowrap;");
    expect(relaxed.replaceAll("\r\n", "")).not.toContain("\n");

    const crlfLayout = layout.replaceAll("\n", "\r\n");
    const repaired = applySourceStrategy(crlfLayout, {
      kind: "jsx-open-tag",
      expect: '<html lang="en">',
      replace: "<html lang={locale} dir={textDirection(locale)}>",
      ensureNamedImport: { module: "../../lib/i18n", name: "textDirection" },
    });
    expect(repaired).toContain("<html lang={locale} dir={textDirection(locale)}>");
    expect(repaired).toContain("import { LOCALES, textDirection }");
    expect(repaired.replaceAll("\r\n", "")).not.toContain("\n");
  });
});
