import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseAvoidanceHeading, searchOffset } from '../src/ai/EnemyNavigation';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { EnemyManager } from '../src/ai/EnemyManager';
import { Player } from '../src/player/Player';
import { DamageSystem } from '../src/combat/DamageSystem';
import type { CombatEffects } from '../src/combat/CombatEffects';
import type { CombatAudio } from '../src/combat/CombatAudio';

test('guards keep their desired heading on clear ground and choose a free side of a wall',()=>{
  assert.deepEqual(chooseAvoidanceHeading({x:0,z:2},()=>4,1),{x:0,z:1});
  const heading=chooseAvoidanceHeading({x:0,z:1},direction=>Math.abs(direction.x)<.6?.2:4,1);
  assert.ok(heading.x>.6,'persistent side preference steers around the obstacle');
  assert.ok(Math.abs(Math.hypot(heading.x,heading.z)-1)<.0001);
});

test('trapped guards stop instead of walking into colliders or producing invalid directions',()=>{
  assert.deepEqual(chooseAvoidanceHeading({x:1,z:0},()=>.2,-1),{x:0,z:0});
  assert.deepEqual(chooseAvoidanceHeading({x:0,z:0},()=>4,1),{x:0,z:0});
});

test('a squad searches separate expanding points near its last confirmed sighting',()=>{
  const first=searchOffset(1,0),second=searchOffset(2,0),later=searchOffset(1,8);
  assert.notDeepEqual(first,second);
  assert.ok(Math.hypot(later.x,later.z)>Math.hypot(first.x,first.z));
  assert.ok(Math.hypot(searchOffset(1,1000).x,searchOffset(1,1000).z)<=10.21);
  assert.deepEqual(searchOffset(1,8),later);
});

test('leaving a squad clears the active alarm and its offscreen memory expires',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),player=new Player(scene);
  const enemies=new EnemyManager(scene,player,new DamageSystem(),{} as CombatEffects,{} as CombatAudio);
  const guard=enemies.enemies[0];guard.alert(guard.body.position.add(new Vector3(5,0,0)));
  assert.ok(enemies.alertCount>0);
  player.position.set(4000,10,4000);enemies.update(.1);assert.equal(enemies.alertCount,0);
  enemies.update(10);assert.equal(guard.state,'PATROL');assert.equal(guard.hasVisualContact,false);
  scene.dispose();engine.dispose();
});
