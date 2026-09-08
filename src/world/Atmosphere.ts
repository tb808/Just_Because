import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

const oceanVertex = `precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
uniform mat4 world;
varying vec3 worldPosition;
void main() { worldPosition = (world * vec4(position, 1.0)).xyz; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
const oceanFragment = `precision highp float;
varying vec3 worldPosition;
uniform float time;
uniform vec3 eye;
uniform vec3 sunDirection;
uniform vec3 fogColor;
void main() {
  vec2 p = worldPosition.xz;
  float a = p.x * 0.085 + p.y * 0.042 + time * 0.68;
  float b = p.x * -0.19 + p.y * 0.135 - time * 0.9;
  float c = p.x * 0.32 + p.y * 0.29 + time * 1.3;
  vec3 normal = normalize(vec3(cos(a)*0.095-cos(b)*0.06, 1.0, cos(a)*0.05+cos(b)*0.08+cos(c)*0.025));
  vec3 view = normalize(eye - worldPosition);
  float fresnel = pow(1.0 - max(0.0, dot(normal, view)), 3.0);
  vec3 water = mix(vec3(0.035,0.36,0.43), vec3(0.31,0.65,0.68), fresnel);
  water += pow(max(0.0, dot(reflect(-sunDirection, normal), view)), 180.0) * vec3(1.0,0.84,0.59) * 0.8;
  water += smoothstep(0.96,1.0,sin(a)*sin(b)) * 0.035;
  float fog = smoothstep(950.0, 3400.0, distance(eye.xz, p));
  gl_FragColor = vec4(mix(water, fogColor, fog), 1.0);
}`;

/** Original geometric sky, birds and animated water; no remote textures. */
export class Atmosphere {
  elapsed = 0;
  private sky: Mesh;
  private ocean: ShaderMaterial;
  private sun: DirectionalLight;
  private ambient: HemisphericLight;
  private shadows: ShadowGenerator;
  private clouds: Mesh[] = [];
  private birds: { root: TransformNode; wings: Mesh[]; angle: number; radius: number }[] = [];
  private casterTimer = 0;
  private quality = 1.25;
  private golden = Color3.FromHexString('#f6d4ae');
  private daylight = Color3.FromHexString('#fff3dc');
  get clock() {
    const minutes = Math.floor((8.5 + (this.elapsed / 200) % 10) * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  constructor(private scene: Scene) {
    this.sun = scene.getLightByName('sun') as DirectionalLight;
    this.ambient = scene.getLightByName('sky') as HemisphericLight;
    scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = 650; scene.fogEnd = 2400;
    scene.fogColor = Color3.FromHexString('#a5ccd0'); scene.clearColor = new Color4(.65,.8,.83,1);
    scene.imageProcessingConfiguration.exposure = 1.05;
    scene.imageProcessingConfiguration.contrast = 1.13;
    scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.sky = MeshBuilder.CreateSphere('island-sky', { diameter: 8000, segments: 18, sideOrientation: Mesh.BACKSIDE }, scene);
    const skyMat = new StandardMaterial('sky-gradient', scene);
    skyMat.disableLighting = true; skyMat.emissiveColor = Color3.White(); skyMat.diffuseColor = Color3.Black();
    this.sky.material = skyMat; this.sky.isPickable = false; this.sky.infiniteDistance = true; this.sky.applyFog = false;
    const vertices = this.sky.getVerticesData(VertexBuffer.PositionKind)!;
    const colors: number[] = [];
    const horizon = Color3.FromHexString('#c6dfd9'), zenith = Color3.FromHexString('#4a91b8');
    for (let i = 0; i < vertices.length; i += 3) {
      const c = Color3.Lerp(horizon, zenith, Math.pow(Math.max(0, vertices[i + 1] / 4000), .6));
      colors.push(c.r, c.g, c.b, 1);
    }
    this.sky.setVerticesData(VertexBuffer.ColorKind, colors);
    this.ocean = new ShaderMaterial('aegean-water', scene, { vertexSource: oceanVertex, fragmentSource: oceanFragment }, {
      attributes: ['position'], uniforms: ['worldViewProjection', 'world', 'time', 'eye', 'sunDirection', 'fogColor'],
    });
    const sea = scene.getMeshByName('Mediterranean sea');
    if (sea) sea.material = this.ocean;
    this.sun.shadowFrustumSize = 190; this.sun.shadowMinZ = 5; this.sun.shadowMaxZ = 420;
    this.shadows = new ShadowGenerator(1024, this.sun);
    this.shadows.usePercentageCloserFiltering = true; this.shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
    this.shadows.bias = .0006; this.shadows.normalBias = .07; this.shadows.darkness = .28;
    this.createClouds(); this.createBirds();
  }
  setQuality(value: number) { this.quality = value; this.scene.shadowsEnabled = value < 1.6; }
  private createClouds() {
    const material = new StandardMaterial('sunlit-clouds', this.scene);
    material.diffuseColor = Color3.FromHexString('#f2f2e3'); material.specularColor = Color3.Black();
    material.emissiveColor = Color3.FromHexString('#252b2b');
    for (let i = 0; i < 24; i++) {
      const parts: Mesh[] = [];
      for (let j = 0; j < 5; j++) {
        const puff = MeshBuilder.CreateSphere('cloud-puff', { diameter: 1, segments: 4 }, this.scene);
        puff.scaling.set(85 + j % 3 * 38, 18 + j % 2 * 12, 55 + j % 3 * 15);
        puff.position.set(j * 48, Math.sin(j * 2 + i) * 10, Math.cos(j + i) * 32);
        parts.push(puff);
      }
      const cloud = Mesh.MergeMeshes(parts, true, true)!;
      cloud.name = `cumulus-${i}`; cloud.material = material; cloud.isPickable = false;
      cloud.position.set(((i * 719) % 4000) - 2100, 360 + i % 5 * 35, ((i * 1123) % 3800) - 1900);
      this.clouds.push(cloud);
    }
  }
  private createBirds() {
    const mat = new StandardMaterial('gull-feathers', this.scene); mat.diffuseColor = Color3.FromHexString('#e4e5d2'); mat.specularColor = Color3.Black();
    for (let i = 0; i < 12; i++) {
      const root = new TransformNode(`coastal-bird-${i}`, this.scene), wings: Mesh[] = [];
      for (const side of [-1, 1]) {
        const wing = MeshBuilder.CreateBox('gull-wing', { width: .9, height: .055, depth: .24 }, this.scene);
        wing.parent = root; wing.position.x = side * .42; wing.material = mat; wing.isPickable = false; wings.push(wing);
      }
      this.birds.push({ root, wings, angle: i * 2.4, radius: 28 + i * 3 });
    }
  }
  update(dt: number, player: Vector3) {
    this.elapsed += dt;
    const phase = ((this.elapsed / 200) % 10) / 10, angle = .45 + phase * 2.2;
    this.sun.direction.set(-Math.cos(angle) * .8, -.55 - Math.sin(angle) * .45, .35).normalize();
    this.sun.position.copyFrom(player.subtract(this.sun.direction.scale(180)));
    this.sun.intensity = 1.1 - .25 * Math.abs(phase - .45);
    this.sun.diffuse = Color3.Lerp(this.daylight, this.golden, Math.max(0, (phase - .65) / .35));
    this.ambient.intensity = .66;
    this.ocean.setFloat('time', this.elapsed).setVector3('eye', this.scene.activeCamera?.position ?? player)
      .setVector3('sunDirection', this.sun.direction.negate()).setColor3('fogColor', this.scene.fogColor);
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i]; cloud.position.x += dt * (1.3 + i % 3 * .25);
      if (cloud.position.x > 2400) cloud.position.x = -2400;
    }
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i], a = bird.angle + this.elapsed * .18;
      const cx = i < 6 ? -450 : -1130, cz = i < 6 ? -220 : 150;
      bird.root.position.set(cx + Math.sin(a) * bird.radius, 36 + i % 3 * 5 + Math.sin(a * 2) * 2, cz + Math.cos(a) * bird.radius);
      bird.root.rotation.y = -a; bird.root.setEnabled(Vector3.DistanceSquared(player, bird.root.position) < 600 ** 2);
      bird.wings.forEach((wing, j) => wing.rotation.z = (j ? 1 : -1) * (.18 + Math.sin(this.elapsed * 5 + i) * .22));
    }
    this.casterTimer -= dt;
    if (this.casterTimer <= 0 && this.quality < 1.6) {
      this.casterTimer = 1;
      // Nearby visible geometry only: terrain, sky, water and hidden collision proxies never cast.
      this.shadows.getShadowMap()!.renderList = this.scene.meshes.filter(mesh => mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0
        && mesh !== this.sky && !/terrain|sea|checkpoint|cloud|cumulus|collider|hitbox/i.test(mesh.name)
        && Math.hypot(mesh.getBoundingInfo().boundingBox.centerWorld.x-player.x,mesh.getBoundingInfo().boundingBox.centerWorld.z-player.z) < 140
        && mesh.getBoundingInfo().boundingSphere.radiusWorld > .3).slice(0, 200);
    }
  }
  dispose() { this.shadows.dispose(); }
}
