export interface BaseDefinition {
  id: string; name: string; description: string;
  center: [number, number, number]; flag: [number, number, number];
  guards: Array<{ id: string; x: number; z: number }>;
  tanks: Array<{ id: string; x: number; z: number }>;
}
export const bases: BaseDefinition[] = [
  { id: 'orbis', name: 'Relais Orbis', description: 'Das Direktorat kontrolliert von hier die südöstliche Küstenstrasse.', center: [250, 6.2, -150], flag: [225, 6.3, -145],
    guards: [[220,-178],[242,-181],[270,-177],[282,-145],[272,-118],[244,-121],[218,-126],[253,-145]].map(([x,z],i)=>({id:`enemy-${i}`,x,z})),
    tanks: [0,1,2].map(i=>({id:`fuel-${i}`,x:241+i*11,z:-169})) },
  { id: 'porto', name: 'Hafen Mirada', description: 'Befreie den Versorgungshafen an der Westküste und öffne ihn für die Bewohner.', center: [-400, 6.2, -220], flag: [-372, 6.3, -214],
    guards: [[-428,-250],[-404,-252],[-375,-246],[-370,-210],[-394,-190],[-426,-196]].map(([x,z],i)=>({id:`enemy-porto-${i}`,x,z})),
    tanks: [0,1].map(i=>({id:`fuel-porto-${i}`,x:-413+i*12,z:-242})) },
  { id: 'altura', name: 'Station Altura', description: 'Der Höhenposten überwacht die Nordroute. Sichere den Funkhof auf dem Plateau.', center: [300, 34.2, 300], flag: [274, 34.3, 306],
    guards: [[267,270],[294,267],[322,269],[334,309],[319,329],[284,337]].map(([x,z],i)=>({id:`enemy-altura-${i}`,x,z})),
    tanks: [0,1,2].map(i=>({id:`fuel-altura-${i}`,x:291+i*11,z:279})) },
];
export const captureDuration = 6;
export const captureRadius = 12;

const frontierBases = [
  {id:'nordwacht',name:'Festung Nordwacht',description:'Das nördliche Küstenfort schützt die schwere Funkanlage des Direktorats.',x:-950,z:980,y:46},
  {id:'levante',name:'Depot Levante',description:'Der Verkehrsknoten im Osten versorgt die Besatzung auf der ganzen Insel.',x:1100,z:-300,y:22},
  {id:'cima',name:'Radar Cima',description:'Die Radarbasis kontrolliert die nördlichen Bergpässe und den Luftraum.',x:900,z:1000,y:54},
];
for(const base of frontierBases) bases.push({
  id:base.id,name:base.name,description:base.description,center:[base.x,base.y+.2,base.z],flag:[base.x-25,base.y+.3,base.z+6],
  guards:[[-31,-28],[-12,-30],[12,-29],[23,-24],[30,10],[24,30],[0,31],[-29,25],[-8,-6],[14,4]].map(([dx,dz],i)=>({id:`enemy-${base.id}-${i}`,x:base.x+dx,z:base.z+dz})),
  tanks:[-13,0,13].map((dx,i)=>({id:`fuel-${base.id}-${i}`,x:base.x+dx,z:base.z-21})),
});
