import { Color3 } from '@babylonjs/core/Maths/math.color';
import { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { type AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera';
import { movement } from '../data/config';
import { Player } from '../player/Player';

export class GrapplingHook {
  private anchor?: Vector3;
  private surface?: AbstractMesh;
  private rope: LinesMesh;
  private elapsed = 0;
  constructor(private scene: Scene, private player: Player, private camera: ThirdPersonCamera) {
    this.rope = MeshBuilder.CreateLines('grapple-rope', { points: [Vector3.Zero(), Vector3.Up()], updatable: true }, scene);
    this.rope.color = Color3.FromHexString('#e6ffad'); this.rope.isPickable = false; this.rope.setEnabled(false);
  }
  target() {
    const hit = this.scene.pickWithRay(this.camera.aimRay(movement.grappleRange + 15), m => m.checkCollisions && m !== this.player.body);
    if (!hit?.hit || !hit.pickedPoint || Vector3.Distance(hit.pickedPoint, this.player.position) > movement.grappleRange) return null;
    const direction = hit.pickedPoint.subtract(this.player.position), distance = direction.length();
    if (distance < 2) return null;
    // Camera sight alone must not permit firing through a wall next to the player.
    const obstruction = this.scene.pickWithRay(new Ray(this.player.position, direction.normalize(), distance), m => m.checkCollisions && m !== this.player.body);
    if (obstruction?.hit && obstruction.distance < distance - 0.8) return null;
    return hit;
  }
  engage() {
    const hit = this.target(); if (!hit?.pickedPoint || !hit.pickedMesh) return false;
    this.anchor = hit.pickedPoint.clone(); this.surface = hit.pickedMesh; this.elapsed = 0;
    this.rope.setEnabled(true); this.player.velocity.y = Math.max(this.player.velocity.y, 6);
    return true;
  }
  release() { this.anchor = undefined; this.surface = undefined; this.rope.setEnabled(false); }
  apply(dt: number) {
    if (!this.anchor || !this.surface || this.surface.isDisposed() || !this.surface.isEnabled()) return false;
    this.elapsed += dt;
    const offset = this.anchor.subtract(this.player.position), distance = offset.length();
    if (distance < movement.grappleReleaseDistance) { this.player.velocity.y = Math.max(this.player.velocity.y, 8); return false; }
    if (this.elapsed > 5 || distance > movement.grappleRange * 1.2) return false;
    this.player.velocity.addInPlace(offset.normalize().scale(movement.grappleAcceleration * dt));
    this.player.velocity.y -= movement.gravity * 0.18 * dt;
    return true;
  }
  render() { if (this.anchor) MeshBuilder.CreateLines('grapple-rope', { points: [this.player.position.add(new Vector3(0, 0.45, 0)), this.anchor], instance: this.rope }); }
}
