# Freier Fall – Die tote Frequenz

Enthält Spoiler zur gesamten Geschichte.

## Dramaturgie

Nika Serrin kehrt nach drei Jahren auf die Insel zurück. Ihr Bruder Tomás ist verschwunden. Das Rettungsnetz, das sie einst entwarf, wird inzwischen vom Direktorat zur Stimmerkennung und Verfolgung benutzt. Die Geschichte handelt davon, Verantwortung zu übernehmen, ohne sich selbst nachträglich zur unschuldigen Heldin zu machen.

Tomás ist weder blosses Rettungsziel noch überraschender Endgegner. Er schrieb die Filter des Direktorats, um Maras Klinik zu schützen, und rechtfertigte sein Bleiben damit, einzelne Namen aus Verhaftungslisten zu nehmen. Seine Sicherungskopie belastet das Regime und beide Geschwister. Nika entscheidet sich, auch die eigene Unterschrift öffentlich zu machen.

Mara vertritt die Menschen, deren Alltag weitergehen muss. Lia ist die unabhängige Ingenieurin: Sie fordert ein dezentrales ziviles Netz, das künftig auch Nika nicht allein kontrollieren kann. Voss versucht über Funk, Nika mit Straffreiheit zum Schweigen zu bringen; die Geschichte endet mit der Sicherung der Beweise ausserhalb der Insel, ohne eine nicht gespielte Gefangennahme des Direktors zu behaupten.

## Die acht Kapitel

| Kapitel | Spielbarer Schwerpunkt | Erzählerischer Fortschritt |
|---|---|---|
| 01 – Die tote Frequenz | Mara treffen; Haken, Wingsuit und Dachlandung; Empfänger auslesen | Der Notruf nennt Mirada und das Protokoll in Orbis. |
| 02 – Deine Handschrift | Orbis befreien; Überwachungsprotokoll kopieren | Nika erkennt ihre Architektur; Voss meldet sich erstmals. |
| 03 – Kein Name auf der Liste | Sender orten; Mirada öffnen; Tomás treffen | Tomás war kein unbeteiligter Gefangener. |
| 04 – Was unter dem Rauschen liegt | Gespräch an den Kaskaden; Archiv in der Abtei bergen | Das Ausmass und die Verantwortung beider Geschwister werden klar. |
| 05 – Eine Leitung für alle | Lia treffen; Aquädukt überbrücken; Ersatzverbindung prüfen | Klinik und Gemeinden werden unabhängig vom Militärnetz. |
| 06 – Der letzte Sender | Cima befreien; Aussenkanal öffnen | Voss’ Angebot und die Entscheidung über die Zeugenkennungen. |
| 07 – Was wir senden | Optional Kennungen abtrennen; senden; Empfang abwarten | Die Beweise erreichen unabhängige Empfänger. |
| 08 – Morgen bleibt jemand hier | Rückkehr zu Mara; Gespräch mit Tomás über der Bucht | Konsequenzen der Entscheidung; Nika bleibt zum Wiederaufbau. |

22 definierte Hauptziele, davon eines nur beim Schutz der Zeugen. Drei statt zehn vorgeschriebene Basisbefreiungen. Die fünf optionalen Aufträge bieten Training, Versorgung, Wetteraufklärung, einen Zeitlauf und eine Fundstückroute. Sie sperren kein Kapitel. Die übrigen Gebiete bleiben in der offenen Welt befreibar.

## Entscheidung und Konsequenzen

- **Zeugen schützen:** Eine zusätzliche zwölfsekündige Vorbereitung trennt die Zeugenkennungen von der öffentlichen Kopie. Nikas und Tomás’ Beteiligung bleibt sichtbar. Lia kündigt die vertrauliche Übergabe des Originals an eine unabhängige Redaktion an. Im Epilog erzählt Mara von Alma und der erhaltenen Privatsphäre.
- **Original veröffentlichen:** Die Zusatzvorbereitung entfällt. Das vollständige Archiv ist sofort öffentlich prüfbar. Lia warnt die Zeugen; Mara organisiert im Epilog Unterkünfte für Familien, deren Adressen veröffentlicht wurden.

Keine Variante tilgt die Schuld der Geschwister. Der freie Modus nach dem Epilog und die Punktebelohnungen stehen in beiden Varianten zur Verfügung. Es gibt keine simulierte Zeugen-Evakuierung; diese Konsequenz wird im Dialog erzählt.

## Inszenierung und Bedienung

13 in der Engine dargestellte Szenen mit deutschen Untertiteln und eigenem Kameraablauf. Die vorhandenen animierten Kenney-Modelle stellen Nika, Mara, Tomás und Lia dar. Voss bleibt eine Funkstimme, hier als Untertitel inszeniert. Ein Feldrekorder mit eigener Displaytextur visualisiert Verbindung und Archivstatus. Drei zurückhaltende synthetisierte Klangflächen begleiten Erinnerung, Gefahr und Hoffnung. Es gibt keine Sprachaufnahmen oder externen Dienste.

Totale, Zweierbild, Gegenaufnahme, Detail und Rückzug in die Landschaft wechseln nach dem Inhalt der Dialogzeile. Die Kamera prüft Hindernisse und Geländehöhe. Bewohner in unmittelbarer Nähe werden für die Inszenierung ausgeblendet und anschliessend wiederhergestellt. Die Spielfigur wird durch ein Szenenmodell ersetzt, ohne ihre Position, Gesundheit oder Bewegungsenergie zu verändern. Die Simulation, Missionsuhren und Kampfhandlungen pausieren.

SPACE wechselt die Einstellung, ENTER überspringt eine Szene. Bei der Entscheidung führt Überspringen immer zur Auswahl; es wählt niemals stillschweigend eine Variante. Links/rechts und E oder die anklickbaren Optionen bestätigen die Entscheidung. ESC und Fokusverlust pausieren Bild und Ton. Die Einstellung für reduzierte Bewegung des Betriebssystems unterbindet Kamerafahrten. Untertitel erscheinen sofort vollständig und bleiben für die gesamte Einstellung sichtbar.

## Speicherung und Wartung

`MissionProgress` speichert gesehene und ausstehende Szenen sowie die Entscheidung. Das Missionsziel wird vor der Szene einmalig abgeschlossen. Bis zur bestätigten Szene sind weitere Aktionen gesperrt. Beim Laden wird eine unterbrochene Szene vom Anfang wiederholt, ohne die Belohnung erneut zu vergeben.

Die fünf erhaltenen Nebenaufträge behalten IDs und Zielreihenfolge. Alte Spielstände übernehmen deren Fortschritt; entfernte Auftragsdatensätze werden verworfen, vorhandene Punkte bleiben erhalten. Weltbefreiungen, Ausrüstung, Entdeckungen und Position werden weiterhin vom bestehenden Save-System geladen. Neue Story-IDs verhindern, dass alte Checklisten versehentlich erzählte Kapitel abschliessen.

- `src/data/storyMissions.ts`: Kapitel, Ziele, Voraussetzungen, Szenenauslöser und Rückblicke.
- `src/story/Screenplay.ts`: Dialog, Einstellungsfolge, Lesedauer und alternative Epilogtexte.
- `src/story/CutsceneDirector.ts`: Kamera, Darsteller, Display, Filmanzeige und Musik.
- `src/missions/MissionProgress.ts`: Fortschritt, Szenensperre, Entscheidung und Migration.
- `src/core/Game.ts`: Unterbrechung und Wiederaufnahme der Simulation.

Die automatischen Durchläufe prüfen beide Varianten, jede Wiederherstellung zwischen Zielen und Szenen, die Reihenfolge aller 13 Szenen, einmalige Belohnungen und die freie Insel nach dem Ende. Sie ersetzen keinen vollständigen menschlichen Durchlauf von Kampf und Flugpassage.
