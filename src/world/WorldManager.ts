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

export class WorldManager {
  readonly chunks = new ChunkManager();
  readonly spawn = new Vector3(-26, 8, -92);
  private materials = new Map<string, StandardMaterial>();
  constructor(private scene: Scene, private assetsManager: AssetManager) {}
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
    scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 180; scene.fogEnd = 590; scene.fogColor = new Color3(0.56, 0.79, 0.86);
    scene.collisionsEnabled = true;
    const ambient = new HemisphericLight('sky', Vector3.Up(), scene); ambient.intensity = 0.7; ambient.groundColor = Color3.FromHexString('#577770');
    const sun = new DirectionalLight('sun', new Vector3(-0.7, -1, 0.4), scene); sun.intensity = 0.95; sun.diffuse = Color3.FromHexString('#fff1cf');
    createTerrain(scene);
    const sea = MeshBuilder.CreateGround('Mediterranean sea', { width: 5000, height: 5000 }, scene);
    sea.position.y = 0.3; sea.material = this.material('#1d9cad'); sea.isPickable = false;
    // Purpose-built traversal structures; collision geometry is independent from vendor models.
    this.box('coastal-road', 0, 6.04, -30, 9, 0.2, 220, '#4a6366');
    for (let z = -130; z < 80; z += 12) this.box('road-mark', 0, 6.16, z, 0.2, 0.015, 5, '#e8dfb9', false);
    this.box('cross-road', 32, 6.07, -52, 125, 0.2, 8, '#4a6366');
    const stages = [{ x: -26, z: -92, h: 7 }, { x: -22, z: -25, h: 28 }, { x: 36, z: 25, h: 49 }, { x: 80, z: -54, h: 13 }];
    stages.forEach((p, i) => {
      this.box(`relay-${i}`, p.x, 6 + p.h / 2, p.z, i === 0 ? 16 : 9, p.h, 12, '#d5ddd0');
      this.box(`relay-cap-${i}`, p.x, 6 + p.h, p.z, i === 0 ? 17 : 11, 0.45, 13, '#294d52');
      this.box(`relay-stripe-${i}`, p.x, 5 + p.h, p.z - 6.06, 9, 1, 0.1, '#e3a945', false);
      if (i > 0) {
        for (let floor = 9; floor < p.h; floor += 5) this.box(`relay-vents-${i}-${floor}`, p.x, floor, p.z - 6.08, 5.5, 0.85, 0.16, '#547675', false);
        this.box(`relay-mast-${i}`, p.x + 2.5, 9 + p.h, p.z + 2, 0.25, 6, 0.25, '#31555a');
        this.box(`relay-beacon-${i}`, p.x + 2.5, 12 + p.h, p.z + 2, 0.55, 0.6, 0.55, '#e3a945', false);
      }
    });
    this.spawn.set(-26, 14.3, -92);
    // A bridge across the western inlet, gas-station canopy, and an unpopulated military compound.
    this.box('bridge-deck', -150, 7, -100, 75, 1, 9, '#9da99a');
    this.box('bridge-rail-l', -150, 8.1, -104.2, 75, 1.2, 0.3, '#d8ddc6');
    this.box('bridge-rail-r', -150, 8.1, -95.8, 75, 1.2, 0.3, '#d8ddc6');
    this.box('station-canopy', 26, 12, -95, 15, 0.7, 10, '#dd7b48');
    [-6, 6].forEach(x => this.box('station-pillar', 26 + x, 9, -95, 0.5, 6, 0.5, '#d5ddd0'));
    [-4, 4].forEach(x => this.box('fuel-pump', 26 + x, 7.1, -95, 1, 2.2, 1, '#dd7b48'));
    this.box('compound', 56, 6.08, 24, 60, 0.25, 55, '#a7b49d');
    this.box('compound-wall', 85, 8, 24, 1, 4, 55, '#647e78');
    this.box('compound-wall', 55, 8, 51, 60, 4, 1, '#647e78');
    await this.decorate();
  }
  private async place(def: AssetDefinition, name: string, x: number, z: number, y = terrainHeight(x, z), collision = false) {
    const instance = await this.assetsManager.instantiate(def, name); instance.root.position.set(x, y, z);
    if (collision) {
      instance.root.computeWorldMatrix(true);
      const b = instance.root.getHierarchyBoundingVectors(true);
      const size = b.max.subtract(b.min), center = b.max.add(b.min).scale(0.5);
      const proxy = this.box(`${name}-collider`, center.x, center.y, center.z, size.x, size.y, size.z, '#ffffff'); proxy.visibility = 0;
    } else this.chunks.add(instance.root);
    return instance;
  }
  private async decorate() {
    await Promise.all([
      ...[-62, -88, -114].flatMap((x, i) => [-48, -16, 18].map((z, j) => this.place(assets.environment.house, `house-${i}-${j}`, x, z, terrainHeight(x, z), true))),
      this.place(assets.environment.warehouse, 'depot', 63, 24, 6.2, true),
      ...[0, 1, 2].map(i => this.place(assets.environment.tank, `fuel-${i}`, 72, -1 + i * 9, 6.2, true)),
      this.place(assets.environment.container, 'container', 42, 39, 6.2, true),
      this.place(assets.vehicles.car, 'parked-car', 10, -69, 6.2, true),
    ]);
    let seed = 473;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const jobs: Promise<unknown>[] = [];
    for (let i = 0; i < 230; i++) {
      const x = (random() - 0.5) * 430, z = (random() - 0.5) * 450, y = terrainHeight(x, z);
      if (y < 3 || (Math.abs(x) < 15) || (x > -130 && x < 99 && z > -115 && z < 60)) continue;
      const def = i % 5 === 0 ? assets.environment.rock : y < 14 ? assets.environment.palm : assets.environment.tree;
      jobs.push(this.place(def, `nature-${i}`, x, z).then(model => { model.root.rotation.y = random() * Math.PI * 2; }));
    }
    await Promise.all(jobs);
  }
}
