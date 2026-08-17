import { MatchResponseSchema, type MatchResponseParsed } from "./schema.js";
import type { Boerse, VakanzInput } from "./types.js";

/**
 * Rule 3 aus dem System-Prompt: verbotene Superlative/Erfolgsversprechen.
 * Wortgrenzen-Regex statt substring-includes(), sonst matchen z.B. "beste"
 * faelschlich in "bestehende" oder "besteht" (echter Bug, per API-Testlauf
 * gefunden: "Softwareentwickler Backend" loeste faelschlich einen Fallback
 * aus, weil ein Freitext das voellig harmlose Wort "bestehende" enthielt).
 * best(e|er|es|en|em) deckt die deutschen Flexionsformen von "beste" ab;
 * bei "garantiert" zusaetzlich Flexionsformen wie "garantierte(n)".
 */
const VERBOTENE_SUPERLATIVE_PATTERNS: RegExp[] = [
  /\bbest(e|er|es|en|em)\b/i,
  /\bgarantiert\w*\b/i,
  /\bsicher\b/i,
  /\b(fuehrend|führend)\w*\b/i,
  /\bg(u|ü)nstigste\w*\b/i,
  /\bschnellste\w*\b/i,
  /\bin jedem fall\b/i,
];

const ZIFFER_REGEX = /\d/;

export type ValidationFailureReason =
  | "parse-error"
  | "schema-error"
  | "limit-exceeded"
  | "ziffer-in-freitext"
  | "verbotene-superlative";

export interface ValidationSuccess {
  ok: true;
  data: MatchResponseParsed;
}

export interface ValidationFailure {
  ok: false;
  reason: ValidationFailureReason;
  detail: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Schritte 0-6 aus matching-prompt-console.md Abschnitt 6.
 *
 * Schritt 0 (Prefill wieder voranstellen, max_tokens-Abbruch abfangen)
 * passiert bereits in client.ts, bevor dieser Code laeuft.
 *
 * Bei jedem Fehlschlag: NICHT reparieren, sondern nach oben durchreichen -
 * der Aufrufer (match.ts) entscheidet ueber den Fallback (Schritt 8).
 */
export function validateModelResponse(
  rawText: string,
  input: VakanzInput
): ValidationResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (err) {
    return {
      ok: false,
      reason: "parse-error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const schemaResult = MatchResponseSchema.safeParse(parsedJson);
  if (!schemaResult.success) {
    return {
      ok: false,
      reason: "schema-error",
      detail: schemaResult.error.message,
    };
  }
  const data = schemaResult.data;

  // Schritt 1: unbekannte boardId verwerfen (nicht die ganze Antwort).
  const bekannteIds = new Set(input.kandidaten.map((k) => k.boardId));
  const bereinigteEmpfehlungen = data.empfehlungen.filter((e) =>
    bekannteIds.has(e.boardId)
  );

  // Schritt 2: Laenge gegen das tatsaechlich angefragte limit pruefen,
  // nicht nur gegen das Schema-Maximum 5.
  if (bereinigteEmpfehlungen.length > input.limit) {
    return {
      ok: false,
      reason: "limit-exceeded",
      detail: `Modell lieferte ${bereinigteEmpfehlungen.length} Empfehlungen, angefragt war limit=${input.limit}.`,
    };
  }

  // Schritt 4: planrolle je Empfehlung gegen die Originaldaten der Boerse
  // abgleichen; bei Abweichung korrigieren (nicht verwerfen).
  const boerseById = new Map<string, Boerse>(
    input.kandidaten.map((k) => [k.boardId, k])
  );
  const korrigierteEmpfehlungen = bereinigteEmpfehlungen.map((e) => {
    const boerse = boerseById.get(e.boardId);
    if (boerse && !boerse.planrolle.includes(e.planrolle)) {
      return { ...e, planrolle: boerse.planrolle[0] };
    }
    return e;
  });

  // Schritt 5: Ziffern in Freitextfeldern - Regel 2 ist eine ABSOLUTE REGEL,
  // ein Verstoss disqualifiziert die gesamte Antwort (siehe Modul-Doku oben).
  const freitexte = [
    ...korrigierteEmpfehlungen.map((e) => e.begruendung),
    ...data.hinweise,
  ];
  const freitextMitZiffer = freitexte.find((t) => ZIFFER_REGEX.test(t));
  if (freitextMitZiffer) {
    return {
      ok: false,
      reason: "ziffer-in-freitext",
      detail: `Ziffer in Freitext gefunden: "${freitextMitZiffer}"`,
    };
  }

  // Schritt 6: verbotene Superlative - ebenfalls eine ABSOLUTE REGEL.
  const gesamttext = freitexte.join(" \n ");
  for (const pattern of VERBOTENE_SUPERLATIVE_PATTERNS) {
    const match = gesamttext.match(pattern);
    if (match) {
      return {
        ok: false,
        reason: "verbotene-superlative",
        detail: `Verbotenes Wort gefunden: "${match[0]}"`,
      };
    }
  }

  return {
    ok: true,
    data: { ...data, empfehlungen: korrigierteEmpfehlungen },
  };
}
