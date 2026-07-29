import layoutBaseline from "../../../../apps/demo-target/data/layout.json";
import localeStateBaseline from "../../../../apps/demo-target/data/locale-state.json";
import translationsBaseline from "../../../../apps/demo-target/data/translations.json";
import predicates from "../../../../fixtures/multilingual-demo/predicates.json";
import { AtlasPayTarget } from "./AtlasPayTarget";

type PageProps = {
  params: Promise<{ locale: string; route?: string[] }>;
  searchParams: Promise<{ state?: string }>;
};

function setPointer(value: unknown, pointer: string[], after: unknown) {
  let current = value as Record<string, unknown>;
  for (const segment of pointer.slice(0, -1)) {
    current = current[segment] as Record<string, unknown>;
  }
  current[pointer.at(-1)!] = after;
}

export default async function AtlasPayPage({ params, searchParams }: PageProps) {
  const { locale, route: routeParts } = await params;
  const query = await searchParams;
  const state = query.state === "fixed" ? "fixed" : "broken";
  const layout = structuredClone(layoutBaseline) as Record<
    string,
    Record<string, unknown>
  >;
  const localeState = structuredClone(localeStateBaseline) as {
    pageLang: string;
    directions: Record<string, string>;
  };
  const translations = structuredClone(translationsBaseline) as Record<
    string,
    Record<string, string>
  >;

  if (state === "fixed") {
    for (const predicate of predicates) {
      const file = predicate.repair.file;
      const target = file.endsWith("layout.json")
        ? layout
        : file.endsWith("locale-state.json")
          ? localeState
          : file.endsWith("translations.json")
            ? translations
            : null;
      if (target) setPointer(target, predicate.repair.pointer, predicate.repair.after);
    }
  }

  const route = routeParts?.length ? `/${routeParts.join("/")}` : "/";
  const localeLayout = layout[locale] ?? {};
  const direction =
    localeState.directions[locale] ??
    (new Intl.Locale(locale).maximize().script === "Arab" ||
    new Intl.Locale(locale).maximize().script === "Hebr"
      ? "rtl"
      : "ltr");
  const sourcePay = translations["en-GB"]["checkout.pay_now"];
  const payLabel = translations[locale]?.["checkout.pay_now"] ?? sourcePay;
  const checkoutTerm =
    translations[locale]?.["checkout.term"] ?? translations["en-GB"]["checkout.term"];

  return (
    <AtlasPayTarget
      locale={locale}
      pageLang={locale === "en-GB" ? localeState.pageLang : locale}
      direction={direction as "ltr" | "rtl"}
      route={route}
      state={state}
      lineHeight={Number(localeLayout.heroLineHeight ?? 44)}
      glyphHeight={Number(localeLayout.measuredGlyphHeight ?? 34)}
      ctaWidth={Number(localeLayout.ctaClientWidth ?? 230)}
      ctaScrollWidth={Number(localeLayout.ctaScrollWidth ?? 180)}
      iconOrder={String(localeLayout.iconOrder ?? "before")}
      fontCoverage={Boolean(localeLayout.fontCoverage ?? true)}
      whiteSpace={String(localeLayout.whiteSpace ?? "normal")}
      payLabel={payLabel.replace("{amount}", "£1,299.50")}
      checkoutTerm={checkoutTerm}
    />
  );
}
