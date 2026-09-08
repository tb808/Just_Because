import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { worldConfig } from '../data/config';
import { bases } from '../data/bases';
import { settlements, worldLocations, worldRoads } from '../data/world';

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function naturalHeight(x:number,z:number) {
  const radius=Math.hypot(x/1830,z/1740);
  const coast=1-smooth(.77,1.02,radius);
  const massif=145*Math.exp(-((x-10)**2/155000+(z-670)**2/120000));
  const westRidge=48*Math.exp(-((x+630)**2/140000+(z-470)**2/350000));
  const eastRidge=72*Math.exp(-((x-950)**2/100000+(z-780)**2/240000));
  const rolling=7*Math.sin(x*.006)*Math.cos(z*.004)+4*Math.sin((x+z)*.014);
  let height=-9+coast*(24+massif+westRidge+eastRidge+rolling);
  // Shallow bays bring the sea to the two working harbors without severing the mainland.
  const westBay=smooth(1320,1430,-x)*(1-smooth(110,290,Math.abs(z-150)));
  const southBay=smooth(1000,1115,-z)*(1-smooth(95,240,Math.abs(x-720)));
  height+=(Math.min(height,-2.5)-height)*Math.max(westBay,southBay);
  return height;
}
function authoredHeight(x:number,z:number) {
  let height=naturalHeight(x,z);
  for(const town of settlements) {
    const distance=Math.max(Math.abs(x-town.center[0]),Math.abs(z-town.center[1]));
    const blend=1-smooth(town.radius,town.radius+145,distance);
    height+=(town.elevation-height)*blend;
  }
  for(const base of bases) {
    const blend=1-smooth(78,190,Math.hypot(x-base.center[0],z-base.center[2]));
    height+=(base.center[1]-.2-height)*blend;
  }
  for(const location of worldLocations) {
    if(location.kind==='harbor') {
      const blend=1-smooth(9,20,Math.hypot(x-location.position[0],z-location.position[1]));
      height+=(3.5-height)*blend;continue;
    }
    const blend=1-smooth(42,85,Math.hypot(x-location.position[0],z-location.position[1]));
    height+=(naturalHeight(...location.position)-height)*blend;
  }
  return height;
}
// A spatial index keeps height queries cheap for terrain construction, physics and NPCs.
const roadCells=new Map<string,Array<{ax:number;az:number;dx:number;dz:number;length2:number;ay:number;by:number}>>();
for(const road of Object.values(worldRoads)) for(let i=1;i<road.length;i++) {
  const [startX,startZ]=road[i-1],[endX,endZ]=road[i],steps=Math.max(1,Math.ceil(Math.hypot(endX-startX,endZ-startZ)/24));
  // Sample the existing grading along a long road: interpolating only city endpoints
  // would cut straight through mountain plateaus and create cliffs at town entrances.
  for(let step=0;step<steps;step++) {
    const a=step/steps,b=(step+1)/steps,ax=startX+(endX-startX)*a,az=startZ+(endZ-startZ)*a,bx=startX+(endX-startX)*b,bz=startZ+(endZ-startZ)*b,dx=bx-ax,dz=bz-az;
    const segment={ax,az,dx,dz,length2:dx*dx+dz*dz,ay:Math.max(3.5,authoredHeight(ax,az)),by:Math.max(3.5,authoredHeight(bx,bz))};
    for(let cx=Math.floor((Math.min(ax,bx)-24)/128);cx<=Math.floor((Math.max(ax,bx)+24)/128);cx++) for(let cz=Math.floor((Math.min(az,bz)-24)/128);cz<=Math.floor((Math.max(az,bz)+24)/128);cz++) {
      const key=`${cx}:${cz}`,cell=roadCells.get(key)??[];cell.push(segment);roadCells.set(key,cell);
    }
  }
}
export function terrainHeight(x: number, z: number) {
  let height=authoredHeight(x,z),nearest=24,target=height;
  for(const road of roadCells.get(`${Math.floor(x/128)}:${Math.floor(z/128)}`)??[]) {
    const t=Math.max(0,Math.min(1,((x-road.ax)*road.dx+(z-road.az)*road.dz)/(road.length2||1)));
    const distance=Math.hypot(x-road.ax-road.dx*t,z-road.az-road.dz*t);
    if(distance<nearest) {nearest=distance;target=road.ay+(road.by-road.ay)*t;}
  }
  height+=(target-height)*(1-smooth(7,24,nearest));
  // Plateau streets must stay flush with building foundations even at incoming road junctions.
  for(const town of settlements) {const blend=1-smooth(town.radius,town.radius+30,Math.max(Math.abs(x-town.center[0]),Math.abs(z-town.center[1])));height+=(town.elevation-height)*blend;}
  for(const base of bases) {const blend=1-smooth(78,110,Math.hypot(x-base.center[0],z-base.center[2]));height+=(base.center[1]-.2-height)*blend;}
  return height;
}
export function createTerrain(scene: Scene) {
  const material = new StandardMaterial('terrain', scene); material.diffuseColor = Color3.White(); material.specularColor = Color3.Black(); material.freeze();
  const tiles: Mesh[] = [];
  for (let tz = 0; tz < 16; tz++) for (let tx = 0; tx < 16; tx++) tiles.push(createTile(scene, material, tx, tz));
  return tiles;
}
function createTile(scene: Scene, material: StandardMaterial, tx: number, tz: number) {
  const size = worldConfig.size / 16, n = worldConfig.subdivisions / 16;
  const positions: number[] = [], indices: number[] = [], colors: number[] = [], normals: number[] = [];
  for (let z = 0; z <= n; z++) for (let x = 0; x <= n; x++) {
    const px = (tx + x / n) * size - worldConfig.size / 2, pz = (tz + z / n) * size - worldConfig.size / 2;
    const y = terrainHeight(px, pz);
    positions.push(px, y, pz);
    const dry=.5+.5*Math.sin(px*.0027+pz*.003);
    const tint = y < 2.5 ? '#d8cba0' : y > 118 ? '#a3a59a' : y > 65 ? '#7e9670' : dry>.7 ? '#a5b97a' : '#79a76c';
    const c = Color3.FromHexString(tint).scale(0.91 + 0.09 * Math.sin(px * 0.07 + pz * 0.09));
    colors.push(c.r, c.g, c.b, 1);
    if (x < n && z < n) { const i = z * (n + 1) + x; indices.push(i, i + 1, i + n + 1, i + 1, i + n + 2, i + n + 1); }
  }
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); Object.assign(data, { positions, indices, normals, colors });
  const mesh = new Mesh(`terrain-${tx}-${tz}`, scene); data.applyToMesh(mesh);
  mesh.checkCollisions = true; mesh.receiveShadows = true; mesh.material = material;
  mesh.freezeWorldMatrix(); return mesh;
}
