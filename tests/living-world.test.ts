import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { LivingWorld } from '../src/world/LivingWorld';
import type { WorldManager } from '../src/world/WorldManager';
import type { AssetManager } from '../src/core/AssetManager';
import { bases } from '../src/data/bases';

test('residents move, react to noise, sleep at distance and populate only liberated bases',async()=>{
  const engine=new NullEngine(), scene=new Scene(engine), material=new StandardMaterial('test',scene);
  const world={scene,flags:new Map(),material:()=>material} as unknown as WorldManager;
  const manager={instantiate:async (_:unknown,name:string)=>({root:new TransformNode(name,scene),entries:{animationGroups:[]}})} as unknown as AssetManager;
  const living=new LivingWorld(world); await living.load(manager);
  const resident=scene.getTransformNodeByName('resident-0')!, friendly=scene.getTransformNodeByName('resident-12')!;
  const player=new Vector3(-85,7,-83), start=resident.position.clone(); living.update(1,player);
  assert.ok(resident.position.x>start.x); assert.ok(living.activeCount>0);
  const walking=resident.position.x-start.x, before=resident.position.x;
  living.noise(resident.position); living.update(1,player); assert.ok(resident.position.x-before>walking*2);
  assert.match(living.talk(resident.position)!,/Deckung/);
  living.update(.1,new Vector3(1000,0,1000)); assert.equal(living.activeCount,0); assert.equal(resident.isEnabled(),false);
  const flag=Vector3.FromArray(bases[0].flag); living.update(.1,flag); assert.equal(friendly.isEnabled(),false);
  living.liberate('orbis'); living.update(.1,flag); assert.equal(friendly.isEnabled(),true);
  living.reset(); living.update(.1,flag); assert.equal(friendly.isEnabled(),false);
  scene.dispose(); engine.dispose();
});
