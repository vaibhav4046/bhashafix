import type { Metadata } from "next";
import { AppShell } from "../product";
import { ImportConsole } from "./import-console";

export const metadata: Metadata = {
  title: "Report import console",
  description:
    "Open a BhashaFix report, screenshots archive or proof capsule in the browser. Files are parsed locally and never uploaded.",
};

export default function ImportPage() {
  return (
    <AppShell className="ls-page">
      <ImportConsole />
    </AppShell>
  );
}
