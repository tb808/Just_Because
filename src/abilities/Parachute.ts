import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Player } from '../player/Player';
import { movement } from '../data/config';

export function parachuteVelocity(v: { x: number; y: number; z: number }, x: number, z: number, dt: number) {
  const steer = 1 - Math.exp(-2.5 * dt), brake = 1 - Math.exp(-6 * dt);
  v.x += (x - v.x) * steer; v.z += (z - v.z) * steer;
  v.y += (-movement.parachuteSink - v.y) * brake;
}
export class Parachute {
  private root: TransformNode;
  constructor(scene: Scene, private player: Player) {
    this.root = new TransformNode('parachute-rig', scene); this.root.parent = player.body;
    const canopy = MeshBuilder.CreateSphere('parachute-canopy', { diameter: 4.8, segments: 8 }, scene);
    canopy.parent = this.root; canopy.position.y = 3.5; canopy.scaling.set(1.1, 0.24, 0.57);
    const material = new StandardMaterial('canopy-lime', scene); material.diffuseColor = Color3.FromHexString('#d7f19a'); material.specularColor = Color3.Black(); canopy.material = material; canopy.isPickable = false;
    for (const x of [-2, 2]) for (const z of [-0.7, 0.7]) {
      const cord = MeshBuilder.CreateLines('parachute-cord', { points: [new Vector3(x * 0.2, 0.55, 0), new Vector3(x, 3.3, z)] }, scene);
      cord.parent = this.root; cord.color = Color3.FromHexString('#f1edd6'); cord.isPickable = false;
    }
    this.root.setEnabled(false);
  }
  apply(dt: number, yaw: number, strafe: number, forward: number) {
    const speed = 5 + forward * 4, turn = strafe * 4;
    parachuteVelocity(this.player.velocity, Math.sin(yaw) * speed + Math.cos(yaw) * turn, Math.cos(yaw) * speed - Math.sin(yaw) * turn, dt);
    this.root.rotation.y = yaw; this.root.rotation.z = -strafe * 0.12;
  }
  show(active: boolean) { this.root.setEnabled(active); }
}
