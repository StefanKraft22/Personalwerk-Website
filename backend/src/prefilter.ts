import type { Boerse } from "./types.js";

/**
 * Sehr einfacher deterministischer Vorfilter, der matching-prompt-console.md
 * Abschnitt 3 ("kandidaten enthält ausschließlich Börsen, die der
 * deterministische Vorfilter bereits durchgelassen hat, maximal 15 Stück")
 * minimal erfüllt, sobald der Katalog (aktuell 61 Börsen, siehe
 * boards-catalog.json aus dem Medienkompass) über das Limit waechst.
 *
 * Kein echtes Relevanz-Ranking (das kann diese Funktion nicht leisten, ohne
 * den Jobtitel zu klassifizieren - das ist explizit Aufgabe des Modells,
 * nicht des Vorfilters). Stattdessen: einfacher Keyword-Overlap zwischen
 * Jobtitel und Boersen-Text (Name + Kurzbeschreibung).
 *
 * WICHTIG: der reale Katalog (61 Boersen aus dem Medienkompass) enthaelt
 * allein schon 15 Boersen der Kategorie "generalist" - genau das gesamte
 * Limit. Eine fruehere Version dieser Funktion liess ausnahmslos ALLE
 * Generalisten durch und fuellte den Rest mit Spezialisten auf, wodurch bei
 * 15 Generalisten NIE eine einzige Fachboerse (praezision) an das Modell
 * ging - ein echter Bug, gefunden beim ersten Live-Test mit "Bauingenieur"
 * (keine der eigentlich passenden Boersen wie bauingenieur24 oder
 * TECHNIK.JOBS war in der Kandidatenliste). Fix: nur ein KLEINES,
 * festes Kontingent an Generalisten (deckt die reichweite-Pflichtregel aus
 * System-Prompt-Regel 6 ab, ohne den ganzen Slot-Budget zu verbrauchen),
 * der Rest wird ueber Keyword-Score aus dem GESAMTEN Katalog aufgefuellt.
 *
 * Bewusste Vereinfachung, kein Ersatz fuer eine echte Vorfilter-Logik mit
 * Region/Branche/Preisfiltern aus einer richtigen Datenbank - vor
 * Produktivbetrieb ueberarbeiten.
 */

const GENERALISTEN_KONTINGENT = 3;

const STOPWORDS = new Set([
  "der", "die", "das", "und", "für", "fuer", "im", "in", "von", "mit", "bei",
  "m", "w", "d", "x", "a", "e", "k", "o", "l",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[().,;:/\-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function score(jobtitelTokens: string[], boerse: Boerse): number {
  const boerseTokens = new Set(tokenize(`${boerse.name} ${boerse.kurzbeschreibung}`));
  let hits = 0;
  for (const t of jobtitelTokens) {
    if (boerseTokens.has(t)) hits++;
  }
  return hits;
}

export function prefilterCandidates(
  catalog: Boerse[],
  jobtitel: string,
  maxCandidates = 15
): Boerse[] {
  if (catalog.length <= maxCandidates) return catalog;

  const jobtitelTokens = tokenize(jobtitel);

  const scoredAll = catalog
    .map((b) => ({ boerse: b, score: score(jobtitelTokens, b) }))
    .sort((a, b) => b.score - a.score);

  const generalistenSorted = scoredAll.filter((s) => s.boerse.kategorie === "generalist");
  const nichtGeneralistenSorted = scoredAll.filter((s) => s.boerse.kategorie !== "generalist");

  const gewaehlteGeneralisten = generalistenSorted
    .slice(0, GENERALISTEN_KONTINGENT)
    .map((s) => s.boerse);

  const remainingSlots = Math.max(0, maxCandidates - gewaehlteGeneralisten.length);
  let aufgefuellt = nichtGeneralistenSorted.slice(0, remainingSlots).map((s) => s.boerse);

  // Falls nicht genug Fach-/Regionalboersen vorhanden sind, um alle
  // verbleibenden Slots zu fuellen (kleiner Katalog), zusaetzliche
  // Generalisten ueber das Kontingent hinaus nachziehen statt Slots leer
  // zu lassen.
  if (aufgefuellt.length < remainingSlots) {
    const luecke = remainingSlots - aufgefuellt.length;
    const weitereGeneralisten = generalistenSorted
      .slice(GENERALISTEN_KONTINGENT, GENERALISTEN_KONTINGENT + luecke)
      .map((s) => s.boerse);
    aufgefuellt = [...aufgefuellt, ...weitereGeneralisten];
  }

  return [...gewaehlteGeneralisten, ...aufgefuellt];
}
