import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AssetManager } from '../core/AssetManager';
import { enemyConfig } from '../data/enemies';
import { bases } from '../data/bases';
import { terrainHeight } from '../world/Terrain';
import { Player } from '../player/Player';
import { DamageSystem } from '../combat/DamageSystem';
import { CombatEffects } from '../combat/CombatEffects';
import { CombatAudio } from '../combat/CombatAudio';
import { Enemy } from './Enemy';

export class EnemyManager {
  readonly enemies: Enemy[];
  get defeated() { return this.enemies.filter(e => e.health.dead).length; }
  get alertCount() { return this.enemies.filter(e => !e.health.dead && (e.state === 'COMBAT' || e.state === 'SEARCH')).length; }
  constructor(scene: Scene, private player: Player, damage: DamageSystem, effects: CombatEffects, audio: CombatAudio) {
    this.enemies = bases.flatMap(base => base.guards.map(({id,x,z}) => new Enemy(id, scene, new Vector3(x, terrainHeight(x,z)+1.18, z), player, damage, effects, audio)));
  }
  async load(assets: AssetManager) { await Promise.all(this.enemies.map(e => e.load(assets))); this.reset(); }
  update(dt: number) { for (const enemy of this.enemies) { const active = Vector3.DistanceSquared(enemy.body.position, this.player.position) < 260 ** 2; enemy.setActive(active); if (active) enemy.update(dt); } }
  noise(position: Vector3) { for (const enemy of this.enemies) if (Vector3.Distance(position, enemy.body.position) < enemyConfig.hearingRadius) enemy.alert(position); }
  reset() { this.enemies.forEach(e => e.reset()); }
}
