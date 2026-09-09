import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { settlements } from '../data/world';
import { worldConfig } from '../data/config';
import { terrainHeight } from './Terrain';

export const surveyCellSize = 120;
export const surveyRadius = 250;
const half = worldConfig.size / 2;
const cellsPerAxis = Math.ceil(worldConfig.size / surveyCellSize);
const cellKey = (x: number, z: number) => `${Math.floor((x + half) / surveyCellSize)}:${Math.floor((z + half) / surveyCellSize)}`;
const parseCell = (key: string) => {
  const match = /^(\d+):(\d+)$/.exec(key);
  if (!match) return undefined;
  const x = Number(match[1]), z = Number(match[2]);
  if (x < 0 || z < 0 || x >= cellsPerAxis || z >= cellsPerAxis) return undefined;
  return { x, z, worldX: -half + (x + .5) * surveyCellSize, worldZ: -half + (z + .5) * surveyCellSize };
};

/** Stable location IDs keep discovery independent of order and old save files. */
export class Exploration {
  readonly discovered = new Set<string>(['ventosa']);
  readonly surveyed = new Set<string>();
  revision = 0;
  onDiscover: (name: string) => void = () => {};
  constructor() { this.reveal(settlements[0].center[0], settlements[0].center[1]); }
  update(position: Vector3) {
    this.reveal(position.x, position.z);
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
  restore(ids: readonly string[], surveyedCells: readonly string[] = []) {
    this.reset();
    for (const id of ids) {
      const place = settlements.find(s => s.id === id);
      if (!place) continue;
      this.discovered.add(id);
      // Old saves did not retain travelled map cells, but discovered towns remain visible.
      if (!surveyedCells.length) this.reveal(place.center[0], place.center[1]);
    }
    for (const key of surveyedCells) if (parseCell(key)) this.surveyed.add(key);
    this.revision++;
  }
  isSurveyed(x: number, z: number) {
    const cx = Math.floor((x + half) / surveyCellSize), cz = Math.floor((z + half) / surveyCellSize);
    const reach = Math.ceil(surveyRadius / surveyCellSize) + 1;
    for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
      const cell = parseCell(`${cx + dx}:${cz + dz}`);
      if (cell && this.surveyed.has(`${cell.x}:${cell.z}`) && Math.hypot(x - cell.worldX, z - cell.worldZ) <= surveyRadius) return true;
    }
    return false;
  }
  visibilityPath() {
    return [...this.surveyed].map(key => {
      const cell = parseCell(key)!;
      const x = cell.worldX, y = -cell.worldZ, r = surveyRadius;
      return `M${x-r},${y}a${r},${r} 0 1,0 ${r*2},0a${r},${r} 0 1,0 ${-r*2},0Z`;
    }).join(' ');
  }
  reset() {
    this.discovered.clear(); this.discovered.add('ventosa'); this.surveyed.clear();
    this.reveal(settlements[0].center[0], settlements[0].center[1]); this.revision++;
  }
  private reveal(x: number, z: number) {
    const key = cellKey(x, z);
    if (!parseCell(key) || this.surveyed.has(key)) return;
    this.surveyed.add(key); this.revision++;
  }
}

export function validSavedPosition(position: readonly number[]) {
  const [x, y, z] = position, limit = worldConfig.size / 2 - 12;
  return position.length === 3 && position.every(Number.isFinite) && Math.abs(x) < limit && Math.abs(z) < limit
    && y > Math.max(-3, terrainHeight(x, z) - 2) && y < 1500;
}
