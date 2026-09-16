import type { WeaponSpec } from './contracts';
export type WeaponId = 'pistol' | 'compact' | 'smg' | 'shotgun' | 'carbine' | 'rifle' | 'marksman' | 'heavy' | 'launcher';
export interface WeaponDefinition extends WeaponSpec { id: WeaponId; name: string; reserve: number; price: number; description: string; pellets?: number }
const base = { projectileSpeed: 0, explosionRadius: 0 };
export const weapons: Record<WeaponId, WeaponDefinition> = {
  pistol: { ...base, id: 'pistol', name: 'PISTOLE · ROST-9', description: 'Alte Dienstpistole. Wenig Schaden, kleines Magazin, kurze Reichweite.', price: 0, damage: 14, fireRate: 2.5, magazineSize: 8, reloadTime: 2.1, range: 65, spread: 0.035, recoil: 0.025, reserve: 64 },
  compact: { ...base, id: 'compact', name: 'PISTOLE · LIDO', description: 'Zuverlässige Seitenwaffe mit grösserem Magazin und ruhigerem Rückstoss.', price: 400, damage: 21, fireRate: 3.5, magazineSize: 12, reloadTime: 1.5, range: 90, spread: 0.02, recoil: 0.02, reserve: 96 },
  smg: { ...base, id: 'smg', name: 'MASCHINENPISTOLE · VESPA', description: 'Schnelle Salven für enge Gassen. Auf Distanz ungenau.', price: 850, damage: 17, fireRate: 12, magazineSize: 28, reloadTime: 1.6, range: 95, spread: 0.045, recoil: 0.014, reserve: 224 },
  shotgun: { ...base, id: 'shotgun', name: 'SCHROTFLINTE · SCOGLIO', description: 'Sechs Schrotkugeln pro Schuss. Stark aus nächster Nähe.', price: 1100, damage: 15, pellets: 6, fireRate: 1.2, magazineSize: 6, reloadTime: 2.6, range: 38, spread: 0.16, recoil: 0.06, reserve: 48 },
  carbine: { ...base, id: 'carbine', name: 'KARABINER · SENTIERO', description: 'Präzises, sparsames Gewehr für mittlere Distanzen.', price: 1500, damage: 24, fireRate: 5, magazineSize: 20, reloadTime: 1.8, range: 160, spread: 0.016, recoil: 0.018, reserve: 160 },
  rifle: { ...base, id: 'rifle', name: 'STURMGEWEHR · VELA-7', description: 'Vollautomatischer Allrounder für die Befreiung der Insel.', price: 2400, damage: 27, fireRate: 9, magazineSize: 30, reloadTime: 1.7, range: 190, spread: 0.012, recoil: 0.018, reserve: 240 },
  marksman: { ...base, id: 'marksman', name: 'PRÄZISIONSGEWEHR · FARO', description: 'Hoher Einzelschaden und grosse Reichweite. Langsame Schussfolge.', price: 3200, damage: 85, fireRate: 0.9, magazineSize: 5, reloadTime: 2.5, range: 330, spread: 0.004, recoil: 0.065, reserve: 40 },
  heavy: { ...base, id: 'heavy', name: 'MASCHINENGEWEHR · BASTIONE', description: 'Lange Feuerstösse aus einem grossen Magazin. Langsames Nachladen.', price: 4200, damage: 31, fireRate: 10, magazineSize: 70, reloadTime: 3.8, range: 200, spread: 0.03, recoil: 0.03, reserve: 280 },
  launcher: { id: 'launcher', name: 'RAKETENWERFER · NOVA', description: 'Explosive Raketen gegen Tanks und Gruppen. Abstand halten.', price: 5600, damage: 175, fireRate: 0.8, magazineSize: 1, reloadTime: 2.2, range: 240, spread: 0, recoil: 0.05, projectileSpeed: 70, explosionRadius: 14, reserve: 12 },
};
export const weaponIds = Object.keys(weapons) as WeaponId[];
export const isWeaponId = (value: unknown): value is WeaponId => typeof value === 'string' && Object.hasOwn(weapons, value);
