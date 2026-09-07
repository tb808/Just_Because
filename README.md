# Cala Ventra · Freier Fall

Ein eigenständiger clientseitiger Third-Person-Movement-Prototyp. TypeScript, Babylon.js 8.56.2 und Vite 7.3.6. Kein Backend, Login oder externer Asset-Server zur Laufzeit.

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

* Kleine Inselregion mit Küste, Meer, Hügeln, Dorf, Strassen, Brücke, Tankstelle und unbewohntem Basisgelände.
* Animierte Kenney-Spielfigur, Laufen/Sprinten/Springen, Kollision und weiche Third-Person-Kamera mit Zoom und Hindernisprüfung.
* Greifhaken mit Sichtlinie, 135-m-Reichweite, Seil, Beschleunigung, automatischem Lösen am Ziel und Momentum.
* Wingsuit mit Dive/Climb-Verhalten, Luftwiderstand, Steuerung und sichtbarer Membran.
* Fallschirm mit schneller Verzögerung, lenkbarem Sinkflug und Wechsel zwischen Luftfähigkeiten.
* Datengetriebene Höhenroute mit vier Checkpoints, Zeit und Abschlussmeldung. Danach freies Erkunden.
* HTML-HUD, Pause, Empfindlichkeit, Renderqualität, Rücksetzen und Maus-Fallback.
* Lokale GLB-Assets, Cache und Instanzen, 64 Terrain-Kollisionsteile, Distanzaktivierung der Dekoration.

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
| R | Zurück zum Aussichtspunkt; Checkpoints behalten |
| Esc | Pause |

Im integrierten Browser kann Pointer Lock blockiert sein. Das Spiel aktiviert dann automatisch Rechtsziehen/Pfeiltasten. Für unbegrenzte Mausrotation einen eigenständigen Browser-Tab benutzen. Keine Touch-/Mobilsteuerung implementiert.

Tipp: Das erste Relais steht direkt vor dir. Ziel möglichst hoch setzen, F drücken, kurz vor dem Dach Space lösen. Mit der Kamera lenken; W im Wingsuit senkt die Flugbahn zusätzlich. Q bremst den Sinkflug. Der letzte Checkpoint verlangt eine Bodenlandung.

## Projekt und Planung

* [Architektur, Klassenkommunikation, Zustände und zukünftige Systeme](docs/ARCHITECTURE.md)
* [Assets, Quellen, Formate, Lizenzen und Stilentscheidung](CREDITS.md)
* [Prüfergebnisse und bekannte Grenzen](docs/VALIDATION.md)
* `src/data/assets.ts`: alle Modellpfade; `src/data/config.ts`: Movement-Tuning; `src/data/contracts.ts`: Damage-/Vehicle-/Enemy-Verträge.

## Testen und statisch bereitstellen

```sh
npm test
npm run build
npm run preview
```

`dist/` ist eine vollständige statische Website. Den **Inhalt von dist** auf GitHub Pages oder einen anderen statischen Host veröffentlichen. `base: './'` und das Asset-Manifest berücksichtigen Unterverzeichnisse. Kein SPA-Router und keine serverseitigen Rewrites notwendig. Es wurde noch nichts öffentlich veröffentlicht; das Projekt enthält keine Hosting-Zugangsdaten.

## Nächste Entwicklungsschritte

1. Höhenroute spielen und Beschleunigung, Lösen, Landen abstimmen; Animationen überblenden, kleines Vaulting und ausgearbeitete Flugausrüstung ergänzen.
2. Geparkten SUV durch Vehicle/CarController fahrbar machen, Ein-/Ausstieg und sichere Übergabe des Momentums.
3. Sturmgewehr/Raketenwerfer → Health/Explosionen → zerstörbare Tanks, jeweils mit Build-/Laufzeitprüfung.
4. 5–10 Gegner → Alarm → Basisziele/Befreiung. Erst danach Welt vergrössern.

Das ist **noch nicht der komplette Action-Vertical-Slice**: Fahrzeuge sind Dekoration; Kampf, Zerstörung, Gegner, Alarm und Basisbefreiung sind noch nicht implementiert. Das Streaming aktiviert bereits geladene Dekoration nach Distanz, entlädt aber noch keine Asset-Dateien. Keine Havok-Physik, kein Spielstand, keine Sounds, keine WebGPU-Option. Es gibt kein Savegame; Neuladen setzt die Route zurück.

## Assets reproduzieren

Normales Starten benötigt keine Asset-Downloads. Die fertigen GLBs sind bereits unter `public/assets`. Zum erneuten Import: `node scripts/download-assets.mjs`, ZIPs jeweils nach `.cache/assets/<pack>/` entpacken und `node scripts/prepare-assets.mjs`. Vor Verwendung aktualisierter Packs Lizenzen/Dateinamen erneut prüfen. Die Vorbereitung bettet externe PNGs ein und schreibt das Provenienz-/Hash-Inventar. Die vollständigen Pack-Archive werden nicht ausgeliefert.
