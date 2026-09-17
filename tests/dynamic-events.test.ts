import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DynamicEvents } from '../src/world/DynamicEvents';

test('a nearby dynamic event announces itself, shows progress and awards completion once', () => {
  const engine=new NullEngine(),scene=new Scene(engine),events=new DynamicEvents(scene);
  const player=new Vector3(-26,8,-320),messages:string[]=[];let reward=0;
  events.onMessage=message=>messages.push(message);events.onReward=amount=>reward+=amount;
  events.update(2.1,player,false,true);
  assert.equal(events.view?.id,'west-bridge-call');
  assert.equal(events.view?.discovered,true);
  assert.match(messages[0],/IN DER NÄHE/);
  const position=events.view!.position;player.set(position[0],position[1],position[2]);
  events.update(.5,player,true,true);
  assert.equal(events.view?.inside,true);
  assert.ok((events.view?.progress??0)>0);
  for(let i=0;i<40;i++)events.update(.1,player,true,true);
  assert.equal(events.view,undefined);
  assert.equal(reward,450);
  assert.equal(events.completed,1);
  assert.match(messages.at(-1)!,/ABGESCHLOSSEN/);
  events.dispose();scene.dispose();engine.dispose();
});

test('active events and their interaction progress survive a save round-trip', () => {
  const engine=new NullEngine(),scene=new Scene(engine),player=new Vector3(-26,8,-320);
  const original=new DynamicEvents(scene);original.update(2.1,player,false,true);
  const position=original.view!.position;player.set(position[0],position[1],position[2]);original.update(1.25,player,true,true);
  const saved=original.saveState(),restored=new DynamicEvents(scene);restored.restore(saved);restored.update(0,player,false,true);
  assert.equal(restored.view?.id,saved.active?.siteId);
  assert.equal(restored.view?.discovered,true);
  assert.ok(Math.abs((restored.view?.progress??0)-1.25/4)<.001);
  assert.equal(restored.saveState().sequence,saved.sequence);
  original.dispose();restored.dispose();scene.dispose();engine.dispose();
});
