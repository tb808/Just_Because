export type PlayerState = 'ON_FOOT' | 'FALLING' | 'GRAPPLING' | 'WINGSUIT' | 'PARACHUTE' | 'IN_VEHICLE';
export type AbilityAction = 'grapple' | 'wingsuit' | 'parachute' | 'release' | 'land';

export function transition(state: PlayerState, action: AbilityAction, allowed = true): PlayerState {
  if (state === 'IN_VEHICLE') return state;
  if (action === 'land') return 'ON_FOOT';
  if (action === 'release') return state === 'ON_FOOT' ? state : 'FALLING';
  if (!allowed) return state;
  if (action === 'grapple') return state === 'GRAPPLING' ? 'FALLING' : 'GRAPPLING';
  if (state === 'ON_FOOT') return state;
  if (action === 'wingsuit') return state === 'WINGSUIT' ? 'FALLING' : 'WINGSUIT';
  return state === 'PARACHUTE' ? 'FALLING' : 'PARACHUTE';
}

export const stateLabels: Record<PlayerState, string> = {
  ON_FOOT: 'ZU FUSS', FALLING: 'FREIER FALL', GRAPPLING: 'GREIFHAKEN',
  WINGSUIT: 'WINGSUIT', PARACHUTE: 'FALLSCHIRM', IN_VEHICLE: 'IM FAHRZEUG',
};
