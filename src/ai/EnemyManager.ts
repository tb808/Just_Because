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
  private communicationTimer = 0;
  private squads = new Map<string, string>();
  get defeated() { return this.enemies.filter(e => e.health.dead).length; }
  get alertCount() { return this.enemies.filter(e => e.body.isEnabled() && !e.health.dead && (e.state === 'COMBAT' || e.state === 'SEARCH' || e.state === 'ALERT')).length; }
  constructor(scene: Scene, private player: Player, damage: DamageSystem, effects: CombatEffects, audio: CombatAudio) {
    this.enemies = bases.flatMap(base => base.guards.map(({id,x,z}) => {this.squads.set(id,base.id);return new Enemy(id, scene, new Vector3(x, terrainHeight(x,z)+1.18, z), player, damage, effects, audio);}));
  }
  async load(assets: AssetManager) { await Promise.all(this.enemies.map(e => e.load(assets))); this.reset(); }
  update(dt: number) {
    for (const enemy of this.enemies) { const active = Vector3.DistanceSquared(enemy.body.position, this.player.position) < 300 ** 2; enemy.setActive(active); if (active) enemy.update(dt); else enemy.ageMemory(dt); }
    this.communicationTimer-=dt;
    if(this.communicationTimer<=0) {
      this.communicationTimer=.9;
      // Only direct visual contact produces a radio report; hearsay cannot keep a squad alerted forever.
      for(const source of this.enemies) if(source.body.isEnabled()&&source.hasVisualContact) {
        for(const ally of this.enemies) if(ally!==source&&!ally.hasVisualContact&&this.squads.get(ally.id)===this.squads.get(source.id)&&Vector3.DistanceSquared(source.body.position,ally.body.position)<95**2) ally.alert(source.knownTarget);
      }
    }
  }
  noise(position: Vector3) { for (const enemy of this.enemies) if (Vector3.Distance(position, enemy.body.position) < enemyConfig.hearingRadius) enemy.alert(position); }
  reset() { this.communicationTimer=0;this.enemies.forEach(e => e.reset()); }
}
