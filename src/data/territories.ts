export interface TerritoryDefinition {
  baseId: string;
  name: string;
  /** A map-space anchor used to divide the island into contiguous influence regions. */
  anchor: readonly [x: number, z: number];
  settlementIds: readonly string[];
}

/**
 * Political regions deliberately sit between their base and the settlements they control.
 * This gives every city an authored owner instead of letting small coordinate changes move it
 * to an unrelated base on the atlas.
 */
export const territories: readonly TerritoryDefinition[] = [
  { baseId: 'orbis', name: 'Bezirk Ventosa', anchor: [105, -172], settlementIds: ['ventosa'] },
  { baseId: 'porto', name: 'Westhafen', anchor: [-800, -300], settlementIds: ['aurora', 'porto-novo'] },
  { baseId: 'altura', name: 'Bezirk Estela', anchor: [80, 260], settlementIds: ['estela'] },
  { baseId: 'nordwacht', name: 'Olivenland', anchor: [-825, 815], settlementIds: ['oliveto'] },
  { baseId: 'levante', name: 'Ostküste', anchor: [900, -260], settlementIds: ['bellacosta', 'sanremo'] },
  { baseId: 'cima', name: 'Hochland', anchor: [625, 1010], settlementIds: ['monteluce'] },
  { baseId: 'bastione', name: 'Nordwestmark', anchor: [-975, 1625], settlementIds: ['rocca-alta'] },
  { baseId: 'fonderia', name: 'Industriebezirk', anchor: [1675, 900], settlementIds: ['ferravalle'] },
  { baseId: 'scogliera', name: 'Westkap', anchor: [-1785, -850], settlementIds: ['cala-serena'] },
  { baseId: 'meridiano', name: 'Sonnenküste', anchor: [1350, -1360], settlementIds: ['solara'] },
];

export function territoryAt(x: number, z: number) {
  return territories.reduce((nearest, territory) =>
    Math.hypot(x - territory.anchor[0], z - territory.anchor[1])
      < Math.hypot(x - nearest.anchor[0], z - nearest.anchor[1]) ? territory : nearest);
}

export function territoryForSettlement(id: string) {
  return territories.find(territory => territory.settlementIds.includes(id));
}
