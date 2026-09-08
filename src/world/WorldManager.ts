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
import { bases } from '../data/bases';
import { settlements } from '../data/world';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export interface WorldDestructible { id: string; root: TransformNode; collider: Mesh }

export class WorldManager {
  readonly chunks = new ChunkManager();
  readonly spawn = new Vector3(-26, 8, -320);
  readonly destructibles: WorldDestructible[] = [];
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
    mesh.freezeWorldMatrix(); return mesh;
  }
  async create() {
    const scene = this.scene;
    scene.clearColor = new Color4(0.56, 0.79, 0.86, 1);
    scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 330; scene.fogEnd = 940; scene.fogColor = new Color3(0.56, 0.79, 0.86);
    scene.collisionsEnabled = true;
    const ambient = new HemisphericLight('sky', Vector3.Up(), scene); ambient.intensity = 0.7; ambient.groundColor = Color3.FromHexString('#577770');
    const sun = new DirectionalLight('sun', new Vector3(-0.7, -1, 0.4), scene); sun.intensity = 0.95; sun.diffuse = Color3.FromHexString('#fff1cf');
    createTerrain(scene);
    const sea = MeshBuilder.CreateGround('Mediterranean sea', { width: 5000, height: 5000 }, scene);
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
    this.spawn.set(-26, terrainHeight(-26,-320) + 7.3, -320);
    const stationY = terrainHeight(66, -282);
    this.box('station-canopy', 66, stationY + 6, -282, 18, 0.7, 11, '#dd7b48');
    [-7, 7].forEach(x => this.box('station-pillar', 66 + x, stationY + 3, -282, 0.5, 6, 0.5, '#d5ddd0'));
    [-4, 4].forEach(x => this.box('fuel-pump', 66 + x, stationY + 1.1, -282, 1, 2.2, 1, '#dd7b48'));
    await this.decorate();
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
    } else this.chunks.add(instance.root);
    return instance;
  }
  private async decorate() {
    await Promise.all([
      ...settlements.flatMap(settlement => settlement.homes.map(([x,z], index) => this.place(assets.environment.house, `${settlement.id}-house-${index}`, x, z, terrainHeight(x, z), true))),
      this.place(assets.vehicles.car, 'parked-car', 66, -266, terrainHeight(66,-266)+.2, true),
    ]);
    let seed = 473;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const jobs: Promise<unknown>[] = [];
    for (let i = 0; i < 850; i++) {
      const x = (random() - 0.5) * 1080, z = (random() - 0.5) * 1120, y = terrainHeight(x, z);
      if (y < 3) continue;
      if (bases.some(b=>Math.hypot(x-b.center[0],z-b.center[2])<95)) continue;
      if (Math.hypot(x,z+220)<150 || Math.hypot(x+115,z-230)<100 || (x>-475&&x<-295&&z>-330&&z<-165)) continue;
      const def = i % 5 === 0 ? assets.environment.rock : y < 14 ? assets.environment.palm : assets.environment.tree;
      jobs.push(this.place(def, `nature-${i}`, x, z).then(model => { model.root.rotation.y = random() * Math.PI * 2; }));
    }
    await Promise.all(jobs);
  }
}
