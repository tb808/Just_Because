import type { PlayerState } from '../player/PlayerState';
import { settlements, worldLocations, type GroundPoint, type SettlementDefinition } from './world';
import { bases } from './bases';
import { terrainHeight } from '../world/Terrain';

export interface TraversalObjective {
  id: string; title: string; description: string; position: [number, number, number]; radius: number;
  requiredState?: PlayerState;
  kind?: 'visit' | 'interact' | 'hold' | 'liberate';
  action?: string;
  holdSeconds?: number;
  baseId?: string;
}
export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  category: 'Höhenroute' | 'Versorgung' | 'Nachbarschaft' | 'Befreiung' | 'Aufklärung' | 'Zeitlauf' | 'Entdeckung' | 'Inselreise';
  reward: number;
  objectives: TraversalObjective[];
  requires?: string[];
  timeLimit?: number;
}

const ground = ([x, z]: GroundPoint, offset = 1): [number, number, number] => {
  // Harbor navigation sits on the wooden deck rather than the lower shoreline terrain.
  const harbor = worldLocations.some(place => place.kind === 'harbor' && place.position[0] === x && place.position[1] === z);
  return [x, Math.max(terrainHeight(x, z), harbor ? 4.5 : -Infinity) + offset, z];
};
const market = (town: SettlementDefinition): GroundPoint => [town.market[0], town.market[1] - 8];
const location = (id: string) => {
  const found = worldLocations.find(item => item.id === id);
  if (!found) throw new Error(`Unknown mission destination: ${id}`);
  return found;
};
function visit(id: string, title: string, description: string, point: GroundPoint, radius = 16): TraversalObjective {
  return { id, title, description, position: ground(point), radius, kind: 'visit' };
}
function interact(id: string, title: string, description: string, point: GroundPoint, action: string): TraversalObjective {
  return { ...visit(id, title, description, point, 12), kind: 'interact', action };
}
function hold(id: string, title: string, description: string, point: GroundPoint, seconds = 10): TraversalObjective {
  return { ...visit(id, title, description, point, 18), kind: 'hold', holdSeconds: seconds };
}

/** Four original checkpoints retain their save indices; heights follow the actual terrain and relay roofs. */
export const traversalRoute: TraversalObjective[] = [
  { id: 'relay-one', title: '01 / Über die Dächer', description: 'Zieh dich mit F auf das Relais über Ventosa. SPACE löst den Haken.', position: ground([34, -230], 29), radius: 10, kind: 'visit' },
  { id: 'relay-two', title: '02 / Ins Inselinnere', description: 'Erreiche das hohe Relais nordöstlich hinter den Häusern. Nutze den Greifhaken.', position: ground([112, -82], 49), radius: 11, kind: 'visit' },
  { id: 'glide', title: '03 / Freier Flug', description: 'Spring vom hohen Relais und fliege mit C im Wingsuit durch den goldenen Ring.', position: ground([160, -120], 29), radius: 16, requiredState: 'WINGSUIT', kind: 'visit' },
  { id: 'landing', title: '04 / Sanfte Ankunft', description: 'Öffne Q und lande auf dem Dach des Relais vor Orbis.', position: ground([202, -170], 16), radius: 9, requiredState: 'ON_FOOT', kind: 'visit' },
];

const civicStories = [
  { title: 'Die erste freie Sendung', item: 'Medikamentenkiste', contact: 'Apothekerin Mara', recipient: 1, detail: 'Estela wartet seit Tagen auf Verbandszeug. Mara hat am Markt von Ventosa eine Kiste für dich vorbereitet.' },
  { title: 'Werkzeuge für die Ernte', item: 'Werkzeugpaket', contact: 'Mechaniker Ivo', recipient: 6, detail: 'Die Ölpresse in Oliveto steht still. Ivos Ersatzteile müssen durch das westliche Hügelland.' },
  { title: 'Frühmarkt in Ventosa', item: 'Orangenlieferung', contact: 'Händlerin Ada', recipient: 0, detail: 'Auroras Obstbauern versorgen den Küstenmarkt. Übernimm die erste Lieferung nach Ventosa.' },
  { title: 'Eine Leitung nach San Remo', item: 'Funkbauteile', contact: 'Techniker Elio', recipient: 4, detail: 'Mit diesen Ersatzteilen kann San Remo sein ziviles Funknetz wieder aufbauen.' },
  { title: 'Die Rechnung geht aufs Haus', item: 'Wasserfilter', contact: 'Ingenieurin Lia', recipient: 3, detail: 'Lia schickt neue Filter an die Fischhallen von Bellacosta. Folge der Küstenstrasse nach Süden.' },
  { title: 'Nachrichten aus den Bergen', item: 'Postsack', contact: 'Postbotin Alma', recipient: 1, detail: 'Nach Wochen der Sperren haben sich in Monteluce Briefe angesammelt. Bringe sie zum Markt von Estela.' },
  { title: 'Öl für den Hafen', item: 'Olivenöl-Kiste', contact: 'Bauer Renzo', recipient: 7, detail: 'Die Kantinen von Porto Novo brauchen Nachschub. Renzo wartet mit den Vorräten auf dem Dorfplatz.' },
  { title: 'Fisch für Aurora', item: 'Kühlbox', contact: 'Fischerin Noa', recipient: 2, detail: 'Noa möchte die südlichen Händler wieder beliefern. Nimm ihre Kühlbox über die westliche Küstenroute mit.' },
];
const civicMissions: MissionDefinition[] = settlements.map((town, index) => {
  const story = civicStories[index], destination = settlements[story.recipient];
  return {
    id: `supply-${town.id}`, title: story.title, category: 'Versorgung', description: story.detail, reward: 550 + index * 50,
    objectives: [
      interact(`${town.id}-pickup`, `${story.contact} · ${town.name}`, `${story.detail} Drücke zu Fuss E beim markierten Treffpunkt.`, market(town), `${story.item} übernehmen`),
      visit(`${town.id}-arrival`, `Ankunft in ${destination.name}`, `Bringe die ${story.item} nach ${destination.name}. Folge den Strassen oder suche deinen eigenen Weg.`, [destination.center[0], destination.center[1] - 110]),
      interact(`${town.id}-delivery`, `Übergabe am Markt von ${destination.name}`, 'Die Lieferung wird am Markt erwartet. Drücke zu Fuss E, um sie abzugeben.', market(destination), `${story.item} abgeben`),
    ],
  };
});

const neighborhoodStories = [
  { title: 'Licht in den Gassen', job: 'Strassenverteiler einschalten', detail: 'Mara kennt die ausgefallenen Strassenverteiler. Stelle die Versorgung in drei Vierteln von Ventosa wieder her.' },
  { title: 'Offene Türen', job: 'Nachbarschaftspaket abgeben', detail: 'Alma hat Hilfspakete für die älteren Bewohner Estelas vorbereitet. Verteile sie an den Treffpunkten im Viertel.' },
  { title: 'Der Markt kehrt zurück', job: 'Marktstand freigeben', detail: 'Auroras Händler wollen wieder öffnen. Kontrolliere die drei Verkaufsplätze und gib ihre Stände frei.' },
  { title: 'Sauberes Wasser', job: 'Wasserstation prüfen', detail: 'Bellacostas Brunnen müssen nach der Filterlieferung geprüft werden. Übernimm die drei Messstellen.' },
  { title: 'Stimmen der Stadt', job: 'Quartierantenne verbinden', detail: 'Lias Funknetz braucht Anschlussstellen in der Altstadt. Verbinde drei Quartierantennen in San Remo.' },
  { title: 'Wärme über den Dächern', job: 'Heizmaterial übergeben', detail: 'In Monteluce werden die Nächte kalt. Verteile Heizmaterial an den drei Nachbarschaftstreffpunkten.' },
  { title: 'Wasser für die Haine', job: 'Bewässerungsventil öffnen', detail: 'Olivetos Bewässerung muss abschnittsweise wieder geöffnet werden. Renzo hat drei Ventile markiert.' },
  { title: 'Sichere Heimkehr', job: 'Hafen-Sammelstelle versorgen', detail: 'Die Fischerfamilien von Porto Novo kehren zurück. Versorge ihre Sammelstellen und melde dich am Markt.' },
];
const neighborhoodMissions: MissionDefinition[] = settlements.map((town, index) => {
  const story = neighborhoodStories[index];
  const points = [town.residentRoute[3], town.residentRoute[6], town.residentRoute[10]];
  return {
    id: `community-${town.id}`, title: story.title, category: 'Nachbarschaft', reward: 700,
    description: story.detail, requires: [`supply-${town.id}`],
    objectives: [
      ...points.map((point, stage) => interact(`${town.id}-district-${stage}`, `${town.name} · Quartier ${stage + 1}/3`, `${story.detail} E am markierten Strassenpunkt.`, point, story.job)),
      interact(`${town.id}-report`, `Rückmeldung am Markt von ${town.name}`, 'Alle drei Treffpunkte sind versorgt. Melde den Abschluss am Markt.', market(town), 'Auftrag abschliessen'),
    ],
  };
});

const liberationMissions: MissionDefinition[] = bases.map((base, index) => ({
  id: `liberate-${base.id}`, title: `Operation ${base.name.replace(/^(Relais|Hafen|Station|Festung|Depot|Radar) /, '')}`,
  category: 'Befreiung', reward: 1200 + index * 150, description: base.description,
  ...(index > 2 ? { requires: [`liberate-${bases[index - 3].id}`] } : {}),
  objectives: [
    hold(`${base.id}-survey`, `${base.name} aufklären`, 'Bleibe acht Sekunden am markierten Beobachtungspunkt. Danach sichere die Basis: Wachen, Tanks und Flagge.', [base.center[0] - 78, base.center[2] - 62], 8),
    { ...visit(`${base.id}-secure`, `${base.name} befreien`, 'Schalte die Wachen aus, zerstöre die roten Tanks und halte anschliessend sechs Sekunden die Flagge. Bereits befreite Basen zählen ebenfalls.', [base.flag[0], base.flag[2]], 14), kind: 'liberate', baseId: base.id },
    interact(`${base.id}-broadcast`, 'Freie Frequenz bestätigen', 'Bestätige die Freigabe neben der gesicherten Flagge. E übermittelt die Nachricht an die Bewohner.', [base.flag[0] - 3, base.flag[2] - 3], 'Befreiung melden'),
  ],
}));

const reconStories = [
  { id: 'faro-aurora', title: 'Lichtzeichen im Westen', detail: 'Prüfe die Küstensignale vom alten Leuchtturm aus. Halte die Verbindung, bis alle Bojen erfasst sind.', town: 2 },
  { id: 'abbey', title: 'Das Echo der Abtei', detail: 'Zwischen den alten Bögen stört ein Sendesignal das zivile Netz. Peile seine Frequenz zwölf Sekunden lang.', town: 5 },
  { id: 'aqueduct', title: 'Unter den alten Bögen', detail: 'Die Ingenieure brauchen eine Funkvermessung des Aquädukts. Halte am markierten Zugang die Position.', town: 4 },
  { id: 'caldera', title: 'Über allen Tälern', detail: 'Kartiere die Funklücken im Inselinneren vom Caldera-Hochblick aus.', town: 1 },
  { id: 'windfarm', title: 'Wind und Wellen', detail: 'Lies am Windpark die Wetterdaten für die Fischer aus. Die Übertragung braucht eine stabile Position.', town: 3 },
  { id: 'north-sanctuary', title: 'Das nördliche Fenster', detail: 'Richte am Nordkap eine Verbindung zu den Booten ausserhalb der Insel ein.', town: 5 },
];
const reconMissions: MissionDefinition[] = reconStories.map(story => {
  const place = location(story.id), town = settlements[story.town];
  return {
    id: `recon-${story.id}`, title: story.title, category: 'Aufklärung', reward: 800, description: story.detail,
    objectives: [
      hold(`${story.id}-scan`, place.name, `${story.detail} Bleibe zwölf Sekunden im Kreis. Beim Verlassen beginnt die Messung erneut.`, place.position, 12),
      ...(story.id === 'caldera' ? [visit('caldera-waterfall', 'Vergleichsmessung an den Kaskaden', 'Passiere die Kaskaden von Estela für eine zweite Messung im Tal, bevor du die Daten abgibst.', location('waterfall').position)] : []),
      interact(`${story.id}-data`, `Messdaten nach ${town.name}`, `Bringe die Messdaten zum zivilen Funkkontakt am Markt von ${town.name}.`, market(town), 'Messdaten übergeben'),
    ],
  };
});

const timedRoutes = [
  { id: 'south-express', title: 'Südexpress', from: 2, stops: ['southern-service'], to: 3, detail: 'Eine temperaturempfindliche Lieferung muss von Aurora über Costa Sud nach Bellacosta.' },
  { id: 'harbor-run', title: 'Die Hafenschicht', from: 6, stops: ['olive-estate'], to: 7, detail: 'Bringe die Ersatzteile über das Gut Valverde rechtzeitig zur Frühschicht nach Porto Novo.' },
  { id: 'mountain-post', title: 'Bergpost gegen die Uhr', from: 1, stops: ['caldera', 'abbey'], to: 5, detail: 'Die dringende Bergpost führt von Estela über den Hochblick und die Abtei nach Monteluce.' },
  { id: 'east-circuit', title: 'Küstenkurier', from: 3, stops: ['windfarm', 'sanremo-station'], to: 4, detail: 'Die Küstenstationen erwarten eine eilige Ersatzteilrunde von Bellacosta nach San Remo.' },
];
const timedMissions: MissionDefinition[] = timedRoutes.map(route => {
  const from = settlements[route.from], to = settlements[route.to];
  const points = [market(from), ...route.stops.map(id => location(id).position), market(to)];
  const distance = points.slice(1).reduce((total, point, i) => total + Math.hypot(point[0] - points[i][0], point[1] - points[i][1]), 0);
  return {
    id: `timed-${route.id}`, title: route.title, category: 'Zeitlauf', reward: 1400, description: route.detail,
    timeLimit: Math.ceil((distance / 12 + 120) / 15) * 15,
    objectives: [
      interact(`${route.id}-start`, `Sendung in ${from.name} abholen`, `${route.detail} Die Uhr startet mit E. Nutze Sprint, Greifhaken und Flugausrüstung. Bei Ablauf kannst du am Start neu beginnen.`, market(from), 'Zeitlauf starten'),
      ...route.stops.map((id, index) => { const place = location(id); return visit(`${route.id}-${index}`, place.name, `Passiere ${place.name} und folge dem nächsten Wegpunkt. Der Timer läuft auch beim Wechsel des Auftrags weiter.`, place.position, 24); }),
      interact(`${route.id}-finish`, `Expressübergabe · ${to.name}`, 'Gib die Sendung zu Fuss am markierten Markt mit E ab, bevor die Zeit abläuft.', market(to), 'Expresssendung abgeben'),
    ],
  };
});

const cacheStories = [
  { id: 'coast-archive', title: 'Das Logbuch der Küste', sites: ['porto-novo-docks', 'old-fort'], town: 7, detail: 'In den Hafenlagern und dem alten Fort liegen Teile eines vermissten Küstenlogbuchs.' },
  { id: 'harvest-archive', title: 'Die verschwundene Ernte', sites: ['olive-estate', 'vineyard'], town: 6, detail: 'Auf Gut Valverde und im Weingut Sole versteckten die Bauern ihre Bestandslisten vor dem Direktorat.' },
  { id: 'salt-archive', title: 'Salz und Seewind', sites: ['bellacosta-marina', 'salt-fields'], town: 3, detail: 'Zwei Kisten mit Navigationsunterlagen verbinden die südliche Marina mit den Salinen im Norden.' },
  { id: 'trade-archive', title: 'Verlorene Verbindungen', sites: ['aurora-orchard', 'sanremo-station'], town: 4, detail: 'Suche die beiden Kurierdepots am Orangenhof und am Terminal San Remo.' },
];
const cacheMissions: MissionDefinition[] = cacheStories.map(story => ({
  id: `cache-${story.id}`, title: story.title, category: 'Entdeckung', reward: 1100, description: story.detail,
  objectives: [
    ...story.sites.map((id, index) => { const place = location(id); return interact(`${story.id}-${index}`, `Versteck ${index + 1}/2 · ${place.name}`, `${story.detail} Suche die markierte Kiste am Zugang und drücke E.`, place.position, 'Versteck bergen'); }),
    interact(`${story.id}-return`, `Fundstücke nach ${settlements[story.town].name}`, 'Übergebe die geborgenen Unterlagen dem Kontakt am Markt.', market(settlements[story.town]), 'Fundstücke übergeben'),
  ],
}));

export const missionDefinitions: readonly MissionDefinition[] = [
  { id: 'heights', title: 'Über den Dächern von Ventosa', description: 'Lerne die Höhenroute kennen: Greifhaken, Wingsuit und Fallschirm verbinden vier Relais.', category: 'Höhenroute', reward: 900, objectives: traversalRoute },
  ...civicMissions, ...neighborhoodMissions, ...liberationMissions, ...reconMissions, ...timedMissions, ...cacheMissions,
  {
    id: 'island-postcards', title: 'Acht Städte, eine Insel', category: 'Inselreise', reward: 2200,
    description: 'Verbinde alle acht Städte auf einer grossen Inselrunde und hole dir an jedem Markt einen Stempel.',
    objectives: [0, 2, 7, 6, 1, 5, 4, 3].map(index => { const town = settlements[index]; return interact(`postcard-${town.id}`, `Inselpass · ${town.name}`, `${town.character}. Hole dir mit E den Stempel am markierten Markt.`, market(town), `Stempel von ${town.name} holen`); }),
  },
  {
    id: 'free-island', title: 'Cala Ventra gehört uns', category: 'Inselreise', reward: 5000,
    description: 'Alle sechs Stützpunkte sind frei. Verbinde die Dörfer mit einer letzten Botschaft und feiere am Ausgangspunkt.',
    requires: liberationMissions.map(mission => mission.id),
    objectives: [
      interact('freedom-monteluce', 'Die Botschaft aus Monteluce', 'Hole die gemeinsame Erklärung der befreiten Gemeinden am Markt von Monteluce ab.', market(settlements[5]), 'Erklärung übernehmen'),
      interact('freedom-ventosa', 'Zurück in Ventosa', 'Bringe die Erklärung zu Mara auf den Markt von Ventosa.', market(settlements[0]), 'Erklärung übergeben'),
      visit('freedom-overlook', 'Ein neuer Morgen', 'Kehre zur Strasse unterhalb des Aussichtspunkts südlich von Ventosa zurück. Die Insel ist offen für deinen nächsten Sprung.', [-26, -300], 22),
    ],
  },
];
