import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeshBuilder, NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';
import { Player } from '../src/player/Player';
import { PlayerMovement } from '../src/player/PlayerMovement';
import { ThirdPersonCamera } from '../src/camera/ThirdPersonCamera';
import { InputManager } from '../src/core/InputManager';
import { createTerrain } from '../src/world/Terrain';
import { movement } from '../src/data/config';
import { transition } from '../src/player/PlayerState';
import { glideVelocity } from '../src/abilities/Wingsuit';
import { parachuteVelocity } from '../src/abilities/Parachute';

function fixture() {
  const engine = new NullEngine(); const scene = new Scene(engine); scene.collisionsEnabled = true;
  const floor = MeshBuilder.CreateGround('test-floor', { width: 1000, height: 1000 }, scene); floor.checkCollisions = true;
  const held = new Set<string>(), pressed = new Set<string>();
  const input = {
    lookX: 0, lookY: 0, zoom: 0, aiming: false,
    down: (action: string) => held.has(action),
    take: (action: string) => { const exists = pressed.has(action); pressed.delete(action); return exists; },
    axes: () => ({ x: Number(held.has('right')) - Number(held.has('left')), z: Number(held.has('forward')) - Number(held.has('back')) }),
    clear: () => { held.clear(); pressed.clear(); },
  } as unknown as InputManager;
  const player = new Player(scene); player.position.set(0, 0.91, 0);
  const camera = new ThirdPersonCamera(scene, player, input); camera.yaw = 0; camera.pitch = 0; camera.update(0, true);
  const controller = new PlayerMovement(player, input, camera, scene, new Vector3(0, 0.91, 0));
  scene.meshes.forEach(m => m.computeWorldMatrix(true));
  const step = (seconds: number) => { for (let i = 0; i < Math.round(seconds / movement.fixedStep); i++) controller.update(movement.fixedStep); };
  return { engine, scene, held, pressed, player, camera, controller, step, dispose: () => { scene.dispose(); engine.dispose(); } };
}

test('terrain faces point upward and form collision tiles', () => {
  const engine = new NullEngine(), scene = new Scene(engine), tiles = createTerrain(scene);
  assert.equal(tiles.length, 256);
  for (const tile of tiles) {
    const normals = tile.getVerticesData(VertexBuffer.NormalKind)!;
    for (let i = 1; i < normals.length; i += 3) assert.ok(normals[i] > 0, `downward terrain normal ${normals[i]}`);
    assert.equal(tile.checkCollisions, true);
  }
  scene.dispose(); engine.dispose();
});
test('falling lands without sinking; jump returns to ground', () => {
  const f = fixture(); f.player.position.y = 12; f.step(2);
  assert.equal(f.player.state, 'ON_FOOT'); assert.ok(Math.abs(f.player.position.y - 0.9) < 0.03);
  f.pressed.add('jump'); f.step(0.25); assert.ok(f.player.position.y > 2.4);
  f.step(1.5); assert.equal(f.player.state, 'ON_FOOT'); f.dispose();
});
test('fixed-step movement is stable across 30/60/144 Hz rendering', () => {
  const results = [30, 60, 144].map(fps => {
    const f = fixture(); f.held.add('forward'); f.held.add('sprint'); let accumulator = 0;
    for (let i = 0; i < fps * 2; i++) {
      accumulator += 1 / fps;
      while (accumulator + 1e-10 >= movement.fixedStep) { f.controller.update(movement.fixedStep); accumulator -= movement.fixedStep; }
    }
    const z = f.player.position.z; f.dispose(); return z;
  });
  assert.ok(results[0] > 23); assert.ok(Math.max(...results) - Math.min(...results) < 0.001);
});
test('diagonal input has no speed advantage', () => {
  const run = (diagonal: boolean) => { const f = fixture(); f.held.add('forward'); if (diagonal) f.held.add('right'); f.step(1); const speed = f.player.speed; f.dispose(); return speed; };
  assert.ok(Math.abs(run(false) - run(true)) < 0.01);
});
test('high-speed movement cannot tunnel through a wall', () => {
  const f = fixture(); const wall = MeshBuilder.CreateBox('wall', { width: 15, height: 20, depth: 0.2 }, f.scene);
  wall.position.set(0, 10, 5); wall.checkCollisions = true; wall.computeWorldMatrix(true);
  f.player.position.y = 10; f.player.velocity.z = 60; f.step(0.2);
  assert.ok(f.player.position.z < 4.6, `wall penetration ${f.player.position.z}`); f.dispose();
});
test('pushing against an ordinary wall is not mistaken for being trapped', () => {
  const f = fixture(); const wall = MeshBuilder.CreateBox('wall', { width: 15, height: 5, depth: 0.2 }, f.scene);
  wall.position.set(0, 2.5, 1); wall.checkCollisions = true; wall.computeWorldMatrix(true);
  let recovered = 0; f.controller.onUnstuck = () => recovered++; f.held.add('forward'); f.step(1.5);
  assert.equal(recovered, 0); assert.ok(f.player.position.z < 0.7); f.dispose();
});
test('a collision lock returns the player to safety and movement resumes', () => {
  const f = fixture(); f.player.position.set(6, 0.91, 0); f.player.body.computeWorldMatrix(true);
  const moveWithCollisions = f.player.body.moveWithCollisions.bind(f.player.body);
  f.player.body.moveWithCollisions = () => f.player.body;
  let recovered = 0; f.controller.onUnstuck = () => recovered++; f.held.add('forward'); f.step(1);
  assert.equal(recovered, 1); assert.ok(Vector3.Distance(f.player.position, new Vector3(0, 0.91, 0)) < 1);
  f.player.body.moveWithCollisions = moveWithCollisions;
  f.step(0.5); assert.ok(f.player.position.z > 1); f.dispose();
});
test('manual unstuck lifts the player without resetting progress or input', () => {
  const f = fixture(); f.player.position.y = 0.2; f.player.velocity.set(4, -8, 3);
  let unstuck = 0, reset = 0; f.controller.onUnstuck = () => unstuck++; f.controller.onReset = () => reset++;
  f.held.add('forward'); f.pressed.add('unstuck'); f.step(movement.fixedStep);
  assert.equal(unstuck, 1); assert.equal(reset, 0); assert.equal(f.player.state, 'FALLING');
  assert.ok(Math.abs(f.player.position.y - 3.2) < 0.001); assert.deepEqual(f.player.velocity.asArray(), [0, 4.5, 0]);
  assert.equal(f.held.has('forward'), true); f.dispose();
});
test('camera retracts in front of an occluding wall', () => {
  const f = fixture(); const wall = MeshBuilder.CreateBox('camera-wall', { width: 12, height: 8, depth: 0.4 }, f.scene);
  wall.position.set(0, 3, -3); wall.checkCollisions = true; wall.computeWorldMatrix(true);
  f.camera.update(1 / 60, true); assert.ok(f.camera.camera.position.z > -2.5); f.dispose();
});
test('a retracted camera stays behind a fast airborne player', () => {
  const f = fixture(); f.player.state = 'FALLING'; f.camera.yaw = 0; f.camera.pitch = 0; f.camera.update(0, true);
  const oldTarget = f.player.position.add(new Vector3(0.8, 0.85, 0));
  f.camera.camera.position.copyFrom(oldTarget.add(new Vector3(0, 0, -0.35)));
  f.player.position.z -= 5; f.camera.update(1 / 60);
  const target = f.player.position.add(new Vector3(0.8, 0.85, 0));
  const relative = f.camera.camera.position.subtract(target);
  assert.ok(relative.z < -0.2, `camera crossed in front of player: ${relative.z}`);
  assert.ok(relative.asArray().every(Number.isFinite)); f.dispose();
});
test('camera repairs invalid orbit values instead of producing a broken view', () => {
  const f = fixture(); f.camera.yaw = Number.POSITIVE_INFINITY; f.camera.pitch = Number.NaN;
  f.camera.camera.position.copyFrom(f.player.position.add(new Vector3(0.8, 0.85, 0)));
  f.camera.update(0);
  assert.ok(Number.isFinite(f.camera.yaw)); assert.ok(Number.isFinite(f.camera.pitch));
  assert.ok(f.camera.camera.position.asArray().every(Number.isFinite));
  assert.ok(Vector3.Distance(f.camera.camera.position, f.player.position) > 1); f.dispose();
});
test('grapple acquires a surface, accelerates, and releases momentum', () => {
  const f = fixture(); const wall = MeshBuilder.CreateBox('anchor-wall', { width: 10, height: 25, depth: 1 }, f.scene);
  wall.position.set(0, 12, 40); wall.checkCollisions = true; wall.computeWorldMatrix(true);
  f.pressed.add('grapple'); f.step(0.3); assert.equal(f.player.state, 'GRAPPLING'); assert.ok(f.player.velocity.z > 15);
  const speed = f.player.velocity.z; f.pressed.add('jump'); f.step(movement.fixedStep);
  assert.equal(f.player.state, 'FALLING'); assert.ok(f.player.velocity.z >= speed - 0.01);
  assert.equal(f.scene.getMeshByName('grapple-rope')!.isEnabled(), false); f.dispose();
});
test('air abilities switch exclusively and reset clears their meshes', () => {
  const f = fixture(); f.player.position.y = 50;
  f.pressed.add('wingsuit'); f.step(0.1); assert.equal(f.player.state, 'WINGSUIT');
  f.pressed.add('parachute'); f.step(0.1); assert.equal(f.player.state, 'PARACHUTE');
  assert.equal(f.scene.getMeshByName('Nika-wingsuit')!.isEnabled(), false);
  assert.equal(f.scene.getMeshByName('parachute-canopy')!.isEnabled(), true);
  f.controller.reset(); assert.equal(f.scene.getMeshByName('parachute-canopy')!.isEnabled(), false); assert.equal(f.player.speed, 0); f.dispose();
});
test('wingsuit dive stores speed that can be traded back for height', () => {
  const dive = { x: 0, y: -5, z: 25 }, climb = { ...dive };
  for (let i = 0; i < 240; i++) { glideVelocity(dive, 0, -0.5, 1 / 120); glideVelocity(climb, 0, 0.25, 1 / 120); }
  assert.ok(Math.hypot(dive.x, dive.y, dive.z) > Math.hypot(climb.x, climb.y, climb.z)); assert.ok(dive.y < climb.y);
  const zoom = { x: 0, y: -4, z: 22 }; let altitude = 0;
  for (let i = 0; i < 240; i++) { glideVelocity(zoom, 0, -0.55, 1 / 120); altitude += zoom.y / 120; }
  const pullUpAltitude = altitude;
  for (let i = 0; i < 180; i++) { glideVelocity(zoom, 0, 0.35, 1 / 120); altitude += zoom.y / 120; }
  assert.ok(zoom.y > 0, `pull-up vertical speed ${zoom.y}`);
  assert.ok(altitude > pullUpAltitude, `pull-up failed to regain height: ${altitude - pullUpAltitude}`);
});
test('parachute arrests a fast fall', () => {
  const fall = { x: 30, y: -60, z: 0 }; for (let i = 0; i < 240; i++) parachuteVelocity(fall, 0, 5, 1 / 120);
  assert.ok(Math.abs(fall.y + 3.5) < 0.01); assert.ok(Math.abs(fall.x) < 0.3);
});
test('ground and vehicle states reject incompatible air activation', () => {
  assert.equal(transition('ON_FOOT', 'wingsuit'), 'ON_FOOT');
  assert.equal(transition('IN_VEHICLE', 'grapple'), 'IN_VEHICLE');
  assert.equal(transition('FALLING', 'grapple', false), 'FALLING');
  assert.equal(transition('WINGSUIT', 'parachute'), 'PARACHUTE');
});
