export interface BaseDefinition {
  id: string; name: string; description: string;
  center: [number, number, number]; flag: [number, number, number];
  guards: Array<{ id: string; x: number; z: number }>;
  tanks: Array<{ id: string; x: number; z: number }>;
}
export const bases: BaseDefinition[] = [
  { id: 'orbis', name: 'Relais Orbis', description: 'Das Direktorat kontrolliert von hier die Südküste.', center: [56, 6.2, 24], flag: [48, 6.3, 5],
    guards: [[12,-49],[26,-29],[37,-12],[48,-16],[78,-25],[30,29],[47,45],[81,45]].map(([x,z],i)=>({id:`enemy-${i}`,x,z})),
    tanks: [0,1,2].map(i=>({id:`fuel-${i}`,x:63+i*9,z:-12})) },
  { id: 'porto', name: 'Hafen Mirada', description: 'Befreie den Versorgungshafen und öffne ihn für die Küstenbewohner.', center: [-220, 6.2, -100], flag: [-214, 6.3, -93],
    guards: [[-247,-118],[-231,-122],[-204,-127],[-191,-91],[-222,-69],[-248,-78]].map(([x,z],i)=>({id:`enemy-porto-${i}`,x,z})),
    tanks: [0,1].map(i=>({id:`fuel-porto-${i}`,x:-204+i*9,z:-112})) },
  { id: 'altura', name: 'Station Altura', description: 'Der Höhenposten überwacht die Insel. Sichere den Funkhof.', center: [90, 24.2, 210], flag: [108, 24.3, 212],
    guards: [[67,189],[88,181],[128,198],[119,227],[79,245],[58,222]].map(([x,z],i)=>({id:`enemy-altura-${i}`,x,z})),
    tanks: [0,1,2].map(i=>({id:`fuel-altura-${i}`,x:83+i*9,z:194})) },
];
export const captureDuration = 6;
export const captureRadius = 12;
