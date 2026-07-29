import { ZariyaPreview } from "../ZariyaPreview";

export default async function ZariyaLocale({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  return <ZariyaPreview locale={locale} fixed={query.state !== "broken"} />;
}
