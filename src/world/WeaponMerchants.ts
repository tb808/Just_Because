import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetManager } from '../core/AssetManager';
import type { ChunkManager } from './ChunkManager';
import { assets, residentCharacterModels } from '../data/assets';
import { settlements } from '../data/world';
import { weaponIds } from '../data/weapons';
import { terrainHeight } from './Terrain';

// The south approach to the reserved east market stall stays clear of story contacts.
export const weaponMerchants = settlements.map(town => ({
  id: town.id, name: `Waffenhandel · ${town.name}`,
  position: [town.market[0] + 21, terrainHeight(...town.market) + 1, town.market[1] + 9] as [number, number, number],
}));
export type WeaponMerchant = typeof weaponMerchants[number];
export function nearbyWeaponMerchant(position: Vector3) {
  return weaponMerchants.find(merchant => Vector3.DistanceSquared(position, Vector3.FromArray(merchant.position)) < 25);
}

export async function buildWeaponMerchants(scene: Scene, manager: AssetManager, chunks: ChunkManager) {
  for (const [index, merchant] of weaponMerchants.entries()) {
    const root = new TransformNode(`merchant-${merchant.id}`, scene);
    root.position.copyFromFloats(merchant.position[0], merchant.position[1] - 1, merchant.position[2] + 4);
    const vendor = await manager.instantiate(residentCharacterModels[index % residentCharacterModels.length], `merchant-${merchant.id}-vendor`);
    vendor.root.parent = root; vendor.root.position.set(0, 0.16, 2.3); vendor.root.rotation.y = Math.PI;
    for (let slot = 0; slot < 3; slot++) {
      const id = weaponIds[(index * 3 + slot) % weaponIds.length];
      const model = await manager.instantiate(assets.weapons[id], `merchant-${merchant.id}-${id}`);
      model.root.parent = root; model.root.position.set((slot - 1) * 1.8, 1.48, 0);
      model.root.rotation.y = Math.PI / 2;
    }
    if (typeof document !== 'undefined') {
      const sign = MeshBuilder.CreatePlane(`merchant-${merchant.id}-sign`, { width: 5.8, height: 1 }, scene);
      sign.parent = root; sign.position.set(0, 3.9, 0); sign.isPickable = false;
      const material = new StandardMaterial(`merchant-${merchant.id}-sign`, scene);
      const texture = new DynamicTexture(`merchant-${merchant.id}-label`, { width: 1024, height: 176 }, scene, false);
      texture.drawText('WAFFEN  /  HANDEL', null, 115, 'bold 65px sans-serif', '#f6d799', '#153237', true);
      material.diffuseTexture = texture; material.emissiveColor = Color3.White(); material.backFaceCulling = false;
      sign.material = material;
    }
    chunks.add(root);
  }
}
