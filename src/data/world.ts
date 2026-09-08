export type GroundPoint = readonly [x: number, z: number];

export interface SettlementDefinition {
  id: string;
  name: string;
  center: GroundPoint;
  market: GroundPoint;
  homes: readonly GroundPoint[];
  residentRoute: readonly GroundPoint[];
}

/** Authored layout shared by the 3D world, ambient simulation and map UI. */
export const settlements: readonly SettlementDefinition[] = [
  {
    id: 'ventosa', name: 'Dorf Ventosa', center: [-40, -195], market: [-62, -248],
    homes: [[-125,-218],[-88,-210],[-125,-170],[-88,-170],[48,-210],[86,-210],[48,-168],[86,-168]],
    residentRoute: [[-69,-258],[-55,-258],[-55,-250],[-69,-250]],
  },
  {
    id: 'estela', name: 'Dorf Estela', center: [-132, 225], market: [-132, 278],
    homes: [[-174,202],[-90,202],[-174,244],[-90,244],[-174,286],[-90,286]],
    residentRoute: [[-139,268],[-125,268],[-125,276],[-139,276]],
  },
] as const;

export const worldRoads = {
  southernCoast: [[-445,-282],[-400,-282],[-320,-280],[-235,-286],[-135,-282],[-20,-282],[92,-274],[175,-238],[235,-202],[250,-184]],
  harborAccess: [[-400,-282],[-400,-252],[-400,-220]],
  ventosaMain: [[-20,-335],[-20,-282],[-20,-235],[-20,-140]],
  ventosaWest: [[-135,-242],[-88,-242],[-20,-235]],
  interior: [[-20,-140],[18,-35],[78,64],[145,145],[220,222],[282,278],[300,300]],
  estela: [[78,64],[6,105],[-72,157],[-132,225],[-132,278]],
  miradaMarket: [[-400,-282],[-355,-298],[-305,-298]],
} as const;

export const trafficRoute: readonly GroundPoint[] = [[-400,-286],[-300,-288],[-175,-284],[-82,-282],[42,-278],[126,-258],[208,-220]];

export const miradaResidentRoute: readonly GroundPoint[] = [[-342,-316],[-328,-316],[-328,-308],[-342,-308]];

export const landmarks = [
  { name: 'Aussichtspunkt', position: [-26,-320] as GroundPoint, symbol: '△', labelSide: 'right' },
  ...settlements.map(({name,center}) => ({ name, position: center, symbol: '⌂', labelSide: 'right' as const })),
  ...settlements.map(({name,market}) => ({ name: `Markt ${name.replace('Dorf ', '')}`, position: market, symbol: '◇', labelSide: 'left' as const })),
  { name: 'Markt Mirada', position: [-335,-306] as GroundPoint, symbol: '◇', labelSide: 'left' },
  { name: 'Hafensteg', position: [-505,-220] as GroundPoint, symbol: '⚓', labelSide: 'right' },
  { name: 'Westbrücke', position: [-235,-286] as GroundPoint, symbol: '═', labelSide: 'left' },
  { name: 'Tankstelle', position: [66,-282] as GroundPoint, symbol: '+', labelSide: 'right' },
  { name: 'Höhenrelais', position: [112,-82] as GroundPoint, symbol: '△', labelSide: 'left' },
] as const;
