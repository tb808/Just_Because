import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WorldManager } from '../src/world/WorldManager';
import { StaticGeometry } from '../src/world/StaticGeometry';
import { settlements } from '../src/data/world';
import { missionDefinitions } from '../src/data/missions';
import { bases } from '../src/data/bases';
import type { AssetManager } from '../src/core/AssetManager';

interface Bounds {minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number}
test('non-rendered world construction batches geometry and preserves navigable sidewalks',async()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  const assetStub={instantiate:async(def:{height:number},name:string)=>{
    const root=new TransformNode(name,scene),mesh=MeshBuilder.CreateBox(`${name}-stub`,{width:2,height:def.height,depth:2},scene);
    mesh.parent=root;mesh.position.y=def.height/2;return {root,fallback:false};
  }} as unknown as AssetManager;
  const world=new WorldManager(scene,assetStub);
  try {
    await world.create();
    assert.equal(world.flags.size,10);assert.equal(world.supplies.length,10);assert.equal(world.destructibles.length,29);
    const batches=scene.meshes.filter(m=>m.name.startsWith('district:'));
    assert.ok(batches.length>100&&batches.length<4800,`district batches must stay bounded: ${batches.length}`);
    assert.ok(batches.reduce((count,m)=>count+m.getTotalVertices(),0)>500000,'expanded districts need actual detailed geometry');
    const bounds=batches.flatMap(mesh=>mesh.metadata.navigationObstacles as Bounds[]);
    assert.ok(bounds.length>1500,'collision metadata must preserve individual shapes');
    for(const mesh of batches) {
      const box=mesh.getBoundingInfo().boundingBox;
      assert.ok([box.minimum.x,box.minimum.y,box.minimum.z,box.maximum.x,box.maximum.y,box.maximum.z].every(Number.isFinite),`${mesh.name} has invalid geometry`);
    }
    for(const town of settlements) {
      const active=bounds.filter(b=>b.minY<town.elevation+1.7&&b.maxY>town.elevation+.75);
      const market:readonly (readonly [number,number])[]=[[town.market[0]-10,town.market[1]-8],[town.market[0]+10,town.market[1]-8],[town.market[0]+10,town.market[1]+8],[town.market[0]-10,town.market[1]+8]];
      for(const route of [town.residentRoute,market])for(let i=0;i<route.length;i++) {
        const a=route[i],b=route[(i+1)%route.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.ceil(length));
        for(let j=0;j<=count;j++) {
          const x=a[0]+(b[0]-a[0])*j/count,z=a[1]+(b[1]-a[1])*j/count;
          const hit=active.find(o=>x>o.minX-.4&&x<o.maxX+.4&&z>o.minZ-.4&&z<o.maxZ+.4);
          assert.ok(!hit,`${town.name} sidewalk blocked at ${x},${z}: ${JSON.stringify(hit)}`);
        }
      }
    }
    // Check authored mission arrivals against actual district collision shapes, without rendering.
    // Ground/deck slabs sit below the torso; liberation itself is state-based and points at a flagpole.
    const directBounds=scene.meshes.filter(mesh=>mesh.checkCollisions&&mesh.metadata?.worldStatic&&!mesh.metadata.navigationObstacles).map(mesh=>{
      mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox;
      return {minX:box.minimumWorld.x,maxX:box.maximumWorld.x,minZ:box.minimumWorld.z,maxZ:box.maximumWorld.z,minY:box.minimumWorld.y,maxY:box.maximumWorld.y};
    });
    for(const mission of missionDefinitions)for(const objective of mission.objectives) {
      if(objective.kind==='liberate')continue;
      const [x,y,z]=objective.position;
      const hit=[...bounds,...directBounds].find(obstacle=>obstacle.maxY>y-.5&&obstacle.minY<y+.8&&x>obstacle.minX-.4&&x<obstacle.maxX+.4&&z>obstacle.minZ-.4&&z<obstacle.maxZ+.4);
      assert.ok(!hit,`${mission.id}/${objective.id} arrival intersects collision geometry: ${JSON.stringify(hit)}`);
    }
    const blockedGuards:string[]=[];
    for(const base of bases)for(const guard of base.guards) {
      const y=base.center[1]+.98;
      const hit=[...bounds,...directBounds].find(obstacle=>obstacle.maxY>y-.7&&obstacle.minY<y+.95&&guard.x>obstacle.minX-.5&&guard.x<obstacle.maxX+.5&&guard.z>obstacle.minZ-.5&&guard.z<obstacle.maxZ+.5);
      if(hit) blockedGuards.push(`${guard.id}: ${JSON.stringify(hit)}`);
    }
    assert.deepEqual(blockedGuards,[],'guard spawns must not intersect collision geometry');
    const tank=world.destructibles[0];tank.root.metadata={streamHidden:true};tank.collider.metadata={...tank.collider.metadata,streamHidden:true};
    world.chunks.update(1,new Vector3(1900,0,1900));world.chunks.update(1,world.spawn);
    assert.equal(tank.root.isEnabled(),false);assert.equal(tank.collider.isEnabled(),false);
    assert.ok(world.chunks.activeCount<world.chunks.totalCount,'distance culling must deactivate remote districts');
    tank.root.metadata.streamHidden=false;tank.collider.metadata.streamHidden=false;world.chunks.update(1,new Vector3(250,6,-150));
    assert.equal(tank.root.isEnabled(),true);
  } finally {scene.dispose();engine.dispose();}
});

test('batched cylinders and boxes expose outward-facing surface normals without rendering',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try {
    const world=new WorldManager(scene,{} as AssetManager),g=new StaticGeometry(world);
    g.box(0,2,0,2,4,2,'#ffffff',true);g.cylinder(10,2,0,2,4,'#ffffff',true,2,8);
    const [mesh]=g.flush(),positions=mesh.getVerticesData('position')!,normals=mesh.getVerticesData('normal')!;
    for(let i=0;i<positions.length;i+=3) {
      const x=positions[i]+mesh.position.x,z=positions[i+2]+mesh.position.z,cx=x>5?10:0;
      const dot=(x-cx)*normals[i]+(positions[i+1]-2)*normals[i+1]+z*normals[i+2];
      assert.ok(dot>0,'primitive normals must point away from its center');
    }
  }finally {scene.dispose();engine.dispose();}
});
