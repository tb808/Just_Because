import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MeshBuilder, NullEngine, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { LivingWorld } from '../src/world/LivingWorld';
import { approachSpeed, buildTrafficCircuit, directionToDestination, distanceSquared, planEscape, residentActivity, routineDestination, segmentHitsObstacle, trafficTargetSpeed } from '../src/world/AmbientBehavior';
import type { WorldManager } from '../src/world/WorldManager';
import type { AssetManager } from '../src/core/AssetManager';
import { bases } from '../src/data/bases';
import { settlements, type GroundPoint } from '../src/data/world';
import { terrainHeight } from '../src/world/Terrain';
import { StaticGeometry } from '../src/world/StaticGeometry';

async function fixture(obstacle: boolean|'batch'=false) {
  const engine=new NullEngine(),scene=new Scene(engine),material=new StandardMaterial('shared-body',scene);
  if(obstacle===true) {
    const [x,z]=settlements[0].residentRoute[0];
    const wall=MeshBuilder.CreateBox('sidewalk-obstruction',{width:1,height:3,depth:5},scene);
    wall.position.set(x+2,terrainHeight(x,z)+1.5,z);wall.checkCollisions=true;
  }
  const world={scene,flags:new Map(),material:()=>material,chunks:{add:()=>{}},registerVehicle:(root:TransformNode,id:string)=>({
    id,root,collider:MeshBuilder.CreateBox(`${id}-collider`,{size:1},scene),centerOffset:new Vector3(0,1,0),
    initialPosition:root.position.clone(),initialRotationY:root.rotation.y,occupied:false,ambient:true,
  })} as unknown as WorldManager;
  if(obstacle==='batch') {
    const geometry=new StaticGeometry(world),[x,z]=settlements[0].residentRoute[0],y=terrainHeight(x,z)+1.5;
    geometry.box(x-15,y,z+2,2,3,10,'#ffffff',true);geometry.box(x+15,y,z+2,2,3,10,'#ffffff',true);geometry.flush();
  }
  const manager={instantiate:async (_:unknown,name:string)=>({root:new TransformNode(name,scene),entries:{animationGroups:[]}})} as unknown as AssetManager;
  const living=new LivingWorld(world);await living.load(manager);
  return {engine,scene,material,living,dispose:()=>{scene.dispose();engine.dispose();}};
}

test('every settlement receives inhabitants, markets and local traffic; distant residents sleep',async()=>{
  const f=await fixture();
  assert.ok(f.living.populationCount>=200,'island-wide cast includes the markets');
  assert.ok(f.living.trafficCount>=settlements.length+8);
  for(const town of settlements) {
    f.living.update(.1,new Vector3(town.center[0],town.elevation,town.center[1]));
    assert.ok(f.living.activeCount>=15,`${town.name} should have a visible local cast`);
  }
  f.living.update(.1,new Vector3(4000,0,4000));assert.equal(f.living.activeCount,0);
  assert.equal(f.scene.getTransformNodeByName('resident-0')!.isEnabled(),false);f.dispose();
});

test('residents walk, turn away from a nearby threat, converse and gradually recover',async()=>{
  const f=await fixture(),resident=f.scene.getTransformNodeByName('resident-0')!,start=resident.position.clone();
  const observer=start.add(new Vector3(0,0,10));
  f.living.update(.8,observer);assert.ok(Vector3.Distance(resident.position,start)>.3);
  // The current route heads east; putting a threat ahead must reverse that movement.
  const movement=resident.position.subtract(start).normalize();
  const threat=resident.position.add(movement.scale(3)),before=Vector3.Distance(resident.position,threat);
  f.living.noise(threat);f.living.update(.5,observer);
  assert.ok(Vector3.Distance(resident.position,threat)>before,'panic must increase distance from the threat');
  assert.match(f.living.talk(resident.position)!,/Deckung/);
  for(let i=0;i<20;i++) f.living.update(1,observer);
  assert.doesNotMatch(f.living.talk(resident.position)!,/Deckung/);
  f.living.reset();assert.ok(resident.position.equalsWithEpsilon(start));f.dispose();
});

test('liberated bases gain civilians and reset removes them again',async()=>{
  const f=await fixture(),base=bases[0],flag=Vector3.FromArray(base.flag);
  f.living.update(.1,flag);const before=f.living.populationCount;
  f.living.liberate(base.id);f.living.update(.1,flag);assert.equal(f.living.populationCount,before+4);
  assert.ok(f.living.activeCount>=4);
  f.living.reset();assert.equal(f.living.populationCount,before);f.dispose();
});

test('pedestrians cannot step through a thin collider on their route',async()=>{
  const f=await fixture(true),resident=f.scene.getTransformNodeByName('resident-0')!,start=resident.position.clone();
  for(let i=0;i<8;i++) f.living.update(.5,start.add(new Vector3(0,0,10)));
  assert.ok(resident.position.x<start.x+1.2,'the collision margin keeps the resident outside the wall');
  f.dispose();
});

test('merged buildings leave their intervening sidewalk traversable',async()=>{
  const f=await fixture('batch'),resident=f.scene.getTransformNodeByName('resident-0')!,start=resident.position.clone();
  for(let i=0;i<5;i++) f.living.update(.5,start.add(new Vector3(0,0,10)));
  assert.ok(resident.position.x>start.x+2,'primitive collision bounds leave the empty space inside a district batch walkable');f.dispose();
});

test('a moving car stops before a pedestrian and proceeds when the pedestrian moves behind it',async()=>{
  const f=await fixture(),car=f.scene.getTransformNodeByName('ambient-traffic-0')!,farAway=new Vector3(4000,0,4000);
  const inactivePosition=car.position.clone();
  for(let i=0;i<5;i++) f.living.update(1,farAway);
  assert.ok(car.position.equalsWithEpsilon(inactivePosition),'offscreen traffic must not consume simulation time');
  const forward=new Vector3(Math.sin(car.rotation.y),0,Math.cos(car.rotation.y));
  const player=car.position.add(forward.scale(15));player.y=terrainHeight(player.x,player.z)+1;
  for(let i=0;i<6;i++) f.living.update(1,player);
  const distance=Vector3.Distance(car.position,player);
  assert.ok(distance>3.9&&distance<6,'car must brake with room for its front bumper');
  const stopped=car.position.clone();player.copyFrom(stopped.subtract(forward.scale(8)));
  for(let i=0;i<3;i++) f.living.update(1,player);
  assert.ok(Vector3.Distance(car.position,stopped)>3,'a pedestrian behind the car must not pin it in place');f.dispose();
});

test('escape plans follow the safer direction and stop before circling back toward gunfire',()=>{
  const route:GroundPoint[]=[[0,0],[20,0],[20,20],[0,20]];
  const result=planEscape(route,[5,0],[12,0],1,1);
  assert.equal(result.direction,-1);assert.equal(result.next,0);
  assert.ok(distanceSquared(route[result.shelter],[12,0])>distanceSquared([5,0],[12,0]));
  const atCorner=planEscape(route,[0,0],[4,0],1,1);
  assert.equal(atCorner.next,3,'an escape at a vertex skips the zero-length backwards endpoint');
});

test('traffic uses separate continuous lanes and local turnarounds',()=>{
  const circuit=buildTrafficCircuit([[0,0],[50,0],[100,0]],2);
  assert.equal(circuit[0][1],-2);assert.ok(circuit.some(([x,z])=>x===50&&z===2));
  assert.ok(Math.sqrt(distanceSquared(circuit[0],circuit.at(-1)!))<2);
  assert.ok(circuit.every((p,i)=>Math.sqrt(distanceSquared(p,circuit[(i+1)%circuit.length]))<=51));
  assert.deepEqual(buildTrafficCircuit([[0,0]]),[]);
});

test('traffic brakes for pedestrians ahead, follows vehicles, and ignores the opposite lane or rear',()=>{
  assert.equal(trafficTargetSpeed([0,0],[1,0],6,10,[{position:[4,0],radius:.8}]),0);
  assert.equal(trafficTargetSpeed([0,0],[1,0],6,10,[{position:[-3,0],radius:1},{position:[7,4],radius:1}]),10);
  assert.ok(trafficTargetSpeed([0,0],[1,0],10,12,[{position:[10,0],radius:1.3,speed:0}])<10);
  assert.equal(approachSpeed(0,10,1),2.1);assert.equal(approachSpeed(10,0,1),4.5);
});

test('different jobs keep different routines and slab collision catches crossing thin fences',()=>{
  assert.equal(residentActivity('merchant',0),'market');assert.equal(residentActivity('worker',0),'work');
  assert.equal(residentActivity('worker',325),'rest');assert.equal(residentActivity('worker',390),'work');
  const wall={minX:2,maxX:2.1,minZ:-1,maxZ:1};
  assert.equal(segmentHitsObstacle([0,0],[4,0],wall,.35),true);
  assert.equal(segmentHitsObstacle([0,2],[4,2],wall,.35),false);
});

test('errands have occupation-specific destinations and choose connected sidewalks back home',()=>{
  assert.equal(routineDestination('merchant','market',15,4),0);
  assert.equal(routineDestination('merchant','rest',15,4),4);
  assert.notEqual(routineDestination('worker','work',15,4),routineDestination('fisher','work',15,4));
  const route:GroundPoint[]=[[0,0],[20,0],[20,10],[0,10]];
  assert.equal(directionToDestination(route,0,3),-1);
  assert.equal(directionToDestination(route,0,1),1);
});
