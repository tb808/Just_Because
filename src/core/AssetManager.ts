import { AssetContainer, type InstantiatedEntries } from '@babylonjs/core/assetContainer';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Animations/animatable';
import type { AssetDefinition } from '../data/assets';

export interface ModelInstance { root: TransformNode; entries?: InstantiatedEntries; fallback: boolean }
export class AssetManager {
  private cache = new Map<string, Promise<AssetContainer>>();
  readonly failures = new Set<string>();
  completed = 0;
  requested = 0;
  onProgress: (done: number, total: number) => void = () => {};
  constructor(private scene: Scene) {}

  private load(path: string) {
    let pending = this.cache.get(path);
    if (!pending) {
      this.requested++;
      pending = LoadAssetContainerAsync(`${import.meta.env.BASE_URL}${path}`, this.scene)
        .then(container => { container.animationGroups.forEach(a => a.stop()); container.meshes.forEach(m => m.receiveShadows = true); return container; })
        .finally(() => { this.completed++; this.onProgress(this.completed, this.requested); });
      this.cache.set(path, pending);
    }
    return pending;
  }
  async instantiate(definition: AssetDefinition, name: string): Promise<ModelInstance> {
    const root = new TransformNode(name, this.scene);
    try {
      const container = await this.load(definition.path);
      const entries = container.instantiateModelsToScene(n => `${name}:${n}`, !!definition.tint, { doNotInstantiate: !!definition.animated || !!definition.tint });
      entries.rootNodes.forEach(n => n.parent = root);
      entries.animationGroups.forEach(a => a.stop());
      root.getChildMeshes().forEach(m => { m.isPickable = false; m.checkCollisions = false; });
      if (definition.tint) for (const mesh of root.getChildMeshes()) {
        const material = new StandardMaterial(`${name}:paint`, this.scene); material.diffuseColor = Color3.FromHexString(definition.tint); material.specularColor = Color3.Black(); mesh.material = material;
      }
      root.computeWorldMatrix(true);
      const bounds = root.getHierarchyBoundingVectors(true);
      const height = Math.max(0.01, bounds.max.y - bounds.min.y);
      root.scaling.setAll(definition.height / height);
      // Keep feet/base at root origin using a separate model pivot.
      const pivot = new TransformNode(`${name}:offset`, this.scene);
      pivot.parent = root;
      entries.rootNodes.forEach(n => n.parent = pivot);
      pivot.position.y = -bounds.min.y;
      return { root, entries, fallback: false };
    } catch (error) {
      if (!this.failures.has(definition.path)) console.warn(`Asset fallback: ${definition.path}`, error);
      this.failures.add(definition.path);
      const mesh = MeshBuilder.CreateCapsule(`${name}:fallback`, { height: definition.height, radius: definition.height / 5 }, this.scene);
      const material = new StandardMaterial(`${name}:fallback-material`, this.scene);
      material.diffuseColor = Color3.FromHexString('#ffbd59'); mesh.material = material;
      mesh.position.y = definition.height / 2; mesh.parent = root; mesh.isPickable = false;
      return { root, fallback: true };
    }
  }
  dispose() { for (const pending of this.cache.values()) void pending.then(c => c.dispose()).catch(() => {}); this.cache.clear(); }
}
