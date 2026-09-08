import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Player } from '../player/Player';
import { movement } from '../data/config';

export function glideVelocity(v: { x: number; y: number; z: number }, yaw: number, pitch: number, dt: number) {
  // Camera pitch is the pilot's requested attitude. A small negative trim keeps a
  // neutral wingsuit in a sustainable glide instead of flying level for free.
  const requestedPitch = Math.max(-0.78, Math.min(0.4, pitch - 0.08));
  const oldSpeed = Math.hypot(v.x, v.y, v.z);
  const speed = Math.max(movement.wingsuitMinSpeed, oldSpeed);
  const horizontal = Math.hypot(v.x, v.z);
  const flightPitch = oldSpeed > 0.01 ? Math.atan2(v.y, horizontal) : requestedPitch;

  // Gravity accelerates a dive and consumes airspeed during a climb. Parasite
  // drag rises quadratically, so neither a long dive nor level flight can create
  // unlimited energy.
  const parasiteDrag = 0.55 + 0.0085 * (speed - 27) ** 2;
  const angleOfAttack = Math.abs(requestedPitch - flightPitch);
  const controlDrag = Math.max(0, angleOfAttack - 0.18) * 2.4;
  const nextSpeed = Math.max(8, Math.min(movement.wingsuitMaxSpeed,
    speed + (-movement.gravity * Math.sin(flightPitch) - parasiteDrag - controlDrag) * dt));

  // Below the configured flying speed the suit progressively loses lift and the
  // nose drops. Diving restores airflow and therefore control authority.
  const lift = Math.max(0, Math.min(1, (nextSpeed - 8) / (movement.wingsuitMinSpeed - 8)));
  const controlledPitch = -0.48 + (requestedPitch + 0.48) * lift;
  const targetX = Math.sin(yaw) * Math.cos(controlledPitch);
  const targetY = Math.sin(controlledPitch);
  const targetZ = Math.cos(yaw) * Math.cos(controlledPitch);
  let dirX = oldSpeed > 0.01 ? v.x / oldSpeed : targetX;
  let dirY = oldSpeed > 0.01 ? v.y / oldSpeed : targetY;
  let dirZ = oldSpeed > 0.01 ? v.z / oldSpeed : targetZ;
  const steering = 1 - Math.exp(-(1.15 + lift * 1.9) * dt);
  dirX += (targetX - dirX) * steering;
  dirY += (targetY - dirY) * steering;
  dirZ += (targetZ - dirZ) * steering;
  const length = Math.hypot(dirX, dirY, dirZ) || 1;
  v.x = dirX / length * nextSpeed;
  v.y = dirY / length * nextSpeed;
  v.z = dirZ / length * nextSpeed;
}
export class Wingsuit {
  private mesh: Mesh;
  constructor(scene: Scene, private player: Player) {
    this.mesh = new Mesh('Nika-wingsuit', scene);
    const data = new VertexData();
    data.positions = [-1.05, 1.2, -0.15, -0.22, 0.2, -0.15, -0.3, 1.25, -0.15, 1.05, 1.2, -0.15, 0.22, 0.2, -0.15, 0.3, 1.25, -0.15];
    data.indices = [0, 1, 2, 3, 5, 4]; const normals: number[] = []; VertexData.ComputeNormals(data.positions, data.indices, normals); data.normals = normals; data.applyToMesh(this.mesh);
    const material = new StandardMaterial('wingsuit-membrane', scene); material.diffuseColor = Color3.FromHexString('#ddf49a'); material.backFaceCulling = false;
    this.mesh.material = material; this.mesh.parent = player.visual; this.mesh.isPickable = false; this.mesh.setEnabled(false);
  }
  apply(dt: number, yaw: number, pitch: number, strafe: number, forward: number) {
    const targetYaw = yaw + strafe * 0.62;
    glideVelocity(this.player.velocity, targetYaw, pitch - forward * 0.28, dt);
    const velocityYaw = Math.atan2(this.player.velocity.x, this.player.velocity.z);
    const turnError = Math.atan2(Math.sin(targetYaw - velocityYaw), Math.cos(targetYaw - velocityYaw));
    this.player.flightPitch = Math.atan2(this.player.velocity.y, Math.hypot(this.player.velocity.x, this.player.velocity.z));
    this.player.flightRoll = Math.max(-0.72, Math.min(0.72, -turnError * 1.35 - strafe * 0.16));
  }
  show(active: boolean) {
    this.mesh.setEnabled(active);
    if (!active) { this.player.flightPitch = 0; this.player.flightRoll = 0; }
  }
}
