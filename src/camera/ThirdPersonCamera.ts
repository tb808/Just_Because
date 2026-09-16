import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { cameraConfig } from '../data/config';
import { InputManager } from '../core/InputManager';
import { Player } from '../player/Player';
import { pickCollision } from '../world/CollisionQueries';

export class ThirdPersonCamera {
  readonly camera: FreeCamera;
  yaw = 0.885;
  pitch = -0.045;
  sensitivity = cameraConfig.sensitivity;
  private distance = cameraConfig.distance;
  private currentDistance = cameraConfig.distance;
  private shake = 0;
  private time = 0;
  private shoulder = 0.8;
  private lastAnchor?: Vector3;
  kick(recoil: number) { this.pitch += recoil; this.shake = Math.min(0.4, this.shake + recoil * 2); }
  blast(strength: number) { this.shake = Math.min(0.65, this.shake + strength); }
  constructor(private scene: Scene, private player: Player, private input: InputManager) {
    this.camera = new FreeCamera('third-person', new Vector3(0, 15, -100), scene);
    this.camera.minZ = 0.1; this.camera.maxZ = 5200; this.camera.fov = 0.9; scene.activeCamera = this.camera;
  }
  get forward() { return new Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  get heading() { return new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  aimRay(range: number) { return new Ray(this.camera.position.clone(), this.camera.getForwardRay().direction, range); }
  update(dt: number, snap = false) {
    const lookX=this.input.lookX;
    this.yaw += lookX * this.sensitivity;
    this.yaw += (Number(this.input.down('lookRight')) - Number(this.input.down('lookLeft'))) * dt * 1.5;
    this.pitch += (Number(this.input.down('lookUp')) - Number(this.input.down('lookDown'))) * dt;
    const driving=this.player.state==='IN_VEHICLE';
    if(driving&&Math.abs(lookX)<.1&&!this.input.down('lookLeft')&&!this.input.down('lookRight')) {
      const heading=this.player.visual.rotation.y,difference=Math.atan2(Math.sin(heading-this.yaw),Math.cos(heading-this.yaw));
      this.yaw+=difference*(1-Math.exp(-2.2*dt));
    }
    if (!Number.isFinite(this.yaw)) this.yaw = 0.885;
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
    if (!Number.isFinite(this.pitch)) this.pitch = -0.045;
    this.pitch = Math.max(driving?-.62:-1.05, Math.min(driving?.18:.85, this.pitch - this.input.lookY * this.sensitivity));
    this.distance = Math.max(cameraConfig.minDistance, Math.min(cameraConfig.maxDistance, this.distance + this.input.zoom * 0.7));
    if (!Number.isFinite(this.distance)) this.distance = cameraConfig.distance;
    this.input.lookX = this.input.lookY = this.input.zoom = 0;
    const aiming = this.input.aiming;
    const desired = aiming ? 3.2 : driving ? Math.max(9.5,this.distance+2.5) : this.player.state === 'WINGSUIT' ? 11 : this.player.speed > 10 ? this.distance + 1.5 : this.distance;
    if(snap)this.currentDistance=desired;else this.currentDistance += (desired - this.currentDistance) * (1 - Math.exp(-5 * dt));
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const desiredShoulder=driving?0:aiming?.7:.8;
    if(snap)this.shoulder=desiredShoulder;else this.shoulder += (desiredShoulder - this.shoulder) * (1 - Math.exp(-10 * dt));
    const anchor = this.player.position.add(new Vector3(0, driving?.6:.85, 0));
    // Follow player translation immediately. Only the camera's orbit should lag;
    // smoothing its world position can leave a retracted camera in front of a
    // fast airborne player and make it turn around for a frame.
    if (!snap && this.lastAnchor) this.camera.position.addInPlace(anchor.subtract(this.lastAnchor));
    this.lastAnchor = anchor.clone();
    const target = anchor.add(right.scale(this.shoulder));
    const wanted = target.subtract(this.forward.scale(this.currentDistance));
    const smoothPosition = snap ? wanted : Vector3.Lerp(this.camera.position, wanted, 1 - Math.exp(-cameraConfig.smoothing * dt));
    const offset = smoothPosition.subtract(target), offsetLength = offset.length();
    const validOffset = Number.isFinite(offsetLength) && offsetLength > 0.001;
    const direction = validOffset ? offset.scale(1 / offsetLength) : this.forward.scale(-1);
    const castLength = validOffset ? offsetLength : this.currentDistance;
    let safe = castLength;
    // Five parallel rays approximate a small camera volume, avoiding corner clipping.
    for (const shift of [Vector3.Zero(), right.scale(0.22), right.scale(-0.22), Vector3.Up().scale(0.2), Vector3.Down().scale(0.2)]) {
      const hit = pickCollision(this.scene, new Ray(target.add(shift), direction, castLength), this.player.body, mesh=>!!mesh.metadata?.cameraIgnore);
      if (hit?.hit) safe = Math.min(safe, Math.max(0.35, hit.distance - 0.35));
    }
    this.camera.position.copyFrom(target.add(direction.scale(safe)));
    this.camera.setTarget(target);
    this.time += dt; this.shake *= Math.exp(-9 * dt);
    this.camera.rotation.x += Math.sin(this.time * 61) * this.shake * 0.03;
    this.camera.rotation.z = Math.sin(this.time * 47) * this.shake * 0.025;
    const fov = aiming ? 0.68 : 0.9 + Math.min(this.player.speed / 200, 0.2);
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-4 * dt));
  }
}
