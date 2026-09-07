import type { PlayerState } from '../player/PlayerState';
export interface TraversalObjective {
  id: string; title: string; description: string; position: [number, number, number]; radius: number;
  requiredState?: PlayerState;
}
export const traversalRoute: TraversalObjective[] = [
  { id: 'relay-one', title: '01 / Über die Dächer', description: 'Zieh dich mit F zum ersten Relais. Löse mit SPACE kurz vor dem Dach.', position: [-22, 35.3, -25], radius: 10 },
  { id: 'relay-two', title: '02 / Höher hinaus', description: 'Das hohe Relais liegt nordöstlich. Halte Ausschau nach dem goldenen Ring.', position: [36, 56.3, 25], radius: 11 },
  { id: 'glide', title: '03 / Freier Flug', description: 'Fliege mit C im Wingsuit durch den Ring über der Küstenstrasse.', position: [54, 32, -24], radius: 14, requiredState: 'WINGSUIT' },
  { id: 'landing', title: '04 / Sanfte Ankunft', description: 'Öffne Q und lande auf dem Dach am südlichen Relais.', position: [80, 20.3, -54], radius: 8, requiredState: 'ON_FOOT' },
];
