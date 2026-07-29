"use client";

import { useEffect, useState } from "react";

const translations = {
  en: {
    nav: ["Home", "Dashboard", "Pricing"],
    badge: "SMART WORKFLOWS",
    title: "Move work forward, without the friction.",
    copy: "One calm workspace for your team to plan, decide, and deliver.",
    cta: "Start your free workspace",
    trial: "Start a free trial",
    stats: ["12 active projects", "94% on track", "8 decisions today"],
  },
  hi: {
    nav: ["होम", "डैशबोर्ड", "मूल्य"],
    badge: "स्मार्ट वर्कफ़्लो",
    title: "काम आगे बढ़ाएँ, बिना रुकावट के",
    copy: "आपकी टीम के लिए योजना, निर्णय और डिलीवरी का एक सहज स्थान।",
    cta: "अपना मुफ़्त कार्यक्षेत्र शुरू करें",
    trial: "मुफ़्त परीक्षण शुरू करें",
    stats: ["12 सक्रिय प्रोजेक्ट", "94% सही दिशा में", "आज 8 निर्णय"],
  },
  ta: {
    nav: ["முகப்பு", "டாஷ்போர்டு", "விலை"],
    badge: "திறன் வாய்ந்த பணிப்பாய்வு",
    title: "தடையின்றி உங்கள் வேலையை முன்னோக்கி நகர்த்துங்கள்",
    copy: "திட்டமிடவும், முடிவெடுக்கவும், சிறப்பாக வழங்கவும் ஒரே அமைதியான இடம்.",
    cta: "உங்கள் இலவச பணியிடத்தை இன்றே தொடங்குங்கள்",
    trial: "இலவசமாகத் தொடங்குங்கள்",
    stats: ["12 செயலில் உள்ளவை", "94% சரியான பாதை", "இன்று 8 முடிவுகள்"],
  },
  ur: {
    nav: ["گھر", "ڈیش بورڈ", "قیمت"],
    badge: "سمارٹ ورک فلو",
    title: "کام کو بغیر رکاوٹ آگے بڑھائیں",
    copy: "منصوبہ بندی، فیصلے اور ترسیل کے لیے آپ کی ٹیم کی پُرسکون جگہ۔",
    cta: "اپنی مفت ورک اسپیس شروع کریں",
    trial: "مفت آزمائش شروع کریں",
    stats: ["12 فعال منصوبے", "94% درست سمت", "آج 8 فیصلے"],
  },
};

export function ZariyaPreview({
  locale,
  fixed,
}: {
  locale: string;
  fixed: boolean;
}) {
  const safeLocale = locale in translations ? (locale as keyof typeof translations) : "en";
  const t = translations[safeLocale];
  const [view, setView] = useState("Home");

  useEffect(() => {
    document.documentElement.lang = fixed ? safeLocale : "en";
    document.documentElement.dir = fixed && safeLocale === "ur" ? "rtl" : "ltr";
    document.body.classList.add("zariya-body");
    return () => document.body.classList.remove("zariya-body");
  }, [safeLocale, fixed]);

  const direction = fixed && safeLocale === "ur" ? "rtl" : "ltr";
  const nav = direction === "rtl" ? [...t.nav].reverse() : t.nav;
  const displayedTrial =
    safeLocale === "ta" && !fixed ? "dashboard.start_trial" : t.trial;

  return (
    <main className={`zariya ${fixed ? "is-fixed" : "is-broken"}`} dir={direction}>
      <header className="zariya-nav">
        <div className="zariya-logo">
          <i>z</i> zari<em>ya</em>
        </div>
        <nav aria-label="Zariya navigation">
          {nav.map((item) => (
            <button
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </nav>
        <button
          className="zariya-switcher"
          data-bf="locale-switcher"
          aria-label={fixed ? `Change language, current ${safeLocale}` : undefined}
        >
          ◎
        </button>
      </header>
      <section className="zariya-hero">
        <div className="zariya-copy">
          <span>{t.badge}</span>
          <h1 data-bf="hi-heading">{t.title}</h1>
          <p>{t.copy}</p>
          <button data-bf="ta-cta" className="zariya-cta">
            {t.cta} <i>↗</i>
          </button>
        </div>
        <div className="zariya-dashboard">
          <div className="zariya-dash-top">
            <span>My workspace</span>
            <i>•••</i>
          </div>
          <div className="zariya-progress">
            <span>Release readiness</span>
            <strong>94%</strong>
            <i>
              <b />
            </i>
          </div>
          <div className="zariya-task">
            <i>✓</i>
            <span>
              <b>Product localization</b>
              Design review · Today
            </span>
            <em>HI</em>
          </div>
          <div className="zariya-task">
            <i className="violet">↗</i>
            <span>
              <b>Pricing launch</b>
              Content pass · Tomorrow
            </span>
            <em>TA</em>
          </div>
          <button data-bf="trial-label" className="zariya-trial">
            {displayedTrial}
          </button>
        </div>
      </section>
      <section className="zariya-stats">
        {t.stats.map((stat, index) => (
          <div key={stat}>
            <i>{["◒", "↗", "✓"][index]}</i>
            <span>{stat}</span>
          </div>
        ))}
      </section>
      {!fixed && <div className="defect-flag">INTENTIONAL BROKEN BASELINE</div>}
    </main>
  );
}
