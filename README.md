# Cala Ventra · Freier Fall

Ein eigenständiges Third-Person-Actionspiel mit offener Inselwelt. TypeScript, Babylon.js und Vite; lokale Modelle, kein Backend und kein externer Asset-Server zur Laufzeit.

## Starten

Node.js 22.12+ oder 24 LTS und npm:

```sh
npm ci
npm run dev
```

Die ausgegebene lokale Adresse öffnen und **Spielen** klicken. Bei einem defekten globalen npm-Wrapper funktioniert auf dieser Maschine:

```powershell
& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run dev
```

## Die erweiterte Insel

- **4.096 × 4.096 Meter Terrain**, gut zehnmal die bisherige Terrainfläche. Zusammenhängende Küsten, Buchten, Bergland und ein Strassennetz zwischen allen Siedlungen und Sehenswürdigkeiten.
- **Acht Siedlungen:** Ventosa, Estela, Aurora, Bellacosta, San Remo, Monteluce, Oliveto und Porto Novo. Über 220 mehrgeschossige Gebäude, Fensterläden, Balkone, Dachterrassen, Läden, Marktstände, Brunnen, Cafés, Uhrtürme, Gärten, Gehwege und Übergänge.
- **16 weitere Orte:** Leuchtturm, zwei Hafenanlagen, Oliven- und Orangenhöfe, Weinberge, Abtei, Aquädukt, Hochblick, Terminal, Raststätte, Kaskaden, Windpark, Nordkap, Fort und Salinen. Dazu tausende prozedurale Landschaftsobjekte.
- **39 auswählbare Aufträge mit 128 Zielen:** Höhenroute, acht Lieferaufträge, acht Nachbarschaftsaufträge, sechs Befreiungsoperationen, sechs Aufklärungen, vier Zeitläufe, vier Fundstückrouten, Inselpass und Finale. Mehrere Etappen, Voraussetzungen, Interaktionen und einmalige Punktebelohnungen.
- **Sechs Basen, 50 Wachen und 17 Tanks.** Schalte die Ziele einer Basis aus und halte ihre Flagge sechs Sekunden. Danach kehren Bewohner zurück, Nachschub wird verfügbar und die Flagge wechselt die Farbe.
- **Bewohner und Verkehr:** Menschen mit sechs Berufen, unterschiedlicher Kleidung, Laufwegen, Arbeits- und Marktpausen, Gesprächen und örtlichen Dialogen. Bei Schüssen laufen sie zu sicheren Punkten und beruhigen sich allmählich. 18 Autos fahren auf getrennten Fahrspuren, bremsen und reagieren auf Fussgänger und andere Fahrzeuge. Entfernte Figuren werden deaktiviert.
- **Überarbeitete Atmosphäre:** eigene Wasseranimation, Himmelsverlauf, ziehende Wolken, Küstenvögel, wechselndes Tageslicht und nahe Schatten. Die Einstellung Performance deaktiviert Schatten.
- **Inselatlas, Journal und Reisen:** Die Minikarte folgt dem Spieler. Entdeckte Siedlungen werden für Schnellreise freigeschaltet; Reisen funktioniert am Boden ohne Alarm und ohne laufenden Zeitauftrag.
- **Lokaler Spielstand:** Position, Aufträge, Punkte, Gesundheit, Munition, besiegte Wachen, zerstörte Tanks, befreite Basen, entdeckte Orte und Tageslichtzeit werden automatisch gesichert. Ältere Spielstände bleiben lesbar. Rücktaste behält den Einsatzfortschritt; Einsatz neu starten setzt ihn zurück.

## Steuerung

| Eingabe | Funktion |
|---|---|
| WASD / Shift / Space | Bewegen / Sprinten / Springen |
| Maus / Mausrad | Kamera / Zoom |
| F | Greifhaken an eine Oberfläche; erneut lösen |
| Space während Greifhaken | Seil lösen, Schwung behalten |
| C / Q | Wingsuit / Fallschirm in der Luft |
| Linke / rechte Maustaste | Schiessen / Zielen |
| J | Alternative Feuertaste |
| 1 / 2 / R | Gewehr / Raketenwerfer / Nachladen |
| E | Markierte Auftragsaktion, Nachschub oder Gespräch |
| Tab | Inselatlas öffnen / schliessen |
| M | Auftragsjournal öffnen / schliessen |
| T | Reiseziele öffnen / schliessen |
| ↑ ↓ im Atlas | Eintrag auswählen |
| ← → im Atlas | Insel / Aufträge / Reisen wechseln |
| E im Atlas | Ziel verfolgen oder Reise bestätigen |
| B / N | Nächsten verfügbaren Auftrag / nächste Basis verfolgen |
| Rücktaste | Zurück zum Start und Ausrüstung auffüllen; Fortschritt behalten |
| Esc | Pause |

Der Atlas pausiert die Simulation. Die Tastatursteuerung funktioniert auch bei aktiver Maussperre; im Maus-Fallback können die Schaltflächen angeklickt werden. Falls Pointer Lock im integrierten Browser blockiert wird, die Kamera mit rechter Maustaste ziehen oder Pfeiltasten verwenden.

## Prüfen und bauen

```sh
npm test
npm run build
```

Die Tests prüfen Spiellogik und Geometriedaten; Babylon NullEngine erzeugt dabei keine Bilder. Bei dieser Überarbeitung wurde auf Wunsch **kein visueller Test, kein Screenshot und kein Browser-Spieltest** ausgeführt. Darstellung, Bediengefühl und Hardwareleistung prüft der Nutzer selbst.

`dist/` enthält die statisch bereitstellbare Anwendung. Eine öffentliche Bereitstellung ist nicht Bestandteil dieser Überarbeitung.

## Technische Grenzen

Die Autos sind Umgebungsverkehr und noch nicht vom Spieler fahrbar. Bewohner nutzen feste, geprüfte Fusswege und Hindernisvermeidung; Wachen verwenden Sichtprüfung, lokale Hindernisvermeidung, Truppmeldungen und Suche, kein allgemeines Navmesh oder strategisches Deckungssystem. Zerstörbar sind Tanks, keine vollständigen Gebäude. Die Welt verwendet Distanzaktivierung und zusammengefasste Geometrie; geladenes Gelände und Assets bleiben im Speicher. Kein Touch-Modus, keine Hand-IK oder Ragdolls. Grafikleistung und tatsächliche WebGL-Darstellung dieser Fassung wurden nicht gemessen.

## Projekt und Assets

- [Architektur](docs/ARCHITECTURE.md)
- [Prüfstand](docs/VALIDATION.md)
- [Assets und Lizenzen](CREDITS.md)
- Weltdefinitionen: `src/data/world.ts`, `src/data/bases.ts`, `src/data/config.ts`.
- Missionen: `src/data/missions.ts`, `src/missions/MissionProgress.ts`.
- Eigene Stadt-, Landschafts- und Umgebungsgeometrie entsteht direkt im Spiel; zusätzliche Downloads sind nicht erforderlich.

Die vorhandenen GLBs liegen in `public/assets`. Zum reproduzierbaren Neuimport dienen `scripts/download-assets.mjs` und `scripts/prepare-assets.mjs`; Provenienz und Lizenzen liegen in `public/assets/licenses`.
