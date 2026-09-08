import type { PlayerState } from '../player/PlayerState';
export interface TraversalObjective {
  id: string; title: string; description: string; position: [number, number, number]; radius: number;
  requiredState?: PlayerState;
}
export const traversalRoute: TraversalObjective[] = [
  { id: 'relay-one', title: '01 / Über die Dächer', description: 'Zieh dich mit F zum Relais über Ventosa. Löse mit SPACE kurz vor dem Dach.', position: [34, 34.3, -230], radius: 10 },
  { id: 'relay-two', title: '02 / Ins Inselinnere', description: 'Das hohe Relais liegt nordöstlich hinter dem Dorf.', position: [112, 54.3, -82], radius: 11 },
  { id: 'glide', title: '03 / Freier Flug', description: 'Fliege mit C im Wingsuit durch den Ring über der Küstenroute.', position: [160, 35, -120], radius: 14, requiredState: 'WINGSUIT' },
  { id: 'landing', title: '04 / Sanfte Ankunft', description: 'Öffne Q und lande auf dem Relais vor Orbis.', position: [202, 21.3, -170], radius: 8, requiredState: 'ON_FOOT' },
];
