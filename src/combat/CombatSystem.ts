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
  liberated = false;
  private immunity = 3;
  private sinceDamage = 0;
  private deathTime = 0;
  onMessage: (message: string) => void = () => {};
  onRespawn: () => void = () => {};
  onDeath: () => void = () => {};
  get destroyed() { return this.tanks.filter(t => t.health.dead).length; }
  get heat() { const n = this.enemies.alertCount; return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : 3; }
  get nearSupply() { return Vector3.Distance(this.player.position, this.world.supply) < 6; }
  constructor(private scene: Scene, private player: Player, private input: InputManager, camera: ThirdPersonCamera, private world: WorldManager) {
    this.effects = new CombatEffects(scene);
    this.explosions = new ExplosionSystem(scene, this.damage, this.effects, this.audio, player.position);
    this.projectiles = new ProjectileManager(scene, this.explosions, this.effects);
    this.weapons = new WeaponManager(scene, player, input, camera, this.damage, this.projectiles, this.effects, this.audio);
    this.enemies = new EnemyManager(scene, player, this.damage, this.effects, this.audio);
    this.damage.register({ id: 'player', health: this.health, position: player.position, faction: 'player', radius: 0.7, canDamage: () => this.immunity <= 0 });
    this.health.onDamage = () => { this.sinceDamage = 0; this.hurtFlash = 0.35; camera.blast(0.13); };
    this.health.onDeath = () => { player.dead = true; player.velocity.setAll(0); this.deathTime = 2; this.onDeath(); this.onMessage('Ausgeschaltet. Rückkehr zum Aussichtspunkt …'); };
    this.weapons.onShot = position => this.enemies.noise(position);
    this.weapons.onHit = kill => { this.hitFlash = 0.15; this.killFlash = kill; };
    this.explosions.onBlast = blast => {
      this.enemies.noise(blast.position);
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
    await Promise.all([this.weapons.load(manager), this.enemies.load(manager)]);
  }
  update(dt: number) {
    this.immunity = Math.max(0, this.immunity - dt); this.hitFlash = Math.max(0, this.hitFlash - dt); this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.sinceDamage += dt;
    if (this.player.dead) { this.deathTime -= dt; if (this.deathTime <= 0) { this.revive(); this.onRespawn(); } }
    else {
      this.weapons.update(dt);
      if (this.sinceDamage > 7) this.health.heal(dt * 8);
      if (this.input.take('interact') && this.nearSupply) { this.weapons.reset(); this.health.heal(100); this.onMessage('Nachschub am SUV · Munition und Gesundheit aufgefüllt.'); }
    }
    this.enemies.update(dt); this.projectiles.update(dt); this.explosions.update(); this.effects.update(dt); this.tanks.forEach(t => t.update(dt));
    if (!this.liberated && this.destroyed === 3 && this.enemies.defeated === this.enemies.enemies.length) {
      this.liberated = true; this.score += 1000; this.onMessage('RELAIS ORBIS GESICHERT · +1.000 Punkte. Gut gemacht, Nika.');
    }
  }
  revive() { this.health.reset(); this.player.revive(); this.weapons.reset(); this.immunity = 3; this.sinceDamage = 0; this.hurtFlash = 0; }
  reset() {
    this.revive(); this.enemies.reset(); this.tanks.forEach(t => t.reset()); this.explosions.reset(); this.projectiles.reset(); this.effects.reset();
    this.score = 0; this.liberated = false;
  }
  dispose() { this.audio.dispose(); }
}
