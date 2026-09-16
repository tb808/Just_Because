import type { MissionSaveState } from '../missions/MissionProgress';

export type EquipmentId = 'grapple' | 'parachute' | 'wingsuit';
export type Equipment = Record<EquipmentId, boolean>;
export const equipmentLabels: Record<EquipmentId, string> = { grapple: 'Greifhaken', parachute: 'Fallschirm', wingsuit: 'Gleiter / Wingsuit' };
export const equipmentRequirements: Record<EquipmentId, string> = { grapple: 'Triff Mara in Kapitel 1', parachute: 'Erreiche das erste Relais in Kapitel 1', wingsuit: 'Befreie Tomás in Kapitel 3' };
/** Derived from committed story checkpoints: no second, divergent unlock save. */
export function storyEquipment(state: MissionSaveState): Equipment {
  const first = state.records?.['story-01'];
  return {
    grapple: !!first && (first.complete || first.step >= 1),
    parachute: !!first && (first.complete || first.step >= 2),
    wingsuit: state.records?.['story-03']?.complete === true,
  };
}
