# Cala Ventra · Freier Fall

Ein eigenständiger clientseitiger Third-Person-Actionprototyp. TypeScript, Babylon.js 8.56.2 und Vite 7.3.6. Kein Backend, Login oder externer Asset-Server zur Laufzeit.

## Starten

Für Entwickler: Node.js 22.12+ oder 24 LTS, npm.

```sh
npm ci
npm run dev
```

Anschliessend die von Vite ausgegebene lokale Adresse öffnen (normalerweise http://127.0.0.1:5173/). **Spielen** klicken. Spieler einer bereitgestellten Website benötigen nur einen WebGL-fähigen Desktop-Browser, keine Installation. Die HTML-Datei nicht per `file://` öffnen.

Auf der Entwicklungsmaschine war der globale npm-Wrapper defekt. Der funktionierende lokale Aufruf lautet gegebenenfalls:

```powershell
& 'C:/Program Files/nodejs/node.exe' 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run dev
```

## Bereits spielbar

* Rund 1,2 × 1,2 km grosse Inselregion mit Küste, Meer, Bergland, zwei Dörfern, Hafen, Strassennetz, Brücke, Tankstelle und drei getrennten Basisgeländen.
* Animierte Kenney-Spielfigur, Laufen/Sprinten/Springen, Kollision und weiche Third-Person-Kamera mit Zoom und Hindernisprüfung.
* Greifhaken mit Sichtlinie, 135-m-Reichweite, Seil, Beschleunigung, automatischem Lösen am Ziel und Momentum.
* Wingsuit mit Dive/Climb-Verhalten, Luftwiderstand, Steuerung und sichtbarer Membran.
* Fallschirm mit schneller Verzögerung, lenkbarem Sinkflug und Wechsel zwischen Luftfähigkeiten.
* Datengetriebene Höhenroute mit vier Checkpoints, Zeit und Abschlussmeldung. Danach freies Erkunden.
* HTML-HUD, Pause, Empfindlichkeit, Renderqualität, Rücksetzen und Maus-Fallback.
* Lokale GLB-Assets, Cache und Instanzen, 64 Terrain-Kollisionsteile, Distanzaktivierung der Dekoration.
* VELA-7-Sturmgewehr und NOVA-Raketenwerfer: Magazine, Reserve, Nachladen, Streuung, Rückstoss, Mündungsblitze und Einschläge. Schüsse prüfen Hindernisse ab der Waffenmündung.
* 20 animierte Wachen in drei unabhängigen Basen: Patrouille, Sichtkegel/Sichtlinie, Schussgeräusche, Verfolgung, Beschuss, Suche und Rückkehr. Trefferreaktion und Todesanimation.
* Acht rote Treibstofftanks: Schaden, Explosion, Wrackzustand und Kettenreaktionen. Gepoolte Raketen, Feuer, Rauch, Funken und Trümmer; synthetisierte Sounds mit Lautstärkeregler.
* Relais Orbis (8 Wachen / 3 Tanks), Hafen Mirada (6 / 2) und Station Altura (6 / 3). Ziele ausschalten, danach sechs Sekunden im 12-m-Bereich um die Flagge bleiben. Jede Befreiung gibt einmalig 1.000 Punkte, eine grüne Flagge, Bewohner und Nachschub.
* 1.280 × 1.280 m Terrain mit eigener Westküste, Hafensteg, drei Marktplätzen, logisch gesetzten Siedlungen, einer Küstenstrasse und Verbindungen ins Bergland. TAB öffnet eine grosse Inselkarte mit Orten, Strassen, Spielerposition und Basenstatus; N wählt das Ziel.
* Zwölf zivile Bewohner mit Laufwegen, Pausen, kurzen Gesprächen und Unruhe bei Schüssen. Je zwei weitere Bewohner kehren in befreite Basen zurück. Zwei zivile Autos verkehren auf der Küstenstrasse und halten vor dem Spieler.
* Grösserer SUV als Nachschubpunkt. Einheitlicher Massstab: Spielfigur 1,75 m, SUV 2,15 m, Dorfhaus 11 m, Depot 16 m, Tanks 6 m. Kollisionsproxies werden aus den skalierten Modellgrenzen abgeleitet.

## Steuerung

| Eingabe | Funktion |
|---|---|
| WASD | Bewegen / Flugrichtung trimmen |
| Shift | Sprint |
| Space | Sprung; während Grapple: Seil lösen |
| F | Greifhaken an markierte Oberfläche / lösen |
| C | Wingsuit in der Luft öffnen/schliessen |
| Q | Fallschirm in der Luft öffnen/schliessen |
| Maus | Kamera drehen |
| Mausrad | Zoom |
| Rechte Maustaste | Schulterkamera; im Maus-Fallback: ziehen zum Drehen |
| Pfeiltasten | Zusätzliche Kamerasteuerung |
| Linke Maustaste / J | Schiessen; halten für Dauerfeuer |
| 1 / 2 | Sturmgewehr / Raketenwerfer |
| R | Nachladen |
| E | Nachschub am freigeschalteten SUV / mit nahem Bewohner sprechen |
| N | Nächste Basis auf Karte und im Auftrag verfolgen |
| Tab | Grosse Inselkarte öffnen / schliessen |
| M | Kampfauftrag / Höhenroute anzeigen |
| Rücktaste | Zurück zum Aussichtspunkt, Ausrüstung auffüllen; Einsatzfortschritt behalten |
| Esc | Pause |

Im integrierten Browser kann Pointer Lock blockiert sein. Das Spiel aktiviert dann automatisch Rechtsziehen/Pfeiltasten. Für unbegrenzte Mausrotation einen eigenständigen Browser-Tab benutzen. Keine Touch-/Mobilsteuerung implementiert.

Tipp: Der Startblick zeigt auf die roten Tanks der Basis. Mit **2** eine Rakete auswählen, zielen und feuern. Eine gut platzierte Explosion löst eine Kettenreaktion aus. Mit **F** hoch an ein Gebäude ziehen und mit **Space** lösen. **C** öffnet den Wingsuit, **Q** bremst den Sinkflug. Im Wingsuit sind die Hände belegt; im Fallschirm kann geschossen werden. **E** am SUV neben der Strasse füllt Gesundheit und Munition auf.

## Projekt und Planung

* [Architektur, Klassenkommunikation, Zustände und zukünftige Systeme](docs/ARCHITECTURE.md)
* [Assets, Quellen, Formate, Lizenzen und Stilentscheidung](CREDITS.md)
* [Prüfergebnisse und bekannte Grenzen](docs/VALIDATION.md)
* `src/data/assets.ts`: Modelle/Massstab; `src/data/config.ts`: Movement; `src/data/weapons.ts`: Waffenwerte; `src/data/enemies.ts`: Wachen; `src/data/contracts.ts`: zukünftige Verträge.

## Testen und statisch bereitstellen

```sh
npm test
npm run build
npm run preview
```

`dist/` ist eine vollständige statische Website. Den **Inhalt von dist** auf GitHub Pages oder einen anderen statischen Host veröffentlichen. `base: './'` und das Asset-Manifest berücksichtigen Unterverzeichnisse. Kein SPA-Router und keine serverseitigen Rewrites notwendig. Es wurde noch nichts öffentlich veröffentlicht; das Projekt enthält keine Hosting-Zugangsdaten.

## Nächste Entwicklungsschritte

1. Kampf und Höhenroute spielen, Treffergefühl und Movement abstimmen; kleines Vaulting und ausgearbeitete Flugausrüstung ergänzen.
2. Geparkten SUV durch Vehicle/CarController fahrbar machen, Ein-/Ausstieg und sichere Übergabe des Momentums.
3. KI um Navigation und explizite Deckungspunkte erweitern; Alarm mit Abklingzeit und begrenzten Verstärkungen.
4. Weitere datengetriebene Basentypen und Aufgaben ergänzen; Weltqualität und Wegführung vor zusätzlicher Fläche verbessern.

Das ist **noch nicht der komplette Action-Vertical-Slice**: Der SUV ist noch nicht fahrbar. Die Gegner verwenden direkte Bewegung mit Kollision, noch kein Navmesh und keine strategische Deckungswahl. Alarm 0–3 zeigt aktive Gegnerreaktion; es gibt noch keine Verstärkungen. Nur Tanks sind zerstörbar, Gebäude bleiben stehen. Animationen kombinieren vorhandene Kenney-Clips mit Maskierung, Überblendung und prozeduralem Waffenrückstoss; noch kein Hand-IK oder physikalische Ragdolls. Das Streaming aktiviert geladene Dekoration, entlädt aber noch keine Asset-Dateien. Keine Havok-Physik und keine WebGPU-Option. Kein Savegame; Neuladen setzt den Einsatz zurück.

## Assets reproduzieren

Normales Starten benötigt keine Asset-Downloads. Die fertigen GLBs sind bereits unter `public/assets`. Zum erneuten Import: `node scripts/download-assets.mjs`, ZIPs jeweils nach `.cache/assets/<pack>/` entpacken und `node scripts/prepare-assets.mjs`. Vor Verwendung aktualisierter Packs Lizenzen/Dateinamen erneut prüfen. Die Vorbereitung bettet externe PNGs ein und schreibt das Provenienz-/Hash-Inventar. Die vollständigen Pack-Archive werden nicht ausgeliefert.
