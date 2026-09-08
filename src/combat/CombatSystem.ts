import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AssetManager } from '../core/AssetManager';
import { InputManager } from '../core/InputManager';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { Player } from '../player/Player';
import { WorldManager } from '../world/WorldManager';
import { HealthComponent } from '../systems/HealthComponent';
import { DestructibleComponent } from '../systems/DestructibleComponent';
import { EnemyManager } from '../ai/EnemyManager';
import { DamageSystem } from './DamageSystem';
import { CombatEffects } from './CombatEffects';
import { CombatAudio } from './CombatAudio';
import { ExplosionSystem } from './ExplosionSystem';
import { ProjectileManager } from './ProjectileManager';
import { WeaponManager } from './WeaponManager';
import { BaseManager } from '../world/BaseManager';
import { LivingWorld } from '../world/LivingWorld';
import type { CombatSaveState } from '../core/SaveGame';

/** Wires combat modules; damage, ballistics, AI and visual effects keep separate ownership. */
export class CombatSystem {
  readonly health = new HealthComponent(100);
  readonly damage = new DamageSystem();
  readonly audio = new CombatAudio();
  readonly effects: CombatEffects;
  readonly explosions: ExplosionSystem;
  readonly projectiles: ProjectileManager;
  readonly weapons: WeaponManager;
  readonly enemies: EnemyManager;
  readonly tanks: DestructibleComponent[] = [];
  score = 0;
  hitFlash = 0;
  killFlash = false;
  hurtFlash = 0;
  readonly bases = new BaseManager();
  readonly living: LivingWorld;
  get liberated() { return this.bases.complete; }
  private immunity = 3;
  private sinceDamage = 0;
  private deathTime = 0;
  onMessage: (message: string) => void = () => {};
  onRespawn: () => void = () => {};
  onDeath: () => void = () => {};
  get destroyed() { return this.tanks.filter(t => t.health.dead).length; }
  get heat() { const n = this.enemies.alertCount; return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3; }
  get nearSupply() { return Vector3.Distance(this.player.position, this.world.supply) < 6 || (this.world.supplies??[]).some(s=>this.bases.states.some(b=>b.definition.id===s.baseId&&b.liberated)&&Vector3.Distance(this.player.position,Vector3.FromArray(s.position))<6); }
  get nearResident() { return !!this.living.nearby(this.player.position); }
  constructor(private scene: Scene, private player: Player, private input: InputManager, camera: ThirdPersonCamera, private world: WorldManager) {
    this.living = new LivingWorld(world);
    this.bases.onLiberated = base => { this.score+=1000; this.world.setBaseLiberated(base.id,true); this.living.liberate(base.id); this.onMessage(`${base.name.toUpperCase()} BEFREIT · +1.000 Punkte · Nachschub verfügbar`); };
    this.effects = new CombatEffects(scene);
    this.explosions = new ExplosionSystem(scene, this.damage, this.effects, this.audio, player.position);
    this.projectiles = new ProjectileManager(scene, this.explosions, this.effects);
    this.weapons = new WeaponManager(scene, player, input, camera, this.damage, this.projectiles, this.effects, this.audio);
    this.enemies = new EnemyManager(scene, player, this.damage, this.effects, this.audio);
    this.damage.register({ id: 'player', health: this.health, position: player.position, faction: 'player', radius: 0.7, canDamage: () => this.immunity <= 0 });
    this.health.onDamage = () => { this.sinceDamage = 0; this.hurtFlash = 0.35; camera.blast(0.13); };
    this.health.onDeath = () => { player.dead = true; player.velocity.setAll(0); this.deathTime = 2; this.onDeath(); this.onMessage('Ausgeschaltet. Rückkehr zum Aussichtspunkt …'); };
    this.weapons.onShot = position => { this.enemies.noise(position); this.living.noise(position); };
    this.weapons.onHit = kill => { this.hitFlash = 0.15; this.killFlash = kill; };
    this.explosions.onBlast = blast => {
      this.enemies.noise(blast.position);
      this.living.noise(blast.position);
      const distance = Vector3.Distance(player.position, blast.position); camera.blast(Math.max(0, 0.5 - distance / 100));
      if (distance < blast.radius && !player.dead) player.velocity.addInPlace(player.position.subtract(blast.position).normalize().scale(12 * (1 - distance / blast.radius)));
    };
    this.damage.onHit = (target, source) => {
      if (target.faction !== 'player' && target.health.dead) { this.score += target.faction === 'enemy' ? 100 : 250; this.hitFlash = 0.3; this.killFlash = true; }
      if (source === 'player') this.enemies.noise(player.position);
    };
  }
  async load(manager: AssetManager) {
    for (const object of this.world.destructibles) this.tanks.push(new DestructibleComponent(this.scene, object, this.damage, this.explosions));
    await Promise.all([this.weapons.load(manager), this.enemies.load(manager), this.living.load(manager)]);
  }
  update(dt: number) {
    this.immunity = Math.max(0, this.immunity - dt); this.hitFlash = Math.max(0, this.hitFlash - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.sinceDamage += dt;
    if (this.player.dead) { this.deathTime -= dt; if (this.deathTime <= 0) { this.revive(); this.onRespawn(); } }
    else {
      this.weapons.update(dt);
      if (this.sinceDamage > 7) this.health.heal(dt * 8);
      if (this.input.take('interact')) {
        if(this.nearSupply) { this.weapons.reset(); this.health.heal(100); this.onMessage('Nachschub am SUV · Munition und Gesundheit aufgefüllt.'); }
        else { const dialogue=this.living.talk(this.player.position); if(dialogue) this.onMessage(dialogue); }
      }
    }
    this.enemies.update(dt); this.projectiles.update(dt); this.explosions.update(); this.effects.update(dt); this.tanks.forEach(t => t.update(dt));
    this.bases.update(dt,this.player.position,!this.player.dead,id=>this.damage.targets.get(id)?.health.dead??false);
    this.living.update(dt,this.player.position);
  }
  revive() { this.health.reset(); this.player.revive(); this.weapons.reset(); this.immunity = 3; this.sinceDamage = 0; this.hurtFlash = 0; }
  saveState(): CombatSaveState {
    return {
      score: this.score, health: this.health.current, weapons: this.weapons.saveState(), selectedBase: this.bases.selected,
      liberatedBaseIds: this.bases.states.filter(base => base.liberated).map(base => base.definition.id),
      defeatedEnemyIds: this.enemies.enemies.filter(enemy => enemy.health.dead).map(enemy => enemy.id),
      destroyedTankIds: this.tanks.filter(tank => tank.health.dead).map(tank => tank.object.id),
    };
  }
  restore(state: CombatSaveState) {
    this.reset(); this.score = Math.max(0, Math.floor(state.score));
    this.health.current = state.health > 0 ? Math.min(this.health.max, state.health) : this.health.max;
    this.weapons.restore(state.weapons);
    const defeated = new Set(state.defeatedEnemyIds), destroyed = new Set(state.destroyedTankIds);
    this.enemies.enemies.forEach(enemy => { if (defeated.has(enemy.id)) enemy.restoreDefeated(); });
    this.tanks.forEach(tank => { if (destroyed.has(tank.object.id)) tank.restoreDestroyed(); });
    this.bases.restore(state.selectedBase, state.liberatedBaseIds);
    for (const base of this.bases.states) if (base.liberated) {
      this.world.setBaseLiberated(base.definition.id, true); this.living.liberate(base.definition.id);
    }
  }
  reset() {
    this.revive(); this.enemies.reset(); this.tanks.forEach(t => t.reset()); this.explosions.reset(); this.projectiles.reset(); this.effects.reset();
    this.score = 0; this.bases.reset(); this.living.reset();
    for(const base of this.bases.states) this.world.setBaseLiberated(base.definition.id,false);
  }
  dispose() { this.audio.dispose(); }
}
