export type StoryChoice = 'open' | 'shield';
export type Framing = 'wide' | 'nika' | 'partner' | 'two' | 'detail' | 'horizon';
export type CastMember = 'mara' | 'tomas' | 'lia';
export interface StoryShot { speaker: string; text: string; framing: Framing; seconds: number; shieldText?: string }
export interface StoryScene {
  id: string; title: string; location: string; chapter: string;
  anchor: string | [number, number]; cast?: CastMember; mood: 'memory' | 'danger' | 'hope';
  shots: StoryShot[]; choice?: boolean; ending?: boolean;
}
const line = (speaker: string, text: string, framing: Framing, shieldText?: string): StoryShot => ({
  speaker, text, framing, shieldText,
  seconds: Math.max(5, Math.max(text.length, shieldText?.length ?? 0) / 15 + 1.2),
});

/** No voice service or prerendered video: these are directed shots of the actual island. */
export const screenplay: readonly StoryScene[] = [
  { id: 'arrival', title: 'Die tote Frequenz', chapter: 'AKT I / DIE RÜCKKEHR', location: 'Ventosa · Südliche Küstenstrasse', anchor: [-26, -300], mood: 'memory', shots: [
    line('Tomás · beschädigte Aufnahme', 'Nika. Wenn du das hörst, hat Mara den Empfänger gefunden. Komm nicht zum Haus.', 'wide'),
    line('Tomás · beschädigte Aufnahme', 'Sie benutzen unser Netz. Die Stimmen verschwinden, aber die Aufzeichnungen bleiben. Such die tote Frequenz.', 'detail'),
    line('Nika', 'Drei Jahre kein Wort. Und jetzt sagst du mir wieder nur die Hälfte.', 'nika'),
    line('Mara · Funk', 'Ich bin am Küstenmarkt. Und Nika? Lass deinen richtigen Namen erstmal aus dem Funk.', 'horizon'),
  ] },
  { id: 'mara', title: 'Was übrig bleibt', chapter: 'KAPITEL 01', location: 'Ventosa · Küstenmarkt', anchor: 'story-mara', cast: 'mara', mood: 'memory', shots: [
    line('Mara', 'Dein Bruder hat mir das hier gebracht. Danach standen zwei Wagen vor der Klinik.', 'two'),
    line('Nika', 'Warum hast du nicht angerufen?', 'nika'),
    line('Mara', 'Weil beim letzten Anruf am nächsten Morgen mein Patient verschwunden war.', 'partner'),
    line('Mara', 'Tomás sagte: Über den Dächern hört sie mich. Erst das kleine Relais, dann das hohe. Du kennst den Weg.', 'detail'),
    line('Nika', 'Ja. Wir haben ihn zusammen gebaut.', 'nika'),
  ] },
  { id: 'signal', title: 'Ein Ruf aus Orbis', chapter: 'KAPITEL 01 / DER NOTRUF', location: 'Ventosa · Relaisdach', anchor: 'story-receiver', mood: 'danger', shots: [
    line('Tomás · Aufnahme', 'Wartungskanal sieben. Sie bringen mich nach Mirada. Orbis hat die Transportliste.', 'wide'),
    line('Tomás · Aufnahme', 'Spreng nicht einfach die Antennen. Die Klinik hängt am selben Netz. Nika, ich habe—', 'detail'),
    line('Empfänger', '[Die Aufnahme bricht ab. Ein Trägersignal bleibt.]', 'two'),
    line('Nika', 'Diesmal höre ich dir bis zum Ende zu. Ich hole die Liste.', 'nika'),
  ] },
  { id: 'signature', title: 'Deine Handschrift', chapter: 'KAPITEL 02 / ORBIS', location: 'Relais Orbis · Funkhof', anchor: 'story-orbis-log', mood: 'danger', shots: [
    line('Terminal · archivierter Eintrag', 'Projekt VELA. Automatische Stimmerkennung. Ursprüngliche Systemarchitektur: N. Serrin.', 'detail'),
    line('Nika', 'Das war ein Rettungsnetz. Es sollte Menschen nach den Stürmen finden.', 'nika'),
    line('Voss · offene Leitung', 'Und nun findet es sie vor dem nächsten Sturm. Willkommen zu Hause, Frau Serrin.', 'wide'),
    line('Nika', 'Wo ist Tomás?', 'nika'),
    line('Voss · offene Leitung', 'Mirada. Er war wesentlich kooperativer als Sie.', 'detail'),
  ] },
  { id: 'brother', title: 'Kein Name auf der Liste', chapter: 'KAPITEL 03 / MIRADA', location: 'Hafen Mirada · Östlicher Ausgang', anchor: 'story-tomas', cast: 'tomas', mood: 'memory', shots: [
    line('Nika', 'Ich habe in jedem Lager nach dir gesucht.', 'wide'),
    line('Tomás', 'Sie haben mich nicht im Lager gehalten. Ich war in der Werkstatt.', 'partner'),
    line('Nika', 'Voss hat gesagt, du hättest ihnen geholfen.', 'nika'),
    line('Tomás', 'Er wollte die Klinik schliessen. Ich sollte nur einen Filter schreiben. Dann noch einen.', 'partner'),
    line('Nika', 'Und wann hast du gemerkt, was der Filter aussortiert?', 'nika'),
    line('Tomás', 'Nicht hier. Bei den Kaskaden. Bitte.', 'two'),
  ] },
  { id: 'truth', title: 'Keine Ausrede', chapter: 'KAPITEL 04 / DIE KASKADEN', location: 'Kaskaden von Estela · Unter dem Wasserrauschen', anchor: 'story-confession', cast: 'tomas', mood: 'memory', shots: [
    line('Tomás', 'Ich wusste, dass sie mithören. Ich habe mir gesagt: Wenn ich bleibe, kann ich Namen aus den Listen nehmen.', 'partner'),
    line('Nika', 'Wie viele?', 'nika'),
    line('Tomás', 'Elf. Die anderen Namen habe ich behalten. In einer Sicherung in der Abtei.', 'detail'),
    line('Nika', 'Elf machen die anderen nicht ungeschehen.', 'nika'),
    line('Tomás', 'Ich weiss. In der Sicherung steht auch mein Name. Wenn du sie sendest, bleibt er drin.', 'partner'),
    line('Nika', 'Meiner auch. Keine saubere Geschichte für uns. Nur eine wahre.', 'two'),
  ] },
  { id: 'archive', title: 'Die Stimmen im Archiv', chapter: 'KAPITEL 04 / SANTA ALBA', location: 'Abtei Santa Alba · Verstecktes Aufnahmegerät', anchor: 'story-abbey', mood: 'memory', shots: [
    line('Alma · archivierter Anruf', 'Mein Mann ist gestern nicht zurückgekommen. Ich möchte nur wissen, wo ich fragen kann.', 'wide'),
    line('Archiv · Vermerk', 'Anruf weitergeleitet. Haushalt markiert. Zugriff genehmigt: Direktor Voss.', 'detail'),
    line('Nika', 'Keine Saboteure. Keine Bedrohungen. Menschen, die jemanden gesucht haben.', 'nika'),
    line('Tomás · Funk', 'Cimas Sender reicht bis aufs Festland. Aber wenn wir das Netz einfach abschalten—', 'horizon'),
    line('Nika', '—steht Maras Klinik still. Dann finden wir einen Weg, sie verbunden zu lassen. Ich fahre zu Lia.', 'nika'),
  ] },
  { id: 'lia', title: 'Kein einzelner Schalter', chapter: 'KAPITEL 05 / SAN REMO', location: 'San Remo · Werkstatt am Markt', anchor: 'story-lia', cast: 'lia', mood: 'hope', shots: [
    line('Lia', 'Ihr habt ein Netz gebaut, das von einem einzigen Ort abhängt. Natürlich wollte Voss diesen Ort.', 'partner'),
    line('Nika', 'Kannst du die Gemeinden davon trennen?', 'nika'),
    line('Lia', 'Der alte Verteiler am Aquädukt. Danach die Ersatzantenne an den Salinen. Zwei Verbindungen, die sie nie benutzt haben.', 'detail'),
    line('Lia', 'Und wenn wir fertig sind, bekommt jede Gemeinde ihren eigenen Zugang. Keine Generalschlüssel mehr. Auch keinen für dich.', 'partner'),
    line('Nika', 'Gut. Sag mir, wo ich anfangen soll.', 'two'),
  ] },
  { id: 'decision', title: 'Der Preis der Wahrheit', chapter: 'KAPITEL 06 / CIMA', location: 'Radar Cima · Aussenkanal', anchor: 'story-uplink', mood: 'danger', choice: true, shots: [
    line('Voss · offene Leitung', 'Sie senden das, und die ganze Welt sieht Ihre Unterschrift. Ich kann sie verschwinden lassen. Ihre und die Ihres Bruders.', 'wide'),
    line('Nika', 'Sie können keine Unterschriften verschwinden lassen. Nur Menschen. Die Leitung bleibt offen.', 'nika'),
    line('Lia · Funk', 'Nika, im Original stehen auch Adressen der Zeugen. Unverändert ist es sofort nachprüfbar. Aber jeder kann diese Menschen finden.', 'detail'),
    line('Tomás · Funk', 'Wir können die Zeugenkennungen trennen. Die Vorbereitung dauert länger. Unsere eigenen Namen bleiben in beiden Fassungen.', 'two'),
    line('Nika', 'Sie haben lange genug entschieden, was andere zu hören bekommen. Jetzt tragen wir die Verantwortung.', 'nika'),
  ] },
  { id: 'broadcast', title: 'Empfang bestätigt', chapter: 'KAPITEL 07 / DIE SENDUNG', location: 'Radar Cima · Verbindung zum Festland', anchor: 'story-broadcast', mood: 'hope', shots: [
    line('Nika · öffentliche Sendung', 'Mein Name ist Nika Serrin. Ich habe das Netz entworfen, mit dem das Direktorat diese Insel überwacht. Das hier sind seine Aufzeichnungen.', 'nika'),
    line('Lia · Funk', 'Das Original ist draussen. Vollständige Signaturen, vollständige Listen. Ich warne die Zeugen jetzt, dass ihre Adressen öffentlich sind.', 'detail', 'Die öffentliche Kopie ist draussen. Die Zeugenkennungen bleiben bei uns. Eine unabhängige Redaktion erhält das Original vertraulich.'),
    line('Unbekannte Station · Funk', 'Cala Ventra, wir empfangen euch. Die Dateien sind gespiegelt. Mehrere Redaktionen haben bestätigt.', 'horizon'),
    line('Tomás · Funk', 'Sie können den Sender ausschalten. Es ist jetzt nicht mehr nur hier.', 'wide'),
    line('Nika', 'Mara. Wir kommen nach Hause.', 'nika'),
  ] },
  { id: 'home', title: 'Die Tür bleibt offen', chapter: 'KAPITEL 08 / VENTOSA', location: 'Ventosa · Küstenmarkt', anchor: 'story-home', cast: 'mara', mood: 'hope', shots: [
    line('Mara', 'Heute Morgen haben die Leute wieder angerufen. Mit ihrem Namen.', 'partner'),
    line('Nika', 'Und die Klinik?', 'nika'),
    line('Mara', 'Lias Leitung hält. Aber wir bringen heute Nacht Familien unter, deren Adressen in den Listen stehen.', 'two', 'Lias Leitung hält. Alma kam vorbei. Sie hat ihren Mann auf der Aufnahme erkannt, ohne dass die ganze Insel ihre Adresse kennt.'),
    line('Nika', 'Ich hätte früher zurückkommen sollen.', 'nika'),
    line('Mara', 'Ja. Aber heute bist du hier. Fang damit an.', 'partner'),
  ] },
  { id: 'ending', title: 'Morgen bleibt jemand hier', chapter: 'EPILOG / CALA VENTRA', location: 'Ventosa · Über der Bucht', anchor: 'story-dawn', cast: 'tomas', mood: 'hope', ending: true, shots: [
    line('Tomás', 'Früher bist du von hier gesprungen, bevor ich den Schirm sortiert hatte.', 'wide'),
    line('Nika', 'Früher hast du behauptet, du brauchst keinen.', 'nika'),
    line('Tomás', 'Voss schweigt. Seine Posten stehen trotzdem noch.', 'partner'),
    line('Nika', 'Dann helfen wir den Orten, die noch nicht frei sind. Die Aufzeichnungen waren ein Anfang.', 'two'),
    line('Tomás', 'Und danach? Gehst du wieder?', 'partner'),
    line('Nika', 'Mara braucht morgen jemanden in der Klinik. Diesmal bleibe ich.', 'horizon'),
  ] },
];

export const storyChoices = [
  { id: 'shield' as const, title: 'Die Zeugen schützen', description: 'Zwölf Sekunden zusätzliche Vorbereitung. Zeugenkennungen bleiben vertraulich; eure Verantwortung bleibt öffentlich.' },
  { id: 'open' as const, title: 'Das Original veröffentlichen', description: 'Direkt senden. Die vollständigen Listen sind sofort prüfbar, aber auch Namen und Adressen der Zeugen werden öffentlich.' },
];

export function shotText(shot: StoryShot, choice?: StoryChoice) { return choice === 'shield' && shot.shieldText ? shot.shieldText : shot.text; }
