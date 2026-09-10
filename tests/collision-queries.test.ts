import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene, MeshBuilder, Ray, Vector3 } from '@babylonjs/core';
import { CollisionQueries, moveWithWorldCollisions } from '../src/world/CollisionQueries';

test('spatial picks match scene rays at cell seams and track moving, hidden and destroyed colliders', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    for (let i = 0; i < 200; i++) {
      const wall = MeshBuilder.CreateBox(`wall-${i}`, { width: 12, height: 8, depth: 1 }, scene);
      wall.position.set(i % 2 ? 64 : -64, 4, i * 70);
      wall.checkCollisions = true; wall.metadata = { collisionStatic: true }; wall.freezeWorldMatrix();
    }
    const index = new CollisionQueries(scene);
    assert.ok(index.candidates(60, 68, 60, 85).length < 5);
    const car = MeshBuilder.CreateBox('moving-car', { size: 3 }, scene);
    car.checkCollisions = true; car.visibility = 0; car.position.set(64, 4, 65);
    const ray = new Ray(new Vector3(64, 4, 60), Vector3.Forward(), 30);
    const compare = () => {
      scene.meshes.forEach(mesh => mesh.computeWorldMatrix(true));
      const expected = scene.pickWithRay(ray, mesh => mesh.checkCollisions && mesh.isEnabled());
      const actual = index.pick(ray);
      assert.equal(actual?.pickedMesh ?? null, expected?.pickedMesh ?? null);
      if (expected?.hit) assert.ok(Math.abs(actual!.distance - expected.distance) < 1e-6);
    };
    compare(); assert.equal(index.pick(ray)?.pickedMesh, car);
    car.position.z = 80; compare(); assert.notEqual(index.pick(ray)?.pickedMesh, car);
    scene.getMeshByName('wall-1')!.setEnabled(false); compare(); assert.equal(index.pick(ray)?.pickedMesh, car);
    car.setEnabled(false); compare();
    car.setEnabled(true); car.dispose(); compare();
    // Both negative coordinates and long rays across multiple cells remain valid.
    ray.origin.set(-64, 4, -10); ray.length = 400; compare();
  } finally { scene.dispose(); engine.dispose(); }
});

test('indexed collision sweeps retain wall sliding and prevent tunnelling across cells', () => {
  const run = (indexed: boolean) => {
    const engine = new NullEngine(), scene = new Scene(engine); scene.collisionsEnabled = true;
    try {
      const wall = MeshBuilder.CreateBox('wall', { width: .2, height: 30, depth: 60 }, scene);
      wall.position.set(64, 10, 0); wall.checkCollisions = true;
      wall.metadata = { collisionStatic: true }; wall.freezeWorldMatrix();
      const body = MeshBuilder.CreateBox('body', { size: 1 }, scene);
      body.position.set(55, 10, 0); body.ellipsoid.set(.4, .9, .4); body.computeWorldMatrix(true);
      if (indexed) new CollisionQueries(scene);
      moveWithWorldCollisions(body, new Vector3(20, 0, 7));
      assert.equal(body.surroundingMeshes, null);
      return body.position.clone();
    } finally { scene.dispose(); engine.dispose(); }
  };
  const expected = run(false), actual = run(true);
  assert.ok(actual.x < 64 && actual.z > 6);
  assert.ok(Vector3.Distance(expected, actual) < 1e-6);
});
