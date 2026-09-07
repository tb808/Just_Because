import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Player } from '../player/Player';
import { movement } from '../data/config';

export function glideVelocity(v: { x: number; y: number; z: number }, yaw: number, pitch: number, dt: number) {
  const angle = Math.max(-0.75, Math.min(0.28, pitch));
  const horizontal = Math.hypot(v.x, v.z);
  // Diving trades altitude for speed; climbing loses speed. Drag prevents unlimited acceleration.
  const acceleration = -Math.sin(angle) * 22 - Math.max(0, horizontal - 26) * 0.12;
  const speed = Math.max(movement.wingsuitMinSpeed, Math.min(movement.wingsuitMaxSpeed, horizontal + acceleration * dt));
  const turn = 1 - Math.exp(-2.2 * dt), lift = 1 - Math.exp(-2.8 * dt);
  v.x += (Math.sin(yaw) * speed - v.x) * turn;
  v.z += (Math.cos(yaw) * speed - v.z) * turn;
  v.y += (Math.sin(angle) * speed - 3.3 - v.y) * lift;
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
    glideVelocity(this.player.velocity, yaw + strafe * 0.45, pitch - forward * 0.15, dt);
    this.player.visual.rotation.z = -strafe * 0.3;
  }
  show(active: boolean) { this.mesh.setEnabled(active); if (!active) this.player.visual.rotation.z = 0; }
}
