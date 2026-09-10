import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Scene } from '@babylonjs/core/scene';
import { AssetManager } from '../core/AssetManager';
import { CharacterAnimator } from '../core/CharacterAnimator';
import { assets, guardCharacterModels } from '../data/assets';
import { enemyConfig } from '../data/enemies';
import { difficulties, type Difficulty } from '../data/difficulty';
import type { EnemyState } from '../data/contracts';
import { HealthComponent } from '../systems/HealthComponent';
import { DamageSystem } from '../combat/DamageSystem';
import { CombatEffects } from '../combat/CombatEffects';
import { CombatAudio } from '../combat/CombatAudio';
import { Player } from '../player/Player';
import { chooseAvoidanceHeading, searchOffset } from './EnemyNavigation';
import { moveWithWorldCollisions, pickCollision } from '../world/CollisionQueries';

export class Enemy {
  readonly health: HealthComponent;
  readonly body: Mesh;
  state: EnemyState = 'PATROL';
  private visual: TransformNode;
  private animator?: CharacterAnimator;
  private perception = 0;
  private fireTimer: number;
  private lastSeen = Vector3.Zero();
  private memory = 0;
  private visible = false;
  private patrol = 0;
  private hitTime = 0;
  private shotTime = 0;
  private weapon?: TransformNode;
  private searchTime = 0;
  private avoidanceTime = 0;
  private avoidanceDirection = Vector3.Zero();
  private avoidanceSide = 1;
  private personality = 0;
  private stuckTime = 0;
  private difficulty: Difficulty;
  get hasVisualContact() { return this.visible && !this.health.dead; }
  get knownTarget() { return this.lastSeen.clone(); }
  get spawnPoint() { return this.spawn.clone(); }
  constructor(readonly id: string, private scene: Scene, private spawn: Vector3, private player: Player, private damage: DamageSystem, private effects: CombatEffects, private audio: CombatAudio, difficulty: Difficulty = 'medium') {
    this.difficulty = difficulty;
    this.health = new HealthComponent(difficulties[difficulty].enemyHealth);
    this.body = MeshBuilder.CreateBox(`${id}-hitbox`, { width: 0.85, height: 1.9, depth: 0.85 }, scene);
    this.body.position.copyFrom(spawn); this.body.ellipsoid.set(0.4, 0.95, 0.4); this.body.visibility = 0; this.body.metadata = { damageId: id };
    this.visual = new TransformNode(`${id}-visual`, scene); this.visual.parent = this.body; this.visual.position.y = -0.95;
    this.fireTimer = 0.5 + Math.random();
    this.personality = Array.from(id).reduce((sum,char) => sum+char.charCodeAt(0),0);
    this.avoidanceSide = this.personality%2 ? 1 : -1;
    damage.register({ id, health: this.health, position: this.body.position, faction: 'enemy', radius: 0.7 });
    this.health.onDamage = () => { this.hitTime = 0.25; this.alert(player.position); };
    this.health.onDeath = () => { this.animator?.die(); this.body.metadata = null; this.weapon?.setEnabled(false); };
  }
  setDifficulty(difficulty: Difficulty) {
    this.difficulty = difficulty;
    this.health.setMaximum(difficulties[difficulty].enemyHealth);
  }
  relocateSpawn(position: Vector3) { this.spawn.copyFrom(position); this.body.position.copyFrom(position); this.body.computeWorldMatrix(true); }
  async load(manager: AssetManager) {
    const model = await manager.instantiate(guardCharacterModels[this.personality % guardCharacterModels.length], this.id); model.root.parent = this.visual;
    this.animator = new CharacterAnimator(model.entries?.animationGroups ?? [], this.scene);
    const weapon = await manager.instantiate(assets.weapons.rifle, `${this.id}-rifle`); weapon.root.parent = this.visual; weapon.root.rotation.y = Math.PI; weapon.root.position.set(0.28, 1.2, 0.84); this.weapon = weapon.root;
    const vest = MeshBuilder.CreateBox(`${this.id}-vest`, { width: 0.54, height: 0.48, depth: 0.38 }, this.scene);
    vest.parent = this.visual; vest.position.y = 1.18; vest.isPickable = false;
    const material = new StandardMaterial(`${this.id}-faction`, this.scene); material.diffuseColor = Color3.FromHexString('#bd573b'); material.specularColor = Color3.Black(); vest.material = material;
    const torso = model.root.getDescendants().find(node => node.name.endsWith(':torso')) as TransformNode | undefined;
    if (torso) { torso.computeWorldMatrix(true); vest.computeWorldMatrix(true); vest.setParent(torso); }
  }
  alert(position: Vector3) {
    if (this.health.dead) return;
    if(Vector3.DistanceSquared(this.lastSeen,position)>4) this.searchTime=0;
    this.lastSeen.copyFrom(position); this.memory = enemyConfig.searchDuration;
    if(!this.visible) this.state = 'ALERT';
    this.perception=Math.min(this.perception,.05);
  }
  setActive(active: boolean) { if (this.body.isEnabled() === active) return; this.body.setEnabled(active); if (!active && !this.health.dead) this.animator?.suspend(); }
  ageMemory(dt: number) {
    this.visible=false;this.memory=Math.max(0,this.memory-dt);
    if(!this.health.dead&&this.memory<=0) this.state=Vector3.DistanceSquared(this.body.position,this.spawn)>100?'RETURN':'PATROL';
  }
  update(dt: number) {
    if (this.health.dead) return;
    this.perception -= dt; this.fireTimer -= dt; this.hitTime = Math.max(0, this.hitTime - dt); this.shotTime = Math.max(0, this.shotTime - dt); this.memory = Math.max(0, this.memory - dt);
    const toPlayer = this.player.position.subtract(this.body.position), distance = toPlayer.length();
    if (this.perception <= 0) {
      this.perception = 0.18 + Math.random() * 0.08;
      const facing = Vector3.Dot(toPlayer.normalizeToNew(), new Vector3(Math.sin(this.visual.rotation.y), 0, Math.cos(this.visual.rotation.y)));
      this.visible = !this.player.dead && distance < enemyConfig.viewDistance && (facing > 0.1 || this.memory > 0 || distance < 12);
      if (this.visible) {
        const eye = this.body.position.add(new Vector3(0, 0.6, 0));
        const rayDirection = this.player.position.subtract(eye);
        const hit = pickCollision(this.scene, new Ray(eye, rayDirection.normalizeToNew(), rayDirection.length()));
        if (hit?.hit && hit.distance < rayDirection.length() - 0.5) this.visible = false;
      }
      if (this.visible) { this.lastSeen.copyFrom(this.player.position); this.memory = enemyConfig.searchDuration; this.state = 'COMBAT'; this.searchTime=0; }
      else if (this.memory > 0) this.state = 'SEARCH'; else this.state = Vector3.Distance(this.body.position, this.spawn) > 10 ? 'RETURN' : 'PATROL';
    }
    const direction = Vector3.Zero(); let moving = false;
    if (this.state === 'COMBAT') {
      direction.copyFrom(toPlayer); direction.y = 0;
      if (distance > 24) moving = true;
      else if (distance < 10) {direction.scaleInPlace(-1);moving=true;}
      else if(this.hitTime>0) {const x=direction.x;direction.x=direction.z*this.avoidanceSide;direction.z=-x*this.avoidanceSide;moving=true;}
      if (this.fireTimer <= 0 && this.visible) { this.fireTimer = enemyConfig.fireInterval + Math.random() * 0.5; this.shoot(distance); }
    } else if (this.state === 'SEARCH' || this.state === 'ALERT' || this.state === 'RETURN') {
      let target=this.state==='RETURN'?this.spawn:this.lastSeen;
      if(this.state==='SEARCH'&&Vector3.DistanceSquared(this.body.position,this.lastSeen)<13**2) {
        this.searchTime+=dt;
        const offset=searchOffset(this.personality,this.searchTime);target=this.lastSeen.add(new Vector3(offset.x,0,offset.z));
      }
      direction.copyFrom(target.subtract(this.body.position)); direction.y = 0; moving = direction.length() > 1.5;
    } else {
      this.patrol += dt * 0.35; const target = this.spawn.add(new Vector3(Math.sin(this.patrol) * 4, 0, Math.cos(this.patrol) * 3));
      direction.copyFrom(target.subtract(this.body.position)); direction.y = 0; moving = direction.length() > 0.5;
    }
    const wantsToMove=moving;
    if(moving&&direction.lengthSquared()>.01) {
      this.avoidanceTime-=dt;
      if(this.avoidanceTime<=0) {
        this.avoidanceTime=.22;
        const heading=chooseAvoidanceHeading(direction, candidate=>{
          const ray=new Ray(this.body.position.add(new Vector3(0,-.15,0)),new Vector3(candidate.x,0,candidate.z),4);
          const hit=pickCollision(this.scene,ray,this.body);
          return hit?.hit?Math.max(0,hit.distance-.6):4;
        },this.avoidanceSide);
        this.avoidanceDirection.set(heading.x,0,heading.z);
      }
      direction.copyFrom(this.avoidanceDirection);
      moving=direction.lengthSquared()>.01;
    }
    if (direction.lengthSquared() > 0.01) {
      direction.normalize();
      const facing=this.state==='COMBAT'?toPlayer:direction;
      const target = Math.atan2(facing.x, facing.z);
      const angle = Math.atan2(Math.sin(target - this.visual.rotation.y), Math.cos(target - this.visual.rotation.y)); this.visual.rotation.y += angle * (1 - Math.exp(-9 * dt));
    }
    const previousX=this.body.position.x,previousZ=this.body.position.z;
    this.body.computeWorldMatrix(true);
    moveWithWorldCollisions(this.body, new Vector3(moving && !this.hitTime ? direction.x * enemyConfig.speed * dt : 0, -4 * dt, moving && !this.hitTime ? direction.z * enemyConfig.speed * dt : 0));
    const moved=Math.hypot(this.body.position.x-previousX,this.body.position.z-previousZ);
    if(wantsToMove&&!this.hitTime&&moved<enemyConfig.speed*dt*.08) this.stuckTime+=dt; else this.stuckTime=0;
    if(this.stuckTime>=2.5) this.recoverFromStuck();
    this.visual.rotation.z = Math.sin(this.hitTime * 65) * this.hitTime * 0.4;
    if (this.weapon) this.weapon.position.z = 0.84 - this.shotTime * 0.35;
    this.animator?.update(dt, moving ? 'walk' : 'idle', this.shotTime > 0 ? 'holding-both-shoot' : 'holding-both');
  }
  private shoot(distance: number) {
    const settings = difficulties[this.difficulty];
    const origin = this.body.position.add(new Vector3(0, 0.35, 0));
    const forward = this.player.position.subtract(origin).normalize();
    const right = Vector3.Cross(Math.abs(forward.y) > 0.95 ? Vector3.Forward() : Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();
    const spread = distance * settings.enemyAimSpread;
    const aim = this.player.position
      .add(right.scale((Math.random() - 0.5) * spread))
      .addInPlace(up.scale((Math.random() - 0.5) * spread * 0.6));
    const direction = aim.subtract(origin).normalize();
    const hit = this.scene.pickWithRay(new Ray(origin, direction, enemyConfig.viewDistance), m => m.checkCollisions || (m.metadata?.damageId === 'player'));
    const end = hit?.pickedPoint ?? origin.add(direction.scale(enemyConfig.viewDistance));
    this.effects.trace(origin, end, true); this.effects.muzzle(origin, direction); this.audio.play('shot', distance); this.shotTime = 0.18;
    if (hit?.pickedMesh?.metadata?.damageId === 'player') this.damage.hit('player', settings.enemyDamage, this.id);
  }
  private recoverFromStuck() {
    this.body.position.copyFrom(this.spawn);this.body.computeWorldMatrix(true);
    this.state='PATROL';this.memory=this.searchTime=this.avoidanceTime=this.stuckTime=0;this.visible=false;this.avoidanceDirection.setAll(0);
  }
  restoreDefeated() {
    this.health.current = 0; this.animator?.die(); this.body.metadata = null; this.weapon?.setEnabled(false);
  }
  reset() {
    this.health.reset(); this.animator?.reset(); this.body.position.copyFrom(this.spawn); this.body.metadata = { damageId: this.id }; this.weapon?.setEnabled(true);
    this.visual.rotation.setAll(0); this.visual.rotation.y = Math.PI; this.memory = 0; this.visible = false; this.state = 'PATROL'; this.fireTimer = 1;
    this.hitTime = this.shotTime = this.perception = this.patrol = 0;
    this.searchTime=this.avoidanceTime=this.stuckTime=0;this.avoidanceDirection.setAll(0);
    if (this.weapon) this.weapon.position.z = 0.84;
  }
}
