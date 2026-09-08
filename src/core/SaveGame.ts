import type { WeaponId } from '../data/weapons';
import type { MissionSaveState } from '../missions/MissionProgress';

export const saveKey = 'cala-ventra.save.v1';

export interface WeaponSaveState {
  selected: WeaponId;
  rifle: { ammo: number; reserve: number };
  launcher: { ammo: number; reserve: number };
}

export interface CombatSaveState {
  score: number;
  health: number;
  weapons: WeaponSaveState;
  selectedBase: number;
  liberatedBaseIds: string[];
  defeatedEnemyIds: string[];
  destroyedTankIds: string[];
}

export interface GameSave {
  version: 1;
  savedAt: number;
  player: [number, number, number];
  missions: MissionSaveState;
  combat: CombatSaveState;
  world?: { discoveredSettlementIds: string[]; elapsed: number };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const missionRecordValid = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as { step?: unknown; elapsed?: unknown; hold?: unknown; complete?: unknown };
  return finite(record.step) && Number.isInteger(record.step) && record.step >= 0
    && finite(record.elapsed) && record.elapsed >= 0 && finite(record.hold) && record.hold >= 0
    && typeof record.complete === 'boolean';
};

export function isGameSave(value: unknown): value is GameSave {
  if (!value || typeof value !== 'object') return false;
  const save = value as Partial<GameSave>, missions = save.missions, combat = save.combat, weapons = combat?.weapons;
  const weaponValid = (weapon: unknown) => !!weapon && typeof weapon === 'object' && finite((weapon as { ammo?: unknown }).ammo) && finite((weapon as { reserve?: unknown }).reserve);
  return save.version === 1 && finite(save.savedAt)
    && Array.isArray(save.player) && save.player.length === 3 && save.player.every(finite)
    && !!missions && finite(missions.index) && finite(missions.elapsed)
    && (missions.trackedId === undefined || typeof missions.trackedId === 'string')
    && (missions.records === undefined || !!missions.records && typeof missions.records === 'object' && !Array.isArray(missions.records)
      && Object.values(missions.records).every(missionRecordValid))
    && (save.world === undefined || !!save.world && stringArray(save.world.discoveredSettlementIds) && finite(save.world.elapsed) && save.world.elapsed >= 0)
    && !!combat && finite(combat.score) && finite(combat.health) && finite(combat.selectedBase)
    && stringArray(combat.liberatedBaseIds) && stringArray(combat.defeatedEnemyIds) && stringArray(combat.destroyedTankIds)
    && !!weapons && (weapons.selected === 'rifle' || weapons.selected === 'launcher')
    && weaponValid(weapons.rifle) && weaponValid(weapons.launcher);
}

export function loadGameSave(storage?: StorageLike) {
  try {
    const raw = (storage ?? window.localStorage).getItem(saveKey);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isGameSave(parsed) ? parsed : undefined;
  } catch { return undefined; }
}

export function storeGameSave(save: GameSave, storage?: StorageLike) {
  try { (storage ?? window.localStorage).setItem(saveKey, JSON.stringify(save)); return true; }
  catch { return false; }
}

export function clearGameSave(storage?: StorageLike) {
  try { (storage ?? window.localStorage).removeItem(saveKey); }
  catch { /* Storage can be unavailable in privacy-restricted browsers. */ }
}
