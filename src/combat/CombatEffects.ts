import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { LinesMesh } from '@babylonjs/core/Meshes/linesMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Scene } from '@babylonjs/core/scene';

interface Particle { mesh: Mesh; velocity: Vector3; life: number; duration: number; size: number; growth: number; gravity: number }
export class CombatEffects {
  private particles: Particle[] = [];
  private traces: { mesh: LinesMesh; life: number }[] = [];
  private cursor = 0;
  private traceCursor = 0;
  private materials: StandardMaterial[];
  constructor(private scene: Scene) {
    this.materials = ['#ffb736', '#f76725', '#63666a', '#263d40', '#f5edbb'].map((hex, i) => {
      const m = new StandardMaterial(`effect-${i}`, scene); m.diffuseColor = Color3.FromHexString(hex); m.specularColor = Color3.Black();
      if (i < 2 || i === 4) { m.emissiveColor = m.diffuseColor; m.disableLighting = true; } return m;
    });
    const template = MeshBuilder.CreateIcoSphere('particle-template', { radius: 1, subdivisions: 1, flat: true }, scene); template.setEnabled(false);
    for (let i = 0; i < 128; i++) { const mesh = template.clone(`particle-${i}`); mesh.isPickable = false; mesh.setEnabled(false); this.particles.push({ mesh, velocity: Vector3.Zero(), life: 0, duration: 0, size: 0, growth: 0, gravity: 0 }); }
    for (let i = 0; i < 24; i++) { const mesh = MeshBuilder.CreateLines(`tracer-${i}`, { points: [Vector3.Zero(), Vector3.Up()], updatable: true }, scene); mesh.isPickable = false; mesh.setEnabled(false); this.traces.push({ mesh, life: 0 }); }
  }
  private emit(position: Vector3, velocity: Vector3, material: number, duration: number, size: number, growth: number, gravity: number) {
    const p = this.particles[this.cursor++ % this.particles.length];
    Object.assign(p, { life: duration, duration, size, growth, gravity }); p.velocity.copyFrom(velocity);
    p.mesh.position.copyFrom(position); p.mesh.scaling.setAll(size); p.mesh.visibility = 1; p.mesh.material = this.materials[material]; p.mesh.setEnabled(true);
  }
  muzzle(position: Vector3, direction: Vector3) { this.emit(position, direction.scale(1.5), 4, 0.07, 0.12, 1.7, 0); }
  impact(position: Vector3, organic = false) {
    for (let i = 0; i < 7; i++) this.emit(position, new Vector3((Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7), organic ? 0 : 4, 0.22 + Math.random() * 0.12, 0.055, -0.08, 8);
  }
  trace(from: Vector3, to: Vector3, enemy = false) {
    const t = this.traces[this.traceCursor++ % this.traces.length];
    MeshBuilder.CreateLines(t.mesh.name, { points: [from, to], instance: t.mesh });
    t.mesh.color = Color3.FromHexString(enemy ? '#ff784c' : '#ffe69e'); t.mesh.alpha = 1; t.mesh.setEnabled(true); t.life = 0.09;
  }
  smoke(position: Vector3) { this.emit(position, new Vector3(0, 1.2, 0), 2, 0.7, 0.2, 0.45, 0); }
  explosion(position: Vector3, radius: number) {
    for (let i = 0; i < 45; i++) {
      const direction = new Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize();
      const smoke = i > 27, debris = i > 16 && i <= 27;
      this.emit(position, direction.scale(smoke ? 3 : debris ? 12 + Math.random() * 12 : 5 + Math.random() * 8), smoke ? 2 : debris ? 3 : i % 2, smoke ? 2.6 : debris ? 1.5 : 0.65, smoke ? 0.8 : debris ? 0.2 : radius * 0.13, smoke ? 1.2 : debris ? -0.05 : 1, debris ? 20 : -0.5);
    }
  }
  update(dt: number) {
    for (const p of this.particles) if (p.life > 0) {
      p.life -= dt; if (p.life <= 0) { p.mesh.setEnabled(false); continue; }
      p.velocity.y -= p.gravity * dt; p.mesh.position.addInPlace(p.velocity.scale(dt)); p.mesh.rotation.x += dt * 2; p.mesh.rotation.z += dt;
      p.mesh.scaling.setAll(Math.max(0.01, p.size + p.growth * (p.duration - p.life))); p.mesh.visibility = Math.min(1, p.life / (p.duration * 0.45));
    }
    for (const t of this.traces) if (t.life > 0) { t.life -= dt; t.mesh.alpha = Math.max(0, t.life / 0.09); if (t.life <= 0) t.mesh.setEnabled(false); }
  }
  reset() { this.particles.forEach(p => { p.life = 0; p.mesh.setEnabled(false); }); this.traces.forEach(t => { t.life = 0; t.mesh.setEnabled(false); }); }
}
