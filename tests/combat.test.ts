import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, Vector3, MeshBuilder, TransformNode, Ray, Animation, AnimationGroup } from '@babylonjs/core';
import { HealthComponent } from '../src/systems/HealthComponent';
import { Weapon } from '../src/combat/Weapon';
import { weapons } from '../src/data/weapons';
import { DamageSystem } from '../src/combat/DamageSystem';
import { ExplosionSystem, radialDamage } from '../src/combat/ExplosionSystem';
import { ProjectileManager } from '../src/combat/ProjectileManager';
import { DestructibleComponent } from '../src/systems/DestructibleComponent';
import type { CombatEffects } from '../src/combat/CombatEffects';
import type { CombatAudio } from '../src/combat/CombatAudio';
import { Enemy } from '../src/ai/Enemy';
import { Player } from '../src/player/Player';
import { WeaponManager } from '../src/combat/WeaponManager';
import type { InputManager } from '../src/core/InputManager';
import type { ThirdPersonCamera } from '../src/camera/ThirdPersonCamera';
import { CharacterAnimator } from '../src/core/CharacterAnimator';
import { CombatSystem } from '../src/combat/CombatSystem';
import type { WorldManager } from '../src/world/WorldManager';
import { bases, captureDuration } from '../src/data/bases';
import { difficulties } from '../src/data/difficulty';

test('complete operation awards once, respawns the player, and resets all objectives', () => {
  const engine = new NullEngine(), scene = new Scene(engine), player = new Player(scene);
  const input = { take: () => false, down: () => false, aiming: false } as unknown as InputManager;
  const camera = { yaw: 0, pitch: 0, blast() {} } as unknown as ThirdPersonCamera;
  const world = { supply: new Vector3(1000, 0, 0), flags: new Map(), setBaseLiberated() {} } as unknown as WorldManager;
  const combat = new CombatSystem(scene, player, input, camera, world);
  for (const base of bases) for (const tank of base.tanks) {
    const root = new TransformNode(tank.id, scene); root.position.set(tank.x,base.center[1],tank.z);
    const collider = MeshBuilder.CreateBox(`${tank.id}-collider`, { size: 3 }, scene); collider.position.copyFrom(root.position).addInPlace(new Vector3(0,3,0)); collider.checkCollisions = true; collider.metadata = { damageId: tank.id }; collider.computeWorldMatrix(true);
    combat.tanks.push(new DestructibleComponent(scene, { id: tank.id, root, collider }, combat.damage, combat.explosions));
  }
  for (const enemy of combat.enemies.enemies) combat.damage.hit(enemy.id, 100, 'player');
  for(const tank of combat.tanks) combat.damage.hit(tank.object.id,100,'player');
  combat.update(.016); combat.update(.016); combat.update(.016);
  assert.equal(combat.liberated,false);
  for(const base of bases) { player.position.copyFrom(Vector3.FromArray(base.flag)); combat.update(captureDuration); }
  const expectedReward = bases.reduce((total, base) => total + 1000 + base.guards.length * 100 + base.tanks.length * 250, 0);
  assert.ok(combat.liberated); assert.equal(combat.score, expectedReward); combat.update(0.016); assert.equal(combat.score, expectedReward);
  let respawns = 0; combat.onRespawn = () => respawns++;
  combat.update(3.1); combat.damage.hit('player', 100, 'enemy-0'); assert.ok(player.dead);
  combat.update(2.1); assert.equal(player.dead, false); assert.equal(combat.health.current, 100); assert.equal(respawns, 1);
  combat.reset(); assert.equal(combat.score, 0); assert.equal(combat.liberated, false); assert.equal(combat.destroyed, 0); assert.equal(combat.enemies.defeated, 0);
  combat.dispose(); scene.dispose(); engine.dispose();
});

test('a brief fire press shoots once and a wall blocks subsequent rifle damage', () => {
  const engine = new NullEngine(), scene = new Scene(engine), player = new Player(scene), damage = new DamageSystem();
  player.position.set(0, 1, 0); player.state = 'ON_FOOT';
  const pressed = new Set(['fire']);
  const input = { take: (action: string) => pressed.delete(action), down: () => false, firing: false, aiming: true } as unknown as InputManager;
  const camera = { aimRay: (length: number) => new Ray(new Vector3(0, 1.35, -1), Vector3.Forward(), length), heading: Vector3.Forward(), yaw: 0, pitch: 0, kick() {} } as unknown as ThirdPersonCamera;
  const health = new HealthComponent(100), target = MeshBuilder.CreateBox('guard', { size: 2 }, scene);
  target.position.set(0, 1.35, 10); target.metadata = { damageId: 'enemy-test' }; target.computeWorldMatrix(true);
  damage.register({ id: 'enemy-test', position: target.position, health, faction: 'enemy', radius: 1 });
  const explosions = new ExplosionSystem(scene, damage, effects, audio, player.position);
  const manager = new WeaponManager(scene, player, input, camera, damage, new ProjectileManager(scene, explosions, effects), effects, audio);
  manager.update(1 / 60); manager.update(0.2);
  assert.equal(health.current, 73); assert.equal(manager.current.ammo, 29);
  const wall = MeshBuilder.CreateBox('cover', { width: 5, height: 8, depth: 0.2 }, scene);
  wall.position.z = 5; wall.checkCollisions = true; wall.computeWorldMatrix(true);
  pressed.add('fire'); manager.update(0.2); assert.equal(health.current, 73); assert.equal(manager.current.ammo, 28);
  wall.dispose(); pressed.add('fire'); manager.update(0.2); assert.equal(health.current, 46);
  scene.dispose(); engine.dispose();
});

test('guards need line of sight to shoot the player', () => {
  const engine = new NullEngine(), scene = new Scene(engine), player = new Player(scene), damage = new DamageSystem();
  scene.collisionsEnabled = true; player.position.set(0, 0.95, 0); player.body.computeWorldMatrix(true);
  const floor = MeshBuilder.CreateGround('floor', { width: 100, height: 100 }, scene); floor.checkCollisions = true; floor.computeWorldMatrix(true);
  const wall = MeshBuilder.CreateBox('wall', { width: 100, height: 20, depth: 0.5 }, scene); wall.position.set(0, 5, 5); wall.checkCollisions = true; wall.computeWorldMatrix(true);
  const health = new HealthComponent(100); damage.register({ id: 'player', health, position: player.position, radius: 0.7, faction: 'player' });
  const guard = new Enemy('enemy-test', scene, new Vector3(0, 0.95, 10), player, damage, effects, audio);
  guard.alert(player.position); for (let i = 0; i < 30; i++) guard.update(0.1);
  assert.equal(health.current, 100);
  wall.dispose(); guard.alert(player.position); for (let i = 0; i < 30; i++) guard.update(0.1);
  assert.ok(health.current < 100); scene.dispose(); engine.dispose();
});

test('shooting arm layer excludes competing walking tracks and death stops locomotion', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  const arm = new TransformNode('guard:arm-right', scene), leg = new TransformNode('guard:leg-right', scene);
  const track = new Animation('rotate', 'rotation.x', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE); track.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 1 }]);
  const walk = new AnimationGroup('guard:walk', scene); walk.addTargetedAnimation(track, arm); walk.addTargetedAnimation(track, leg);
  const shoot = new AnimationGroup('guard:holding-both-shoot', scene); shoot.addTargetedAnimation(track, arm);
  const die = new AnimationGroup('guard:die', scene); die.addTargetedAnimation(track, leg);
  const animator = new CharacterAnimator([walk, shoot, die], scene); animator.update(0.1, 'walk', 'holding-both-shoot');
  const lower = scene.animationGroups.find(g => g.name === 'lower:walk:holding-both-shoot')!;
  assert.deepEqual(lower.targetedAnimations.map(t => t.target), [leg]); assert.ok(lower.isPlaying);
  animator.die(); assert.equal(lower.isPlaying, false); assert.ok(die.isPlaying);
  animator.reset(); animator.update(0.1, 'walk', 'holding-both-shoot'); assert.ok(lower.isPlaying);
  scene.dispose(); engine.dispose();
});

const effects = { explosion() {}, smoke() {}, muzzle() {}, trace() {}, impact() {} } as unknown as CombatEffects;
const audio = { play() {} } as unknown as CombatAudio;
test('health clamps damage and emits death exactly once', () => {
  const health = new HealthComponent(100); let deaths = 0; health.onDeath = () => deaths++;
  assert.equal(health.damage(-10), 0); assert.equal(health.damage(NaN), 0);
  health.damage(40); assert.equal(health.current, 60); health.damage(90); health.damage(90);
  assert.equal(health.current, 0); assert.equal(deaths, 1); health.reset(); assert.equal(health.current, 100);
});
test('weapon enforces cooldown, magazine and reserve accounting', () => {
  const rifle = new Weapon(weapons.rifle); assert.equal(rifle.fire(), true); assert.equal(rifle.fire(), false);
  rifle.update(1); assert.equal(rifle.fire(), true); assert.equal(rifle.ammo, 28);
  rifle.reserve = 1; assert.equal(rifle.reload(), true); assert.equal(rifle.fire(), false);
  rifle.update(weapons.rifle.reloadTime + 0.001); assert.equal(rifle.ammo, 29); assert.equal(rifle.reserve, 0); assert.equal(rifle.reload(), false);
});
test('rocket magazine can fire only once until reloaded', () => {
  const launcher = new Weapon(weapons.launcher); launcher.fire(); launcher.update(2); assert.equal(launcher.fire(), false);
  launcher.reload(); launcher.update(2.3); assert.equal(launcher.ammo, 1); assert.equal(launcher.reserve, 11);
});
test('friendly-fire filtering and respawn immunity reject damage', () => {
  const damage = new DamageSystem(), hp = new HealthComponent(100);
  damage.register({ id: 'enemy-a', health: hp, position: Vector3.Zero(), faction: 'enemy', radius: 1 });
  assert.equal(damage.hit('enemy-a', 10, 'enemy-b'), false);
  assert.equal(damage.hit('enemy-a', 10, 'player'), true);
  damage.register({ id: 'player', health: hp, position: Vector3.Zero(), faction: 'player', radius: 1, canDamage: () => false });
  assert.equal(damage.hit('player', 100, 'enemy-a'), false); assert.equal(hp.current, 90);
});
test('one tank detonation chains through three tanks and can reset', () => {
  const engine = new NullEngine(), scene = new Scene(engine), damage = new DamageSystem();
  const explosions = new ExplosionSystem(scene, damage, effects, audio, Vector3.Zero()); let blasts = 0; explosions.onBlast = () => blasts++;
  const tanks = [0, 9, 18].map((x, i) => {
    const root = new TransformNode(`tank-${i}`, scene); root.position.set(x, 0, 0);
    const collider = MeshBuilder.CreateBox(`tank-${i}-collider`, { size: 3 }, scene); collider.position.set(x, 3, 0); collider.checkCollisions = true; collider.metadata = { damageId: `fuel-${i}` }; collider.computeWorldMatrix(true);
    return new DestructibleComponent(scene, { id: `fuel-${i}`, root, collider }, damage, explosions);
  });
  damage.hit('fuel-0', 100, 'player'); explosions.update(); explosions.update();
  assert.ok(tanks.every(t => t.health.dead)); assert.equal(blasts, 3);
  explosions.update(); assert.equal(blasts, 3); tanks.forEach(t => t.reset()); assert.ok(tanks.every(t => !t.health.dead && t.object.collider.isEnabled()));
  scene.dispose(); engine.dispose();
});
test('rocket collision sweeps its full path and does not tunnel', () => {
  const engine = new NullEngine(), scene = new Scene(engine), damage = new DamageSystem();
  const explosions = new ExplosionSystem(scene, damage, effects, audio, Vector3.Zero()); let position: Vector3 | undefined;
  explosions.onBlast = blast => position = blast.position;
  const wall = MeshBuilder.CreateBox('thin-wall', { width: 10, height: 10, depth: 0.1 }, scene); wall.position.z = 5; wall.checkCollisions = true; wall.computeWorldMatrix(true);
  const projectiles = new ProjectileManager(scene, explosions, effects); projectiles.launch(Vector3.Zero(), new Vector3(0, 0, 200), 100, 8, 200);
  projectiles.update(0.1); explosions.update(); assert.ok(position); assert.ok(Math.abs(position.z - 4.95) < 0.1);
  projectiles.update(0.1); projectiles.reset(); scene.dispose(); engine.dispose();
});
test('building cover reduces blast damage', () => {
  const engine = new NullEngine(), scene = new Scene(engine), damage = new DamageSystem();
  const health = new HealthComponent(100); damage.register({ id: 'player', health, position: new Vector3(0, 2, 8), faction: 'player', radius: 0.5 });
  const wall = MeshBuilder.CreateBox('cover', { width: 10, height: 10, depth: 1 }, scene); wall.position.z = 4; wall.checkCollisions = true; wall.computeWorldMatrix(true);
  const explosions = new ExplosionSystem(scene, damage, effects, audio, Vector3.Zero()); explosions.enqueue({ position: new Vector3(0, 2, 0), radius: 15, damage: 100, source: 'tank' }); explosions.update();
  assert.ok(health.current > 85); assert.equal(radialDamage(20, 10, 100), 0); scene.dispose(); engine.dispose();
});
test('dead guards stop fighting and can be restored for a new operation', () => {
  const engine = new NullEngine(), scene = new Scene(engine), player = new Player(scene), damage = new DamageSystem();
  const enemy = new Enemy('enemy-a', scene, new Vector3(0, 2, 10), player, damage, effects, audio);
  enemy.alert(player.position); damage.hit(enemy.id, 100, 'player'); const position = enemy.body.position.clone();
  enemy.update(2); assert.equal(enemy.body.metadata, null); assert.ok(enemy.body.position.equals(position));
  enemy.reset(); assert.equal(enemy.health.dead, false); assert.equal(enemy.body.metadata.damageId, enemy.id);
  scene.dispose(); engine.dispose();
});

test('difficulty changes enemy health while preserving its current health ratio', () => {
  const engine = new NullEngine(), scene = new Scene(engine), player = new Player(scene), damage = new DamageSystem();
  const enemy = new Enemy('enemy-a', scene, new Vector3(0, 2, 10), player, damage, effects, audio, 'easy');
  assert.equal(enemy.health.max, difficulties.easy.enemyHealth);
  enemy.health.damage(enemy.health.max / 2); enemy.setDifficulty('hard');
  assert.equal(enemy.health.max, difficulties.hard.enemyHealth); assert.equal(enemy.health.current, difficulties.hard.enemyHealth / 2);
  enemy.health.damage(enemy.health.current); enemy.setDifficulty('medium'); assert.equal(enemy.health.current, 0);
  scene.dispose(); engine.dispose();
});
