import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Atmosphere } from '../src/world/Atmosphere';

test('atmosphere constructs without a renderer and handles travel, saved time and quality changes',()=>{
  const engine = new NullEngine(), scene = new Scene(engine);
  new DirectionalLight('sun',new Vector3(-1,-1,.4),scene); new HemisphericLight('sky',Vector3.Up(),scene);
  MeshBuilder.CreateGround('Mediterranean sea',{width:10000,height:10000},scene);
  try {
    const environment = new Atmosphere(scene); assert.equal(environment.clock,'08:30');
    environment.update(.05,new Vector3(-20,7,-300));
    environment.elapsed=480; environment.update(0,new Vector3(1000,80,1000));
    assert.match(environment.clock,/^\d{2}:\d{2}$/);
    const sun=scene.getLightByName('sun') as DirectionalLight;
    assert.ok(sun.position.asArray().every(Number.isFinite)); assert.ok(Math.abs(sun.direction.length()-1)<.0001);
    environment.setQuality(1.6); assert.equal(scene.shadowsEnabled,false);
    environment.setQuality(1); assert.equal(scene.shadowsEnabled,true);
    assert.ok(scene.getMeshByName('Mediterranean sea')!.material);
    environment.dispose();
    // No scene.render(), screenshot, browser or visual comparison is performed.
  } finally {scene.dispose();engine.dispose();}
});
