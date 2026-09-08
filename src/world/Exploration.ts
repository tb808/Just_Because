import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { settlements } from '../data/world';
import { worldConfig } from '../data/config';
import { terrainHeight } from './Terrain';

/** Stable location IDs keep discovery independent of order and old save files. */
export class Exploration {
  readonly discovered = new Set<string>(['ventosa']);
  onDiscover: (name: string) => void = () => {};
  update(position: Vector3) {
    for (const place of settlements) {
      if (this.discovered.has(place.id) || Math.hypot(position.x - place.center[0], position.z - place.center[1]) > place.radius + 25) continue;
      this.discovered.add(place.id); this.onDiscover(place.name);
    }
  }
  destination(id: string, danger: boolean, grounded: boolean) {
    if (danger || !grounded || !this.discovered.has(id)) return undefined;
    const place = settlements.find(s => s.id === id);
    if (!place) return undefined;
    const [x, z] = place.residentRoute[0];
    return new Vector3(x, terrainHeight(x, z) + 1.2, z);
  }
  restore(ids: readonly string[]) {
    this.reset();
    for (const id of ids) if (settlements.some(s => s.id === id)) this.discovered.add(id);
  }
  reset() { this.discovered.clear(); this.discovered.add('ventosa'); }
}

export function validSavedPosition(position: readonly number[]) {
  const [x, y, z] = position, limit = worldConfig.size / 2 - 12;
  return position.length === 3 && position.every(Number.isFinite) && Math.abs(x) < limit && Math.abs(z) < limit
    && y > Math.max(-3, terrainHeight(x, z) - 2) && y < 1500;
}
