import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { Ray } from '@babylonjs/core/Culling/ray';
import type { PickingInfo } from '@babylonjs/core/Collisions/pickingInfo';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

const indexes = new WeakMap<Scene, CollisionQueries>();
const cellSize = 64;

/** Broad phase for immutable terrain/districts. Moving colliders remain live. */
export class CollisionQueries {
  private cells = new Map<string, AbstractMesh[]>();
  private dynamic = new Set<AbstractMesh>();
  private pending = new Set<AbstractMesh>();
  private known = new WeakSet<AbstractMesh>();
  private meshCount = -1;
  constructor(private scene: Scene) {
    for (const mesh of scene.meshes) this.add(mesh);
    this.meshCount = scene.meshes.length;
    // Babylon defers creation events; the count check below also catches meshes
    // created and queried synchronously before the notification arrives.
    scene.onNewMeshAddedObservable.add(mesh => this.pending.add(mesh));
    scene.onMeshRemovedObservable.add(mesh => { this.pending.delete(mesh); this.dynamic.delete(mesh); this.meshCount = -1; });
    indexes.set(scene, this);
  }
  private add(mesh: AbstractMesh) {
    if (this.known.has(mesh)) return;
    this.known.add(mesh);
    if (mesh.isDisposed() || !mesh.checkCollisions) return;
    if (!mesh.metadata?.collisionStatic) { this.dynamic.add(mesh); return; }
    mesh.computeWorldMatrix(true);
    const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
    for (let x = Math.floor(min.x / cellSize); x <= Math.floor(max.x / cellSize); x++) {
      for (let z = Math.floor(min.z / cellSize); z <= Math.floor(max.z / cellSize); z++) {
        const key = `${x}:${z}`, cell = this.cells.get(key) ?? [];
        cell.push(mesh); this.cells.set(key, cell);
      }
    }
  }
  candidates(minX: number, maxX: number, minZ: number, maxZ: number) {
    if (this.meshCount !== this.scene.meshes.length) {
      for (const mesh of this.scene.meshes) this.add(mesh);
      this.meshCount = this.scene.meshes.length;
    }
    for (const mesh of this.pending) this.add(mesh);
    this.pending.clear();
    const found = new Set<AbstractMesh>();
    for (let x = Math.floor(minX / cellSize); x <= Math.floor(maxX / cellSize); x++) {
      for (let z = Math.floor(minZ / cellSize); z <= Math.floor(maxZ / cellSize); z++) {
        for (const mesh of this.cells.get(`${x}:${z}`) ?? []) found.add(mesh);
      }
    }
    for (const mesh of this.dynamic) found.add(mesh);
    return [...found].filter(mesh => !mesh.isDisposed() && mesh.isEnabled() && mesh.checkCollisions);
  }
  pick(ray: Ray, excluded?: AbstractMesh) {
    const endX = ray.origin.x + ray.direction.x * ray.length;
    const endZ = ray.origin.z + ray.direction.z * ray.length;
    let nearest: PickingInfo | null = null;
    for (const mesh of this.candidates(Math.min(ray.origin.x, endX), Math.max(ray.origin.x, endX), Math.min(ray.origin.z, endZ), Math.max(ray.origin.z, endZ))) {
      if (mesh === excluded) continue;
      mesh.computeWorldMatrix();
      const hit = ray.intersectsMesh(mesh);
      if (hit.hit && hit.distance <= ray.length && (!nearest || hit.distance < nearest.distance)) nearest = hit;
    }
    return nearest;
  }
}

export function pickCollision(scene: Scene, ray: Ray, excluded?: AbstractMesh) {
  const index = indexes.get(scene);
  return index ? index.pick(ray, excluded) : scene.pickWithRay(ray, mesh => mesh.checkCollisions && mesh.isEnabled() && mesh !== excluded);
}

export function moveWithWorldCollisions(body: AbstractMesh, displacement: Vector3) {
  const index = indexes.get(body.getScene());
  if (!index) { body.moveWithCollisions(displacement); return; }
  // A sphere around the whole sweep also covers sliding and ellipsoid offsets.
  const radius = displacement.length() + Math.max(body.ellipsoid.x, body.ellipsoid.y, body.ellipsoid.z) + body.ellipsoidOffset.length() + 1;
  const position = body.getAbsolutePosition();
  const previous = body.surroundingMeshes;
  body.surroundingMeshes = index.candidates(position.x - radius, position.x + radius, position.z - radius, position.z + radius);
  try { body.moveWithCollisions(displacement); }
  finally { body.surroundingMeshes = previous; }
}
