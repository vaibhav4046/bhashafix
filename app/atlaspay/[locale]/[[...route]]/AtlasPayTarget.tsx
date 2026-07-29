"use client";

import { useEffect } from "react";

type Props = {
  locale: string;
  pageLang: string;
  direction: "ltr" | "rtl";
  route: string;
  state: "broken" | "fixed";
  lineHeight: number;
  glyphHeight: number;
  ctaWidth: number;
  ctaScrollWidth: number;
  iconOrder: string;
  fontCoverage: boolean;
  whiteSpace: string;
  payLabel: string;
  checkoutTerm: string;
};

const copy: Record<string, { kicker: string; title: string; body: string }> = {
  "hi-IN": {
    kicker: "सीमाओं के पार भुगतान",
    title: "हर बाजार के लिए एक वित्तीय घर",
    body: "अपनी वैश्विक टीम के लिए भुगतान, कार्ड और स्पष्ट रिपोर्टिंग।",
  },
  "de-DE": {
    kicker: "GLOBALE ZAHLUNGEN",
    title: "Finanzen ohne Grenzen",
    body: "Konten, Karten und Überweisungen für internationale Teams.",
  },
  "ar-SA": {
    kicker: "مدفوعات عالمية",
    title: "حساب واحد لكل سوق",
    body: "حوّل الأموال وأدر البطاقات بوضوح كامل.",
  },
  "he-IL": {
    kicker: "תשלומים גלובליים",
    title: "חשבון אחד לכל שוק",
    body: "העברות, כרטיסים ודיווח ברור לצוותים גלובליים.",
  },
  "ja-JP": {
    kicker: "グローバル決済",
    title: "すべての市場に、ひとつの口座",
    body: "国境を越えるチームの送金、カード、レポート。",
  },
  "zh-Hans-CN": {
    kicker: "全球支付",
    title: "面向每个市场的统一账户",
    body: "为全球团队提供转账、卡片和清晰报告。",
  },
  "th-TH": {
    kicker: "การชำระเงินทั่วโลก",
    title: "บัญชีเดียวสำหรับทุกตลาด",
    body: "โอนเงินระหว่างประเทศได้รวดเร็วและปลอดภัยสำหรับทุกธุรกิจ",
  },
  "fr-FR": {
    kicker: "PAIEMENTS MONDIAUX",
    title: "Un compte pour chaque marché",
    body: "Virements, cartes et rapports clairs pour les équipes internationales.",
  },
  "es-MX": {
    kicker: "PAGOS GLOBALES",
    title: "Una cuenta para cada mercado",
    body: "Transferencias, tarjetas y reportes claros para equipos globales.",
  },
  "en-GB": {
    kicker: "GLOBAL PAYMENTS",
    title: "One account for every market",
    body: "Transfers, cards and clear reporting for international teams.",
  },
};

export function AtlasPayTarget(props: Props) {
  useEffect(() => {
    const previousLang = document.documentElement.lang;
    const previousDir = document.documentElement.dir;
    document.documentElement.lang = props.pageLang;
    document.documentElement.dir = props.direction;
    return () => {
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDir;
    };
  }, [props.pageLang, props.direction]);

  const language = copy[props.locale] ?? copy["en-GB"];
  const routeLabel = props.route === "/" ? "Home" : props.route.slice(1);
  return (
    <main
      className="atlas-app"
      data-state={props.state}
      data-locale={props.locale}
      data-font-coverage={String(props.fontCoverage)}
      dir={props.direction}
    >
      <header>
        <strong>Atlas<span>Pay</span></strong>
        <nav aria-label="AtlasPay demo">
          <span>{routeLabel}</span>
          <span>Pricing</span>
          <span>Dashboard</span>
        </nav>
        <button aria-label="Locale selector">{props.locale}</button>
      </header>
      <section className="atlas-body">
        <div className="atlas-copy">
          <small>{language.kicker}</small>
          <h1
            data-testid="hero-title"
            style={{
              lineHeight: `${props.lineHeight}px`,
              maxHeight:
                props.locale === "hi-IN" && props.state === "broken"
                  ? `${props.lineHeight}px`
                  : "none",
            }}
          >
            {props.route === "/checkout" ? props.checkoutTerm : language.title}
          </h1>
          <p
            data-testid="plan-description"
            style={{
              whiteSpace: props.whiteSpace as "normal" | "nowrap",
              maxWidth: props.locale === "th-TH" ? "220px" : "470px",
            }}
          >
            {language.body}
          </p>
          <button
            data-testid="primary-cta"
            style={{
              width: `${props.ctaWidth}px`,
              minWidth: `${props.ctaScrollWidth}px`,
              whiteSpace: props.state === "broken" ? "nowrap" : "normal",
            }}
          >
            {props.route === "/checkout" ? props.payLabel : props.locale === "de-DE" ? "Kostenloses Geschäftskonto eröffnen" : "Start securely"}
          </button>
          <a
            className={`atlas-back ${props.iconOrder}`}
            data-testid="back-link"
            href="#"
          >
            <i>←</i><span>{props.locale === "he-IL" ? "חזרה להגדרות" : "Back to settings"}</span>
          </a>
        </div>
        <div className="atlas-card">
          <div><span>Available balance</span><b>£82,410.20</b></div>
          <div className="atlas-chart"><i/><i/><i/><i/><i/><i/></div>
          <footer><span>London</span><span>Singapore</span><span>Mexico City</span></footer>
        </div>
      </section>
      <footer>
        <span>BhashaFix AtlasPay fixture · {props.state}</span>
        <code>glyph {props.glyphHeight}px · line {props.lineHeight}px</code>
      </footer>
    </main>
  );
}
