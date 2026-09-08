import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { missionDefinitions } from '../data/missions';
import { MissionProgress, type MissionActor, type MissionSaveState } from './MissionProgress';

export { objectiveReached } from './MissionProgress';
export class MissionManager extends MissionProgress {
  private marker?: TransformNode;
  private ring!: Mesh;
  private diamond!: Mesh;
  private parcel!: Mesh;
  private beam!: Mesh;
  private material!: StandardMaterial;
  private markerKey = '';
  private animationTime = 0;
  constructor(scene: Scene) {
    super(missionDefinitions);
    this.marker = new TransformNode('tracked-mission', scene);
    this.material = new StandardMaterial('mission-marker-gold', scene);
    this.material.diffuseColor = Color3.FromHexString('#f3c65a');
    this.material.emissiveColor = Color3.FromHexString('#9b751b');
    this.material.specularColor = Color3.Black();
    this.ring = MeshBuilder.CreateTorus('mission-target-ring', { diameter: 11, thickness: 0.19, tessellation: 40 }, scene);
    this.diamond = MeshBuilder.CreatePolyhedron('mission-target-diamond', { type: 1, size: 0.7 }, scene);
    this.parcel = MeshBuilder.CreateBox('mission-cargo', { width: 1.5, height: 1.1, depth: 1.1 }, scene);
    this.parcel.position.y = -0.45;
    const parcelMaterial = new StandardMaterial('mission-cargo-wood', scene);
    parcelMaterial.diffuseColor = Color3.FromHexString('#c18f52'); parcelMaterial.specularColor = Color3.Black();
    const strap = MeshBuilder.CreateBox('mission-cargo-strap', { width: 0.2, height: 1.15, depth: 1.15 }, scene);
    strap.parent = this.parcel;
    strap.material = this.material; strap.isPickable = false;
    this.beam = MeshBuilder.CreateCylinder('mission-light-column', { diameter: 0.22, height: 25, tessellation: 8 }, scene);
    this.beam.position.y = 11.5;
    const beamMaterial = new StandardMaterial('mission-light-column-material', scene);
    beamMaterial.diffuseColor = Color3.FromHexString('#f3c65a'); beamMaterial.emissiveColor = Color3.FromHexString('#e9b74b'); beamMaterial.alpha = 0.23;
    for (const mesh of [this.ring, this.diamond, this.parcel, this.beam]) {
      mesh.parent = this.marker; mesh.isPickable = false; mesh.material = this.material;
    }
    this.parcel.material = parcelMaterial; this.beam.material = beamMaterial;
    this.syncMarker();
  }
  override update(dt: number, player: MissionActor, context: { liberatedBaseIds?: readonly string[] } = {}) {
    super.update(dt, player, context); this.syncMarker();
    this.animationTime += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.diamond.rotation.y = this.animationTime * 0.8;
    this.diamond.position.y = 3.8 + Math.sin(this.animationTime * 2) * 0.3;
    const scale = 1 + Math.sin(this.animationTime * 1.6) * 0.025;
    this.ring.scaling.setAll(scale);
    this.marker?.setEnabled(!!this.objective && !player.dead);
  }
  override interact(player: MissionActor, liberatedBaseIds: readonly string[] = []) {
    const consumed = super.interact(player, liberatedBaseIds); this.syncMarker(); return consumed;
  }
  override setTracked(id: string) { const result = super.setTracked(id); this.syncMarker(); return result; }
  override restore(state: MissionSaveState) { super.restore(state); this.syncMarker(); }
  override reset() { super.reset(); this.markerKey = ''; this.syncMarker(); }
  private syncMarker() {
    if (!this.marker) return;
    const objective = this.objective;
    this.marker.setEnabled(!!objective);
    if (!objective || this.markerKey === `${this.tracked.id}:${objective.id}`) return;
    this.markerKey = `${this.tracked.id}:${objective.id}`;
    this.marker.position.copyFromFloats(...objective.position);
    const airborne = this.tracked.category === 'Höhenroute';
    this.ring.rotation.x = airborne ? Math.PI / 2 : 0;
    this.ring.position.y = airborne ? 1.5 : -0.72;
    this.parcel.setEnabled(objective.kind === 'interact');
    this.beam.setEnabled(!airborne);
    const color = objective.kind === 'hold' ? '#5ce4df' : objective.kind === 'liberate' ? '#f18d75' : '#f3c65a';
    this.material.diffuseColor = Color3.FromHexString(color); this.material.emissiveColor = this.material.diffuseColor.scale(0.5);
  }
}
