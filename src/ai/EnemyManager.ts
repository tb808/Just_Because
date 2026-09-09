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
import type { Difficulty } from '../data/difficulty';
import { findOpenGuardPosition, type NavigationObstacle } from './EnemyNavigation';

export class EnemyManager {
  readonly enemies: Enemy[];
  private communicationTimer = 0;
  private squads = new Map<string, string>();
  difficulty: Difficulty;
  get defeated() { return this.enemies.filter(e => e.health.dead).length; }
  get alertCount() { return this.enemies.filter(e => e.body.isEnabled() && !e.health.dead && (e.state === 'COMBAT' || e.state === 'SEARCH' || e.state === 'ALERT')).length; }
  constructor(private scene: Scene, private player: Player, damage: DamageSystem, effects: CombatEffects, audio: CombatAudio, difficulty: Difficulty = 'medium') {
    this.difficulty = difficulty;
    this.enemies = bases.flatMap(base => base.guards.map(({id,x,z}) => {this.squads.set(id,base.id);return new Enemy(id, scene, new Vector3(x, terrainHeight(x,z)+1.18, z), player, damage, effects, audio, difficulty);}));
  }
  setDifficulty(difficulty: Difficulty) { this.difficulty = difficulty; this.enemies.forEach(enemy => enemy.setDifficulty(difficulty)); }
  async load(assets: AssetManager) {
    const obstacles=this.navigationObstacles();
    for(const enemy of this.enemies) {
      const base=bases.find(candidate=>candidate.id===this.squads.get(enemy.id));
      if(!base) continue;
      const safe=findOpenGuardPosition(enemy.spawnPoint,{x:base.center[0],z:base.center[2]},obstacles,terrainHeight);
      enemy.relocateSpawn(new Vector3(safe.x,safe.y,safe.z));
    }
    await Promise.all(this.enemies.map(e => e.load(assets))); this.reset();
  }
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
  private navigationObstacles() {
    const obstacles:NavigationObstacle[]=[];
    for(const mesh of this.scene.meshes) {
      if(!mesh.checkCollisions) continue;
      mesh.computeWorldMatrix(true);
      const box=mesh.getBoundingInfo().boundingBox,{minimumWorld:min,maximumWorld:max}=box;
      const bounds:NavigationObstacle[]=mesh.metadata?.navigationObstacles??[{minX:min.x,maxX:max.x,minZ:min.z,maxZ:max.z,minY:min.y,maxY:max.y}];
      for(const obstacle of bounds) if(obstacle.maxY-obstacle.minY>=.9&&obstacle.maxX-obstacle.minX<=200&&obstacle.maxZ-obstacle.minZ<=200) obstacles.push(obstacle);
    }
    return obstacles;
  }
}
