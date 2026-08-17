export const BERUFSFELDER = [
  "it-software",
  "ingenieure-technik",
  "gesundheit-pflege",
  "vertrieb-marketing",
  "finance-legal",
  "gewerblich-logistik",
  "kaufmaennisch-verwaltung",
  "bau-immobilien",
  "hr-personal",
  "naturwissenschaft-pharma",
  "agrar-food",
  "gastro-tourismus",
] as const;

export const KARRIERELEVEL = [
  "ausbildung",
  "berufseinsteiger",
  "professional",
  "fachfuehrung",
  "executive",
] as const;

export const PLANROLLEN = [
  "reichweite",
  "praezision",
  "regional",
  "employer-branding",
] as const;

export type Berufsfeld = (typeof BERUFSFELDER)[number];
export type Karrierelevel = (typeof KARRIERELEVEL)[number];
export type Planrolle = (typeof PLANROLLEN)[number];
