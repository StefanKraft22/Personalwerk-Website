import type { Berufsfeld } from "./enums.js";
import type { Boerse, EmpfehlungMitRang } from "./types.js";

/**
 * Spiegelt CATEGORY_TO_BERUFSFELDER aus Empfehlungsliste.html (die Branche-Box
 * in der Suchleiste bietet nur 5 grobe Branchen an, der Katalog kennt 12
 * Berufsfelder) - bei Aenderung an einer Stelle immer auch die andere pruefen,
 * es gibt aktuell keine gemeinsame Quelle fuer Frontend (statisches HTML) und
 * Backend (TS).
 */
export const BRANCHE_TO_BERUFSFELDER: Record<string, Berufsfeld[]> = {
  gesundheit: ["gesundheit-pflege"],
  it: ["it-software", "ingenieure-technik"],
  handwerk: ["gewerblich-logistik", "bau-immobilien", "agrar-food"],
  vertrieb: ["vertrieb-marketing"],
  buero: ["kaufmaennisch-verwaltung", "hr-personal", "finance-legal"],
};

export function istBekannteBranche(branche: unknown): branche is string {
  return typeof branche === "string" && branche in BRANCHE_TO_BERUFSFELDER;
}

/** Boersen, die in mindestens einem der Berufsfelder dieser Branche einen Anteil > 0 haben. */
export function boersenFuerBranche(catalog: Boerse[], branche: string): Boerse[] {
  const felder = BRANCHE_TO_BERUFSFELDER[branche];
  if (!felder) return [];
  return catalog.filter((b) => felder.some((f) => (b.berufsfelder[f] ?? 0) > 0));
}

function maxAnteilInBranche(boerse: Boerse, felder: Berufsfeld[]): number {
  const werte = felder.map((f) => boerse.berufsfelder[f] ?? 0);
  return werte.length > 0 ? Math.max(...werte) : 0;
}

/**
 * Deterministische Rangfolge fuer die reine Branche-Ansicht (kein Modell-
 * aufruf, siehe server.ts): sortiert nach Anteil in den Berufsfeldern dieser
 * Branche. Nutzt bewusst die vorhandene Kurzbeschreibung der Boerse als
 * Begruendungstext - anders als fallbackRanking() aus fallback.ts, die
 * absichtlich KEINEN Text liefert (das ist fuer den seltenen Modell-
 * Fehlerfall gedacht). Die Branche-Ansicht ist dagegen der Normalfall dieses
 * Features und braucht deshalb echten Text statt "Keine Begründung
 * verfügbar." auf jeder Karte.
 */
export function rangiereNachBranche(
  kandidaten: Boerse[],
  branche: string,
  limit: number
): EmpfehlungMitRang[] {
  const felder = BRANCHE_TO_BERUFSFELDER[branche] ?? [];
  const bewertet = kandidaten
    .map((b) => ({ boerse: b, anteil: maxAnteilInBranche(b, felder) }))
    .sort((a, z) => z.anteil - a.anteil);

  return bewertet.slice(0, Math.max(0, limit)).map((entry, i) => ({
    boardId: entry.boerse.boardId,
    planrolle: entry.boerse.planrolle[0] ?? "praezision",
    passgenauigkeit: Math.min(1, Math.max(0, entry.anteil / 100)),
    begruendung: entry.boerse.kurzbeschreibung,
    rang: i + 1,
  }));
}
