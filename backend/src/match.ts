import Anthropic from "@anthropic-ai/sdk";
import { callMatchingModel, TruncatedResponseError } from "./client.js";
import { validateModelResponse } from "./validate.js";
import { fallbackRanking } from "./fallback.js";
import type { EmpfehlungMitRang, MatchResult, VakanzInput } from "./types.js";

export interface MatchOptions {
  apiKey?: string;
  client?: Anthropic;
  /** Ueberschreibt DEFAULT_MODEL, z.B. mit ALTERNATIVE_MODEL zum Vergleichstest. */
  model?: string;
  /** An callMatchingModel durchgereicht, siehe dort. */
  supportsTemperature?: boolean;
  /** Fuer Logging/Monitoring: wird bei jedem Fallback mit dem Grund aufgerufen. */
  onFallback?: (reason: string) => void;
}

/**
 * Oeffentlicher Einstiegspunkt: ruft den Matching-Prompt auf, validiert die
 * Antwort serverseitig (matching-prompt-console.md Abschnitt 6) und liefert
 * bei jedem Fehler die deterministische Fallback-Rangfolge statt einer
 * reparierten Modellantwort - "Punkt 8 ist der Grund, warum der Shop auch
 * ohne Modell funktionsfähig bleibt."
 *
 * Schritt 7 (Preise/Reichweiten aus der Datenbank anreichern) ist bewusst
 * NICHT Teil dieser Funktion - das passiert in der Anwendung, nachdem sie
 * dieses Ergebnis erhalten hat, mit den boardId-Werten aus `empfehlungen`.
 */
export async function matchStellenboersen(
  input: VakanzInput,
  opts: MatchOptions = {}
): Promise<MatchResult> {
  if (input.kandidaten.length === 0) {
    return {
      normalisierterJobtitel: input.jobtitel,
      erkanntesBerufsfeld: "it-software",
      erkanntesKarrierelevel: "professional",
      konfidenz: 0,
      empfehlungen: [],
      hinweise: ["Keine Kandidaten uebergeben."],
      fallback: false,
    };
  }

  let rawText: string;
  try {
    const raw = await callMatchingModel(input, {
      apiKey: opts.apiKey,
      client: opts.client,
      model: opts.model,
      supportsTemperature: opts.supportsTemperature,
    });
    rawText = raw.text;
  } catch (err) {
    const reason =
      err instanceof TruncatedResponseError
        ? "truncated"
        : `api-error: ${err instanceof Error ? err.message : String(err)}`;
    opts.onFallback?.(reason);
    return fallbackRanking(input);
  }

  const validation = validateModelResponse(rawText, input);
  if (!validation.ok) {
    opts.onFallback?.(`${validation.reason}: ${validation.detail}`);
    return fallbackRanking(input);
  }

  // Schritt 3: rang aus der Array-Position ableiten, nicht aus der Modellantwort.
  const empfehlungen: EmpfehlungMitRang[] = validation.data.empfehlungen.map(
    (e, i) => ({ ...e, rang: i + 1 })
  );

  return {
    normalisierterJobtitel: validation.data.normalisierterJobtitel,
    erkanntesBerufsfeld: validation.data.erkanntesBerufsfeld,
    erkanntesKarrierelevel: validation.data.erkanntesKarrierelevel,
    konfidenz: validation.data.konfidenz,
    empfehlungen,
    hinweise: validation.data.hinweise,
    fallback: false,
  };
}
