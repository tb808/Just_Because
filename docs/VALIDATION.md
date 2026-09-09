# Prüfstand

## 9. September 2026 – Strassennetz und Geländeanschluss

81 Codetests bestanden; TypeScript und Produktionsbuild erfolgreich. Kein Browser, Screenshot oder visueller Test ausgeführt.

`RoadNetwork.ts` ersetzt die falsch orientierten bisherigen Strassenflächen durch dunklen Asphalt, Bankette, Mittellinien, Randlinien und gebündelte Leitpfosten. Kreuzungen erhalten geschlossene Anschlüsse; die Zebrastreifen liegen über dem Asphalt. Der alte waagerechte Brückensockel wurde entfernt, weil er die geneigte Fahrbahn schneiden konnte.

`RoadSurface.ts` schneidet die Strassenumrisse direkt aus den tatsächlichen Geländedreiecken und hebt Asphalt um 24 cm an. Damit werden auch Dreiecksmitten und Kanten vom Gelände getragen; die glatte Höhenfunktion allein genügte hierfür nicht. Verkehr verwendet dieselbe Fahrbahnhöhe. Numerisch geprüft: nach oben gerichtete Flächen, Abstand sämtlicher Strassendreiecke zum Gelände, Vergleich mit Terrain-Kollisionsabfragen und zusammenhängende Erreichbarkeit aller acht Städte. Bestehende Spiellogik-, Fahrzeug- und Weltprüfungen bestehen ebenfalls. Vite meldet weiterhin lediglich die bekannte Grössenwarnung des Babylon-Bundles.

## 8. September 2026 – grosse Inselüberarbeitung, ausschliesslich Codeprüfung

**65 automatisierte Tests bestanden, 0 Fehler.** Die TypeScript-Prüfung und der Vite-Produktionsbuild bestehen. Der vollständige aktuelle Build liegt in `dist/`. Vite meldet weiterhin die Grössenwarnung für das Babylon-Bundle (rund 2,99 MB unkomprimiert, 674 kB gzip); dies ist kein Buildfehler. Der Sandbox-Zugriff auf übergeordnete Verzeichnisse verhinderte zunächst das Lesen der Vite-Konfiguration durch esbuild. Der anschliessend freigegebene lokale Build lief erfolgreich durch.

Geprüfter Umfang:

- 4.096-Meter-Terrain, acht Siedlungen mit 227 Gebäuden, sechs Basen, 50 Wachen und 17 Tanks; eindeutige IDs und Geländeanschlüsse.
- Sämtliche Strassen auf trockenem Gelände; numerische Steigungsprüfung verhindert abrupte Plateauanschlüsse. Fassaden-, Gebäude- und Landschaftsgeometrie enthält endliche Werte und nach aussen gerichtete Normalen.
- Fusswege und Marktrunden gegen die tatsächlichen einzelnen Kollisionsformen der gebauten Welt geprüft. Geometriebatches blockieren nicht pauschal die Zwischenräume. Entfernte Bezirke werden deaktiviert; zerstörte Tanks bleiben auch nach Rückkehr deaktiviert.
- Alle 39 Missionen mit 128 Zielen: vollständiger Ablauf der Zustandslogik ohne Abhängigkeitsblockaden, Einmalbelohnungen, Voraussetzungen, bewusste Interaktion, Bewegungsanforderungen, unterbrechbare Aufklärung, fortlaufende Zeitlimits beim Auftragswechsel und Wiederbeginn nach Ablauf.
- Physische Missionsankünfte gegen Kollisionsmetadaten geprüft, einschliesslich Hafen-Deckhöhe, Abstand zu Flaggenmasten und freier Zugang zum Finale. Das ersetzt keinen manuellen Durchlauf der Flugroute.
- Zivile Besetzung aller Siedlungen, berufsbezogene Besorgungen, Gespräche, Flucht vom Geräusch, Erholung, Basisrückkehrer, Hindernisvermeidung und Distanzaktivierung.
- Durchgehende getrennte Fahrspuren, Bremsen vor Fussgängern, Wiederanfahren, Folgeabstand und Unterscheidung zwischen Hindernissen vorne und Verkehr hinten bzw. auf der Gegenspur.
- Wachenbewegung um Hindernisse, unterschiedliche Suchpunkte, Abklingen entfernter Alarme sowie bestehende Kampf-, Respawn-, Bewegung-, Waffen-, Explosions- und Asset-Integritätsprüfungen.
- Alte und neue Spielstände, Teilfortschritt ohne doppelte Belohnungen, Entdeckung und Schnellreiseregeln, ungültige Speicherpositionen sowie gesperrter Zugriff auf localStorage. Während der Initialisierung wird kein bestehender Spielstand überschrieben.
- Aufbau der Atmosphärenkomponenten, Ortswechsel, gespeicherte Tageslichtzeit und Qualitätswechsel ohne Renderer.

**Auf ausdrücklichen Wunsch wurden keine visuellen Tests ausgeführt:** kein Browser geöffnet, keine Screenshots erstellt, kein Bild gerendert oder visuell verglichen. Babylon NullEngine wird ausschliesslich für Objekt-, Geometrie- und Spiellogiktests verwendet; die Tests rufen `scene.render()` nicht auf. WebGL-Shaderdarstellung, Bediengefühl, tatsächliche Framerate und visuelle Abnahme dieser Fassung bleiben beim Nutzer.

Die nachfolgenden Browser- und FPS-Angaben sind historische Ergebnisse früherer Fassungen und gelten nicht als Prüfung der grossen Inselüberarbeitung.

## 8. September 2026 – mehrere Basen und belebte Insel

29 automatisierte Tests bestanden. Zusätzliche Prüfungen: getrennte Basisziele, Einnahme erst nach vollständigen Zerstörungszielen, sechs Sekunden Anwesenheit, Abbruch bei Tod/Verlassen, einmalige Belohnung pro Basis, vollständiger Neustart aller drei Basen, eindeutige Entity-IDs und Spawnpositionen auf Land. Bewohner-Test prüft Bewegung, Reaktion auf Geräusche, Abschaltung in grosser Entfernung und Erscheinen erst nach Befreiung. Bestehende Respawn-Pose-Regressionen bleiben erfolgreich.

Browserprüfung: Alle zwölf Modelle laden ohne Ersatzmodelle; N wechselt zu Hafen Mirada mit 6 Wachen / 2 Tanks, die Karte zeigt 0/3 freie Basen und die Entfernung. Marktstände, Bewohner, neue Flaggen und Strassenverkehr sichtbar; Greifhaken zur Dorfregion weiterhin nutzbar. HUD am Aussichtspunkt nach dem Aufwärmen rund 60 FPS; kein umfassender Hardware-Benchmark. Vollständige Eroberung aller drei Basen ist automatisiert geprüft, nicht als vollständiger manueller Spieldurchlauf.

## 8. September 2026 – Respawn-Pose

Fehler: Nach einer Todesanimation blieben Spieler und zurückgesetzte Wachen liegen. `AnimationGroup.stop()` beendet die Wiedergabe, stellt aber die veränderten lokalen Transformationen nicht zurück. Insbesondere animiert der Idle-Clip den gekippten Charakter-Root nicht.

Korrektur: `CharacterAnimator` speichert vor dem Abspielen die lokalen Positionen, Euler-/Quaternion-Rotationen und Skalierungen seiner animierten TransformNodes. Reset stoppt die laufenden Clips und stellt diese Pose wieder her. Die Weltposition bleibt Zuständigkeit des jeweiligen Controllers. Player-Respawn entfernt zudem die prozedurale Flugneigung; Enemy-Reset entfernt Treffer-/Schussimpulse.

`tests/respawn.test.ts` verwendet Babylon-Animationen und die öffentlichen Player-/Enemy-Lade- und Resetpfade. Beide Fälle scheiterten vor der Korrektur an der aufrechten Root-Pose. Sie prüfen nun wiederholte, unterbrochene und bis zum letzten Frame abgespielte Todesanimationen sowie die Rücknahme der Todestranslation. Die bisherigen Tests hatten nur den Neustart von Animationsgruppen geprüft, nicht die tatsächliche Pose.

Ergebnis: **26 Tests bestanden**. Tests laufen mit Babylon NullEngine; sie ersetzen keine umfassende visuelle Abnahme auf verschiedenen Browsern und Grafikkarten.

## Kampf-Smoke-Test vom 7. September 2026

Im integrierten WebGL-Browser geprüft: lokale Modelle ohne Asset-Fallback, Waffenwechsel, Gewehrschuss, manuelles Nachladen und Rakete gegen die Basis. Die Rakete löste drei Tankexplosionen aus; der Auftrag zeigte 3/3 Tanks und eine ausgeschaltete Wache, 850 Punkte. Keine Konsolenfehler/-warnungen beim geprüften Durchlauf. Nach dem Aufwärmen zeigte das HUD am Aussichtspunkt ungefähr 60 FPS; kein allgemeiner Performance-Nachweis.

Automatisierte Prüfungen umfassen zusätzlich Waffenmunition/Feuerrate, Sichtschutz, Raketen-Segmentkollision, Kettenreaktionen, Befreiungsbelohnung, Respawn, Einsatzreset, Bewegung/Kollision und die Integrität aller zwölf lokalen GLBs.

Bekannte Grenzen: SUV noch nicht fahrbar; KI ohne Navmesh und strategische Deckungswahl; einfache Alarmanzeige ohne Verstärkungen. Modellanimationen ohne Hand-IK/Ragdolls. Babylon erzeugt beim Build eine Warnung zum grossen Vendor-Chunk; die Anwendung bleibt statisch deploybar.
