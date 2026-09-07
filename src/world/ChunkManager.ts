import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { type TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { worldConfig } from '../data/config';

interface Chunk { x: number; z: number; active: boolean; nodes: TransformNode[] }
export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private timer = 0;
  get activeCount() { return [...this.chunks.values()].filter(c => c.active).length; }
  add(node: TransformNode) {
    const x = Math.floor(node.position.x / worldConfig.chunkSize), z = Math.floor(node.position.z / worldConfig.chunkSize);
    const key = `${x}:${z}`;
    let chunk = this.chunks.get(key);
    if (!chunk) { chunk = { x, z, active: true, nodes: [] }; this.chunks.set(key, chunk); }
    chunk.nodes.push(node);
  }
  update(dt: number, position: Vector3) {
    this.timer -= dt; if (this.timer > 0) return; this.timer = 0.5;
    for (const c of this.chunks.values()) {
      const distance = Math.hypot((c.x + 0.5) * worldConfig.chunkSize - position.x, (c.z + 0.5) * worldConfig.chunkSize - position.z);
      const active = distance < worldConfig.activeDistance + (c.active ? 45 : 0);
      if (active !== c.active) { c.active = active; c.nodes.forEach(n => n.setEnabled(active)); }
    }
  }
}
