import type { WeaponSpec } from './contracts';
export type WeaponId = 'rifle' | 'launcher';
export interface WeaponDefinition extends WeaponSpec { id: WeaponId; name: string; reserve: number }
export const weapons: Record<WeaponId, WeaponDefinition> = {
  rifle: { id: 'rifle', name: 'STURMGEWEHR · VELA-7', damage: 27, fireRate: 9, magazineSize: 30, reloadTime: 1.7, range: 190, spread: 0.012, recoil: 0.018, projectileSpeed: 0, explosionRadius: 0, reserve: 240 },
  launcher: { id: 'launcher', name: 'RAKETENWERFER · NOVA', damage: 175, fireRate: 0.8, magazineSize: 1, reloadTime: 2.2, range: 240, spread: 0, recoil: 0.05, projectileSpeed: 70, explosionRadius: 14, reserve: 12 },
};
