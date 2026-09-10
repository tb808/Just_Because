import { storyMissions } from './storyMissions';
import type { PlayerState } from '../player/PlayerState';
import { settlements, worldLocations, type GroundPoint, type SettlementDefinition } from './world';
import { terrainHeight } from '../world/Terrain';

export interface TraversalObjective {
  id: string; title: string; description: string; position: [number, number, number]; radius: number;
  requiredState?: PlayerState;
  kind?: 'visit' | 'interact' | 'hold' | 'liberate';
  action?: string;
  holdSeconds?: number;
  baseId?: string;
  scene?: string;
  radio?: { speaker: string; text: string };
  prop?: 'contact' | 'terminal' | 'archive';
  airborne?: boolean;
  whenChoice?: 'open' | 'shield';
}
export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  chapter?: number;
  act?: string;
  recap?: string;
  introScene?: string;
  category: 'Geschichte' | 'Höhenroute' | 'Versorgung' | 'Nachbarschaft' | 'Befreiung' | 'Aufklärung' | 'Zeitlauf' | 'Entdeckung' | 'Inselreise';
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
];
const civicMissions: MissionDefinition[] = settlements.slice(0, 1).map((town, index) => {
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

const reconStories = [
  { id: 'windfarm', title: 'Wind und Wellen', detail: 'Lies am Windpark die Wetterdaten für die Fischer aus. Die Übertragung braucht eine stabile Position.', town: 3 },
];
const reconMissions: MissionDefinition[] = reconStories.map(story => {
  const place = location(story.id), town = settlements[story.town];
  return {
    id: `recon-${story.id}`, title: story.title, category: 'Aufklärung', reward: 800, description: story.detail,
    objectives: [
      hold(`${story.id}-scan`, place.name, `${story.detail} Bleibe zwölf Sekunden im Kreis. Beim Verlassen beginnt die Messung erneut.`, place.position, 12),
      interact(`${story.id}-data`, `Messdaten nach ${town.name}`, `Bringe die Messdaten zum zivilen Funkkontakt am Markt von ${town.name}.`, market(town), 'Messdaten übergeben'),
    ],
  };
});

const timedRoutes = [
  { id: 'south-express', title: 'Südexpress', from: 2, stops: ['southern-service'], to: 3, detail: 'Eine temperaturempfindliche Lieferung muss von Aurora über Costa Sud nach Bellacosta.' },
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
  { id: 'harvest-archive', title: 'Die verschwundene Ernte', sites: ['olive-estate', 'vineyard'], town: 6, detail: 'Auf Gut Valverde und im Weingut Sole versteckten die Bauern ihre Bestandslisten vor dem Direktorat.' },
];
const cacheMissions: MissionDefinition[] = cacheStories.map(story => ({
  id: `cache-${story.id}`, title: story.title, category: 'Entdeckung', reward: 1100, description: story.detail,
  objectives: [
    ...story.sites.map((id, index) => { const place = location(id); return interact(`${story.id}-${index}`, `Versteck ${index + 1}/2 · ${place.name}`, `${story.detail} Suche die markierte Kiste am Zugang und drücke E.`, place.position, 'Versteck bergen'); }),
    interact(`${story.id}-return`, `Fundstücke nach ${settlements[story.town].name}`, 'Übergebe die geborgenen Unterlagen dem Kontakt am Markt.', market(settlements[story.town]), 'Fundstücke übergeben'),
  ],
}));

/** Five optional diversions keep their original IDs and objective ordering for saved games. */
export const missionDefinitions: readonly MissionDefinition[] = [
  ...storyMissions,
  { id: 'heights', title: 'Flugtraining über Ventosa', description: 'Freiwillig: übe Greifhaken, Wingsuit und Fallschirm auf der bekannten Höhenroute.', category: 'Höhenroute', reward: 900, objectives: traversalRoute },
  ...civicMissions,
  ...reconMissions,
  ...timedMissions,
  ...cacheMissions,
];
