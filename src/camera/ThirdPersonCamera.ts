import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { cameraConfig } from '../data/config';
import { InputManager } from '../core/InputManager';
import { Player } from '../player/Player';

export class ThirdPersonCamera {
  readonly camera: FreeCamera;
  yaw = 0.06;
  pitch = 0.2;
  sensitivity = cameraConfig.sensitivity;
  private distance = cameraConfig.distance;
  private currentDistance = cameraConfig.distance;
  constructor(private scene: Scene, private player: Player, private input: InputManager) {
    this.camera = new FreeCamera('third-person', new Vector3(0, 15, -100), scene);
    this.camera.minZ = 0.1; this.camera.maxZ = 1100; this.camera.fov = 0.9; scene.activeCamera = this.camera;
  }
  get forward() { return new Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  get heading() { return new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  aimRay(range: number) { return new Ray(this.camera.position.clone(), this.camera.getForwardRay().direction, range); }
  update(dt: number, snap = false) {
    this.yaw += this.input.lookX * this.sensitivity;
    this.yaw += (Number(this.input.down('lookRight')) - Number(this.input.down('lookLeft'))) * dt * 1.5;
    this.pitch += (Number(this.input.down('lookUp')) - Number(this.input.down('lookDown'))) * dt;
    this.pitch = Math.max(-1.05, Math.min(0.85, this.pitch - this.input.lookY * this.sensitivity));
    this.distance = Math.max(cameraConfig.minDistance, Math.min(cameraConfig.maxDistance, this.distance + this.input.zoom * 0.7));
    this.input.lookX = this.input.lookY = this.input.zoom = 0;
    const aiming = this.input.aiming;
    const desired = aiming ? 3.2 : this.player.state === 'WINGSUIT' ? 11 : this.player.speed > 10 ? this.distance + 1.5 : this.distance;
    this.currentDistance += (desired - this.currentDistance) * (1 - Math.exp(-5 * dt));
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const target = this.player.position.add(new Vector3(0, 0.65, 0)).add(right.scale(aiming ? 0.65 : 0.2));
    const wanted = target.subtract(this.forward.scale(this.currentDistance));
    const smoothPosition = snap ? wanted : Vector3.Lerp(this.camera.position, wanted, 1 - Math.exp(-cameraConfig.smoothing * dt));
    const offset = smoothPosition.subtract(target), length = offset.length(), direction = offset.normalize();
    let safe = length;
    // Five parallel rays approximate a small camera volume, avoiding corner clipping.
    for (const shift of [Vector3.Zero(), right.scale(0.22), right.scale(-0.22), Vector3.Up().scale(0.2), Vector3.Down().scale(0.2)]) {
      const hit = this.scene.pickWithRay(new Ray(target.add(shift), direction, length), mesh => mesh.checkCollisions && mesh !== this.player.body);
      if (hit?.hit) safe = Math.min(safe, Math.max(0.35, hit.distance - 0.35));
    }
    this.camera.position.copyFrom(target.add(direction.scale(safe)));
    this.camera.setTarget(target);
    const fov = aiming ? 0.68 : 0.9 + Math.min(this.player.speed / 200, 0.2);
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-4 * dt));
  }
}
