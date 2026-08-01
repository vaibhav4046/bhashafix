/**
 * Benchmark fixture site for BhashaFix.
 *
 * Generates a realistic four-route payments product ("Meridian Pay") in six
 * locales, in two variants:
 *
 *   clean  - must produce ZERO issues under packages/browser/src/rules.ts at
 *            390x844, 768x1024 and 1440x900. This is the false-positive gate.
 *   broken - carries the labelled defects in SEEDED_DEFECTS, one root cause per
 *            entry, so precision and recall can be measured against ground truth.
 *
 * Determinism rules honoured by every page:
 *   - no JavaScript, no network requests, no web fonts (system stacks only)
 *   - all CSS inlined, all imagery inline SVG or a data: URI
 *   - overflow defects use explicit width/height + overflow:hidden so the
 *     measurement is unambiguous at any font fallback
 *   - every defect-carrying element has a data-testid and no id, so
 *     collectPageMeasurement's cssSelector() emits [data-testid="..."]
 */

export type Variant = "clean" | "broken";

export type SeededDefect = {
  id: string;
  ruleId: string;
  route: string;
  locale: string;
  viewports: string[];
  selector: string;
  note: string;
};

export const FIXTURE_LOCALES: string[] = [
  "en-GB",
  "de-DE",
  "ar-SA",
  "ja-JP",
  "hi-IN",
  "th-TH",
];

export const FIXTURE_ROUTES: string[] = [
  "/",
  "/pricing",
  "/checkout",
  "/settings",
];

const ALL_VIEWPORTS = ["mobile", "tablet", "desktop"];
/** 1180px content overflows 390px and 768px but fits inside a 1440px viewport. */
const NARROW_VIEWPORTS = ["mobile", "tablet"];

export const SEEDED_DEFECTS: SeededDefect[] = [
  // ---------------------------------------------------------------- route: /
  {
    id: "home-en-raw-key",
    ruleId: "BF-LNG-RAW-KEY",
    route: "/",
    locale: "en-GB",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="home-hero-eyebrow"]',
    note: "The hero eyebrow renders the lookup key home.hero.eyebrow instead of the resolved string.",
  },
  {
    id: "home-en-name-missing",
    ruleId: "BF-A11Y-NAME-MISSING",
    route: "/",
    locale: "en-GB",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="site-lang-button"]',
    note: "The icon-only language switcher lost its aria-label, so the control has no accessible name.",
  },
  {
    id: "home-de-lang-mismatch",
    ruleId: "BF-LOC-LANG-MISMATCH",
    route: "/",
    locale: "de-DE",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The de-DE route is served with <html lang=\"en-GB\">, so the localisation never applied.",
  },
  {
    id: "home-de-text-overflow-x",
    ruleId: "BF-VIS-TEXT-OVERFLOW-X",
    route: "/",
    locale: "de-DE",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="home-primary-cta"]',
    note: "The hero CTA keeps a 120px fixed width with white-space:nowrap and overflow:hidden, clipping the German label.",
  },
  {
    id: "home-ar-dir-missing",
    ruleId: "BF-LOC-DIR-MISSING",
    route: "/",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The Arabic document has no dir=\"rtl\", so the whole page is mirrored the wrong way.",
  },
  {
    id: "home-ar-img-alt-missing",
    ruleId: "BF-A11Y-IMG-ALT-MISSING",
    route: "/",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="home-partner-logo"]',
    note: "The first customer logo has no alt attribute in the Arabic build.",
  },
  {
    id: "home-ja-lang-missing",
    ruleId: "BF-LOC-LANG-MISSING",
    route: "/",
    locale: "ja-JP",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The Japanese document declares no language at all.",
  },
  {
    id: "home-ja-title-missing",
    ruleId: "BF-A11Y-TITLE-MISSING",
    route: "/",
    locale: "ja-JP",
    viewports: ALL_VIEWPORTS,
    selector: "title",
    note: "The <title> element is present but empty in the Japanese build.",
  },
  {
    id: "home-hi-text-clip-y",
    ruleId: "BF-VIS-TEXT-CLIP-Y",
    route: "/",
    locale: "hi-IN",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="home-hero-badge"]',
    note: "The compliance badge has a 14px fixed height with overflow:hidden, cutting the Devanagari line box in half.",
  },
  {
    id: "home-th-text-clip-y",
    ruleId: "BF-VIS-TEXT-CLIP-Y",
    route: "/",
    locale: "th-TH",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="home-hero-badge"]',
    note: "The same 14px fixed-height badge clips Thai ascenders and tone marks.",
  },
  {
    id: "home-th-raw-key",
    ruleId: "BF-LNG-RAW-KEY",
    route: "/",
    locale: "th-TH",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="home-hero-eyebrow"]',
    note: "The Thai dictionary is missing home.hero.eyebrow, so the key leaks to the page.",
  },

  // --------------------------------------------------------- route: /pricing
  {
    id: "pricing-en-viewport-overflow",
    ruleId: "BF-VIS-VIEWPORT-OVERFLOW",
    route: "/pricing",
    locale: "en-GB",
    viewports: NARROW_VIEWPORTS,
    selector: "html",
    note: "The regional fee strip is pinned to 1180px, so the document scrolls sideways at 390px and 768px but not at 1440px.",
  },
  {
    id: "pricing-de-text-overflow-x",
    ruleId: "BF-VIS-TEXT-OVERFLOW-X",
    route: "/pricing",
    locale: "de-DE",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="pricing-plan-cta"]',
    note: "The plan CTA is a 120px nowrap box; the German label needs roughly twice that.",
  },
  {
    id: "pricing-ar-dir-missing",
    ruleId: "BF-LOC-DIR-MISSING",
    route: "/pricing",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The Arabic pricing route is missing dir=\"rtl\".",
  },
  {
    id: "pricing-ar-hreflang-invalid",
    ruleId: "BF-LOC-HREFLANG-INVALID",
    route: "/pricing",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: 'link[hreflang="ar_SA"]',
    note: "The alternate link uses the POSIX form ar_SA instead of the BCP 47 tag ar-SA. Selector is the literal string rules.ts emits for this rule, which is not a data-testid selector.",
  },
  {
    id: "pricing-ja-raw-key",
    ruleId: "BF-LNG-RAW-KEY",
    route: "/pricing",
    locale: "ja-JP",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="pricing-enterprise-cta"]',
    note: "The enterprise CTA renders pricing.plan.enterprise.cta instead of the Japanese label.",
  },
  {
    id: "pricing-hi-name-missing",
    ruleId: "BF-A11Y-NAME-MISSING",
    route: "/pricing",
    locale: "hi-IN",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="pricing-compare-toggle"]',
    note: "The icon-only comparison toggle has no aria-label in the Hindi build.",
  },
  {
    id: "pricing-th-text-overflow-x",
    ruleId: "BF-VIS-TEXT-OVERFLOW-X",
    route: "/pricing",
    locale: "th-TH",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="pricing-plan-cta"]',
    note: "The same 120px nowrap CTA clips the Thai enterprise label.",
  },

  // -------------------------------------------------------- route: /checkout
  {
    id: "checkout-en-title-missing",
    ruleId: "BF-A11Y-TITLE-MISSING",
    route: "/checkout",
    locale: "en-GB",
    viewports: ALL_VIEWPORTS,
    selector: "title",
    note: "The checkout route ships an empty <title>.",
  },
  {
    id: "checkout-en-name-missing",
    ruleId: "BF-A11Y-NAME-MISSING",
    route: "/checkout",
    locale: "en-GB",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="checkout-note"]',
    note: "The delivery-note textarea is labelled by a styled <p>, not a real <label>, so it has no accessible name.",
  },
  {
    id: "checkout-de-viewport-overflow",
    ruleId: "BF-VIS-VIEWPORT-OVERFLOW",
    route: "/checkout",
    locale: "de-DE",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The German receipt strip is pinned to 1600px, so the document scrolls sideways at every viewport.",
  },
  {
    id: "checkout-ar-dir-missing",
    ruleId: "BF-LOC-DIR-MISSING",
    route: "/checkout",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The Arabic checkout route is missing dir=\"rtl\".",
  },
  {
    id: "checkout-ar-img-alt-missing",
    ruleId: "BF-A11Y-IMG-ALT-MISSING",
    route: "/checkout",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="checkout-card-logo"]',
    note: "The accepted-card mark has no alt attribute in the Arabic build.",
  },
  {
    id: "checkout-ja-lang-mismatch",
    ruleId: "BF-LOC-LANG-MISMATCH",
    route: "/checkout",
    locale: "ja-JP",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The ja-JP checkout is served with <html lang=\"en-GB\">.",
  },
  {
    id: "checkout-hi-img-alt-missing",
    ruleId: "BF-A11Y-IMG-ALT-MISSING",
    route: "/checkout",
    locale: "hi-IN",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="checkout-card-logo"]',
    note: "The accepted-card mark has no alt attribute in the Hindi build.",
  },
  {
    id: "checkout-th-text-clip-y",
    ruleId: "BF-VIS-TEXT-CLIP-Y",
    route: "/checkout",
    locale: "th-TH",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="checkout-total-label"]',
    note: "The total label sits in a 14px fixed-height box, clipping the Thai line box.",
  },

  // -------------------------------------------------------- route: /settings
  {
    id: "settings-en-lang-invalid",
    ruleId: "BF-LOC-LANG-INVALID",
    route: "/settings",
    locale: "en-GB",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The settings route declares <html lang=\"en_GB\">, which is not a BCP 47 tag.",
  },
  {
    id: "settings-de-hreflang-invalid",
    ruleId: "BF-LOC-HREFLANG-INVALID",
    route: "/settings",
    locale: "de-DE",
    viewports: ALL_VIEWPORTS,
    selector: 'link[hreflang="de_DE"]',
    note: "The alternate link uses de_DE instead of de-DE. Selector is the literal string rules.ts emits for this rule, which is not a data-testid selector.",
  },
  {
    id: "settings-ar-dir-missing",
    ruleId: "BF-LOC-DIR-MISSING",
    route: "/settings",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: "html",
    note: "The Arabic settings route is missing dir=\"rtl\".",
  },
  {
    id: "settings-ar-raw-key",
    ruleId: "BF-LNG-RAW-KEY",
    route: "/settings",
    locale: "ar-SA",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="settings-security-heading"]',
    note: "The security section heading renders settings.section.security instead of the Arabic string.",
  },
  {
    id: "settings-ja-text-overflow-x",
    ruleId: "BF-VIS-TEXT-OVERFLOW-X",
    route: "/settings",
    locale: "ja-JP",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="settings-timezone-value"]',
    note: "The reporting time zone is rendered in a 120px nowrap box, clipping the Japanese label.",
  },
  {
    id: "settings-hi-viewport-overflow",
    ruleId: "BF-VIS-VIEWPORT-OVERFLOW",
    route: "/settings",
    locale: "hi-IN",
    viewports: NARROW_VIEWPORTS,
    selector: "html",
    note: "The audit-trail strip is pinned to 1180px, so the document scrolls sideways at 390px and 768px only.",
  },
  {
    id: "settings-th-name-missing",
    ruleId: "BF-A11Y-NAME-MISSING",
    route: "/settings",
    locale: "th-TH",
    viewports: ALL_VIEWPORTS,
    selector: '[data-testid="settings-theme-toggle"]',
    note: "The icon-only theme toggle has no aria-label in the Thai build.",
  },
];

/* -------------------------------------------------------------------------- */
/* Localised copy                                                             */
/* -------------------------------------------------------------------------- */

type Feature = { title: string; body: string };
type Stat = { value: string; label: string };
type LineItem = { name: string; price: string };

type Copy = {
  brand: string;
  navLabel: string;
  nav: string[];
  langButton: string;
  titles: string[];
  logoAlt: string;
  home: {
    eyebrow: string;
    heading: string;
    sub: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badge: string;
    partnersHeading: string;
    featuresHeading: string;
    features: Feature[];
    statsHeading: string;
    stats: Stat[];
  };
  pricing: {
    heading: string;
    intro: string;
    caption: string;
    columns: string[];
    rows: string[][];
    compareToggle: string;
    planCta: string;
    enterpriseCta: string;
    stripHeading: string;
    regions: string[];
  };
  checkout: {
    heading: string;
    summaryHeading: string;
    items: LineItem[];
    totalLabel: string;
    total: string;
    formHeading: string;
    fields: string[];
    note: string;
    terms: string;
    submit: string;
    secure: string;
    cardAlt: string;
    acceptedHeading: string;
    receiptHeading: string;
    receiptColumns: string[];
  };
  settings: {
    heading: string;
    localeHeading: string;
    securityHeading: string;
    langLabel: string;
    tzLabel: string;
    tzValue: string;
    themeToggle: string;
    twoFactor: string;
    sessionLabel: string;
    sessionOptions: string[];
    auditHeading: string;
    auditColumns: string[];
    detailsSummary: string;
    detailsBody: string;
    dangerHeading: string;
    dangerBody: string;
    dangerCta: string;
    save: string;
  };
  footer: { legal: string; links: string[] };
};

const PARTNERS = ["Halden Retail", "Nordlys Travel", "Kite Studio"];

/** Endonyms stay in their own script in every locale, as real switchers do. */
const LANGUAGE_OPTIONS = [
  "English (United Kingdom)",
  "Deutsch",
  "العربية",
  "日本語",
  "हिन्दी",
  "ไทย",
];

const COPY: Record<string, Copy> = {
  "en-GB": {
    brand: "Meridian Pay",
    navLabel: "Main navigation",
    nav: ["Overview", "Pricing", "Checkout", "Settings"],
    langButton: "Change language",
    titles: [
      "Meridian Pay · Global payments infrastructure",
      "Pricing · Meridian Pay",
      "Checkout · Meridian Pay",
      "Settings · Meridian Pay",
    ],
    logoAlt: "{n} logo",
    home: {
      eyebrow: "Global payments",
      heading: "Payments that work in every language",
      sub: "Meridian Pay settles cards, wallets and bank transfers across 42 markets, with a checkout your customers can actually read.",
      ctaPrimary: "Open a payments account",
      ctaSecondary: "Talk to sales",
      badge: "PCI DSS Level 1 certified and live in 42 markets",
      partnersHeading: "Trusted by teams shipping in more than 30 languages",
      featuresHeading: "Why finance teams move to Meridian",
      features: [
        {
          title: "One integration, 42 markets",
          body: "Add a market from the dashboard. Local methods, currencies and tax rules switch on without another release.",
        },
        {
          title: "Checkout in the customer's language",
          body: "Every string, date and amount is formatted from the locale profile instead of a hard-coded template.",
        },
        {
          title: "Settlement you can reconcile",
          body: "Daily payouts arrive with a machine-readable statement that matches your ledger line for line.",
        },
      ],
      statsHeading: "Last quarter",
      stats: [
        { value: "99.99%", label: "Payment uptime" },
        { value: "1.4 s", label: "Median authorisation" },
        { value: "42", label: "Live markets" },
      ],
    },
    pricing: {
      heading: "Pricing that scales with volume",
      intro: "No setup fee and no monthly minimum. You pay per successful transaction and nothing else.",
      caption: "Plan comparison for card payments in the United Kingdom",
      columns: ["Feature", "Starter", "Growth", "Enterprise"],
      rows: [
        ["Transaction fee", "1.9% + 20p", "1.4% + 20p", "Negotiated"],
        ["Supported markets", "8", "24", "42"],
        ["Payout schedule", "Weekly", "Daily", "Daily"],
        ["Dedicated support", "Community", "Business hours", "Round the clock"],
      ],
      compareToggle: "Show the full feature comparison",
      planCta: "Choose Growth",
      enterpriseCta: "Contact sales",
      stripHeading: "Regional fee comparison",
      regions: [
        "United Kingdom",
        "Germany",
        "Saudi Arabia",
        "Japan",
        "India",
        "Thailand",
      ],
    },
    checkout: {
      heading: "Complete your payment",
      summaryHeading: "Order summary",
      items: [
        { name: "Growth plan, annual", price: "£1,188.00" },
        { name: "Additional market pack", price: "£240.00" },
        { name: "VAT (20%)", price: "£285.60" },
      ],
      totalLabel: "Total due today",
      total: "£1,713.60",
      formHeading: "Payment details",
      fields: [
        "Email address",
        "Name on card",
        "Card number",
        "Expiry (MM/YY)",
        "Security code",
        "Billing country",
      ],
      note: "Delivery note (optional)",
      terms: "I accept the payment terms and the privacy notice.",
      submit: "Pay £1,713.60",
      secure: "Payments are encrypted end to end and are never stored on our servers.",
      cardAlt: "Accepted card scheme",
      acceptedHeading: "Accepted here",
      receiptHeading: "Recent receipts",
      receiptColumns: ["Date", "Reference", "Method", "Status", "Amount"],
    },
    settings: {
      heading: "Workspace settings",
      localeHeading: "Language and region",
      securityHeading: "Security",
      langLabel: "Interface language",
      tzLabel: "Reporting time zone",
      tzValue: "Europe/London, British Summer Time (UTC+1)",
      themeToggle: "Switch to the dark theme",
      twoFactor: "Require two-factor authentication for every sign-in",
      sessionLabel: "Sign inactive sessions out after",
      sessionOptions: ["15 minutes", "1 hour", "8 hours"],
      auditHeading: "Audit trail",
      auditColumns: ["Time", "Actor", "Action", "Workspace", "Result"],
      detailsSummary: "How we store your settings",
      detailsBody: "Settings are stored per workspace and replicated to the region you selected. Changing the region moves the data within one billing cycle.",
      dangerHeading: "Danger zone",
      dangerBody: "Closing the workspace cancels every scheduled payout immediately.",
      dangerCta: "Close workspace",
      save: "Save changes",
    },
    footer: {
      legal: "© 2026 Meridian Pay Ltd. Registered in England and Wales.",
      links: ["Status", "Documentation", "Support"],
    },
  },

  "de-DE": {
    brand: "Meridian Pay",
    navLabel: "Hauptnavigation",
    nav: ["Übersicht", "Preise", "Kasse", "Einstellungen"],
    langButton: "Sprache wechseln",
    titles: [
      "Meridian Pay · Globale Zahlungsinfrastruktur",
      "Preise · Meridian Pay",
      "Kasse · Meridian Pay",
      "Einstellungen · Meridian Pay",
    ],
    logoAlt: "Logo von {n}",
    home: {
      eyebrow: "Globale Zahlungen",
      heading: "Zahlungen, die in jeder Sprache funktionieren",
      sub: "Meridian Pay wickelt Karten, Wallets und Banküberweisungen in 42 Märkten ab, mit einer Kasse, die Ihre Kundschaft wirklich lesen kann.",
      ctaPrimary: "Zahlungskonto eröffnen",
      ctaSecondary: "Vertrieb kontaktieren",
      badge: "PCI-DSS-Level-1-zertifiziert und in 42 Märkten aktiv",
      partnersHeading: "Genutzt von Teams, die in über 30 Sprachen ausliefern",
      featuresHeading: "Warum Finanzteams zu Meridian wechseln",
      features: [
        {
          title: "Eine Integration, 42 Märkte",
          body: "Neue Märkte aktivieren Sie im Dashboard. Lokale Zahlungsarten, Währungen und Steuerregeln greifen ohne weiteres Release.",
        },
        {
          title: "Kasse in der Sprache der Kundschaft",
          body: "Jeder Text, jedes Datum und jeder Betrag wird aus dem Sprachprofil formatiert, nicht aus einer fest verdrahteten Vorlage.",
        },
        {
          title: "Auszahlungen, die sich abstimmen lassen",
          body: "Tägliche Auszahlungen kommen mit einem maschinenlesbaren Beleg, der Zeile für Zeile zu Ihrer Buchhaltung passt.",
        },
      ],
      statsHeading: "Letztes Quartal",
      stats: [
        { value: "99,99 %", label: "Verfügbarkeit" },
        { value: "1,4 s", label: "Mittlere Autorisierung" },
        { value: "42", label: "Aktive Märkte" },
      ],
    },
    pricing: {
      heading: "Preise, die mit dem Volumen wachsen",
      intro: "Keine Einrichtungsgebühr und kein monatlicher Mindestumsatz. Sie zahlen pro erfolgreicher Transaktion und sonst nichts.",
      caption: "Tarifvergleich für Kartenzahlungen in Deutschland",
      columns: ["Leistung", "Starter", "Wachstum", "Unternehmen"],
      rows: [
        ["Transaktionsgebühr", "1,9 % + 0,20 €", "1,4 % + 0,20 €", "Nach Vereinbarung"],
        ["Unterstützte Märkte", "8", "24", "42"],
        ["Auszahlungsrhythmus", "Wöchentlich", "Täglich", "Täglich"],
        ["Dedizierter Support", "Community", "Geschäftszeiten", "Rund um die Uhr"],
      ],
      compareToggle: "Vollständigen Leistungsvergleich anzeigen",
      planCta: "Unternehmenstarif auswählen",
      enterpriseCta: "Vertrieb kontaktieren",
      stripHeading: "Regionaler Gebührenvergleich",
      regions: [
        "Vereinigtes Königreich",
        "Deutschland",
        "Saudi-Arabien",
        "Japan",
        "Indien",
        "Thailand",
      ],
    },
    checkout: {
      heading: "Zahlung abschließen",
      summaryHeading: "Bestellübersicht",
      items: [
        { name: "Wachstumstarif, jährlich", price: "1.188,00 €" },
        { name: "Zusatzpaket Märkte", price: "240,00 €" },
        { name: "MwSt. (19 %)", price: "271,32 €" },
      ],
      totalLabel: "Heute fälliger Gesamtbetrag",
      total: "1.699,32 €",
      formHeading: "Zahlungsdaten",
      fields: [
        "E-Mail-Adresse",
        "Name auf der Karte",
        "Kartennummer",
        "Gültig bis (MM/JJ)",
        "Prüfziffer",
        "Rechnungsland",
      ],
      note: "Lieferhinweis (optional)",
      terms: "Ich akzeptiere die Zahlungsbedingungen und die Datenschutzerklärung.",
      submit: "1.699,32 € zahlen",
      secure: "Zahlungen sind Ende zu Ende verschlüsselt und werden nie auf unseren Servern gespeichert.",
      cardAlt: "Akzeptierte Kartenmarke",
      acceptedHeading: "Hier akzeptiert",
      receiptHeading: "Letzte Belege",
      receiptColumns: ["Datum", "Referenz", "Methode", "Status", "Betrag"],
    },
    settings: {
      heading: "Workspace-Einstellungen",
      localeHeading: "Sprache und Region",
      securityHeading: "Sicherheit",
      langLabel: "Oberflächensprache",
      tzLabel: "Zeitzone für Berichte",
      tzValue: "Europa/Berlin, Mitteleuropäische Sommerzeit (UTC+2)",
      themeToggle: "Zum dunklen Design wechseln",
      twoFactor: "Zwei-Faktor-Authentifizierung bei jeder Anmeldung verlangen",
      sessionLabel: "Inaktive Sitzungen abmelden nach",
      sessionOptions: ["15 Minuten", "1 Stunde", "8 Stunden"],
      auditHeading: "Prüfprotokoll",
      auditColumns: ["Zeit", "Person", "Aktion", "Workspace", "Ergebnis"],
      detailsSummary: "Wie wir Ihre Einstellungen speichern",
      detailsBody: "Einstellungen werden pro Workspace gespeichert und in die gewählte Region repliziert. Ein Regionswechsel verschiebt die Daten innerhalb eines Abrechnungszeitraums.",
      dangerHeading: "Gefahrenbereich",
      dangerBody: "Beim Schließen des Workspace werden alle geplanten Auszahlungen sofort storniert.",
      dangerCta: "Workspace schließen",
      save: "Änderungen speichern",
    },
    footer: {
      legal: "© 2026 Meridian Pay Ltd. Eingetragen in England und Wales.",
      links: ["Status", "Dokumentation", "Support"],
    },
  },

  "ar-SA": {
    brand: "ميريديان باي",
    navLabel: "التنقل الرئيسي",
    nav: ["نظرة عامة", "الأسعار", "الدفع", "الإعدادات"],
    langButton: "تغيير اللغة",
    titles: [
      "ميريديان باي · بنية تحتية عالمية للمدفوعات",
      "الأسعار · ميريديان باي",
      "الدفع · ميريديان باي",
      "الإعدادات · ميريديان باي",
    ],
    logoAlt: "شعار {n}",
    home: {
      eyebrow: "مدفوعات عالمية",
      heading: "مدفوعات تعمل بكل لغة",
      sub: "تسوّي ميريديان باي مدفوعات البطاقات والمحافظ والتحويلات المصرفية في ٤٢ سوقاً، مع صفحة دفع يستطيع عملاؤك قراءتها فعلاً.",
      ctaPrimary: "افتح حساب مدفوعات",
      ctaSecondary: "تحدث إلى المبيعات",
      badge: "معتمد وفق معيار PCI DSS المستوى الأول ونشط في ٤٢ سوقاً",
      partnersHeading: "تثق بنا فرق تعمل بأكثر من ٣٠ لغة",
      featuresHeading: "لماذا تنتقل الفرق المالية إلى ميريديان",
      features: [
        {
          title: "تكامل واحد و٤٢ سوقاً",
          body: "أضف سوقاً جديدة من لوحة التحكم. تُفعَّل طرق الدفع المحلية والعملات وقواعد الضريبة دون إصدار جديد.",
        },
        {
          title: "صفحة دفع بلغة العميل",
          body: "يُنسَّق كل نص وتاريخ ومبلغ من ملف اللغة، لا من قالب ثابت في الشيفرة.",
        },
        {
          title: "تسويات قابلة للمطابقة",
          body: "تصل التحويلات اليومية مع كشف قابل للقراءة آلياً يطابق دفاترك سطراً بسطر.",
        },
      ],
      statsHeading: "الربع الأخير",
      stats: [
        { value: "٩٩٫٩٩٪", label: "جاهزية المدفوعات" },
        { value: "١٫٤ ث", label: "وسيط زمن التفويض" },
        { value: "٤٢", label: "أسواق نشطة" },
      ],
    },
    pricing: {
      heading: "تسعير ينمو مع حجم أعمالك",
      intro: "بدون رسوم إعداد وبدون حد أدنى شهري. تدفع مقابل كل عملية ناجحة فقط.",
      caption: "مقارنة الباقات لمدفوعات البطاقات في المملكة العربية السعودية",
      columns: ["الميزة", "المبتدئة", "النمو", "المؤسسات"],
      rows: [
        ["رسوم العملية", "١٫٩٪ + ١ ريال", "١٫٤٪ + ١ ريال", "حسب الاتفاق"],
        ["الأسواق المدعومة", "٨", "٢٤", "٤٢"],
        ["جدول التحويل", "أسبوعي", "يومي", "يومي"],
        ["دعم مخصص", "المجتمع", "ساعات العمل", "على مدار الساعة"],
      ],
      compareToggle: "عرض المقارنة الكاملة للميزات",
      planCta: "اختر باقة النمو",
      enterpriseCta: "تواصل مع المبيعات",
      stripHeading: "مقارنة الرسوم حسب المنطقة",
      regions: [
        "المملكة المتحدة",
        "ألمانيا",
        "السعودية",
        "اليابان",
        "الهند",
        "تايلاند",
      ],
    },
    checkout: {
      heading: "أكمل عملية الدفع",
      summaryHeading: "ملخص الطلب",
      items: [
        { name: "باقة النمو، سنوية", price: "٥٬٩٤٠٫٠٠ ريال" },
        { name: "حزمة أسواق إضافية", price: "١٬٢٠٠٫٠٠ ريال" },
        { name: "ضريبة القيمة المضافة (١٥٪)", price: "١٬٠٧١٫٠٠ ريال" },
      ],
      totalLabel: "الإجمالي المستحق اليوم",
      total: "٨٬٢١١٫٠٠ ريال",
      formHeading: "بيانات الدفع",
      fields: [
        "البريد الإلكتروني",
        "الاسم على البطاقة",
        "رقم البطاقة",
        "تاريخ الانتهاء (شهر/سنة)",
        "رمز الأمان",
        "بلد الفوترة",
      ],
      note: "ملاحظة التسليم (اختياري)",
      terms: "أوافق على شروط الدفع وإشعار الخصوصية.",
      submit: "ادفع ٨٬٢١١٫٠٠ ريال",
      secure: "المدفوعات مشفّرة من الطرف إلى الطرف ولا تُخزَّن على خوادمنا.",
      cardAlt: "علامة البطاقة المقبولة",
      acceptedHeading: "مقبولة هنا",
      receiptHeading: "أحدث الإيصالات",
      receiptColumns: ["التاريخ", "المرجع", "الطريقة", "الحالة", "المبلغ"],
    },
    settings: {
      heading: "إعدادات مساحة العمل",
      localeHeading: "اللغة والمنطقة",
      securityHeading: "الأمان",
      langLabel: "لغة الواجهة",
      tzLabel: "المنطقة الزمنية للتقارير",
      tzValue: "آسيا/الرياض، التوقيت العربي القياسي (UTC+3)",
      themeToggle: "التبديل إلى المظهر الداكن",
      twoFactor: "طلب المصادقة الثنائية عند كل تسجيل دخول",
      sessionLabel: "تسجيل خروج الجلسات الخاملة بعد",
      sessionOptions: ["١٥ دقيقة", "ساعة واحدة", "٨ ساعات"],
      auditHeading: "سجل التدقيق",
      auditColumns: ["الوقت", "المستخدم", "الإجراء", "مساحة العمل", "النتيجة"],
      detailsSummary: "كيف نحفظ إعداداتك",
      detailsBody: "تُحفظ الإعدادات لكل مساحة عمل وتُنسخ إلى المنطقة التي اخترتها. تغيير المنطقة ينقل البيانات خلال دورة فوترة واحدة.",
      dangerHeading: "منطقة الخطر",
      dangerBody: "إغلاق مساحة العمل يلغي كل التحويلات المجدولة فوراً.",
      dangerCta: "إغلاق مساحة العمل",
      save: "حفظ التغييرات",
    },
    footer: {
      legal: "© ٢٠٢٦ ميريديان باي المحدودة. مسجلة في إنجلترا وويلز.",
      links: ["الحالة", "التوثيق", "الدعم"],
    },
  },

  "ja-JP": {
    brand: "Meridian Pay",
    navLabel: "メインナビゲーション",
    nav: ["概要", "料金", "お支払い", "設定"],
    langButton: "言語を変更する",
    titles: [
      "Meridian Pay · グローバル決済インフラ",
      "料金 · Meridian Pay",
      "お支払い · Meridian Pay",
      "設定 · Meridian Pay",
    ],
    logoAlt: "{n} のロゴ",
    home: {
      eyebrow: "グローバル決済",
      heading: "あらゆる言語で機能する決済",
      sub: "Meridian Pay は 42 の市場でカード、ウォレット、銀行振込を精算し、お客様が実際に読める決済画面を提供します。",
      ctaPrimary: "決済アカウントを開設",
      ctaSecondary: "営業に問い合わせる",
      badge: "PCI DSS レベル 1 認証を取得し、42 市場で稼働中",
      partnersHeading: "30 以上の言語で提供するチームに選ばれています",
      featuresHeading: "財務チームが Meridian を選ぶ理由",
      features: [
        {
          title: "1 つの連携で 42 市場へ",
          body: "市場はダッシュボードから追加できます。現地の決済手段、通貨、税規則は再リリースなしで有効になります。",
        },
        {
          title: "お客様の言語で表示する決済画面",
          body: "すべての文言、日付、金額はロケールプロファイルから整形され、固定のテンプレートには依存しません。",
        },
        {
          title: "照合できる入金",
          body: "毎日の入金には、帳簿と 1 行ずつ一致する機械可読の明細が付きます。",
        },
      ],
      statsHeading: "前四半期",
      stats: [
        { value: "99.99%", label: "決済稼働率" },
        { value: "1.4 秒", label: "認証時間の中央値" },
        { value: "42", label: "稼働中の市場" },
      ],
    },
    pricing: {
      heading: "取引量に応じてスケールする料金",
      intro: "初期費用も月額最低利用料もありません。成功した取引ごとにのみお支払いいただきます。",
      caption: "日本国内のカード決済に関するプラン比較",
      columns: ["機能", "スターター", "グロース", "エンタープライズ"],
      rows: [
        ["取引手数料", "1.9% + 30 円", "1.4% + 30 円", "個別見積"],
        ["対応市場数", "8", "24", "42"],
        ["入金サイクル", "週次", "日次", "日次"],
        ["専任サポート", "コミュニティ", "営業時間内", "24 時間 365 日"],
      ],
      compareToggle: "機能の全比較を表示",
      planCta: "グロースを選択",
      enterpriseCta: "営業に問い合わせる",
      stripHeading: "地域別の手数料比較",
      regions: ["イギリス", "ドイツ", "サウジアラビア", "日本", "インド", "タイ"],
    },
    checkout: {
      heading: "お支払いを完了する",
      summaryHeading: "ご注文内容",
      items: [
        { name: "グロースプラン（年額）", price: "¥178,200" },
        { name: "追加市場パック", price: "¥36,000" },
        { name: "消費税（10%）", price: "¥21,420" },
      ],
      totalLabel: "本日のお支払い合計",
      total: "¥235,620",
      formHeading: "お支払い情報",
      fields: [
        "メールアドレス",
        "カード名義",
        "カード番号",
        "有効期限（月/年）",
        "セキュリティコード",
        "請求先の国",
      ],
      note: "配送メモ（任意）",
      terms: "支払い条件とプライバシー通知に同意します。",
      submit: "¥235,620 を支払う",
      secure: "お支払い情報はエンドツーエンドで暗号化され、当社のサーバーには保存されません。",
      cardAlt: "利用可能なカードブランド",
      acceptedHeading: "ご利用いただけます",
      receiptHeading: "最近の領収書",
      receiptColumns: ["日付", "参照番号", "決済手段", "ステータス", "金額"],
    },
    settings: {
      heading: "ワークスペース設定",
      localeHeading: "言語と地域",
      securityHeading: "セキュリティ",
      langLabel: "表示言語",
      tzLabel: "レポートのタイムゾーン",
      tzValue: "アジア/東京、日本標準時（UTC+9）",
      themeToggle: "ダークテーマに切り替える",
      twoFactor: "サインインのたびに二要素認証を要求する",
      sessionLabel: "非アクティブなセッションをサインアウトするまでの時間",
      sessionOptions: ["15 分", "1 時間", "8 時間"],
      auditHeading: "監査ログ",
      auditColumns: ["時刻", "実行者", "操作", "ワークスペース", "結果"],
      detailsSummary: "設定の保存方法について",
      detailsBody: "設定はワークスペースごとに保存され、選択した地域に複製されます。地域を変更すると、1 回の請求サイクル以内にデータが移動します。",
      dangerHeading: "危険な操作",
      dangerBody: "ワークスペースを閉じると、予定されている入金がすべて即座に取り消されます。",
      dangerCta: "ワークスペースを閉じる",
      save: "変更を保存",
    },
    footer: {
      legal: "© 2026 Meridian Pay Ltd. イングランドおよびウェールズで登記。",
      links: ["ステータス", "ドキュメント", "サポート"],
    },
  },

  "hi-IN": {
    brand: "Meridian Pay",
    navLabel: "मुख्य नेविगेशन",
    nav: ["अवलोकन", "मूल्य निर्धारण", "चेकआउट", "सेटिंग्स"],
    langButton: "भाषा बदलें",
    titles: [
      "Meridian Pay · वैश्विक भुगतान अवसंरचना",
      "मूल्य निर्धारण · Meridian Pay",
      "चेकआउट · Meridian Pay",
      "सेटिंग्स · Meridian Pay",
    ],
    logoAlt: "{n} का लोगो",
    home: {
      eyebrow: "वैश्विक भुगतान",
      heading: "हर भाषा में काम करने वाले भुगतान",
      sub: "Meridian Pay 42 बाज़ारों में कार्ड, वॉलेट और बैंक ट्रांसफ़र का निपटान करता है, और ऐसा चेकआउट देता है जिसे आपके ग्राहक सचमुच पढ़ सकें।",
      ctaPrimary: "भुगतान खाता खोलें",
      ctaSecondary: "बिक्री टीम से बात करें",
      badge: "PCI DSS स्तर 1 प्रमाणित और 42 बाज़ारों में सक्रिय",
      partnersHeading: "30 से अधिक भाषाओं में काम करने वाली टीमों का भरोसा",
      featuresHeading: "वित्त टीमें Meridian क्यों चुनती हैं",
      features: [
        {
          title: "एक इंटीग्रेशन, 42 बाज़ार",
          body: "डैशबोर्ड से नया बाज़ार जोड़ें। स्थानीय भुगतान विधियाँ, मुद्राएँ और कर नियम बिना नई रिलीज़ के सक्रिय हो जाते हैं।",
        },
        {
          title: "ग्राहक की भाषा में चेकआउट",
          body: "हर वाक्य, तारीख़ और राशि लोकेल प्रोफ़ाइल से बनती है, किसी तय टेम्पलेट से नहीं।",
        },
        {
          title: "मिलान योग्य निपटान",
          body: "रोज़ाना भुगतान के साथ मशीन-पठनीय विवरण आता है जो आपके बहीखाते से पंक्ति दर पंक्ति मेल खाता है।",
        },
      ],
      statsHeading: "पिछली तिमाही",
      stats: [
        { value: "99.99%", label: "भुगतान अपटाइम" },
        { value: "1.4 से", label: "औसत प्राधिकरण समय" },
        { value: "42", label: "सक्रिय बाज़ार" },
      ],
    },
    pricing: {
      heading: "मात्रा के साथ बढ़ने वाला मूल्य निर्धारण",
      intro: "कोई सेटअप शुल्क नहीं और कोई मासिक न्यूनतम नहीं। आप केवल हर सफल लेनदेन पर भुगतान करते हैं।",
      caption: "भारत में कार्ड भुगतान के लिए योजना तुलना",
      columns: ["सुविधा", "स्टार्टर", "ग्रोथ", "एंटरप्राइज़"],
      rows: [
        ["लेनदेन शुल्क", "1.9% + ₹2", "1.4% + ₹2", "बातचीत के अनुसार"],
        ["समर्थित बाज़ार", "8", "24", "42"],
        ["भुगतान चक्र", "साप्ताहिक", "दैनिक", "दैनिक"],
        ["समर्पित सहायता", "समुदाय", "कार्य समय", "चौबीसों घंटे"],
      ],
      compareToggle: "पूरी सुविधा तुलना दिखाएँ",
      planCta: "ग्रोथ चुनें",
      enterpriseCta: "बिक्री से संपर्क करें",
      stripHeading: "क्षेत्रवार शुल्क तुलना",
      regions: ["यूनाइटेड किंगडम", "जर्मनी", "सऊदी अरब", "जापान", "भारत", "थाईलैंड"],
    },
    checkout: {
      heading: "अपना भुगतान पूरा करें",
      summaryHeading: "ऑर्डर सारांश",
      items: [
        { name: "ग्रोथ योजना, वार्षिक", price: "₹1,18,800" },
        { name: "अतिरिक्त बाज़ार पैक", price: "₹24,000" },
        { name: "जीएसटी (18%)", price: "₹25,704" },
      ],
      totalLabel: "आज देय कुल राशि",
      total: "₹1,68,504",
      formHeading: "भुगतान विवरण",
      fields: [
        "ईमेल पता",
        "कार्ड पर नाम",
        "कार्ड नंबर",
        "समाप्ति (माह/वर्ष)",
        "सुरक्षा कोड",
        "बिलिंग देश",
      ],
      note: "डिलीवरी नोट (वैकल्पिक)",
      terms: "मैं भुगतान शर्तें और गोपनीयता सूचना स्वीकार करता हूँ।",
      submit: "₹1,68,504 का भुगतान करें",
      secure: "भुगतान एंड टू एंड एन्क्रिप्टेड हैं और हमारे सर्वर पर कभी संग्रहीत नहीं होते।",
      cardAlt: "स्वीकृत कार्ड ब्रांड",
      acceptedHeading: "यहाँ स्वीकार्य",
      receiptHeading: "हाल की रसीदें",
      receiptColumns: ["तारीख़", "संदर्भ", "माध्यम", "स्थिति", "राशि"],
    },
    settings: {
      heading: "वर्कस्पेस सेटिंग्स",
      localeHeading: "भाषा और क्षेत्र",
      securityHeading: "सुरक्षा",
      langLabel: "इंटरफ़ेस भाषा",
      tzLabel: "रिपोर्टिंग समय क्षेत्र",
      tzValue: "एशिया/कोलकाता, भारतीय मानक समय (UTC+5:30)",
      themeToggle: "डार्क थीम पर स्विच करें",
      twoFactor: "हर साइन-इन पर दो-चरणीय प्रमाणीकरण अनिवार्य करें",
      sessionLabel: "निष्क्रिय सत्र इतने समय बाद साइन आउट करें",
      sessionOptions: ["15 मिनट", "1 घंटा", "8 घंटे"],
      auditHeading: "ऑडिट ट्रेल",
      auditColumns: ["समय", "कर्ता", "कार्य", "वर्कस्पेस", "परिणाम"],
      detailsSummary: "हम आपकी सेटिंग्स कैसे संग्रहीत करते हैं",
      detailsBody: "सेटिंग्स प्रति वर्कस्पेस संग्रहीत होती हैं और आपके चुने हुए क्षेत्र में प्रतिकृत की जाती हैं। क्षेत्र बदलने पर डेटा एक बिलिंग चक्र के भीतर स्थानांतरित हो जाता है।",
      dangerHeading: "जोखिम क्षेत्र",
      dangerBody: "वर्कस्पेस बंद करने पर सभी निर्धारित भुगतान तुरंत रद्द हो जाते हैं।",
      dangerCta: "वर्कस्पेस बंद करें",
      save: "परिवर्तन सहेजें",
    },
    footer: {
      legal: "© 2026 Meridian Pay Ltd. इंग्लैंड और वेल्स में पंजीकृत।",
      links: ["स्थिति", "दस्तावेज़", "सहायता"],
    },
  },

  "th-TH": {
    brand: "Meridian Pay",
    navLabel: "การนำทางหลัก",
    nav: ["ภาพรวม", "ราคา", "ชำระเงิน", "การตั้งค่า"],
    langButton: "เปลี่ยนภาษา",
    titles: [
      "Meridian Pay · โครงสร้างพื้นฐานการชำระเงินระดับโลก",
      "ราคา · Meridian Pay",
      "ชำระเงิน · Meridian Pay",
      "การตั้งค่า · Meridian Pay",
    ],
    logoAlt: "โลโก้ {n}",
    home: {
      eyebrow: "การชำระเงินระดับโลก",
      heading: "การชำระเงินที่ใช้ได้ทุกภาษา",
      sub: "Meridian Pay ชำระบัญชีบัตร วอลเล็ต และการโอนผ่านธนาคารใน 42 ตลาด พร้อมหน้าชำระเงินที่ลูกค้าของคุณอ่านได้จริง",
      ctaPrimary: "เปิดบัญชีรับชำระเงิน",
      ctaSecondary: "ติดต่อฝ่ายขาย",
      badge: "ได้รับการรับรอง PCI DSS ระดับ 1 และเปิดใช้งานใน 42 ตลาด",
      partnersHeading: "ได้รับความไว้วางใจจากทีมที่ทำงานมากกว่า 30 ภาษา",
      featuresHeading: "ทำไมทีมการเงินจึงเลือก Meridian",
      features: [
        {
          title: "เชื่อมต่อครั้งเดียว ครอบคลุม 42 ตลาด",
          body: "เพิ่มตลาดใหม่ได้จากแดชบอร์ด วิธีชำระเงินท้องถิ่น สกุลเงิน และกฎภาษีจะเปิดใช้งานโดยไม่ต้องปล่อยเวอร์ชันใหม่",
        },
        {
          title: "หน้าชำระเงินในภาษาของลูกค้า",
          body: "ทุกข้อความ วันที่ และจำนวนเงินถูกจัดรูปแบบจากโปรไฟล์ภาษา ไม่ใช่จากเทมเพลตตายตัว",
        },
        {
          title: "การโอนเงินที่กระทบยอดได้",
          body: "การโอนรายวันมาพร้อมใบแจ้งยอดที่เครื่องอ่านได้และตรงกับบัญชีของคุณทีละบรรทัด",
        },
      ],
      statsHeading: "ไตรมาสที่ผ่านมา",
      stats: [
        { value: "99.99%", label: "เวลาให้บริการ" },
        { value: "1.4 วิ", label: "เวลาอนุมัติเฉลี่ย" },
        { value: "42", label: "ตลาดที่เปิดใช้งาน" },
      ],
    },
    pricing: {
      heading: "ราคาที่ปรับตามปริมาณธุรกรรม",
      intro: "ไม่มีค่าติดตั้งและไม่มีขั้นต่ำรายเดือน คุณจ่ายต่อธุรกรรมที่สำเร็จเท่านั้น",
      caption: "เปรียบเทียบแพ็กเกจสำหรับการชำระด้วยบัตรในประเทศไทย",
      columns: ["คุณสมบัติ", "เริ่มต้น", "เติบโต", "องค์กร"],
      rows: [
        ["ค่าธรรมเนียมต่อรายการ", "1.9% + 3 บาท", "1.4% + 3 บาท", "ตามข้อตกลง"],
        ["ตลาดที่รองรับ", "8", "24", "42"],
        ["รอบการโอนเงิน", "รายสัปดาห์", "รายวัน", "รายวัน"],
        ["ทีมดูแลเฉพาะ", "ชุมชน", "เวลาทำการ", "ตลอด 24 ชั่วโมง"],
      ],
      compareToggle: "แสดงการเปรียบเทียบคุณสมบัติทั้งหมด",
      planCta: "เลือกแพ็กเกจสำหรับองค์กร",
      enterpriseCta: "ติดต่อฝ่ายขาย",
      stripHeading: "เปรียบเทียบค่าธรรมเนียมตามภูมิภาค",
      regions: ["สหราชอาณาจักร", "เยอรมนี", "ซาอุดีอาระเบีย", "ญี่ปุ่น", "อินเดีย", "ไทย"],
    },
    checkout: {
      heading: "ทำการชำระเงินให้เสร็จสิ้น",
      summaryHeading: "สรุปคำสั่งซื้อ",
      items: [
        { name: "แพ็กเกจเติบโต รายปี", price: "฿42,800" },
        { name: "แพ็กตลาดเพิ่มเติม", price: "฿8,640" },
        { name: "ภาษีมูลค่าเพิ่ม (7%)", price: "฿3,600" },
      ],
      totalLabel: "ยอดที่ต้องชำระวันนี้",
      total: "฿55,040",
      formHeading: "รายละเอียดการชำระเงิน",
      fields: [
        "อีเมล",
        "ชื่อบนบัตร",
        "หมายเลขบัตร",
        "วันหมดอายุ (ดด/ปป)",
        "รหัสความปลอดภัย",
        "ประเทศที่เรียกเก็บเงิน",
      ],
      note: "หมายเหตุการจัดส่ง (ไม่บังคับ)",
      terms: "ฉันยอมรับเงื่อนไขการชำระเงินและประกาศความเป็นส่วนตัว",
      submit: "ชำระ ฿55,040",
      secure: "การชำระเงินถูกเข้ารหัสแบบต้นทางถึงปลายทางและไม่ถูกจัดเก็บบนเซิร์ฟเวอร์ของเรา",
      cardAlt: "แบรนด์บัตรที่รองรับ",
      acceptedHeading: "รองรับที่นี่",
      receiptHeading: "ใบเสร็จล่าสุด",
      receiptColumns: ["วันที่", "อ้างอิง", "ช่องทาง", "สถานะ", "จำนวนเงิน"],
    },
    settings: {
      heading: "การตั้งค่าเวิร์กสเปซ",
      localeHeading: "ภาษาและภูมิภาค",
      securityHeading: "ความปลอดภัย",
      langLabel: "ภาษาของอินเทอร์เฟซ",
      tzLabel: "เขตเวลาสำหรับรายงาน",
      tzValue: "เอเชีย/กรุงเทพ, เวลามาตรฐานอินโดจีน (UTC+7)",
      themeToggle: "สลับไปใช้ธีมมืด",
      twoFactor: "บังคับใช้การยืนยันตัวตนสองขั้นตอนทุกครั้งที่เข้าสู่ระบบ",
      sessionLabel: "ออกจากระบบเซสชันที่ไม่ใช้งานหลังจาก",
      sessionOptions: ["15 นาที", "1 ชั่วโมง", "8 ชั่วโมง"],
      auditHeading: "บันทึกการตรวจสอบ",
      auditColumns: ["เวลา", "ผู้ดำเนินการ", "การกระทำ", "เวิร์กสเปซ", "ผลลัพธ์"],
      detailsSummary: "เราจัดเก็บการตั้งค่าของคุณอย่างไร",
      detailsBody: "การตั้งค่าถูกจัดเก็บแยกตามเวิร์กสเปซและทำสำเนาไปยังภูมิภาคที่คุณเลือก การเปลี่ยนภูมิภาคจะย้ายข้อมูลภายในหนึ่งรอบบิล",
      dangerHeading: "โซนอันตราย",
      dangerBody: "การปิดเวิร์กสเปซจะยกเลิกการโอนเงินที่กำหนดไว้ทั้งหมดทันที",
      dangerCta: "ปิดเวิร์กสเปซ",
      save: "บันทึกการเปลี่ยนแปลง",
    },
    footer: {
      legal: "© 2026 Meridian Pay Ltd. จดทะเบียนในอังกฤษและเวลส์",
      links: ["สถานะ", "เอกสาร", "การสนับสนุน"],
    },
  },
};

/* -------------------------------------------------------------------------- */
/* Inline assets (no network, no web fonts)                                   */
/* -------------------------------------------------------------------------- */

function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PARTNER_LOGOS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 32"><rect width="112" height="32" rx="8" fill="#e2e8f0"/><circle cx="20" cy="16" r="8" fill="#1d4ed8"/><rect x="36" y="10" width="60" height="5" rx="2.5" fill="#334155"/><rect x="36" y="19" width="38" height="5" rx="2.5" fill="#94a3b8"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 32"><rect width="112" height="32" rx="8" fill="#e2e8f0"/><path d="M12 24 L22 8 L32 24 Z" fill="#0f766e"/><rect x="40" y="10" width="56" height="5" rx="2.5" fill="#334155"/><rect x="40" y="19" width="30" height="5" rx="2.5" fill="#94a3b8"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 32"><rect width="112" height="32" rx="8" fill="#e2e8f0"/><rect x="12" y="8" width="16" height="16" rx="4" fill="#b45309"/><rect x="36" y="10" width="48" height="5" rx="2.5" fill="#334155"/><rect x="36" y="19" width="44" height="5" rx="2.5" fill="#94a3b8"/></svg>`,
];

const CARD_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 36"><rect width="56" height="36" rx="6" fill="#1a1f71"/><rect y="9" width="56" height="6" fill="#f7b600"/><rect x="8" y="22" width="24" height="4" rx="2" fill="#ffffff"/></svg>`;

const FAVICON = dataUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#1d4ed8"/></svg>`,
);

const GLOBE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1f2937" stroke-width="1.8" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>`;
const COLUMNS_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1f2937" stroke-width="1.8" aria-hidden="true" focusable="false"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1f2937" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>`;

/* -------------------------------------------------------------------------- */
/* Stylesheet                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fluid by construction: no fixed pixel widths on text, every track uses
 * minmax(min(100%, Npx), 1fr), every flex row wraps, and overflow-wrap:anywhere
 * keeps the min-content width of any string down to a single glyph. That is why
 * the clean variant cannot overflow at 390px, 768px or 1440px.
 */
const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#ffffff;color:#111827;font-size:16px;line-height:1.6;overflow-wrap:anywhere;
font-family:system-ui,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Nirmala UI","Leelawadee UI","Yu Gothic UI","Noto Sans Arabic",sans-serif}
img,svg{max-width:100%}
img{height:auto;display:block}
.shell{width:100%;max-width:1100px;margin:0 auto;padding:0 16px}
header.site{border-bottom:1px solid #d5dbe4;background:#f8fafc}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 0}
.brand{display:inline-block;min-height:44px;padding:11px 8px;font-weight:700;font-size:18px;color:#111827;text-decoration:none}
nav.main{display:flex;flex-wrap:wrap;gap:4px;flex:1 1 auto;min-width:0}
nav.main a,footer.site a{display:inline-block;min-height:44px;min-width:44px;padding:11px 12px;color:#1f2937;text-decoration:underline;text-underline-offset:3px;border-radius:8px}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;min-width:44px;padding:0;border:1px solid #64748b;border-radius:10px;background:#ffffff;color:#1f2937;cursor:pointer}
main{display:block;padding:24px 0 8px}
section{margin:0 0 32px}
h1{font-size:clamp(26px,4vw,38px);line-height:1.25;margin:0 0 12px}
h2{font-size:clamp(20px,2.6vw,26px);line-height:1.3;margin:0 0 12px}
h3{font-size:17px;line-height:1.4;margin:0 0 6px}
p{margin:0 0 12px}
.eyebrow{margin:0 0 8px;font-size:13px;font-weight:700;color:#4b5563}
.lede{font-size:18px;color:#1f2937;max-width:62ch}
.badge{display:inline-block;max-width:100%;margin:0 0 16px;padding:6px 12px;border:1px solid #a5b4fc;border-radius:999px;background:#eef2ff;color:#1e3a8a;font-size:13px}
.cta-row{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0 0}
.btn{display:inline-block;min-height:44px;padding:12px 18px;border:1px solid transparent;border-radius:10px;font-size:16px;font-weight:600;line-height:20px;text-align:center;text-decoration:none;cursor:pointer}
.btn-primary{background:#1d4ed8;color:#ffffff}
.btn-secondary{background:#ffffff;color:#1d4ed8;border-color:#1d4ed8}
.btn-danger{background:#b91c1c;color:#ffffff}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px;margin:0;padding:0;list-style:none}
.card{border:1px solid #d5dbe4;border-radius:14px;padding:16px;background:#ffffff}
.logos{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:0;padding:0;list-style:none}
.stats{display:flex;flex-wrap:wrap;gap:16px;margin:0;padding:0;list-style:none}
.stat{flex:1 1 180px;border:1px solid #d5dbe4;border-radius:14px;padding:14px;background:#f8fafc}
.stat-value{font-size:24px;font-weight:700}
.stat-label{font-size:14px;color:#4b5563}
table.plans{width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px}
table.plans caption{padding:0 0 8px;text-align:start;font-size:14px;color:#4b5563}
table.plans th,table.plans td{border:1px solid #d5dbe4;padding:8px;text-align:start;vertical-align:top}
table.plans thead th{background:#f1f5f9}
.strip{display:flex;flex-wrap:wrap;gap:12px;margin:0;padding:0;list-style:none}
.strip li{flex:1 1 180px;border:1px solid #d5dbe4;border-radius:12px;padding:12px;background:#f8fafc;font-size:14px}
.split{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:20px;align-items:start}
.summary-list{margin:0 0 12px;padding:0;list-style:none}
.summary-list li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #d5dbe4}
.total-row{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;padding:10px 0;font-weight:700}
fieldset{min-width:0;margin:0 0 16px;padding:16px;border:1px solid #d5dbe4;border-radius:14px}
legend{padding:0 6px;font-weight:700;font-size:16px}
.field-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px}
.field-group{margin:0 0 12px}
.field-label{display:block;margin:0 0 4px;font-size:14px;font-weight:600;color:#1f2937}
.field{width:100%;min-width:0;max-width:100%;min-height:44px;padding:10px 12px;border:1px solid #64748b;border-radius:10px;background:#ffffff;color:#111827;font:inherit;font-size:16px}
textarea.field{min-height:88px;resize:vertical}
.check{display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;margin:0 0 12px}
.check input{width:26px;height:26px;min-width:26px;margin:9px 0 0}
.check label{flex:1 1 220px;padding:12px 0}
.muted{color:#4b5563;font-size:14px}
.panel{border:1px solid #d5dbe4;border-radius:14px;padding:16px;margin:0 0 16px;background:#ffffff}
details{margin:0 0 16px;padding:12px;border:1px solid #d5dbe4;border-radius:12px}
summary{padding:11px 0;font-weight:600;cursor:pointer}
.danger{border:1px solid #ef4444;border-radius:14px;padding:16px;background:#fef2f2}
footer.site{margin-top:24px;padding:16px 0;border-top:1px solid #d5dbe4;background:#f8fafc}
footer.site ul{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 8px;padding:0;list-style:none}
`;

/**
 * Defect-only rules, emitted for the broken variant. Each one produces a single
 * unambiguous measurement:
 *   .bf-clip-x  scrollWidth  >> clientWidth with overflow-x:hidden  -> BF-VIS-TEXT-OVERFLOW-X
 *   .bf-clip-y  scrollHeight >> clientHeight with overflow-y:hidden -> BF-VIS-TEXT-CLIP-Y
 *   .bf-wide*   pushes documentElement.scrollWidth past the viewport -> BF-VIS-VIEWPORT-OVERFLOW
 */
const DEFECT_CSS = `
.bf-clip-x{display:inline-block;width:120px;max-width:none;overflow:hidden;white-space:nowrap;vertical-align:top}
.bf-clip-y{display:block;width:200px;height:14px;line-height:22px;padding:0;overflow:hidden}
.bf-wide{width:1180px;max-width:none;flex-wrap:nowrap}
.bf-wide-xl{width:1600px;max-width:none;flex-wrap:nowrap}
`;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function href(route: string, locale: string): string {
  return `${route}?locale=${locale}`;
}

/** Index of a defect for this exact page, or undefined when it is not seeded. */
function findDefect(
  variant: Variant,
  route: string,
  locale: string,
  ruleId: string,
): SeededDefect | undefined {
  if (variant !== "broken") return undefined;
  return SEEDED_DEFECTS.find(
    (defect) =>
      defect.route === route && defect.locale === locale && defect.ruleId === ruleId,
  );
}

function htmlAttributes(variant: Variant, route: string, locale: string): string {
  const rtl = locale === "ar-SA";
  if (findDefect(variant, route, locale, "BF-LOC-LANG-MISSING")) {
    return rtl ? ' dir="rtl"' : "";
  }
  if (findDefect(variant, route, locale, "BF-LOC-LANG-INVALID")) {
    return ` lang="${locale.replace("-", "_")}"${rtl ? ' dir="rtl"' : ""}`;
  }
  if (findDefect(variant, route, locale, "BF-LOC-LANG-MISMATCH")) {
    return ` lang="en-GB"${rtl ? ' dir="rtl"' : ""}`;
  }
  const dir = rtl && !findDefect(variant, route, locale, "BF-LOC-DIR-MISSING")
    ? ' dir="rtl"'
    : "";
  return ` lang="${locale}"${dir}`;
}

function alternateLinks(variant: Variant, route: string, locale: string): string {
  const broken = findDefect(variant, route, locale, "BF-LOC-HREFLANG-INVALID");
  const links = FIXTURE_LOCALES.map((alternate) => {
    const tag = broken && alternate === locale ? alternate.replace("-", "_") : alternate;
    return `<link rel="alternate" hreflang="${tag}" href="${esc(href(route, alternate))}">`;
  });
  links.push(
    `<link rel="alternate" hreflang="x-default" href="${esc(href(route, "en-GB"))}">`,
  );
  return links.join("");
}

function head(variant: Variant, route: string, locale: string, copy: Copy): string {
  const title = findDefect(variant, route, locale, "BF-A11Y-TITLE-MISSING")
    ? ""
    : esc(copy.titles[FIXTURE_ROUTES.indexOf(route)]);
  const css = variant === "broken" ? BASE_CSS + DEFECT_CSS : BASE_CSS;
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    `<link rel="icon" href="${FAVICON}">`,
    alternateLinks(variant, route, locale),
    `<style>${css}</style>`,
  ].join("");
}

function siteHeader(variant: Variant, route: string, locale: string, copy: Copy): string {
  const unnamed = Boolean(
    findDefect(variant, route, locale, "BF-A11Y-NAME-MISSING") &&
      route === "/" &&
      locale === "en-GB",
  );
  const label = unnamed ? "" : ` aria-label="${esc(copy.langButton)}"`;
  const links = FIXTURE_ROUTES.map((target, index) => {
    const current = target === route ? ' aria-current="page"' : "";
    return `<a href="${esc(href(target, locale))}"${current}>${esc(copy.nav[index])}</a>`;
  }).join("");
  return `<header class="site"><div class="shell"><div class="bar">
<a class="brand" href="${esc(href("/", locale))}">${esc(copy.brand)}</a>
<nav class="main" aria-label="${esc(copy.navLabel)}">${links}</nav>
<button type="button" class="icon-btn" data-testid="site-lang-button"${label}>${GLOBE_ICON}</button>
</div></div></header>`;
}

function siteFooter(locale: string, copy: Copy): string {
  const links = copy.footer.links
    .map(
      (text, index) =>
        `<li><a href="${esc(href(FIXTURE_ROUTES[index + 1] ?? "/", locale))}">${esc(text)}</a></li>`,
    )
    .join("");
  return `<footer class="site"><div class="shell">
<ul>${links}</ul>
<p class="muted">${esc(copy.footer.legal)}</p>
</div></footer>`;
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

function homeMain(variant: Variant, locale: string, copy: Copy): string {
  const route = "/";
  const rawKey = findDefect(variant, route, locale, "BF-LNG-RAW-KEY");
  const clipY = findDefect(variant, route, locale, "BF-VIS-TEXT-CLIP-Y");
  const clipX = findDefect(variant, route, locale, "BF-VIS-TEXT-OVERFLOW-X");
  const missingAlt = findDefect(variant, route, locale, "BF-A11Y-IMG-ALT-MISSING");

  const eyebrow = rawKey ? "home.hero.eyebrow" : copy.home.eyebrow;
  const logos = PARTNER_LOGOS.map((svg, index) => {
    const first = index === 0;
    const testId = first ? ' data-testid="home-partner-logo"' : "";
    const alt =
      first && missingAlt
        ? ""
        : ` alt="${esc(copy.logoAlt.replace("{n}", PARTNERS[index]))}"`;
    return `<li><img${testId} src="${dataUri(svg)}" width="112" height="32"${alt}></li>`;
  }).join("");

  const features = copy.home.features
    .map(
      (feature) =>
        `<li class="card"><h3>${esc(feature.title)}</h3><p>${esc(feature.body)}</p></li>`,
    )
    .join("");
  const stats = copy.home.stats
    .map(
      (stat) =>
        `<li class="stat"><div class="stat-value">${esc(stat.value)}</div><div class="stat-label">${esc(stat.label)}</div></li>`,
    )
    .join("");

  return `<main><div class="shell">
<section>
<p class="eyebrow" data-testid="home-hero-eyebrow">${esc(eyebrow)}</p>
<h1>${esc(copy.home.heading)}</h1>
<span class="badge${clipY ? " bf-clip-y" : ""}" data-testid="home-hero-badge">${esc(copy.home.badge)}</span>
<p class="lede">${esc(copy.home.sub)}</p>
<div class="cta-row">
<a class="btn btn-primary${clipX ? " bf-clip-x" : ""}" data-testid="home-primary-cta" href="${esc(href("/checkout", locale))}">${esc(copy.home.ctaPrimary)}</a>
<a class="btn btn-secondary" href="${esc(href("/pricing", locale))}">${esc(copy.home.ctaSecondary)}</a>
</div>
</section>
<section>
<h2>${esc(copy.home.partnersHeading)}</h2>
<ul class="logos">${logos}</ul>
</section>
<section>
<h2>${esc(copy.home.featuresHeading)}</h2>
<ul class="grid">${features}</ul>
</section>
<section>
<h2>${esc(copy.home.statsHeading)}</h2>
<ul class="stats">${stats}</ul>
</section>
</div></main>`;
}

function pricingMain(variant: Variant, locale: string, copy: Copy): string {
  const route = "/pricing";
  const clipX = findDefect(variant, route, locale, "BF-VIS-TEXT-OVERFLOW-X");
  const wide = findDefect(variant, route, locale, "BF-VIS-VIEWPORT-OVERFLOW");
  const rawKey = findDefect(variant, route, locale, "BF-LNG-RAW-KEY");
  const unnamed = findDefect(variant, route, locale, "BF-A11Y-NAME-MISSING");

  const headCells = copy.pricing.columns
    .map((column) => `<th scope="col">${esc(column)}</th>`)
    .join("");
  const bodyRows = copy.pricing.rows
    .map(
      (row) =>
        `<tr><th scope="row">${esc(row[0])}</th>${row
          .slice(1)
          .map((cell) => `<td>${esc(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const regions = copy.pricing.regions
    .map(
      (region, index) =>
        `<li><strong>${esc(region)}</strong><br>${esc(copy.pricing.rows[0][1 + (index % 3)])}</li>`,
    )
    .join("");
  const toggleLabel = unnamed ? "" : ` aria-label="${esc(copy.pricing.compareToggle)}"`;
  const enterpriseText = rawKey ? "pricing.plan.enterprise.cta" : copy.pricing.enterpriseCta;

  return `<main><div class="shell">
<section>
<h1>${esc(copy.pricing.heading)}</h1>
<p class="lede">${esc(copy.pricing.intro)}</p>
<div class="cta-row">
<a class="btn btn-primary${clipX ? " bf-clip-x" : ""}" data-testid="pricing-plan-cta" href="${esc(href("/checkout", locale))}">${esc(copy.pricing.planCta)}</a>
<a class="btn btn-secondary" data-testid="pricing-enterprise-cta" href="${esc(href("/settings", locale))}">${esc(enterpriseText)}</a>
<button type="button" class="icon-btn" data-testid="pricing-compare-toggle"${toggleLabel}>${COLUMNS_ICON}</button>
</div>
</section>
<section>
<table class="plans">
<caption>${esc(copy.pricing.caption)}</caption>
<thead><tr>${headCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</section>
<section>
<h2>${esc(copy.pricing.stripHeading)}</h2>
<ul class="strip${wide ? " bf-wide" : ""}">${regions}</ul>
</section>
</div></main>`;
}

function checkoutMain(variant: Variant, locale: string, copy: Copy): string {
  const route = "/checkout";
  const clipY = findDefect(variant, route, locale, "BF-VIS-TEXT-CLIP-Y");
  const wide = findDefect(variant, route, locale, "BF-VIS-VIEWPORT-OVERFLOW");
  const missingAlt = findDefect(variant, route, locale, "BF-A11Y-IMG-ALT-MISSING");
  const unlabelledNote = findDefect(variant, route, locale, "BF-A11Y-NAME-MISSING");

  const items = copy.checkout.items
    .map(
      (item) =>
        `<li><span>${esc(item.name)}</span><span>${esc(item.price)}</span></li>`,
    )
    .join("");
  const cardAlt = missingAlt ? "" : ` alt="${esc(copy.checkout.cardAlt)}"`;
  const receiptHead = copy.checkout.receiptColumns
    .map((column) => `<th scope="col">${esc(column)}</th>`)
    .join("");
  const receiptRows = copy.checkout.items
    .map(
      (item, index) =>
        `<tr><th scope="row">2026-0${index + 3}-1${index + 1}</th><td>MP-4${index}18</td><td>${esc(copy.checkout.cardAlt)}</td><td>${esc(copy.pricing.rows[2][1 + index])}</td><td>${esc(item.price)}</td></tr>`,
    )
    .join("");

  const note = unlabelledNote
    ? `<p class="field-label">${esc(copy.checkout.note)}</p>
<textarea class="field" data-testid="checkout-note" rows="3"></textarea>`
    : `<label class="field-label" id="co-note-label" for="co-note">${esc(copy.checkout.note)}</label>
<textarea class="field" id="co-note" data-testid="checkout-note" rows="3" aria-labelledby="co-note-label"></textarea>`;

  return `<main><div class="shell">
<h1>${esc(copy.checkout.heading)}</h1>
<div class="split">
<section class="panel">
<h2>${esc(copy.checkout.summaryHeading)}</h2>
<ul class="summary-list">${items}</ul>
<div class="total-row">
<span class="${clipY ? "bf-clip-y" : ""}" data-testid="checkout-total-label">${esc(copy.checkout.totalLabel)}</span>
<span>${esc(copy.checkout.total)}</span>
</div>
<h3>${esc(copy.checkout.acceptedHeading)}</h3>
<img data-testid="checkout-card-logo" src="${dataUri(CARD_MARK)}" width="56" height="36"${cardAlt}>
<p class="muted">${esc(copy.checkout.secure)}</p>
</section>
<section>
<form action="${esc(href("/checkout", locale))}" method="post">
<fieldset>
<legend>${esc(copy.checkout.formHeading)}</legend>
<div class="field-group">
<label class="field-label" for="co-email">${esc(copy.checkout.fields[0])}</label>
<input class="field" id="co-email" name="email" type="email" autocomplete="email">
</div>
<div class="field-group">
<label class="field-label" for="co-name">${esc(copy.checkout.fields[1])}</label>
<input class="field" id="co-name" name="cardholder" type="text" autocomplete="cc-name">
</div>
<div class="field-group">
<label class="field-label" for="co-card">${esc(copy.checkout.fields[2])}</label>
<input class="field" id="co-card" name="card" type="text" inputmode="numeric" autocomplete="cc-number">
</div>
<div class="field-row">
<div>
<label class="field-label" for="co-exp">${esc(copy.checkout.fields[3])}</label>
<input class="field" id="co-exp" name="expiry" type="text" autocomplete="cc-exp">
</div>
<div>
<label class="field-label" for="co-cvc">${esc(copy.checkout.fields[4])}</label>
<input class="field" id="co-cvc" name="cvc" type="text" inputmode="numeric" autocomplete="cc-csc">
</div>
</div>
<div class="field-group">
<label class="field-label" for="co-country">${esc(copy.checkout.fields[5])}</label>
<select class="field" id="co-country" name="country">
${copy.pricing.regions.map((region) => `<option>${esc(region)}</option>`).join("")}
</select>
</div>
<div class="field-group">${note}</div>
<div class="check">
<input type="checkbox" id="co-terms" name="terms">
<label for="co-terms">${esc(copy.checkout.terms)}</label>
</div>
<button class="btn btn-primary" type="submit">${esc(copy.checkout.submit)}</button>
</fieldset>
</form>
</section>
</div>
<section>
<h2>${esc(copy.checkout.receiptHeading)}</h2>
<div class="strip${wide ? " bf-wide-xl" : ""}">
<table class="plans">
<caption>${esc(copy.checkout.receiptHeading)}</caption>
<thead><tr>${receiptHead}</tr></thead>
<tbody>${receiptRows}</tbody>
</table>
</div>
</section>
</div></main>`;
}

function settingsMain(variant: Variant, locale: string, copy: Copy): string {
  const route = "/settings";
  const rawKey = findDefect(variant, route, locale, "BF-LNG-RAW-KEY");
  const clipX = findDefect(variant, route, locale, "BF-VIS-TEXT-OVERFLOW-X");
  const wide = findDefect(variant, route, locale, "BF-VIS-VIEWPORT-OVERFLOW");
  const unnamed = findDefect(variant, route, locale, "BF-A11Y-NAME-MISSING");

  const securityHeading = rawKey ? "settings.section.security" : copy.settings.securityHeading;
  const themeLabel = unnamed ? "" : ` aria-label="${esc(copy.settings.themeToggle)}"`;
  const auditHead = copy.settings.auditColumns
    .map((column) => `<th scope="col">${esc(column)}</th>`)
    .join("");
  const auditRows = copy.settings.sessionOptions
    .map(
      (option, index) =>
        `<tr><th scope="row">2026-07-2${index + 1} 09:${index + 1}0</th><td>a.okafor</td><td>${esc(copy.settings.langLabel)}</td><td>meridian-eu-${index + 1}</td><td>${esc(option)}</td></tr>`,
    )
    .join("");

  return `<main><div class="shell">
<h1>${esc(copy.settings.heading)}</h1>
<section class="panel">
<h2>${esc(copy.settings.localeHeading)}</h2>
<div class="field-row">
<div>
<label class="field-label" for="st-lang">${esc(copy.settings.langLabel)}</label>
<select class="field" id="st-lang" name="language">
${LANGUAGE_OPTIONS.map((option) => `<option>${esc(option)}</option>`).join("")}
</select>
</div>
<div>
<p class="field-label">${esc(copy.settings.tzLabel)}</p>
<p class="muted${clipX ? " bf-clip-x" : ""}" data-testid="settings-timezone-value">${esc(copy.settings.tzValue)}</p>
</div>
</div>
<button class="btn btn-secondary" type="button">${esc(copy.settings.save)}</button>
</section>
<section class="panel">
<h2 data-testid="settings-security-heading">${esc(securityHeading)}</h2>
<div class="check">
<input type="checkbox" id="st-2fa" name="two-factor" checked>
<label for="st-2fa">${esc(copy.settings.twoFactor)}</label>
</div>
<div class="field-group">
<label class="field-label" for="st-session">${esc(copy.settings.sessionLabel)}</label>
<select class="field" id="st-session" name="session">
${copy.settings.sessionOptions.map((option) => `<option>${esc(option)}</option>`).join("")}
</select>
</div>
<div class="cta-row">
<button type="button" class="icon-btn" data-testid="settings-theme-toggle"${themeLabel}>${MOON_ICON}</button>
</div>
</section>
<section>
<h2>${esc(copy.settings.auditHeading)}</h2>
<div class="strip${wide ? " bf-wide" : ""}">
<table class="plans">
<caption>${esc(copy.settings.auditHeading)}</caption>
<thead><tr>${auditHead}</tr></thead>
<tbody>${auditRows}</tbody>
</table>
</div>
</section>
<details>
<summary>${esc(copy.settings.detailsSummary)}</summary>
<p>${esc(copy.settings.detailsBody)}</p>
</details>
<section class="danger">
<h2>${esc(copy.settings.dangerHeading)}</h2>
<p>${esc(copy.settings.dangerBody)}</p>
<button class="btn btn-danger" type="button">${esc(copy.settings.dangerCta)}</button>
</section>
</div></main>`;
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/** Build one complete HTML document for a variant / route / locale triple. */
export function buildPage(variant: Variant, route: string, locale: string): string {
  const copy = COPY[locale];
  if (!copy) throw new Error(`No fixture copy for locale "${locale}".`);
  if (!FIXTURE_ROUTES.includes(route)) {
    throw new Error(`Unknown fixture route "${route}".`);
  }

  const main =
    route === "/"
      ? homeMain(variant, locale, copy)
      : route === "/pricing"
        ? pricingMain(variant, locale, copy)
        : route === "/checkout"
          ? checkoutMain(variant, locale, copy)
          : settingsMain(variant, locale, copy);

  return `<!doctype html>
<html${htmlAttributes(variant, route, locale)}>
<head>${head(variant, route, locale, copy)}</head>
<body>
${siteHeader(variant, route, locale, copy)}
${main}
${siteFooter(locale, copy)}
</body>
</html>
`;
}
