import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { CombatSystem } from '../src/combat/CombatSystem';
import { Player } from '../src/player/Player';
import { PlayerMovement } from '../src/player/PlayerMovement';
import { storyEquipment } from '../src/player/EquipmentProgress';
import { MissionProgress } from '../src/missions/MissionProgress';
import { missionDefinitions } from '../src/data/missions';
import { bases } from '../src/data/bases';
import { weapons, weaponIds } from '../src/data/weapons';
import { assets } from '../src/data/assets';
import { isGameSave, type GameSave } from '../src/core/SaveGame';
import { nearbyWeaponMerchant, weaponMerchants } from '../src/world/WeaponMerchants';
import { settlements } from '../src/data/world';
import type { InputManager } from '../src/core/InputManager';
import type { ThirdPersonCamera } from '../src/camera/ThirdPersonCamera';
import type { WorldManager } from '../src/world/WorldManager';

function fixture() {
  const engine = new NullEngine(), scene = new Scene(engine), player = new Player(scene);
  const pressed = new Set<string>();
  const input = { take: (id: string) => pressed.delete(id), down: () => false, axes: () => ({ x: 0, z: 0 }), clear: () => pressed.clear() } as unknown as InputManager;
  const camera = { yaw: 0, pitch: 0, blast() {}, update() {}, heading: Vector3.Forward() } as unknown as ThirdPersonCamera;
  const world = { supply: new Vector3(1000, 0, 0), flags: new Map(), setBaseLiberated() {} } as unknown as WorldManager;
  const combat = new CombatSystem(scene, player, input, camera, world);
  player.state = 'ON_FOOT';
  return { scene, player, pressed, input, camera, combat, dispose() { combat.dispose(); scene.dispose(); engine.dispose(); } };
}

test('new game owns only weak pistol; purchases debit once, equip, persist and survive resupply/death', () => {
  const f = fixture(), { combat } = f;
  assert.deepEqual([...combat.weapons.owned], ['pistol']); assert.equal(combat.money, 0);
  assert.equal(combat.weapons.select('launcher'), false); assert.equal(combat.weapons.selected, 'pistol');
  assert.ok(weapons.pistol.damage < weapons.rifle.damage);
  assert.match(combat.purchase('rifle'), /fehlen/); assert.equal(combat.weapons.owned.has('rifle'), false);
  combat.reward(3000); assert.equal(combat.score, 3000);
  assert.match(combat.purchase('rifle'), /gekauft/); assert.equal(combat.money, 600); assert.equal(combat.score, 3000);
  combat.purchase('rifle'); assert.equal(combat.money, 600);
  combat.weapons.inventory.rifle.ammo = 11;
  const save = combat.saveState(); combat.reset(); combat.restore(save);
  assert.equal(combat.money, 600); assert.equal(combat.weapons.selected, 'rifle'); assert.equal(combat.weapons.current.ammo, 11);
  assert.deepEqual([...combat.weapons.owned], ['pistol', 'rifle']);
  combat.resupply(); combat.revive(); assert.equal(combat.weapons.current.ammo, 30);
  assert.equal(combat.weapons.owned.has('launcher'), false); assert.equal(combat.money, 600);
  combat.reset(); assert.deepEqual([...combat.weapons.owned], ['pistol']); assert.equal(combat.money, 0);
  f.dispose();
});

test('legacy inventory is retained and equipped weapon must belong to saved ownership', () => {
  const f = fixture();
  f.combat.weapons.restore({ selected: 'launcher', rifle: { ammo: 4, reserve: 8 }, launcher: { ammo: 0, reserve: 3 } });
  assert.ok(f.combat.weapons.owned.has('rifle')); assert.ok(f.combat.weapons.owned.has('launcher'));
  assert.equal(f.combat.weapons.selected, 'launcher'); assert.equal(f.combat.weapons.current.reserve, 3);
  const save = f.combat.weapons.saveState(); save.owned = ['pistol'];
  f.combat.weapons.restore(save); assert.equal(f.combat.weapons.selected, 'pistol');
  f.dispose();
});

test('all nine models have distinct assets; all purchased weapons cycle and round-trip ammunition', () => {
  const f = fixture(), { combat } = f;
  assert.equal(weaponIds.length, 9); assert.equal(new Set(weaponIds.map(id => assets.weapons[id].path)).size, 9);
  combat.reward(50000);
  for (const id of weaponIds) { combat.purchase(id); combat.weapons.inventory[id].ammo = 0; }
  const save = combat.saveState(); combat.restore(save);
  assert.equal(combat.weapons.owned.size, 9);
  for (const id of weaponIds) assert.equal(combat.weapons.inventory[id].ammo, 0);
  combat.weapons.select('pistol'); f.pressed.add('rifle'); combat.weapons.update(.1);
  assert.equal(combat.weapons.selected, 'launcher');
  f.pressed.add('launcher'); combat.weapons.update(.1); assert.equal(combat.weapons.selected, 'pistol');
  f.dispose();
});

test('purchases reject death and incompatible movement without taking money', () => {
  const f = fixture(); f.combat.reward(10000);
  for (const state of ['FALLING', 'IN_VEHICLE', 'WINGSUIT'] as const) {
    f.player.state = state; f.combat.purchase('rifle'); assert.equal(f.combat.money, 10000);
  }
  f.player.state = 'ON_FOOT'; f.player.dead = true; f.combat.purchase('rifle');
  assert.equal(f.combat.money, 10000); assert.equal(f.combat.weapons.owned.size, 1); f.dispose();
});

test('story unlocks are ordered, survive each reload, and training waits for the glider', () => {
  let campaign = new MissionProgress(missionDefinitions);
  assert.deepEqual(storyEquipment(campaign.saveState()), { grapple: false, parachute: false, wingsuit: false });
  assert.equal(campaign.setTracked('heights'), false);
  let ticks = 0;
  while (!campaign.storyComplete && ticks++ < 100) {
    const saved = campaign.saveState(), equipment = storyEquipment(saved);
    campaign = new MissionProgress(missionDefinitions); campaign.restore(saved);
    assert.deepEqual(storyEquipment(campaign.saveState()), equipment);
    if (campaign.pendingScene) { campaign.finishScene(campaign.pendingScene, 'shield'); continue; }
    const goal = campaign.objective!;
    if (goal.id === 'story-roof') assert.ok(equipment.grapple && !equipment.parachute && !equipment.wingsuit);
    if (goal.id === 'story-high-relay') assert.ok(equipment.grapple && equipment.parachute && !equipment.wingsuit);
    if (goal.id === 'story-flight') { assert.equal(goal.requiredState, 'PARACHUTE'); assert.ok(equipment.parachute && !equipment.wingsuit); }
    if (campaign.tracked.chapter! >= 4) assert.ok(equipment.wingsuit);
    const actor = { position: Vector3.FromArray(goal.position), state: goal.requiredState ?? 'ON_FOOT' };
    if (goal.kind === 'interact') campaign.interact(actor);
    else campaign.update(goal.holdSeconds ?? 1, actor, { liberatedBaseIds: bases.map(b => b.id) });
  }
  assert.ok(campaign.storyComplete); assert.equal(campaign.setTracked('heights'), true);
  campaign.reset(); assert.deepEqual(storyEquipment(campaign.saveState()), { grapple: false, parachute: false, wingsuit: false });
});

test('locked traversal input cannot activate an ability, while unlocked parachute can deploy', () => {
  const f = fixture(); f.player.position.set(0, 50, 0); f.player.state = 'FALLING';
  const controller = new PlayerMovement(f.player, f.input, f.camera, f.scene, new Vector3(0, 50, 0));
  const messages: string[] = []; controller.onLockedEquipment = m => messages.push(m);
  for (const action of ['grapple', 'parachute', 'wingsuit']) { f.pressed.add(action); controller.update(1 / 60); assert.equal(f.player.state, 'FALLING'); }
  assert.equal(messages.length, 3);
  controller.equipment.parachute = true; f.pressed.add('parachute'); controller.update(1 / 60);
  assert.equal(f.player.state, 'PARACHUTE'); f.dispose();
});

test('every town has a local merchant separated from story contacts, with no remote or rooftop shopping', () => {
  assert.equal(weaponMerchants.length, settlements.length);
  for (const merchant of weaponMerchants) {
    const town = settlements.find(t => t.id === merchant.id)!;
    const position = Vector3.FromArray(merchant.position);
    assert.equal(nearbyWeaponMerchant(position)?.id, merchant.id);
    assert.equal(nearbyWeaponMerchant(position.add(new Vector3(0, 20, 0))), undefined);
    assert.ok(Math.hypot(position.x - town.market[0], position.z - town.market[1] + 8) > 17);
  }
  assert.equal(nearbyWeaponMerchant(new Vector3(2500, 0, 2500)), undefined);
});

test('save validator supports economy and rejects malformed ownership, money and ammunition', () => {
  const f = fixture();
  const save: GameSave = { version: 1, savedAt: 1, player: [0, 1, 0], missions: new MissionProgress(missionDefinitions).saveState(), combat: f.combat.saveState() };
  assert.ok(isGameSave(save));
  for (const money of [-1, Infinity, 1.5]) assert.equal(isGameSave({ ...save, combat: { ...save.combat, money } }), false);
  for (const extra of [{ owned: ['unobtainium'] }, { ammunition: [] }, { ammunition: { pistol: { ammo: NaN, reserve: 1 } } }])
    assert.equal(isGameSave({ ...save, combat: { ...save.combat, weapons: { ...save.combat.weapons, ...extra } } }), false);
  f.dispose();
});
