# Cala Ventra · Architektur

Stand: 8. September 2026, grosse Inselüberarbeitung.

## Welt und Darstellung

`data/world.ts` ist die gemeinsame Quelle für acht Siedlungen, ihre Häuser und Fusswege, das gesamte Strassennetz und 16 weitere Orte. `data/bases.ts` enthält sechs Basen mit stabilen IDs, 50 Wachen und 17 Tanks. Frühere Basis-IDs bleiben gültig.

`Terrain.ts` baut 256 Kollisionsteile für 4.096 × 4.096 Meter. Eine deterministische Höhenfunktion kombiniert Küsten, Hügel und Bergmassive mit Siedlungs- und Basisplateaus. Ein räumlicher Index begrenzt die Strassensegmente pro Höhenabfrage; Strassenhöhen gehen in das Gelände ein.

`WorldExpansion.ts` baut Städte, öffentliche Plätze, Infrastruktur, Landmarken und Natur aus eigenen geometrischen Teilen. `StaticGeometry.ts` fasst diese nach Zelle, Material und Kollisionsstatus zusammen. Die Darstellung bleibt detailliert, ohne für jedes Fenster oder jedes Blatt ein eigenes Scene-Objekt anzulegen. Einzelne physische Formen behalten absolute `navigationObstacles`-Grenzen für die zivile Simulation; der Gesamtumriss eines Geometriebatches darf nicht als Gebäude interpretiert werden.

`WorldManager.ts` lädt die vorhandenen lokalen GLBs über `AssetManager`, erstellt Kollisionsproxies und registriert Versorgungspunkte, Flaggen und zerstörbare Objekte. `ChunkManager.ts` aktiviert Bezirke in 192-Meter-Zellen abstandsabhängig mit Hysterese. Der Zustand `metadata.streamHidden` verhindert, dass zerstörte Tanks bei der Rückkehr sichtbar oder kollidierbar werden. Dies ist Distanzaktivierung, kein Entladen aus dem Speicher.

`Atmosphere.ts` ergänzt einen Himmel mit Vertexfarben, geometrische Wolken und Vögel, einen animierten Wasser-Shader, Tageslicht und begrenzte nahe Schatten. Das Tageslicht startet um 08:30; die gespeicherte Spielzeit treibt seinen Verlauf. Performance-Qualität deaktiviert Schatten. Es besteht keine gemessene FPS-Zusage.

## Simulation und Eingabe

`Game.ts` verbindet die Komponenten. Der Spieler wird mit 120 Hz und begrenztem Nachholen bewegt. Kameraführung, Weltleben, Missionslogik und Kampf verwenden begrenzte Zeitschritte; HUD und Minikarte aktualisieren sich mit zehn Hz. Der Atlas pausiert Simulation und Animation. Pause, Sichtbarkeitsverlust und Tabwechsel räumen Eingabeimpulse auf.

`PlayerMovement.ts` kontrolliert Position, Geschwindigkeit und exklusive Fortbewegungszustände. `GrapplingHook`, `Wingsuit` und `Parachute` beeinflussen die Geschwindigkeit. Kollisionen werden vor jedem festen Tick mit einer aktualisierten Weltmatrix berechnet. Die Rücksetzgrenze folgt der tatsächlichen Terraingrösse. `ThirdPersonCamera` prüft Hindernisse mit mehreren Rays und erhält nach Respawn oder Schnellreise sofort die neue Spielerposition.

`LivingWorld.ts` verteilt zivile Figuren auf sämtliche Siedlungen und deren Marktwege; weitere Bewohner erscheinen nach Basisbefreiungen. Sechs Berufsrollen erhalten Kleidung, örtliche Dialoge, unterschiedliche Pausen und Tätigkeiten. `AmbientBehavior.ts` enthält die unabhängige Logik für Fluchtrichtung, Routen, Bremsen, Fahrspuren und Hindernisschnitte. Fussgänger halten Abstand, sprechen miteinander, reagieren auf Verkehr und suchen bei Geräuschen sichere Routenpunkte. `navigationObstacles` werden räumlich indiziert. Fahrzeuge fahren auf Hin- und Rückspuren mit lokalen Wendepunkten; sie nutzen keine diagonale Verbindung vom Routenende zum Anfang.

`Enemy.ts` umfasst Patrouille, Sichtkontakt, Beschuss, Suche und Rückkehr. `EnemyNavigation.ts` bewertet freie Bewegungsrichtungen und unterschiedliche Suchpunkte. `EnemyManager` sendet Truppmeldungen nur bei aktuellem Sichtkontakt; entfernte Gegner lassen ihre Erinnerung abklingen und halten den Alarm nicht dauerhaft aktiv. Es gibt kein Navmesh und keine Verstärkungswellen.

## Kampf und Persistenz

`CombatSystem` verbindet Waffen, Schaden, Projektile, Explosionen, Gegner, Basen und ziviles Weltleben. `Weapon` verwaltet Magazine und Nachladen, `WeaponManager` prüft die Schusslinie ab der Mündung. Raketen prüfen ihr gesamtes Bewegungssegment, Explosionen laufen durch eine begrenzte Queue. `DamageSystem` verwaltet stabile Entity-IDs und Einmal-Todesereignisse.

`BaseManager` verlangt sämtliche Wachen und Tanks einer Basis und anschliessend sechs Sekunden ununterbrochene Anwesenheit an der Flagge. Jede Befreiung gibt einmalig 1.000 Punkte, aktiviert Versorgung und lässt Bewohner zurückkehren. `DestructibleComponent` hält Gesundheit, Wrack, Collider und den Culling-Zustand zusammen.

`SaveGame.ts` validiert lokale v1-Spielstände und die optional hinzugefügten Kampagnen- und Weltdaten. Alte Vier-Checkpoint-Spielstände werden übernommen, abgeschlossene Belohnungen nicht erneut vergeben. Automatisches Speichern geschieht während des Spiels sowie beim Verlassen. Gespeicherte Positionen müssen innerhalb der neuen Welt und oberhalb des Untergrundes liegen; sonst wird nur die Position auf den Start gesetzt. Einsatz-Neustart setzt die Systeme zurück, normaler Respawn behält Fortschritt.

## Missionen, Atlas und Reisen

`data/missions.ts` definiert 39 Aufträge mit 128 Zielen. Missionsarten sind Besuch, bewusste Interaktion, ununterbrochenes Halten und Basisbefreiung. Kategorien, Geschichten, Voraussetzungen, Belohnungen und optionale Zeitlimits sind Daten.

`MissionProgress.ts` hält reine, ohne Renderer ausführbare Kampagnenlogik. Jede Mission hat eine eigene Etappe, Zeit und Abschlussmarkierung. Gestartete Zeitläufe laufen bei Wechsel zu einem anderen Auftrag weiter, solange die Spielsimulation läuft; bei Ablauf wird nur der betreffende Lauf zurückgesetzt. `MissionManager.ts` ergänzt einen wiederverwendeten Zielmarker aus Ring, Symbol, Licht und Kiste.

E wird zuerst einem erreichbaren Missionsziel angeboten; nur bei tatsächlicher Verwendung wird das Ereignis verbraucht. Sonst verarbeitet der Kampfteil Nachschub oder Gespräche. `onReward` vergibt Punkte, `onAdvance` zeigt Meldungen. B wechselt den verfügbaren Auftrag, N die Basis.

`WorldMap.ts` enthält Minikarte und Atlas mit Bereichen für Insel, Aufträge und Reisen. Die Küste und Höhenkonturen werden aus derselben Terrainfunktion abgeleitet, Wege aus denselben World-Daten. Der Atlas ist per Pfeiltasten und E bedienbar, auch bei gesperrtem Mauszeiger.

`Exploration.ts` entdeckt Siedlungen anhand der Spielerposition und speichert stabile Orts-IDs. Schnellreise erfordert einen entdeckten Ort, Bodenkontakt, keinen Alarm und keinen aktiven Zeitlauf. Als Ziel dient ein freier Punkt am Marktplatz. Kamera, Geschwindigkeit, Luftfähigkeiten und aktive Bezirke werden beim Reisen konsistent aktualisiert.

## Verifikation

Tests prüfen Logik, tatsächliche Geometriedaten, Kollisionsgrenzen, Speicherstände und Komponentenaufbau über Babylon NullEngine. Es wird weder `scene.render()` ausgeführt noch ein Bild verglichen. Die verlangte visuelle Abnahme bleibt beim Nutzer. TypeScript-Prüfung und Vite-Produktionsbuild ergänzen die automatisierten Codeprüfungen.
