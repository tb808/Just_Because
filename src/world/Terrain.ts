import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { worldConfig } from '../data/config';

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function terrainHeight(x: number, z: number) {
  const radius = Math.sqrt((x / 235) ** 2 + (z / 255) ** 2);
  const island = 1 - smooth(0.72, 1.05, radius);
  const mountain = 72 * Math.exp(-((x + 65) ** 2 / 6800 + (z - 145) ** 2 / 3400));
  const ridge = 29 * Math.exp(-((x - 125) ** 2 / 2800 + (z - 75) ** 2 / 5500));
  return -7 + island * (13 + (mountain + ridge) * smooth(35, 90, z));
}
export function createTerrain(scene: Scene) {
  const material = new StandardMaterial('terrain', scene); material.diffuseColor = Color3.White(); material.specularColor = Color3.Black();
  const tiles: Mesh[] = [];
  // Smaller bounds let Babylon reject distant terrain before triangle-level ray/collision work.
  for (let tz = 0; tz < 8; tz++) for (let tx = 0; tx < 8; tx++) tiles.push(createTile(scene, material, tx, tz));
  return tiles;
}
function createTile(scene: Scene, material: StandardMaterial, tx: number, tz: number) {
  const size = worldConfig.size / 8, n = worldConfig.subdivisions / 8;
  const positions: number[] = [], indices: number[] = [], colors: number[] = [], normals: number[] = [];
  for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) {
    const px = (tx + x / n) * size - worldConfig.size / 2, pz = (tz + z / n) * size - worldConfig.size / 2;
    const y = terrainHeight(px, pz);
    positions.push(px, y, pz);
    const tint = y < 3 ? '#dfd09b' : y > 49 ? '#88958a' : y > 20 ? '#639b73' : '#85b777';
    const c = Color3.FromHexString(tint).scale(0.94 + 0.06 * Math.sin(px * 0.21 + pz * 0.13));
    colors.push(c.r, c.g, c.b, 1);
    if (x < n && z < n) { const i = z * (n + 1) + x; indices.push(i, i + 1, i + n + 1, i + 1, i + n + 2, i + n + 1); }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); Object.assign(data, { positions, indices, normals, colors });
  const mesh = new Mesh(`terrain-${tx}-${tz}`, scene); data.applyToMesh(mesh);
  mesh.convertToFlatShadedMesh(); mesh.checkCollisions = true; mesh.receiveShadows = true;
  mesh.material = material;
  mesh.freezeWorldMatrix(); return mesh;
}
