# Cala Ventra — Asset-Credits

Lizenz- und Quellenprüfung: **7. September 2026**. Alle eingebundenen Drittanbieter-Modelle stammen aus offiziellen Kenney-Downloads. Die jeweilige Asset-Seite wurde vor dem Download auf CC0 geprüft; die Lizenzdateien der Archive liegen zusätzlich unter `public/assets/licenses/`.

## Tatsächlich eingebunden

| Asset / Originaldatei | Ersteller | Quelle | Lizenz | Format | Verwendung |
|---|---|---|---|---|---|
| Blocky Characters 2.0 / `character-f.glb` | Kenney | [Blocky Characters](https://kenney.nl/assets/blocky-characters) | CC0 1.0 | GLB | Nika Serrin; Originalanimationen idle, walk, sprint, holding-both |
| Nature Kit / `tree_palmDetailedTall.glb` | Kenney | [Nature Kit](https://kenney.nl/assets/nature-kit) | CC0 1.0 | GLB | Küstenpalmen |
| Nature Kit / `tree_oak.glb` | Kenney | [Nature Kit](https://kenney.nl/assets/nature-kit) | CC0 1.0 | GLB | Wald/Berghänge |
| Nature Kit / `rock_largeA.glb` | Kenney | [Nature Kit](https://kenney.nl/assets/nature-kit) | CC0 1.0 | GLB | Felsen |
| Car Kit / `suv.glb` | Kenney | [Car Kit](https://kenney.nl/assets/car-kit) | CC0 1.0 | GLB | Geparktes Fahrzeug; noch nicht fahrbar |
| City Kit Suburban / `building-type-a.glb` | Kenney | [City Kit Suburban](https://kenney.nl/assets/city-kit-suburban) | CC0 1.0 | GLB | Dorfhäuser |
| City Kit Industrial / `building-a.glb` | Kenney | [City Kit Industrial](https://kenney.nl/assets/city-kit-industrial) | CC0 1.0 | GLB | Depot des Vektor-Direktorats |
| City Kit Industrial / `detail-tank-large.glb` | Kenney | [City Kit Industrial](https://kenney.nl/assets/city-kit-industrial) | CC0 1.0 | GLB | Tanks; Zerstörung folgt in späterer Phase |
| City Kit Industrial / `shipping-container-a.glb` | Kenney | [City Kit Industrial](https://kenney.nl/assets/city-kit-industrial) | CC0 1.0 | GLB | Basiscontainer |

[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) verlangt keine Namensnennung; wir nennen Kenney trotzdem. Keine Modelle werden hotgelinkt. Externe PNG-Texturen wurden verlustfrei in die jeweiligen GLBs eingebettet. Modelle sind umbenannt und werden zur Laufzeit skaliert; Geometrie und Originalanimationen bleiben erhalten. `inventory.json` enthält pro Datei Quelle, Download-URL, Datum, Dateigrösse und SHA-256 der eingebundenen Version. Die neun GLBs belegen zusammen 805.536 Bytes.

Eigene Inhalte: Terrain/Topografie, Traversal-Relais, Brücke, Tankstellen-Blockout, Wingsuit-Membranen, Fallschirm-Blockout, Missionen, Namen und HUD. Diese sind projektintern entstanden und stammen aus keinem anderen Spiel. Die Ausrüstung ist noch Prototyp-Geometrie und wird später durch eigene ausgearbeitete Modelle ersetzt.

## Geprüfte Kandidaten für die nächsten Phasen

Diese Liste bedeutet **nicht**, dass diese Assets bereits im Spiel eingebaut sind. Die Lizenz der konkreten heruntergeladenen Version wird beim jeweiligen Import erneut abgeglichen.

| Bedarf / Pack | Ersteller und Quelle | Geprüfte Lizenzangabe | Dateiformat | Entscheidung |
|---|---|---|---|---|
| Spieler und Soldaten / Ultimate Modular Men | [Quaternius](https://quaternius.com/packs/ultimatemodularcharacters.html) | CC0 auf der Pack-Seite | Beschreibung nennt FBX, OBJ, glTF, Blend | Alternative mit 24 Animationen; noch nicht heruntergeladen. Eigene Fraktionsfarben/Ausrüstung erforderlich. |
| Charakterbasis / Universal Base Characters Standard | [Quaternius](https://quaternius.com/packs/universalbasecharacters.html) | CC0 auf der Pack-Seite | FBX, glTF | Längerfristige Alternative; deutlich mehr Geometrie, separates Retargeting. Free-Standard von kostenpflichtiger Source-Version unterscheiden. |
| Autos / Car Kit | [Kenney](https://kenney.nl/assets/car-kit) | CC0; Archivlizenz abgeglichen | GLB im geprüften Archiv | Primäre Fahrzeugfamilie; SUV bereits als Dekoration integriert. |
| Militärfahrzeug / eigener SUV-Umbau | [Kenney Car Kit](https://kenney.nl/assets/car-kit) als Basis | CC0; Änderungen erlaubt | GLB | Generischer SUV mit eigenen Farben und Zubehör statt realer Fahrzeugmarke. Kein fertiges Militär-Pack behauptet. |
| Helikopter | [kazuma / Poly Pizza](https://poly.pizza/m/EQJ2MECUbx) | Public Domain (CC0), Modellseite | FBX / glTF | Geeigneter einfacher Low-Poly-Kandidat, bisher nicht heruntergeladen. |
| Waffen / Blaster Kit | [Kenney](https://kenney.nl/assets/blaster-kit) | Creative Commons CC0 auf Pack-Seite | ZIP; konkretes Modellformat vor Import noch zu prüfen | Stilistisch passende Basis für eigene Arcadewaffen; keine realen Waffenmarken. |
| Gebäude / City Kit Suburban | [Kenney](https://kenney.nl/assets/city-kit-suburban) | CC0; Archivlizenz abgeglichen | GLB | Primäre Dorf-/Stadtfamilie. |
| Strassen / City Kit Roads | [Kenney](https://kenney.nl/assets/city-kit-roads) | CC0; Archivlizenz abgeglichen | GLB | Archiv geprüft, noch keine Dateien in `public`; derzeit eigene zusammenhängende Strassen-Geometrie. |
| Bäume und Steine / Nature Kit | [Kenney](https://kenney.nl/assets/nature-kit) | CC0; Archivlizenz abgeglichen | GLB | Primäre Vegetation; instanziiert. |
| Militärbasis / City Kit Industrial | [Kenney](https://kenney.nl/assets/city-kit-industrial) | CC0; Archivlizenz abgeglichen | GLB | Depot, Container und Tanks; Basislayout und Relais sind eigene Designs. |
| Treibstofftanks / detail-tank-large | [Kenney City Kit Industrial](https://kenney.nl/assets/city-kit-industrial) | CC0; Archivlizenz abgeglichen | GLB | Bereits dekorativ eingebunden; Health/Wrackzustand kommt später. |

Stilentscheidung: flächige Farben, wenig Texturdetail, klare Silhouetten; Kenney bildet die konsistente Hauptfamilie. Quaternius dient als spätere Charakteralternative, nicht als ungeprüfte Mischung. Der Helikopter muss vor Integration neben dem SUV beurteilt werden. Ein zusätzlich recherchierter Tank von Zsky auf Poly Pizza verlangt Namensnennung und wird für diesen Slice nicht verwendet.

## Software

Babylon.js: Apache-2.0. Vite und TypeScript: jeweils Lizenz der installierten Distribution beachten (Vite MIT, TypeScript Apache-2.0). Lizenzdateien sind Bestandteil der npm-Pakete. Keine Drittanbieter-Sounds, Schriftdateien oder Texturen ausser den eingebetteten Kenney-Texturen werden ausgeliefert.
