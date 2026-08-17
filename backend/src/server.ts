import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import cors from "cors";
import { matchStellenboersen } from "./match.js";
import { prefilterCandidates } from "./prefilter.js";
import { boersenFuerBranche, istBekannteBranche, rangiereNachBranche, BRANCHE_TO_BERUFSFELDER } from "./branche.js";
import type { Boerse, VakanzInput } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Minimaler lokaler Dev-Server, damit das Frontend-Prototyp (Empfehlungsliste.html)
 * den Suchschlitz gegen den echten Matching-Dienst testen kann.
 *
 * KEIN Produktionsserver: CORS ist bewusst offen (Access-Control-Allow-Origin: *),
 * es gibt weder Auth noch Rate-Limiting. Vor echtem Einsatz klaeren.
 *
 * Der Katalog (data/boards-catalog.json, 61 Boersen aus dem echten
 * Medienkompass-PDF) ist groesser als das in matching-prompt-console.md
 * Abschnitt 3 vorgegebene Limit von maximal 15 Kandidaten - siehe
 * prefilter.ts fuer die (bewusst einfache) Vorfilterlogik, die das
 * durchsetzt.
 */

const PORT = Number(process.env.PORT ?? 4312);

const catalog: Boerse[] = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "boards-catalog.json"), "utf-8")
);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, boardsInCatalog: catalog.length });
});

app.post("/api/match", async (req, res) => {
  const { jobtitel, region, limit, branche } = req.body ?? {};

  const jobtitelStr = typeof jobtitel === "string" ? jobtitel.trim() : "";
  const regionStr = typeof region === "string" ? region : undefined;
  const limitVal = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;

  if (!istBekannteBranche(branche) && !jobtitelStr) {
    res.status(400).json({ error: "jobtitel (string) ist erforderlich, wenn keine Branche gewaehlt ist." });
    return;
  }

  // Branche geht im Algorithmus vor die Jobtitel-Suche: die Branche filtert
  // den Katalog zuerst, der Jobtitel qualifiziert nur zusaetzlich nach, wenn
  // die Branche allein zu viele Boersen liefert (mehr als limitVal). Ohne
  // Branche ("Alle Branchen") laeuft die Suche unveraendert ausschliesslich
  // ueber den Jobtitel im gesamten Katalog.
  if (istBekannteBranche(branche)) {
    const brancheKatalog = boersenFuerBranche(catalog, branche);

    if (brancheKatalog.length === 0) {
      res.json({
        normalisierterJobtitel: jobtitelStr,
        erkanntesBerufsfeld: BRANCHE_TO_BERUFSFELDER[branche][0],
        erkanntesKarrierelevel: "professional",
        konfidenz: 0,
        empfehlungen: [],
        hinweise: ["Keine Boersen fuer diese Branche im Katalog."],
        fallback: false,
        modus: "branche",
      });
      return;
    }

    if (brancheKatalog.length <= limitVal || !jobtitelStr) {
      // Nicht zu viele Boersen, oder noch kein Jobtitel zum Qualifizieren:
      // deterministische Rangfolge nach Berufsfeldanteil, kein Modellaufruf,
      // aber mit echtem Begruendungstext (Kurzbeschreibung der Boerse) statt
      // dem generischen "Keine Begründung verfügbar." auf jeder Karte.
      const empfehlungen = rangiereNachBranche(brancheKatalog, branche, limitVal);
      res.json({
        normalisierterJobtitel: jobtitelStr,
        erkanntesBerufsfeld: BRANCHE_TO_BERUFSFELDER[branche][0],
        erkanntesKarrierelevel: "professional",
        konfidenz: 0,
        empfehlungen,
        hinweise:
          brancheKatalog.length > limitVal
            ? [
                `Zeigt die ${limitVal} relevantesten von ${brancheKatalog.length} Boersen dieser Branche. Jobtitel eingeben, um weiter zu qualifizieren.`,
              ]
            : [],
        fallback: false,
        modus: "branche",
      });
      return;
    }

    // Zu viele Boersen fuer die Branche allein - der Jobtitel qualifiziert
    // zusaetzlich nach, aber nur innerhalb der branchengefilterten Teilmenge,
    // nicht im gesamten Katalog.
    const kandidaten = prefilterCandidates(brancheKatalog, jobtitelStr);
    const input: VakanzInput = { jobtitel: jobtitelStr, region: regionStr, limit: limitVal, kandidaten };

    try {
      const result = await matchStellenboersen(input, {
        onFallback: (reason) => console.warn(`[Fallback] "${jobtitelStr}" (Branche ${branche}): ${reason}`),
      });
      res.json({ ...result, modus: "branche+jobtitel", kandidatenGesendet: kandidaten.map((k) => k.boardId) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Matching fehlgeschlagen." });
    }
    return;
  }

  const kandidaten = prefilterCandidates(catalog, jobtitelStr);
  const input: VakanzInput = { jobtitel: jobtitelStr, region: regionStr, limit: limitVal, kandidaten };

  try {
    const result = await matchStellenboersen(input, {
      onFallback: (reason) => console.warn(`[Fallback] "${jobtitelStr}": ${reason}`),
    });
    res.json({ ...result, modus: "jobtitel", kandidatenGesendet: kandidaten.map((k) => k.boardId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Matching fehlgeschlagen." });
  }
});

app.listen(PORT, () => {
  console.log(`Matching-Server laeuft auf http://localhost:${PORT}`);
  console.log(`Katalog: ${catalog.length} Boersen aus data/boards-catalog.json`);
});
