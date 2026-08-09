# Personalwerk — Mood 7

Eine Landingpage, die das **Design-System der TAG Heuer Connected Calibre E5
Collection-Seite** übernimmt (Elemente, Styles, Animationen) und konsequent auf
**Personalwerk** überträgt.

## Öffnen
`index.html` einfach im Browser öffnen (kein Build, keine Abhängigkeiten).
Fonts (Space Grotesk / Inter) werden von Google Fonts geladen → online öffnen.

```
index.html      Struktur & Inhalte (deutsch)
styles.css      Design-System, Sektionen, Animations-Grundzustände
script.js       Motion-Layer (Vanilla JS, prefers-reduced-motion-aware)
assets/         Bild-Slots (siehe unten)
```

## Was von TAG Heuer übernommen wurde → auf Personalwerk gemappt

| TAG Heuer Connected Collection | Personalwerk Mood 7 |
|---|---|
| Dunkle, kinematische Bühne, orange/rot Akzent | Schwarz-Bühne + Personalwerk-Orange `#ff5a1f` |
| Fixe Promo-Leiste oben | „Kostenlose Erstberatung …“ Laufband |
| Header transparent → wird beim Scrollen solide, blendet aus/ein | identisch (`is-solid` / `is-down`) |
| Vollbild-Hero mit Loop-Media + Zeilen-Reveal | Hero „Personalmarketing für die Zukunft.“ |
| Keyword-Marquee | Multiposting · Employer Branding · … |
| Editorial-Panels (Material/Design der Uhr) | 4 Leistungen: Multiposting / Employer Branding / Personalberatung / E-Recruiting |
| Sport/Performance-Scrollytelling | Ergebnis-Scrolly mit Ziffernblatt (87 % / 45 % / 2.000+ / 98 %) |
| Produkt-Kollektions-Grid mit Hover | „Kollektion“ der Lösungen (Tilt + Hover-Zoom, Badges „Neu“/„Bestseller“) |
| Watch-Faces-Karussell (Drag) | Referenzen-Karussell (Drag / Wheel / Buttons) |
| Newsletter + mehrspaltiger Footer | „EDGE Newsletter“ + Footer |

## Übernommene Animationen
- Intro-Loader mit Prozent-Zähler und Wipe
- Hero-Zeilen fahren nach dem Load von unten ein
- Scroll-Reveal (IntersectionObserver, gestaffelt)
- Parallax auf Hero-, Panel- und CTA-Medien
- Wort-für-Wort-Aufhellung (Manifest & Zitat) am Scroll-Fortschritt
- Zahl-Count-up (Hero-Kennzahlen)
- Gepinntes Scrollytelling mit rotierendem Ziffernblatt + Zeiger
- Karten-Tilt (3D) + Hover-Zoom
- Draggable Karussell mit Trägheit/Buttons/Wheel
- Magnetische Buttons
- Laufband-Marquees
- Alles respektiert `prefers-reduced-motion`.

## Bilder
In `assets/` liegen jetzt **generierte Fotos** (dunkel, kinematisch, Orange-Akzent):

```
assets/hero.jpg               Hero (quer)
assets/panel-multiposting.jpg Reichweite / Screens (hoch)
assets/panel-branding.jpg     Studio-Portrait (hoch)
assets/panel-beratung.jpg     Spotlight / Direct Search (hoch)
assets/panel-erecruiting.jpg  Laptop / Dashboard (hoch)
assets/cta.jpg                Team am Horizont (quer)
```
Zum Austauschen einfach die Datei unter gleichem Namen ersetzen — das CSS
referenziert sie über `:root` (`--img-*`). Fehlt eine Datei, greift automatisch
die **CSS-Duoton-Fläche** als Fallback. Die Kollektions- und Referenzkarten
nutzen bewusst farbige Duoton-Flächen (wie Farb-/Instrument-Swatches).

## Farb-/Typo-Tokens
Alle zentral in `styles.css` unter `:root` — Akzentfarbe, Flächen, Fonts,
Easings und Innenabstände lassen sich dort in einer Zeile anpassen.
