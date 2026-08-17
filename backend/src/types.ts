import type { Berufsfeld, Karrierelevel, Planrolle } from "./enums.js";

/** Eine Stellenboerse aus dem deterministischen Vorfilter, ohne Preisdaten. */
export interface Boerse {
  boardId: string;
  name: string;
  kategorie: string;
  kurzbeschreibung: string;
  /** Anteil in Prozent je Berufsfeld, muss nicht alle Enum-Werte abdecken. */
  berufsfelder: Partial<Record<Berufsfeld, number>>;
  karrierelevel: Karrierelevel[];
  planrolle: Planrolle[];
  bundesweit: boolean;
}

export interface VakanzInput {
  jobtitel: string;
  /** undefined/leer wird beim Prompt-Aufbau zu "keine" */
  region?: string;
  limit: number;
  kandidaten: Boerse[];
}

export interface Empfehlung {
  boardId: string;
  planrolle: Planrolle;
  passgenauigkeit: number;
  begruendung: string;
}

export interface MatchResponse {
  normalisierterJobtitel: string;
  erkanntesBerufsfeld: Berufsfeld;
  erkanntesKarrierelevel: Karrierelevel;
  konfidenz: number;
  empfehlungen: Empfehlung[];
  hinweise: string[];
}

/** empfehlungen angereichert um den aus der Array-Position abgeleiteten Rang. */
export interface EmpfehlungMitRang extends Empfehlung {
  rang: number;
}

export interface MatchResult extends Omit<MatchResponse, "empfehlungen"> {
  empfehlungen: EmpfehlungMitRang[];
  /** true, wenn die Modellantwort verworfen und stattdessen deterministisch sortiert wurde. */
  fallback: boolean;
}
