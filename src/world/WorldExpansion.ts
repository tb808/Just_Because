import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { bases } from '../data/bases';
import { assets } from '../data/assets';
import { settlements, worldRoads, type GroundPoint } from '../data/world';
import { terrainHeight } from './Terrain';
import type { WorldManager } from './WorldManager';

export async function expandWorld(world: WorldManager) {
  const jobs: Promise<unknown>[] = [];
  for (const base of bases) buildBase(world, base, jobs);
  for (const [name, points] of Object.entries(worldRoads)) road(world, `${name}-road`, points);
  const bridgeY=terrainHeight(-235,-286);
  world.box('west-bridge-deck',-235,bridgeY+1,-286,72,1,10,'#9da99a');
  world.box('west-bridge-north-rail',-235,bridgeY+2,-291,72,1.1,.3,'#d8ddc6');
  world.box('west-bridge-south-rail',-235,bridgeY+2,-281,72,1.1,.3,'#d8ddc6');
  world.box('mirada-pier',-505,1.5,-220,190,1,13,'#9b8669');
  for(let x=-585;x<-420;x+=16) for(const z of [-225,-215]) world.box('pier-post',x,.8,z,.65,3,.65,'#645c4e');
  world.box('harbor-crane',-465,9,-202,1,16,1,'#d89a43');
  world.box('harbor-crane-arm',-454,16.5,-202,23,1,1,'#d89a43');
  for (const settlement of settlements) buildMarket(world, settlement.market[0], settlement.market[1], settlement.name.replace('Dorf ', ''));
  buildMarket(world,-335,-306,'Mirada');
  for(const [x,z] of [[-365,-282],[-300,-284],[-175,-284],[-82,-282],[42,-280],[126,-258],[208,-220],[-20,-195],[20,-28],[87,76],[155,154],[238,237],[-70,157],[-132,235]]) addLamp(world,x,z);
  await Promise.all(jobs);
}

function buildBase(world: WorldManager,base:(typeof bases)[number],jobs:Promise<unknown>[]) {
  const [x,y,z]=base.center,[fx,fy,fz]=base.flag;
  world.box(`${base.id}-yard`,x,y-.1,z,76,.3,68,'#a9b4a0');
  world.box(`${base.id}-north-wall`,x,y+1.5,z+34,76,3,.5,'#6d8982');
  // Two wall sections leave a visible gate. At Mirada this aligns with the harbor pier.
  world.box(`${base.id}-west-wall-north`,x-38,y+1.5,z+23,.5,3,22,'#6d8982');
  world.box(`${base.id}-west-wall-south`,x-38,y+1.5,z-23,.5,3,22,'#6d8982');
  world.box(`${base.id}-east-wall`,x+38,y+1.5,z+16,.5,3,36,'#6d8982');
  world.box(`${base.id}-flagpole`,fx,fy+4,fz,.2,8,.2,'#e9e0bd');
  const flag=world.box(`${base.id}-flag`,fx+1.5,fy+7,fz,3,1.7,.08,'#cf6548',false); world.flags.set(base.id,flag);
  world.box(`${base.id}-capture-pad`,fx,fy+.02,fz,9,.08,9,'#597e78',false);
  jobs.push(world.place(assets.environment.warehouse,`${base.id}-depot`,x+9,z+14,y,true));
  for(const [dx,dz] of [[-26,22],[28,25]]) jobs.push(world.place(assets.environment.container,`${base.id}-container-${dx}`,x+dx,z+dz,y,true));
  for(const tank of base.tanks) jobs.push(world.place(assets.environment.tank,tank.id,tank.x,tank.z,y,true));
  const supply={x:x+28,z:z+42},supplyY=terrainHeight(supply.x,supply.z);
  jobs.push(world.place(assets.vehicles.car,`${base.id}-supply`,supply.x,supply.z,supplyY+.2,true));
  world.supplies.push({baseId:base.id,position:[supply.x,supplyY+1,supply.z]});
  world.box(`${base.id}-lookout`,x+29,y+7,z-24,6,14,6,'#d5ddd0');
  world.box(`${base.id}-lookout-roof`,x+29,y+14,z-24,8,.4,8,'#31595b');
}

function buildMarket(world:WorldManager,cx:number,cz:number,name:string) {
  const y=terrainHeight(cx,cz); world.box(`${name}-market-square`,cx,y+.05,cz,42,.12,24,'#c8bea0');
  for(let i=0;i<3;i++) { const x=cx-14+i*14; world.box(`${name}-counter`,x,y+.65,cz+7,6,1.3,2,'#956d49'); world.box(`${name}-awning`,x,y+3,cz+7,7,.2,4,i%2?'#d78958':'#e0c572',false); for(const side of [-3,3]) world.box(`${name}-market-post`,x+side,y+1.5,cz+7,.12,3,.12,'#c7b090'); world.box(`${name}-produce`,x,y+1.5,cz+7,3.5,.4,1,'#8ba34b',false); }
  for(const dx of [-15,15]) { world.box(`${name}-bench`,cx+dx,y+.55,cz-8,4,.3,1,'#9e794f'); world.box(`${name}-bench-back`,cx+dx,y+1,cz-8.5,4,1,.16,'#9e794f'); }
}
function addLamp(world:WorldManager,x:number,z:number) { const y=terrainHeight(x,z); world.box('street-lamp',x,y+3,z,.16,6,.16,'#476764'); world.box('lamp-head',x,y+6,z,1.1,.25,.65,'#fff0b4',false); }
function road(world:WorldManager,name:string,points:readonly GroundPoint[]) {
  const positions:number[]=[],indices:number[]=[],normals:number[]=[];
  for(let i=1;i<points.length;i++) { const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az),count=Math.ceil(length/4),rx=(bz-az)/length*4,rz=-(bx-ax)/length*4; for(let j=0;j<count;j++) { const a=j/count,b=(j+1)/count,start=positions.length/3; for(const [t,s] of [[a,-1],[a,1],[b,-1],[b,1]]) { const x=ax+(bx-ax)*t+rx*s,z=az+(bz-az)*t+rz*s; positions.push(x,terrainHeight(x,z)+.18,z); } indices.push(start,start+2,start+1,start+1,start+2,start+3); } }
  VertexData.ComputeNormals(positions,indices,normals); const data=new VertexData(); Object.assign(data,{positions,indices,normals}); const mesh=new Mesh(name,world.scene); data.applyToMesh(mesh); mesh.material=world.material('#576d6b'); mesh.checkCollisions=true; mesh.freezeWorldMatrix();
}
