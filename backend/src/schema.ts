import { z } from "zod";
import { BERUFSFELDER, KARRIERELEVEL, PLANROLLEN } from "./enums.js";

export const EmpfehlungSchema = z.object({
  boardId: z.string(),
  planrolle: z.enum(PLANROLLEN),
  passgenauigkeit: z.number().min(0).max(1),
  begruendung: z.string().max(400),
});

export const MatchResponseSchema = z.object({
  normalisierterJobtitel: z.string(),
  erkanntesBerufsfeld: z.enum(BERUFSFELDER),
  erkanntesKarrierelevel: z.enum(KARRIERELEVEL),
  konfidenz: z.number().min(0).max(1),
  empfehlungen: z.array(EmpfehlungSchema).max(5),
  hinweise: z.array(z.string()),
});

export type EmpfehlungParsed = z.infer<typeof EmpfehlungSchema>;
export type MatchResponseParsed = z.infer<typeof MatchResponseSchema>;
