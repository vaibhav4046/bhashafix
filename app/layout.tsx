import type { Metadata } from "next";
import repairProof from "../public/replay/repair-proof.json";
import "./globals.css";

const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000",
  ),
  title: {
    default: "BhashaFix — Ship every language without breaking the UI",
    template: "%s — BhashaFix",
  },
  description:
    "The open-source verification harness between AI-generated translations and production software.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "BhashaFix — Evidence before every global release",
    description:
      "Test, repair and prove every language before it reaches production.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "BhashaFix — Ship every language without breaking the UI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BhashaFix — Global localisation engineering",
    description: `Recorded AtlasPay replay: ${repairProof.baselineBlocking} verified failures → ${repairProof.finalBlocking} blocking failures · source locale ${repairProof.sourceLocaleRegression}`,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
