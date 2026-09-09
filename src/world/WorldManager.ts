import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { AssetManager } from '../core/AssetManager';
import { assets, type AssetDefinition } from '../data/assets';
import { createTerrain, terrainHeight } from './Terrain';
import { ChunkManager } from './ChunkManager';
import { expandWorld } from './WorldExpansion';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export interface WorldDestructible { id: string; root: TransformNode; collider: Mesh }
export interface WorldVehicle {
  id: string; root: TransformNode; collider: Mesh; centerOffset: Vector3;
  initialPosition: Vector3; initialRotationY: number; occupied: boolean; ambient: boolean;
}

export class WorldManager {
  readonly chunks = new ChunkManager();
  readonly spawn = new Vector3(-20, 8, -300);
  readonly destructibles: WorldDestructible[] = [];
  readonly vehicles: WorldVehicle[] = [];
  readonly supply = new Vector3(66, 7, -282);
  readonly supplies: Array<{baseId: string; position: [number,number,number]}> = [];
  readonly flags = new Map<string, Mesh>();
  setBaseLiberated(id: string, liberated: boolean) { const flag=this.flags.get(id); if(flag) flag.material=this.material(liberated?'#b8e976':'#cf6548'); }
  private materials = new Map<string, StandardMaterial>();
  constructor(readonly scene: Scene, private assetsManager: AssetManager) {}
  material(color: string) {
    if (!this.materials.has(color)) {
      const m = new StandardMaterial(color, this.scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black();
      this.materials.set(color, m);
    }
    return this.materials.get(color)!;
  }
  box(name: string, x: number, y: number, z: number, width: number, height: number, depth: number, color: string, collision = true) {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
    mesh.position.set(x, y, z); mesh.material = this.material(color); mesh.checkCollisions = collision; mesh.isPickable = collision; mesh.receiveShadows = true;
    mesh.metadata = { worldStatic: true }; mesh.freezeWorldMatrix(); this.chunks.add(mesh); return mesh;
  }
  async create() {
    const scene = this.scene;
    scene.clearColor = new Color4(0.56, 0.79, 0.86, 1);
    scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 330; scene.fogEnd = 940; scene.fogColor = new Color3(0.56, 0.79, 0.86);
    scene.collisionsEnabled = true;
    const ambient = new HemisphericLight('sky', Vector3.Up(), scene); ambient.intensity = 0.7; ambient.groundColor = Color3.FromHexString('#577770');
    const sun = new DirectionalLight('sun', new Vector3(-0.7, -1, 0.4), scene); sun.intensity = 0.95; sun.diffuse = Color3.FromHexString('#fff1cf');
    createTerrain(scene);
    const sea = MeshBuilder.CreateGround('Mediterranean sea', { width: 10000, height: 10000 }, scene);
    sea.position.y = 0.3; sea.material = this.material('#1d9cad'); sea.isPickable = false;
    // Traversal line starts above the southern village and leads toward the interior.
    const stages = [{ x: -26, z: -320, h: 7 }, { x: 34, z: -230, h: 28 }, { x: 112, z: -82, h: 48 }, { x: 202, z: -170, h: 15 }];
    stages.forEach((p, i) => {
      const ground = terrainHeight(p.x, p.z);
      this.box(`relay-${i}`, p.x, ground + p.h / 2, p.z, i === 0 ? 16 : 9, p.h, 12, '#d5ddd0');
      this.box(`relay-cap-${i}`, p.x, ground + p.h, p.z, i === 0 ? 17 : 11, 0.45, 13, '#294d52');
      this.box(`relay-stripe-${i}`, p.x, ground - 1 + p.h, p.z - 6.06, 9, 1, 0.1, '#e3a945', false);
      if (i > 0) {
        for (let floor = 4; floor < p.h; floor += 5) this.box(`relay-vents-${i}-${floor}`, p.x, ground + floor, p.z - 6.08, 5.5, 0.85, 0.16, '#547675', false);
        this.box(`relay-mast-${i}`, p.x + 2.5, ground + p.h + 3, p.z + 2, 0.25, 6, 0.25, '#31555a');
        this.box(`relay-beacon-${i}`, p.x + 2.5, ground + p.h + 6, p.z + 2, 0.55, 0.6, 0.55, '#e3a945', false);
      }
    });
    // Start on the clear village road, in front of the lookout building and
    // within reach of the expanded island transport network.
    this.spawn.set(-20, terrainHeight(-20, -300) + 1, -300);
    const stationY = terrainHeight(66, -282);
    this.box('station-canopy', 66, stationY + 6, -282, 18, 0.7, 11, '#dd7b48');
    [-7, 7].forEach(x => this.box('station-pillar', 66 + x, stationY + 3, -282, 0.5, 6, 0.5, '#d5ddd0'));
    [-4, 4].forEach(x => this.box('fuel-pump', 66 + x, stationY + 1.1, -282, 1, 2.2, 1, '#dd7b48'));
    await this.place(assets.vehicles.car, 'parked-car', 66, -266, terrainHeight(66,-266)+.2, true);
    await expandWorld(this);
  }
  async place(def: AssetDefinition, name: string, x: number, z: number, y = terrainHeight(x, z), collision = false) {
    const instance = await this.assetsManager.instantiate(def, name); instance.root.position.set(x, y, z);
    if (collision) {
      instance.root.computeWorldMatrix(true);
      const b = instance.root.getHierarchyBoundingVectors(true);
      const size = b.max.subtract(b.min), center = b.max.add(b.min).scale(0.5);
      const proxy = this.box(`${name}-collider`, center.x, center.y, center.z, size.x, size.y, size.z, '#ffffff'); proxy.visibility = 0;
      if (name.startsWith('fuel-')) { proxy.metadata = { damageId: name }; this.destructibles.push({ id: name, root: instance.root, collider: proxy }); }
      if (def.path === assets.vehicles.car.path) this.registerVehicle(instance.root, name, proxy, false);
    }
    this.chunks.add(instance.root);
    return instance;
  }

  registerVehicle(root: TransformNode, id: string, collider?: Mesh, ambient = true) {
    root.computeWorldMatrix(true);
    const bounds = root.getHierarchyBoundingVectors(true);
    let size = bounds.max.subtract(bounds.min), center = bounds.max.add(bounds.min).scale(.5);
    if (!size.asArray().every(Number.isFinite) || size.x < .5 || size.y < .5 || size.z < .5) {
      size = new Vector3(2.25, 1.75, 4.5); center = root.position.add(new Vector3(0, .95, 0));
    }
    const proxy = collider ?? MeshBuilder.CreateBox(`${id}-collider`, {width:size.x,height:size.y,depth:size.z}, this.scene);
    proxy.position.copyFrom(center); proxy.visibility = 0; proxy.isPickable = true; proxy.checkCollisions = true;
    proxy.ellipsoid.copyFromFloats(Math.max(.75,size.x*.44),Math.max(.6,size.y*.44),Math.max(1.2,size.z*.44));
    proxy.ellipsoidOffset.setAll(0); proxy.collisionRetryCount = 8; proxy.unfreezeWorldMatrix();
    const dx=center.x-root.position.x,dz=center.z-root.position.z,c=Math.cos(root.rotation.y),s=Math.sin(root.rotation.y);
    const vehicle: WorldVehicle = {
      id,root,collider:proxy,centerOffset:new Vector3(dx*c-dz*s,center.y-root.position.y,dx*s+dz*c),
      initialPosition:root.position.clone(),initialRotationY:root.rotation.y,occupied:false,ambient,
    };
    if (!ambient) {
      root.metadata={...root.metadata,alwaysActive:true}; proxy.metadata={...proxy.metadata,alwaysActive:true};
    }
    this.vehicles.push(vehicle); return vehicle;
  }
}
