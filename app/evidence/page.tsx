import type { Metadata } from "next";
import { AppShell } from "../product";
import { realScanEvidence } from "../lib/evidence";
import { EvidenceConsole } from "./evidence-console";

export const metadata: Metadata = {
  title: "Real external scans",
  description:
    "Published artifacts from three real Chromium scans run through the BhashaFix CLI: routes, locales, renders, issues and screenshot hashes.",
};

export default function EvidencePage() {
  const evidence = realScanEvidence();
  return (
    <AppShell className="ls-page">
      <EvidenceConsole
        generatedAt={evidence.generatedAt}
        limitations={evidence.limitations}
        scans={evidence.scans}
      />
    </AppShell>
  );
}
