import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { traversalRoute, type TraversalObjective } from '../data/missions';
import { Player } from '../player/Player';

export function objectiveReached(objective: TraversalObjective, position: Vector3, state: string) {
  return Vector3.DistanceSquared(position, Vector3.FromArray(objective.position)) <= objective.radius ** 2 && (!objective.requiredState || objective.requiredState === state);
}
export class MissionManager {
  private index = 0;
  private rings: Mesh[];
  private elapsed = 0;
  onAdvance: (message: string) => void = () => {};
  get complete() { return this.index >= traversalRoute.length; }
  get objective() { return traversalRoute[this.index]; }
  get progress() { return this.index / traversalRoute.length; }
  get count() { return `${Math.min(this.index, traversalRoute.length)} / ${traversalRoute.length} CHECKPOINTS`; }
  get time() { return this.elapsed; }
  constructor(scene: Scene) {
    const material = new StandardMaterial('checkpoint-gold', scene); material.diffuseColor = Color3.FromHexString('#f3c65a'); material.emissiveColor = Color3.FromHexString('#9b751b');
    this.rings = traversalRoute.map((point, i) => {
      const ring = MeshBuilder.CreateTorus(`checkpoint-${point.id}`, { diameter: 6, thickness: 0.13, tessellation: 32 }, scene);
      ring.position.copyFromFloats(...point.position); ring.position.y += 2; ring.rotation.x = Math.PI / 2; ring.material = material; ring.isPickable = false;
      ring.setEnabled(i === 0); return ring;
    });
  }
  update(dt: number, player: Player) {
    if (this.complete) return;
    this.elapsed += dt; this.rings[this.index].rotation.y += dt * 0.25;
    if (objectiveReached(this.objective, player.position, player.state)) {
      this.rings[this.index].setEnabled(false); this.index++;
      if (!this.complete) this.rings[this.index].setEnabled(true);
      this.onAdvance(this.complete ? `Höhenroute geschafft · ${Math.round(this.elapsed)} Sekunden. Die Insel gehört deinem nächsten Sprung.` : 'Checkpoint erreicht · Weiter zum nächsten Relais.');
    }
  }
  reset() { this.index = 0; this.elapsed = 0; this.rings.forEach((r, i) => r.setEnabled(i === 0)); }
}
