export interface BaseDefinition {
  id: string; name: string; description: string;
  center: [number, number, number]; flag: [number, number, number];
  guards: Array<{ id: string; x: number; z: number }>;
  tanks: Array<{ id: string; x: number; z: number }>;
}
export const bases: BaseDefinition[] = [
  { id: 'orbis', name: 'Relais Orbis', description: 'Das Direktorat kontrolliert von hier die südöstliche Küstenstrasse.', center: [250, 6.2, -150], flag: [225, 6.3, -145],
    guards: [[220,-178],[242,-181],[270,-177],[282,-145],[272,-118],[244,-116],[218,-126],[253,-145]].map(([x,z],i)=>({id:`enemy-${i}`,x,z})),
    tanks: [0,1,2].map(i=>({id:`fuel-${i}`,x:241+i*11,z:-169})) },
  { id: 'porto', name: 'Hafen Mirada', description: 'Befreie den Versorgungshafen an der Westküste und öffne ihn für die Bewohner.', center: [-400, 6.2, -220], flag: [-372, 6.3, -214],
    guards: [[-428,-250],[-404,-252],[-375,-246],[-370,-210],[-394,-190],[-426,-196]].map(([x,z],i)=>({id:`enemy-porto-${i}`,x,z})),
    tanks: [0,1].map(i=>({id:`fuel-porto-${i}`,x:-413+i*12,z:-242})) },
  { id: 'altura', name: 'Station Altura', description: 'Der Höhenposten überwacht die Nordroute. Sichere den Funkhof auf dem Plateau.', center: [300, 34.2, 300], flag: [274, 34.3, 306],
    guards: [[267,270],[294,267],[327,274],[334,309],[319,334],[284,337]].map(([x,z],i)=>({id:`enemy-altura-${i}`,x,z})),
    tanks: [0,1,2].map(i=>({id:`fuel-altura-${i}`,x:291+i*11,z:279})) },
];
export const captureDuration = 6;
export const captureRadius = 12;
