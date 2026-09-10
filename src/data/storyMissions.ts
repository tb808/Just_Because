import type { MissionDefinition, TraversalObjective } from './missions';
import { terrainHeight } from '../world/Terrain';
import { bases } from './bases';
import { settlements, worldLocations, type GroundPoint } from './world';

const ground = ([x, z]: GroundPoint, height = 1): [number, number, number] => [x, terrainHeight(x, z) + height, z];
const market = (id: string): GroundPoint => { const town = settlements.find(t => t.id === id)!; return [town.market[0], town.market[1] - 8]; };
const place = (id: string) => worldLocations.find(p => p.id === id)!.position;
const goal = (id: string, title: string, description: string, point: GroundPoint, extra: Partial<TraversalObjective> = {}): TraversalObjective =>
  ({ id, title, description, position: ground(point), radius: 12, kind: 'interact', action: title, prop: 'terminal', ...extra });
const free = (id: string): TraversalObjective => {
  const base = bases.find(b => b.id === id)!;
  return goal(`story-free-${id}`, `${base.name} sichern`, 'Schalte die Wachen aus, zerstöre die roten Treibstofftanks und halte die Flagge sechs Sekunden. Bereits befreite Basen zählen.', [base.flag[0], base.flag[2]], { kind: 'liberate', baseId: id });
};
const terminal = (id: string): GroundPoint => { const base = bases.find(b => b.id === id)!; return [base.flag[0] - 3, base.flag[2] - 3]; };

/** A deliberately short, causal campaign. Existing world liberation stays independent. */
export const storyMissions: MissionDefinition[] = [
  {
    id: 'story-01', title: 'Die tote Frequenz', category: 'Geschichte', reward: 900,
    chapter: 1, act: 'I · Die Rückkehr', introScene: 'arrival',
    description: 'Eine Nachricht von deinem verschwundenen Bruder Tomás bringt dich zurück nach Ventosa. Mara hat seinen letzten Funkempfänger versteckt.',
    recap: 'Tomás hat einen Notruf im Wartungskanal versteckt. Der Absender lässt sich nur über Orbis finden.',
    objectives: [
      goal('story-mara', 'Mara am Küstenmarkt treffen', 'Mara wartet am Markt von Ventosa. Geh zu Fuss zum markierten Treffpunkt und sprich mit ihr mit E.', market('ventosa'), { prop: 'contact', scene: 'mara' }),
      goal('story-roof', 'Auf das erste Relais', 'Tomás sendet auf einer alten Wartungsfrequenz. Ziele mit F auf das Relais über Ventosa; SPACE löst den Haken.', [34, -230], { position: ground([34, -230], 29), kind: 'visit', radius: 10, airborne: true }),
      goal('story-high-relay', 'Das Signal über den Dächern suchen', 'Zieh dich mit F auf das hohe Relais nordöstlich. Hier ist der Empfang frei.', [112, -82], { position: ground([112, -82], 49), kind: 'visit', radius: 11, airborne: true }),
      goal('story-flight', 'Mit dem Signal Richtung Orbis fliegen', 'Spring ab und öffne mit C den Wingsuit. Fliege durch den goldenen Ring. Q öffnet anschliessend den Fallschirm.', [160, -120], { position: ground([160, -120], 29), kind: 'visit', requiredState: 'WINGSUIT', radius: 16, airborne: true }),
      goal('story-receiver', 'Den Notruf entschlüsseln', 'Lande mit Q auf dem Relaisdach vor Orbis. E liest Tomás’ Nachricht aus dem Empfänger.', [202, -170], { position: ground([202, -170], 16), radius: 9, scene: 'signal' }),
    ],
  },
  {
    id: 'story-02', title: 'Deine Handschrift', category: 'Geschichte', reward: 1500,
    chapter: 2, act: 'I · Die Rückkehr', requires: ['story-01'],
    description: 'Orbis protokolliert jeden abgefangenen Anruf. Sichere den Funkhof und finde heraus, wohin Tomás gebracht wurde.',
    recap: 'Orbis nutzt Nikas früheres Rettungsnetz zur Überwachung. Die Gefangenenliste führt nach Mirada.',
    objectives: [free('orbis'), goal('story-orbis-log', 'Das Überwachungsprotokoll kopieren', 'Der Funkhof ist gesichert. Lies mit E das Terminal neben der Flagge aus.', terminal('orbis'), { scene: 'signature' })],
  },
  {
    id: 'story-03', title: 'Kein Name auf der Liste', category: 'Geschichte', reward: 1600,
    chapter: 3, act: 'II · Was wir verschwiegen', requires: ['story-02'],
    description: 'Tomás wird im Hafen Mirada festgehalten. Suche zunächst am östlichen Zugang nach seiner Kennung, bevor du den Hafen öffnest.',
    recap: 'Tomás lebt. Er half beim Umbau des Netzes, um Maras Klinik vor der Schliessung zu bewahren.',
    objectives: [
      goal('story-port-scan', 'Tomás’ Kennung orten', 'Halte am östlichen Hafenzugang acht Sekunden die Position. Der Empfänger peilt Tomás’ Wartungssender.', [-325, -215], { kind: 'hold', holdSeconds: 8 }),
      free('porto'),
      goal('story-tomas', 'Tomás am Hafenausgang treffen', 'Der Hafen ist offen. Tomás wartet beim markierten Ausgang. E beginnt das Gespräch.', [-325, -215], { prop: 'contact', scene: 'brother' }),
    ],
  },
  {
    id: 'story-04', title: 'Was unter dem Rauschen liegt', category: 'Geschichte', reward: 1200,
    chapter: 4, act: 'II · Was wir verschwiegen', requires: ['story-03'],
    description: 'In der Abtei liegt Tomás’ Sicherungskopie. Sie kann die Verhaftungen beweisen. Aber erst muss Nika wissen, wem sie noch vertrauen kann.',
    recap: 'Die Sicherungskopie belegt die Verhaftungen und die Beteiligung beider Geschwister. Cima besitzt den einzigen Sender, der die Inselgrenze erreicht.',
    objectives: [
      goal('story-confession', 'Tomás an den Kaskaden anhören', 'Unter dem Wasserrauschen kann das Direktorat euch nicht abhören. Sprich mit Tomás am markierten Zugang.', place('waterfall'), { prop: 'contact', scene: 'truth' }),
      goal('story-abbey', 'Die Sicherungskopie bergen', 'Suche Tomás’ Archiv am Zugang zur Abtei Santa Alba. E öffnet das versteckte Aufnahmegerät.', place('abbey'), { prop: 'archive', scene: 'archive' }),
    ],
  },
  {
    id: 'story-05', title: 'Eine Leitung für alle', category: 'Geschichte', reward: 1400,
    chapter: 5, act: 'III · Die offene Stimme', requires: ['story-04'],
    description: 'Eine zerstörte Antenne würde auch die Klinik abschneiden. Lia kennt einen anderen Weg: das zivile Netz abkoppeln, bevor Cima fällt.',
    recap: 'Lia hat die Klinik und die Gemeinden vom Militärnetz getrennt. Die Sendung kann beginnen, ohne ihre Versorgung zu unterbrechen.',
    objectives: [
      goal('story-lia', 'Lia in San Remo treffen', 'Die Ingenieurin erwartet dich am Markt. Besprich mit E, wie das zivile Netz erhalten werden kann.', market('sanremo'), { prop: 'contact', scene: 'lia' }),
      goal('story-bypass', 'Die zivile Leitung am Aquädukt überbrücken', 'Aktiviere mit E den alten Verteiler am Aquädukt. Er versorgt die Klinik unabhängig von Cima.', place('aqueduct')),
      goal('story-salt-signal', 'Die Ersatzverbindung an den Salinen prüfen', 'Halte die Verbindung zehn Sekunden. Bleibe am Sender; ausserhalb des Kreises beginnt die Prüfung erneut.', place('salt-fields'), { kind: 'hold', holdSeconds: 10, radio: { speaker: 'Lia', text: 'Die Klinik antwortet. Und Estela auch. Zum ersten Mal hängt nicht alles an einem einzigen Schalter.' } }),
    ],
  },
  {
    id: 'story-06', title: 'Der letzte Sender', category: 'Geschichte', reward: 2000,
    chapter: 6, act: 'III · Die offene Stimme', requires: ['story-05'],
    description: 'Radar Cima ist der Zugang zur Aussenwelt. Öffne die Basis und hole dir die Sendekontrolle, bevor das Direktorat sein Archiv löscht.',
    recap: 'Voss bot Nika Straffreiheit für ihr Schweigen. Sie hat abgelehnt. Nun muss sie entscheiden, wie die Beweise die Insel verlassen.',
    objectives: [free('cima'), goal('story-uplink', 'Den Aussenkanal öffnen', 'Verbinde den Empfänger mit Cimas Terminal neben der Flagge. E öffnet den Aussenkanal.', terminal('cima'), { scene: 'decision' })],
  },
  {
    id: 'story-07', title: 'Was wir senden', category: 'Geschichte', reward: 1800,
    chapter: 7, act: 'III · Die offene Stimme', requires: ['story-06'],
    description: 'Deine Entscheidung steht. Bereite das Archiv vor und halte die Verbindung, bis die erste Empfangsbestätigung von ausserhalb eintrifft.',
    recap: 'Die Beweise sind ausserhalb der Insel angekommen. Das Direktorat kann sie nicht mehr zum Schweigen bringen.',
    objectives: [
      goal('story-shield', 'Die Zeugenkennungen abtrennen', 'Lia entfernt Namen und Wohnorte der Zeugen aus der öffentlichen Kopie. Halte dafür zwölf Sekunden am Terminal. Nikas und Tomás’ Unterschriften bleiben sichtbar.', terminal('cima'), { kind: 'hold', holdSeconds: 12, whenChoice: 'shield' }),
      goal('story-transmit', 'Das Archiv senden', 'Starte mit E die Übertragung am Terminal. Dies ist die öffentliche Kopie, die du gewählt hast.', terminal('cima')),
      goal('story-broadcast', 'Auf die Empfangsbestätigung warten', 'Bleibe sechzehn Sekunden im Sendebereich. Erst eine Bestätigung von ausserhalb macht die Beweise sicher.', terminal('cima'), { kind: 'hold', holdSeconds: 16, scene: 'broadcast' }),
    ],
  },
  {
    id: 'story-08', title: 'Morgen bleibt jemand hier', category: 'Geschichte', reward: 2400,
    chapter: 8, act: 'Epilog', requires: ['story-07'],
    description: 'Die Sendung ist draussen. Kehre zu Mara nach Ventosa zurück. Jetzt zählt, was aus den Menschen hinter der Geschichte wird.',
    recap: 'Nika bleibt und hilft beim Wiederaufbau. Die Geschichte endet; die noch besetzten Gebiete und freiwilligen Aufträge bleiben spielbar.',
    objectives: [
      goal('story-home', 'Mara die Antwort bringen', 'Kehre zum Küstenmarkt von Ventosa zurück. Du kannst im Atlas mit T zu bereits entdeckten Orten reisen, sobald du zu Fuss und ohne Alarm bist.', market('ventosa'), { prop: 'contact', scene: 'home' }),
      goal('story-dawn', 'Mit Tomás auf die Bucht schauen', 'Tomás wartet an der Strasse beim Aussichtspunkt südlich von Ventosa. Sprich mit ihm mit E.', [-26, -300], { prop: 'contact', scene: 'ending' }),
    ],
  },
];
