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
- **Eine zusammenhängende Geschichte in acht Kapiteln:** Nika sucht ihren verschwundenen Bruder Tomás und entdeckt, dass ihr früheres Rettungsnetz zur Überwachung der Insel missbraucht wird. 22 Hauptziele verbinden Gespräche, eine Flugpassage, Ermittlungen, den Schutz der zivilen Versorgung und drei gezielte Basisbefreiungen.
- **13 Cutscenes direkt in der 3D-Welt:** Kamerafahrten, Nahaufnahmen, animierte Figuren, leuchtende Funkgeräte, lesbare deutsche Untertitel und eine dezente synthetisierte Musikfläche. Die Dialoge sind untertitelt, nicht eingesprochen. SPACE schaltet zur nächsten Einstellung; ENTER überspringt die Szene. ESC pausiert auch die Cutscene. Reduzierte Bewegung im Betriebssystem stoppt die Kamerafahrten.
- **Eine Entscheidung mit Folgen:** Vor der Veröffentlichung entscheidest du über den Schutz der Zeugenkennungen. Das verändert die Vorbereitung der Sendung, Dialoge und den Epilog. Beide Varianten lassen die offene Insel nach dem Ende spielbar.
- **Fünf freiwillige Nebenaufträge:** Flugtraining, Maras Medikamentenlieferung, Wetterdaten für die Fischer, Südexpress und die verschwundene Ernte. Die bisherigen sich wiederholenden Auftragsreihen entfallen. Die zehn Basen bleiben unabhängig von der Geschichte befrei- und verfolgbar.
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
| SPACE / ENTER in Cutscenes | Nächste Einstellung / Szene überspringen |
| ← → / E bei Storyentscheidung | Möglichkeit wählen / bestätigen |
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

Die Tests prüfen Spiellogik, Weltgeometrie, beide Storyentscheidungen, Cutscene-Sperren und Spielstandmigration. Babylon NullEngine erzeugt dabei keine Bilder. Die Storydarstellung wird zusätzlich lokal im Browser geprüft; Einzelheiten stehen im [Prüfstand](docs/VALIDATION.md).

Alte Spielstände behalten Weltzustand, Inventar, Punkte und den Fortschritt der fünf erhaltenen Nebenaufträge. Die neue Geschichte beginnt bei Kapitel eins. Ein während einer Cutscene gespeicherter Spielstand wiederholt diese Szene beim Laden, ohne Ziele oder Belohnungen doppelt auszulösen.

`dist/` enthält die statisch bereitstellbare Anwendung. Eine öffentliche Bereitstellung ist nicht Bestandteil dieser Überarbeitung.

## Technische Grenzen

Bewohner nutzen feste, geprüfte Fusswege und Hindernisvermeidung; Wachen verwenden Sichtprüfung, lokale Hindernisvermeidung, Truppmeldungen und Suche, kein allgemeines Navmesh oder strategisches Deckungssystem. Zerstörbar sind Tanks, keine vollständigen Gebäude. Die Welt verwendet Distanzaktivierung und zusammengefasste Geometrie; geladenes Gelände und Assets bleiben im Speicher. Kein Touch-Modus, keine Hand-IK oder Ragdolls. Grafikleistung und tatsächliche WebGL-Darstellung dieser Fassung wurden nicht gemessen.

## Projekt und Assets

- [Architektur](docs/ARCHITECTURE.md)
- [Prüfstand](docs/VALIDATION.md)
- [Assets und Lizenzen](CREDITS.md)
- Weltdefinitionen: `src/data/world.ts`, `src/data/bases.ts`, `src/data/config.ts`.
- Missionen: `src/data/missions.ts`, `src/data/storyMissions.ts`, `src/missions/MissionProgress.ts`.
- Drehbuch und Inszenierung: `src/story/Screenplay.ts`, `src/story/CutsceneDirector.ts`.
- [Storykonzept und Ablauf](docs/STORY.md) (enthält Spoiler).
- Eigene Stadt-, Landschafts- und Umgebungsgeometrie entsteht direkt im Spiel; zusätzliche Downloads sind nicht erforderlich.

Die vorhandenen GLBs liegen in `public/assets`. Zum reproduzierbaren Neuimport dienen `scripts/download-assets.mjs` und `scripts/prepare-assets.mjs`; Provenienz und Lizenzen liegen in `public/assets/licenses`.

## Lizenz

Der Quellcode dieses Projekts steht unter der [MIT-Lizenz](LICENSE). Copyright © 2026 Tyler Blumenstein.

Die Lizenzen und Urheberhinweise der eingebundenen Drittanbieter-Assets sind separat in [CREDITS.md](CREDITS.md) und `public/assets/licenses/` dokumentiert.
