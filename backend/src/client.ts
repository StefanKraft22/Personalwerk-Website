import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";
import type { VakanzInput } from "./types.js";

/** Settings 1:1 aus matching-prompt-console.md Abschnitt 1. */
export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
/**
 * Von der Doku selbst genannte Alternative, falls Begruendungstexte zu flach
 * ausfallen. GETESTET UND NICHT DIREKT NUTZBAR: claude-sonnet-5 lehnt sowohl
 * `temperature` ("deprecated for this model") als auch Assistant-Message-
 * Prefill ab ("This model does not support assistant message prefill. The
 * conversation must end with a user message.") - letzteres ist keine reine
 * Parameterfrage, sondern macht den "{"-Prefill-Trick aus Doku-Abschnitt 1
 * (erzwingt den JSON-Start) strukturell unmoeglich. Ein Wechsel auf dieses
 * Modell braucht einen eigenen Prompt-Pfad ohne Prefill (z.B. striktere
 * Anweisung + Extraktion des ersten { ... }-Blocks aus der Antwort statt
 * erzwungenem Start), nicht nur diesen Model-String.
 */
export const ALTERNATIVE_MODEL = "claude-sonnet-5";
const TEMPERATURE = 0;
const MAX_TOKENS = 1536;
const PREFILL = "{";

export interface RawModelCall {
  /** Vollstaendiges JSON, PREFILL bereits wieder vorangestellt. */
  text: string;
  stopReason: string | null;
  model: string;
}

export class TruncatedResponseError extends Error {
  constructor() {
    super(
      "Modellantwort wurde bei max_tokens abgeschnitten (stop_reason=max_tokens) - laut Doku sofort in den Fallback gehen, nicht reparieren."
    );
    this.name = "TruncatedResponseError";
  }
}

export async function callMatchingModel(
  input: VakanzInput,
  opts: {
    apiKey?: string;
    client?: Anthropic;
    model?: string;
    /** Manche Modelle (z.B. claude-sonnet-5) lehnen den temperature-Parameter ab ("deprecated for this model"). */
    supportsTemperature?: boolean;
  } = {}
): Promise<RawModelCall> {
  const client =
    opts.client ??
    new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY });

  const userMessage = buildUserMessage(input);
  const supportsTemperature = opts.supportsTemperature ?? true;

  const response = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    ...(supportsTemperature ? { temperature: TEMPERATURE } : {}),
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: PREFILL },
    ],
  });

  if (response.stop_reason === "max_tokens") {
    throw new TruncatedResponseError();
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Modellantwort enthielt keinen Text-Block.");
  }

  // Assistant-Prefill "{" ist in der Antwort nicht mehr enthalten - wieder voranstellen.
  return {
    text: PREFILL + textBlock.text,
    stopReason: response.stop_reason,
    model: response.model,
  };
}
