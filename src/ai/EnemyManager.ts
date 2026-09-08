import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AssetManager } from '../core/AssetManager';
import { enemySpawns, enemyConfig } from '../data/enemies';
import { Player } from '../player/Player';
import { DamageSystem } from '../combat/DamageSystem';
import { CombatEffects } from '../combat/CombatEffects';
import { CombatAudio } from '../combat/CombatAudio';
import { Enemy } from './Enemy';

export class EnemyManager {
  readonly enemies: Enemy[];
  get defeated() { return this.enemies.filter(e => e.health.dead).length; }
  get alertCount() { return this.enemies.filter(e => !e.health.dead && (e.state === 'COMBAT' || e.state === 'SEARCH')).length; }
  constructor(scene: Scene, player: Player, damage: DamageSystem, effects: CombatEffects, audio: CombatAudio) {
    this.enemies = enemySpawns.map(([x, z], i) => new Enemy(`enemy-${i}`, scene, new Vector3(x, 7.18, z), player, damage, effects, audio));
  }
  async load(assets: AssetManager) { await Promise.all(this.enemies.map(e => e.load(assets))); this.reset(); }
  update(dt: number) { this.enemies.forEach(e => e.update(dt)); }
  noise(position: Vector3) { for (const enemy of this.enemies) if (Vector3.Distance(position, enemy.body.position) < enemyConfig.hearingRadius) enemy.alert(position); }
  reset() { this.enemies.forEach(e => e.reset()); }
}
