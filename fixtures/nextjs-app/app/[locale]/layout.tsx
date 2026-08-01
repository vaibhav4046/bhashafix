import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { LOCALES } from "../../lib/i18n";

export const metadata: Metadata = {
  title: "Meridian Pay",
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <html lang="en">
      <body data-locale={locale}>{children}</body>
    </html>
  );
}
