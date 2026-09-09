export type GroundPoint = readonly [x: number, z: number];

export interface SettlementDefinition {
  id: string;
  name: string;
  center: GroundPoint;
  market: GroundPoint;
  homes: readonly GroundPoint[];
  residentRoute: readonly GroundPoint[];
  elevation: number;
  radius: number;
  population: number;
  character: string;
  color: string;
  architecture?: 'alpine' | 'industrial' | 'riviera' | 'terraces';
}

const townSeeds = [
  { id: 'ventosa', name: 'Ventosa', center: [-40, -195], market: [-62, -248], elevation: 6, radius: 146, population: 280, character: 'Terrakottagassen, Cafés und der alte Küstenmarkt', color: '#e1bd83' },
  { id: 'estela', name: 'Estela', center: [-132, 225], market: [-132, 278], elevation: 24, radius: 150, population: 320, character: 'Hügelstadt mit Arkaden, Handwerk und Zypressenhöfen', color: '#d9cbb0' },
  { id: 'aurora', name: 'Aurora', center: [-850, -700], market: [-850, -700], elevation: 16, radius: 160, population: 480, character: 'Südliche Handelsstadt mit bunten Laubengängen', color: '#e7ac85' },
  { id: 'bellacosta', name: 'Bellacosta', center: [650, -700], market: [650, -700], elevation: 12, radius: 158, population: 520, character: 'Blaue Fensterläden, Palmenboulevards und Fischmarkt', color: '#f0dbc0' },
  { id: 'sanremo', name: 'San Remo', center: [1000, 220], market: [1000, 220], elevation: 30, radius: 162, population: 610, character: 'Dichtes Altstadtviertel mit Uhrturm und Werkstätten', color: '#d1b7a5' },
  { id: 'monteluce', name: 'Monteluce', center: [350, 1020], market: [350, 1020], elevation: 68, radius: 156, population: 390, character: 'Bergstadt mit Steinplätzen, Terrassen und Aussichtsgärten', color: '#c8c5ae' },
  { id: 'oliveto', name: 'Oliveto', center: [-700, 650], market: [-700, 650], elevation: 38, radius: 155, population: 260, character: 'Landstadt zwischen Olivenhainen, Weinbergen und Mühlen', color: '#d7cb8e' },
  { id: 'porto-novo', name: 'Porto Novo', center: [-1150, 150], market: [-1150, 150], elevation: 9, radius: 158, population: 440, character: 'Fischerhäuser, Lagerhallen und eine geschäftige Hafenpromenade', color: '#b9cfcc' },
  { id: 'rocca-alta', name: 'Rocca Alta', center: [-700,1730], market: [-700,1730], elevation: 48, radius: 164, population: 360, character: 'Schieferdächer, Holzbalkone und ein steinerner Bergfried zwischen Tannen', color: '#aaa791', architecture: 'alpine' },
  { id: 'ferravalle', name: 'Ferravalle', center: [1500,1200], market: [1500,1200], elevation: 24, radius: 164, population: 680, character: 'Backsteinviertel, Werkhallen, Dachfenster und der alte Wasserturm', color: '#ae7657', architecture: 'industrial' },
  { id: 'cala-serena', name: 'Cala Serena', center: [-1720,-600], market: [-1720,-600], elevation: 12, radius: 164, population: 410, character: 'Weisse Küstenvillen, türkisfarbene Läden und schattige Pergolen', color: '#eee3c7', architecture: 'riviera' },
  { id: 'solara', name: 'Solara', center: [1580,-1150], market: [1580,-1150], elevation: 18, radius: 164, population: 450, character: 'Ockerfarbene Terrassenhäuser, Kuppeln und ein Basar am Karawanenturm', color: '#d3ad66', architecture: 'terraces' },
] as const;

/** The same authored network drives roads, civilian travel, navigation and the map. */
export const worldRoads: Record<string, readonly GroundPoint[]> = {
  southernCoast: [[-445,-282],[-400,-282],[-320,-280],[-235,-286],[-135,-282],[-20,-282],[92,-274],[175,-238],[235,-202],[250,-184]],
  harborAccess: [[-400,-282],[-400,-252],[-400,-220]],
  ventosaMain: [[-20,-335],[-20,-282],[-20,-235],[-20,-140]],
  ventosaWest: [[-135,-242],[-88,-242],[-20,-235]],
  interior: [[-20,-140],[18,-35],[78,64],[145,145],[220,222],[282,278],[300,300]],
  estela: [[78,64],[6,105],[-72,157],[-132,225],[-132,278]],
  miradaMarket: [[-400,-282],[-355,-298],[-305,-298]],
  westCoast: [[-400,-282],[-585,-400],[-720,-565],[-850,-700],[-1030,-540],[-1160,-240],[-1150,150],[-985,400],[-700,650]],
  southCoast: [[-850,-700],[-650,-840],[-280,-845],[75,-810],[350,-770],[650,-700],[820,-540],[1100,-300]],
  southeast: [[250,-184],[395,-390],[485,-560],[650,-700]],
  eastCoast: [[1100,-300],[1180,-100],[1170,75],[1000,220],[1080,470],[1060,715],[900,1000]],
  northCoast: [[900,1000],[655,1100],[350,1020],[60,1050],[-280,945],[-590,870],[-950,980]],
  northwest: [[-950,980],[-800,820],[-700,650],[-470,545],[-290,405],[-132,225]],
  mountainPass: [[300,300],[425,445],[525,620],[480,805],[350,1020]],
  eastCrossing: [[300,300],[530,275],[770,245],[1000,220]],
  oliveHarbor: [[-1150,150],[-970,300],[-850,470],[-700,650]],
  northernFrontier: [[-950,980],[-1130,1220],[-1050,1500],[-700,1500],[-700,1730],[-420,1730],[-180,1520],[60,1050]],
  foundryCoast: [[900,1000],[1200,1020],[1500,1020],[1500,1200],[1770,1200],[1800,880],[1660,500],[1250,340]],
  serenaCoast: [[-850,-700],[-1200,-850],[-1460,-850],[-1720,-850],[-1720,-600],[-1720,-360],[-1490,-280],[-1160,-240]],
  sunCoast: [[1100,-300],[1390,-570],[1580,-850],[1580,-1150],[1580,-1420],[1290,-1460],[960,-1320],[820,-540]],
  bastioneAccess: [[-1130,1220],[-1380,1340],[-1380,1520],[-1288,1520]],
  fonderiaAccess: [[1800,880],[1720,710],[1720,600],[1812,600]],
  scoglieraAccess: [[-1720,-850],[-1980,-940],[-1980,-1100],[-1888,-1100]],
  meridianoAccess: [[1290,-1460],[970,-1480],[970,-1570],[1082,-1570]],
};
for (const town of townSeeds) {
  const [cx,cz] = town.center, edge = town.radius - 15;
  for (const offset of [-56,0,56]) {
    worldRoads[`${town.id}-avenue-${offset}`] = [[cx+offset,cz-edge],[cx+offset,cz+edge]];
    worldRoads[`${town.id}-street-${offset}`] = [[cx-edge,cz+offset],[cx+edge,cz+offset]];
  }
  worldRoads[`${town.id}-ring`] = [[cx-edge,cz-edge],[cx+edge,cz-edge],[cx+edge,cz+edge],[cx-edge,cz+edge],[cx-edge,cz-edge]];
}

export function distanceToRoad(point: GroundPoint, roads: readonly (readonly GroundPoint[])[] = Object.values(worldRoads)) {
  let distance = Number.POSITIVE_INFINITY;
  for (const road of roads) for (let i=1;i<road.length;i++) {
    const [ax,az]=road[i-1], [bx,bz]=road[i], dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((point[0]-ax)*dx+(point[1]-az)*dz)/(dx*dx+dz*dz || 1)));
    distance=Math.min(distance,Math.hypot(point[0]-ax-dx*t,point[1]-az-dz*t));
  }
  return distance;
}
const roadSegments=Object.values(worldRoads);
export const settlements: readonly SettlementDefinition[] = townSeeds.map(town => {
  const [cx,cz]=town.center, [mx,mz]=town.market;
  const homes: GroundPoint[]=[];
  for (const dx of [-108,-80,-28,28,80,108]) for (const dz of [-108,-80,-28,28,80,108]) {
    const point:GroundPoint=[cx+dx,cz+dz];
    if (Math.abs(point[0]-mx)<32 && Math.abs(point[1]-mz)<25) continue;
    if (distanceToRoad(point,roadSegments)<15) continue;
    // The original traversal towers remain approachable from the starting streets.
    if (town.id==='ventosa' && [[-26,-320],[34,-230],[112,-82]].some(([x,z])=>Math.hypot(point[0]-x,point[1]-z)<19)) continue;
    homes.push(point);
  }
  return {...town, homes, residentRoute: [[mx,mz-8],[cx-8,mz-8],[cx-8,cz-118],[cx+8,cz-118],[cx+8,cz-64],[cx+118,cz-64],[cx+118,cz+8],[cx+8,cz+8],[cx+8,cz+118],[cx-8,cz+118],[cx-8,cz+64],[cx-118,cz+64],[cx-118,cz-8],[cx-8,cz-8],[cx-8,mz-8]]};
});

export interface WorldLocation {
  id:string; name:string; position:GroundPoint;
  kind:'landmark'|'harbor'|'farm'|'ruins'|'station'|'lookout'; description:string;
}
export const worldLocations: readonly WorldLocation[] = [
  {id:'faro-aurora',name:'Leuchtturm Aurora',position:[-1260,-860],kind:'lookout',description:'Ein alter Leuchtturm oberhalb der südwestlichen Buchten.'},
  {id:'porto-novo-docks',name:'Docks Porto Novo',position:[-1450,150],kind:'harbor',description:'Fischerboote, Kräne und Lagerstege an der Westküste.'},
  {id:'bellacosta-marina',name:'Marina Bellacosta',position:[720,-1090],kind:'harbor',description:'Bootswerften und eine sonnige Uferpromenade.'},
  {id:'olive-estate',name:'Gut Valverde',position:[-900,580],kind:'farm',description:'Olivenhaine, eine Ölpresse und Höfe über dem Westtal.'},
  {id:'vineyard',name:'Weingut Sole',position:[-420,790],kind:'farm',description:'Rebenreihen, Terrassen und ein historischer Weinkeller.'},
  {id:'aurora-orchard',name:'Orangenhof Aurora',position:[-610,-610],kind:'farm',description:'Obstgärten und ein ländlicher Wochenmarkt.'},
  {id:'abbey',name:'Abtei Santa Alba',position:[-100,1020],kind:'ruins',description:'Verwitterte Arkaden einer alten Bergabtei.'},
  {id:'aqueduct',name:'Römisches Aquädukt',position:[600,510],kind:'ruins',description:'Steinerne Bögen über einer grünen Talsohle.'},
  {id:'caldera',name:'Caldera-Hochblick',position:[30,665],kind:'lookout',description:'Ein hoch gelegener Aussichtspunkt über dem Inselinneren.'},
  {id:'sanremo-station',name:'Terminal San Remo',position:[1250,340],kind:'station',description:'Busbahnhof, Werkstätten und Lastwagenhof.'},
  {id:'southern-service',name:'Raststätte Costa Sud',position:[70,-810],kind:'station',description:'Eine Raststation zwischen den südlichen Handelsstädten.'},
  {id:'waterfall',name:'Kaskaden von Estela',position:[-425,270],kind:'landmark',description:'Wasserkaskaden, Felsen und eine schattige Parkanlage.'},
  {id:'windfarm',name:'Windpark Levante',position:[1320,-480],kind:'landmark',description:'Windräder über der östlichen Steilküste.'},
  {id:'north-sanctuary',name:'Nordkap-Garten',position:[300,1290],kind:'lookout',description:'Ein Aussichtsgarten mit langen Küstenblicken.'},
  {id:'old-fort',name:'Fort San Aurelio',position:[-1290,750],kind:'ruins',description:'Eine zerfallene Küstenfestung mit Höfen und Zinnen.'},
  {id:'salt-fields',name:'Salinen von Levante',position:[1160,860],kind:'farm',description:'Flache Salzbecken, Schuppen und hölzerne Stege.'},
];
// Each destination has an actual traversable access road, also available to the map.
for (const location of worldLocations) {
  const nearest=settlements.reduce((best,town)=>Math.hypot(town.center[0]-location.position[0],town.center[1]-location.position[1])<Math.hypot(best.center[0]-location.position[0],best.center[1]-location.position[1])?town:best);
  // Leave from the town ring rather than cutting across the occupied blocks.
  const dx=location.position[0]-nearest.center[0],dz=location.position[1]-nearest.center[1],edge=nearest.radius-15;
  const start:GroundPoint=Math.abs(dx)>Math.abs(dz)?[nearest.center[0]+Math.sign(dx)*edge,nearest.center[1]]:[nearest.center[0],nearest.center[1]+Math.sign(dz)*edge];
  worldRoads[`${location.id}-access`]=location.id==='caldera'?[start,[-250,455],[-80,565],location.position]:location.id==='north-sanctuary'?[start,[490,1200],[440,1270],location.position]:[start,location.position];
}

export const trafficRoute: readonly GroundPoint[] = [[-400,-286],[-300,-288],[-175,-284],[-82,-282],[42,-278],[126,-258],[208,-220]];
export const miradaResidentRoute: readonly GroundPoint[] = [[-342,-316],[-328,-316],[-328,-308],[-342,-308]];
export const landmarks = [
  { name:'Aussichtspunkt',position:[-26,-320] as GroundPoint,symbol:'△',labelSide:'right' },
  ...settlements.map(({name,center})=>({name,position:center,symbol:'⌂',labelSide:'right' as const})),
  ...settlements.map(({name,market})=>({name:`Markt ${name}`,position:market,symbol:'◇',labelSide:'left' as const})),
  ...worldLocations.map(({name,position,kind})=>({name,position,symbol:kind==='harbor'?'⚓':kind==='farm'?'♧':kind==='ruins'?'▱':'△',labelSide:'right' as const})),
  {name:'Markt Mirada',position:[-335,-306] as GroundPoint,symbol:'◇',labelSide:'left'},
  {name:'Hafensteg',position:[-505,-220] as GroundPoint,symbol:'⚓',labelSide:'right'},
  {name:'Westbrücke',position:[-235,-286] as GroundPoint,symbol:'═',labelSide:'left'},
  {name:'Tankstelle',position:[66,-282] as GroundPoint,symbol:'+',labelSide:'right'},
  {name:'Höhenrelais',position:[112,-82] as GroundPoint,symbol:'△',labelSide:'left'},
] as const;
