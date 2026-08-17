import type { Boerse, EmpfehlungMitRang, MatchResult, VakanzInput } from "./types.js";
import type { Berufsfeld, Karrierelevel } from "./enums.js";

/**
 * Schritt 8 aus matching-prompt-console.md: deterministische Rangfolge ohne
 * Modell, fuer den Fall, dass die API ausfaellt oder die Modellantwort die
 * Validierung nicht besteht ("nicht reparieren", sondern hierher wechseln).
 *
 * Die Doku beschreibt das Prinzip nur in einem Satz ("sortiert die Anwendung
 * nach Berufsfeldanteil und Reichweite und liefert dieselben Börsen ohne
 * Begründungstext aus") - der genaue Algorithmus ist NICHT vorgegeben.
 * Diese Implementierung ist eine bewusst einfache, nachvollziehbare
 * Approximation:
 *
 * 1. Sortiere Kandidaten nach ihrem hoechsten Berufsfeld-Anteilswert
 *    (Proxy fuer fachliche Relevanz, ohne dass wir den Jobtitel klassifiziert
 *    haetten - das kann diese Funktion nicht leisten, das ist der Teil, den
 *    nur das Modell macht).
 * 2. Bei Gleichstand: Boersen mit Planrolle "reichweite" zuerst.
 * 3. Schneide auf `limit` ab.
 * 4. Keine Begruendungstexte (wie in der Doku gefordert), passgenauigkeit
 *    ist der normierte Anteilswert (0-1), konfidenz ist 0 (kein Modell
 *    beteiligt - macht dem Aufrufer sofort klar, dass es ein Fallback ist).
 *
 * Vor produktivem Einsatz mit echten Business-Anforderungen abstimmen -
 * das hier ist ein plausibler Platzhalter, keine abgenommene Fachlogik.
 */
export function fallbackRanking(input: VakanzInput): MatchResult {
  const bewertet = input.kandidaten.map((k) => ({
    boerse: k,
    maxAnteil: maxBerufsfeldAnteil(k),
  }));

  bewertet.sort((a, b) => {
    if (b.maxAnteil !== a.maxAnteil) return b.maxAnteil - a.maxAnteil;
    const aReichweite = a.boerse.planrolle.includes("reichweite") ? 1 : 0;
    const bReichweite = b.boerse.planrolle.includes("reichweite") ? 1 : 0;
    return bReichweite - aReichweite;
  });

  const ausgewaehlt = bewertet.slice(0, Math.max(0, input.limit));

  const empfehlungen: EmpfehlungMitRang[] = ausgewaehlt.map((entry, i) => ({
    boardId: entry.boerse.boardId,
    planrolle: entry.boerse.planrolle[0] ?? "praezision",
    passgenauigkeit: Math.min(1, Math.max(0, entry.maxAnteil / 100)),
    begruendung: "",
    rang: i + 1,
  }));

  const { berufsfeld, karrierelevel } = mehrheitsProfil(
    ausgewaehlt.map((e) => e.boerse)
  );

  return {
    normalisierterJobtitel: input.jobtitel,
    erkanntesBerufsfeld: berufsfeld,
    erkanntesKarrierelevel: karrierelevel,
    konfidenz: 0,
    empfehlungen,
    hinweise: [
      "Automatische Rangfolge ohne Sprachmodell (Fallback). Begründungstexte fehlen bewusst.",
    ],
    fallback: true,
  };
}

function maxBerufsfeldAnteil(boerse: Boerse): number {
  const werte = Object.values(boerse.berufsfelder).filter(
    (v): v is number => typeof v === "number"
  );
  return werte.length > 0 ? Math.max(...werte) : 0;
}

/** Haeufigster Berufsfeld-/Karrierelevel-Wert unter den ausgewaehlten Boersen, als bester verfuegbarer Anhaltspunkt ohne Modellklassifikation. */
function mehrheitsProfil(boersen: Boerse[]): {
  berufsfeld: Berufsfeld;
  karrierelevel: Karrierelevel;
} {
  const berufsfeldCounts = new Map<Berufsfeld, number>();
  const karrierelevelCounts = new Map<Karrierelevel, number>();

  for (const b of boersen) {
    const topBerufsfeld = Object.entries(b.berufsfelder).sort(
      (a, z) => (z[1] ?? 0) - (a[1] ?? 0)
    )[0]?.[0] as Berufsfeld | undefined;
    if (topBerufsfeld) {
      berufsfeldCounts.set(topBerufsfeld, (berufsfeldCounts.get(topBerufsfeld) ?? 0) + 1);
    }
    for (const level of b.karrierelevel) {
      karrierelevelCounts.set(level, (karrierelevelCounts.get(level) ?? 0) + 1);
    }
  }

  const berufsfeld = topEntry(berufsfeldCounts) ?? "it-software";
  const karrierelevel = topEntry(karrierelevelCounts) ?? "professional";

  return { berufsfeld, karrierelevel };
}

function topEntry<T>(counts: Map<T, number>): T | undefined {
  let best: T | undefined;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}
