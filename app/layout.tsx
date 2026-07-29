import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BhashaFix — Ship every language without breaking the UI",
    template: "%s — BhashaFix",
  },
  description:
    "The open-source localization repair agent that renders, repairs, verifies, and proves multilingual UI fixes.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "BhashaFix — From broken locale to verified release",
    description:
      "Five real localization failures. One bounded repair. Zero regressions.",
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
    title: "BhashaFix — From broken locale to verified release",
    description: "5 defects → 0 defects · English PASS",
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
