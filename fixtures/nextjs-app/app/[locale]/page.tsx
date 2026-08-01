import { loadMessages, translate } from "../../lib/i18n";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  const t = (key: string) => translate(messages, key);

  return (
    <main className="page">
      <p className="brand">{t("brand.name")}</p>
      <h1 className="hero-title">{t("hero.title")}</h1>
      <p className="hero-body">{t("hero.body")}</p>
      <p className="actions">
        <a className="cta" data-testid="cta-primary" href="#pricing">
          {t("cta.primary")}
        </a>
      </p>
      <p className="cta-note">{t("cta.note")}</p>
      <h2 className="section-title" id="pricing">
        {t("nav.pricing")}
      </h2>
      <p className="footer-legal">{t("footer.legal")}</p>
    </main>
  );
}
