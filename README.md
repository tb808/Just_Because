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

- **5.120 × 5.120 Meter Terrain**, 56 % mehr Fläche gegenüber der letzten Erweiterung. Vier neue Halbinseln, Küsten, Buchten, Bergland und ein durchgehendes Strassennetz mit Zufahrten zu den neuen Basistoren.
- **Zwölf Siedlungen, 369 Wohngebäude:** Zu Ventosa, Estela, Aurora, Bellacosta, San Remo, Monteluce, Oliveto und Porto Novo kommen vier eigene Baustile: Rocca Alta mit Schieferdächern, Holzbalkonen und Bergfried; Ferravalle mit Backstein, Werkhallen und Wasserturm; Cala Serena mit weissen Villen, Pergolen und Säulenpavillon; Solara mit ockerfarbenen Terrassenhäusern, Kuppeln und Karawanenturm. Dazu Läden, Marktstände, Brunnen, Cafés, Gärten, Gehwege und Übergänge.
- **16 weitere Orte:** Leuchtturm, zwei Hafenanlagen, Oliven- und Orangenhöfe, Weinberge, Abtei, Aquädukt, Hochblick, Terminal, Raststätte, Kaskaden, Windpark, Nordkap, Fort und Salinen. Dazu tausende prozedurale Landschaftsobjekte.
- **52 auswählbare Aufträge mit 172 Zielen:** Höhenroute, zwölf Lieferaufträge, zwölf Nachbarschaftsaufträge, zehn Befreiungsoperationen, sechs Aufklärungen, vier Zeitläufe, vier Fundstückrouten, zwei Inselpässe und Finale. Mehrere Etappen, Voraussetzungen, Interaktionen und einmalige Punktebelohnungen.
- **Zehn Basen, 90 Wachen und 29 Tanks.** Neu sind Festung Bastione, Depot Fonderia, Station Scogliera und Relais Meridiano. Schalte die Ziele einer Basis aus und halte ihre Flagge sechs Sekunden. Danach kehren Bewohner zurück, Nachschub wird verfügbar und die Flagge wechselt die Farbe.
- **Bewohner und Verkehr:** Menschen mit sechs Berufen, unterschiedlicher Kleidung, Laufwegen, Arbeits- und Marktpausen, Gesprächen und örtlichen Dialogen. Bei Schüssen laufen sie zu sicheren Punkten und beruhigen sich allmählich. 26 Autos fahren auf getrennten Fahrspuren, bremsen und reagieren auf Fussgänger und andere Fahrzeuge. Entfernte Figuren werden deaktiviert.
- **Fahrbare SUVs:** Steige mit E in geparkte oder fahrende SUVs ein. W/S steuern Gas, Bremse und Rückwärtsgang, A/D lenken; E steigt wieder aus und U setzt ein festgefahrenes Fahrzeug auf die letzte sichere Position.
- **Überarbeitete Atmosphäre:** eigene Wasseranimation, Himmelsverlauf, ziehende Wolken, Küstenvögel, wechselndes Tageslicht und nahe Schatten. Die Einstellung Performance deaktiviert Schatten.
- **Inselatlas, Journal und Reisen:** Die Minikarte folgt dem Spieler. Entdeckte Siedlungen werden für Schnellreise freigeschaltet; Reisen funktioniert am Boden ohne Alarm und ohne laufenden Zeitauftrag.
- **Erkundungs- und Gebietskarte:** Bereiste Teile der Insel bleiben auf Atlas und Minikarte sichtbar, während unerforschtes Land verdeckt bleibt und nur Küste sowie Kartengrenze erkennbar sind. Die zehn Einflussgebiete des Direktorats erscheinen rot; nach Einnahme ihrer Basis wechseln Land und zugehörige Städte dauerhaft auf Blau.
- **Lokaler Spielstand:** Position, Aufträge, Punkte, Gesundheit, Munition, besiegte Wachen, zerstörte Tanks, befreite Basen, entdeckte Orte und Tageslichtzeit werden automatisch gesichert. Ältere Spielstände bleiben lesbar. Rücktaste behält den Einsatzfortschritt; Einsatz neu starten setzt ihn zurück.

## Steuerung

| Eingabe | Funktion |
|---|---|
| WASD / Shift / Space | Bewegen / Sprinten / Springen |
| Maus / Mausrad | Kamera / Zoom |
| F | Greifhaken an eine Oberfläche; erneut lösen |
| E am SUV | Einsteigen / aussteigen (W/S fahren, A/D lenken) |
| Space während Greifhaken | Seil lösen, Schwung behalten |
| C / Q | Wingsuit / Fallschirm in der Luft |
| W / S im Wingsuit | Sturzflug beschleunigen / hochziehen und Tempo in Höhe umwandeln |
| A / D im Wingsuit | Kurven fliegen; Nika legt sich sichtbar in die Kurve |
| U | Aus Boden oder Kollision nach oben befreien |
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
