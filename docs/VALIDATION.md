# Prüfstand

## 8. September 2026 – Respawn-Pose

Fehler: Nach einer Todesanimation blieben Spieler und zurückgesetzte Wachen liegen. `AnimationGroup.stop()` beendet die Wiedergabe, stellt aber die veränderten lokalen Transformationen nicht zurück. Insbesondere animiert der Idle-Clip den gekippten Charakter-Root nicht.

Korrektur: `CharacterAnimator` speichert vor dem Abspielen die lokalen Positionen, Euler-/Quaternion-Rotationen und Skalierungen seiner animierten TransformNodes. Reset stoppt die laufenden Clips und stellt diese Pose wieder her. Die Weltposition bleibt Zuständigkeit des jeweiligen Controllers. Player-Respawn entfernt zudem die prozedurale Flugneigung; Enemy-Reset entfernt Treffer-/Schussimpulse.

`tests/respawn.test.ts` verwendet Babylon-Animationen und die öffentlichen Player-/Enemy-Lade- und Resetpfade. Beide Fälle scheiterten vor der Korrektur an der aufrechten Root-Pose. Sie prüfen nun wiederholte, unterbrochene und bis zum letzten Frame abgespielte Todesanimationen sowie die Rücknahme der Todestranslation. Die bisherigen Tests hatten nur den Neustart von Animationsgruppen geprüft, nicht die tatsächliche Pose.

Ergebnis: **26 Tests bestanden**. Tests laufen mit Babylon NullEngine; sie ersetzen keine umfassende visuelle Abnahme auf verschiedenen Browsern und Grafikkarten.

## Kampf-Smoke-Test vom 7. September 2026

Im integrierten WebGL-Browser geprüft: lokale Modelle ohne Asset-Fallback, Waffenwechsel, Gewehrschuss, manuelles Nachladen und Rakete gegen die Basis. Die Rakete löste drei Tankexplosionen aus; der Auftrag zeigte 3/3 Tanks und eine ausgeschaltete Wache, 850 Punkte. Keine Konsolenfehler/-warnungen beim geprüften Durchlauf. Nach dem Aufwärmen zeigte das HUD am Aussichtspunkt ungefähr 60 FPS; kein allgemeiner Performance-Nachweis.

Automatisierte Prüfungen umfassen zusätzlich Waffenmunition/Feuerrate, Sichtschutz, Raketen-Segmentkollision, Kettenreaktionen, Befreiungsbelohnung, Respawn, Einsatzreset, Bewegung/Kollision und die Integrität aller zwölf lokalen GLBs.

Bekannte Grenzen: SUV noch nicht fahrbar; KI ohne Navmesh und strategische Deckungswahl; einfache Alarmanzeige ohne Verstärkungen. Modellanimationen ohne Hand-IK/Ragdolls. Babylon erzeugt beim Build eine Warnung zum grossen Vendor-Chunk; die Anwendung bleibt statisch deploybar.
