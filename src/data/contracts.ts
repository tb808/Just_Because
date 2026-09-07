// Stable domain contracts for the next phases; these are not implemented gameplay yet.
export type EntityId = string;
export interface Vec3Data { x: number; y: number; z: number }
export interface DamageEvent { sourceId: EntityId; targetId: EntityId; amount: number; type: 'bullet' | 'explosion' | 'collision'; hitPoint: Vec3Data; impulse?: Vec3Data }
export interface Damageable { readonly id: EntityId; readonly health: number; applyDamage(event: DamageEvent): void }
export interface WeaponSpec { damage: number; fireRate: number; magazineSize: number; reloadTime: number; range: number; spread: number; recoil: number; projectileSpeed: number; explosionRadius: number }
export interface VehicleSpec { kind: 'car' | 'bike' | 'boat' | 'helicopter'; maxHealth: number; maxSpeed: number; acceleration: number; braking: number; steering: number; seatOffset: Vec3Data; exitOffset: Vec3Data }
export interface VehicleInput { throttle: number; brake: number; steer: number; lift: number }
export interface VehicleController { update(dt: number, input: VehicleInput): void; dispose(): void }
export type EnemyState = 'IDLE' | 'PATROL' | 'SUSPICIOUS' | 'ALERT' | 'COMBAT' | 'SEARCH' | 'RETURN';
export interface EnemySpec { maxHealth: number; viewDistance: number; fieldOfView: number; hearingRadius: number; speed: number; searchDuration: number }
export type ObjectiveType = 'REACH_LOCATION' | 'DESTROY_TARGET' | 'ELIMINATE_TARGET' | 'STEAL_VEHICLE' | 'ESCAPE_AREA' | 'DEFEND_LOCATION' | 'SURVIVE' | 'LIBERATE_BASE';
export interface BaseDefinition { id: EntityId; name: string; objectiveIds: EntityId[]; reward: number }
export interface PersistentWorldState { destroyedIds: Set<EntityId>; liberatedBaseIds: Set<EntityId>; missionProgress: Map<string, number> }
