import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { bases } from '../data/bases';
import { assets } from '../data/assets';
import { terrainHeight } from './Terrain';
import type { WorldManager } from './WorldManager';

export async function expandWorld(world: WorldManager) {
  const jobs: Promise<unknown>[] = [];
  for (const base of bases) {
    const [x,y,z] = base.center, [fx,fy,fz] = base.flag;
    world.box(`${base.id}-flagpole`,fx,fy+4,fz,.2,8,.2,'#e9e0bd');
    const flag = world.box(`${base.id}-flag`,fx+1.5,fy+7,fz,3,1.7,.08,'#cf6548',false);
    world.flags.set(base.id, flag);
    world.box(`${base.id}-capture-pad`,fx,fy+.02,fz,9,.08,9,'#597e78',false);
    if (base.id === 'orbis') continue;
    world.box(`${base.id}-yard`,x,y-.1,z,67,.3,62,'#a9b4a0');
    world.box(`${base.id}-back-wall`,x,y+1.5,z+31,67,3,.5,'#6d8982');
    world.box(`${base.id}-side-wall`,x-33,y+1.5,z,.5,3,62,'#6d8982');
    jobs.push(world.place(assets.environment.warehouse,`${base.id}-depot`,x-10,z+14,y,true));
    jobs.push(world.place(assets.environment.container,`${base.id}-container`,x+24,z+15,y,true));
    for (const tank of base.tanks) jobs.push(world.place(assets.environment.tank,tank.id,tank.x,tank.z,y,true));
    const supply = { x: x+21, z: z+34 };
    jobs.push(world.place(assets.vehicles.car,`${base.id}-supply`,supply.x,supply.z,terrainHeight(supply.x,supply.z)+.2,true));
    world.supplies.push({ baseId: base.id, position: [supply.x,terrainHeight(supply.x,supply.z)+1,supply.z] });
    world.box(`${base.id}-lookout`,x+27,y+7,z-22,6,14,6,'#d5ddd0');
    world.box(`${base.id}-lookout-roof`,x+27,y+14,z-22,8,.4,8,'#31595b');
  }
  for (const [x,z] of [[-230,-165],[-200,-180],[-168,-172]]) jobs.push(world.place(assets.environment.house,`mirada-house-${x}`,x,z,terrainHeight(x,z),true));
  road(world,'west-link',[[0,-52],[-35,-78],[-100,-78],[-145,-90],[-180,-100],[-220,-135],[-268,-128]]);
  road(world,'ridge-link',[[0,60],[25,91],[60,122],[100,151],[138,180],[132,210],[122,255]]);
  road(world,'market-link',[[-175,-110],[-176,-144],[-196,-153],[-250,-150]]);
  world.box('mirada-pier',-290,3,-115,12,1,75,'#9b8669');
  for (let z=-145;z<-76;z+=12) world.box('pier-post',-295,2,z,.7,5,.7,'#645c4e');
  for (const [cx,cz] of [[-85,-83],[-199,-149]]) {
    const y=terrainHeight(cx,cz);
    world.box('market-square',cx,y+.05,cz,36,.12,20,'#c8bea0');
    for (let i=0;i<3;i++) {
      const x=cx-12+i*12;
      world.box('market-counter',x,y+.65,cz+6,5,1.3,2,'#956d49');
      world.box('market-awning',x,y+3,cz+6,6,.2,4,i%2?'#d78958':'#e0c572',false);
      for (const side of [-2.5,2.5]) world.box('market-post',x+side,y+1.5,cz+6,.12,3,.12,'#c7b090');
      world.box('market-produce',x,y+1.5,cz+6,3,.4,1,'#8ba34b',false);
    }
    for (const dx of [-12,12]) {
      world.box('bench',cx+dx,y+.55,cz-7,4,.3,1,'#9e794f');
      world.box('bench-back',cx+dx,y+1,cz-7.5,4,1,.16,'#9e794f');
    }
  }
  for (const [x,z] of [[-52,-78],[-124,-78],[-175,-145],[8,-111],[8,-65],[8,-17],[8,31],[133,183]]) {
    const y=terrainHeight(x,z);
    world.box('street-lamp',x,y+3,z,.16,6,.16,'#476764');
    world.box('lamp-head',x,y+6,z,1.1,.25,.65,'#fff0b4',false);
  }
  await Promise.all(jobs);
}

function road(world: WorldManager, name: string, points: number[][]) {
  const positions:number[]=[], indices:number[]=[], normals:number[]=[];
  for(let i=1;i<points.length;i++) {
    const [ax,az]=points[i-1], [bx,bz]=points[i], length=Math.hypot(bx-ax,bz-az), count=Math.ceil(length/4);
    const rx=(bz-az)/length*3.5, rz=-(bx-ax)/length*3.5;
    for(let j=0;j<count;j++) {
      const a=j/count,b=(j+1)/count, start=positions.length/3;
      for(const [t,s] of [[a,-1],[a,1],[b,-1],[b,1]]) {
        const x=ax+(bx-ax)*t+rx*s,z=az+(bz-az)*t+rz*s;
        positions.push(x,terrainHeight(x,z)+.18,z);
      }
      indices.push(start,start+2,start+1,start+1,start+2,start+3);
    }
  }
  VertexData.ComputeNormals(positions,indices,normals);
  const data=new VertexData(); Object.assign(data,{positions,indices,normals});
  const mesh=new Mesh(name,world.scene); data.applyToMesh(mesh); mesh.material=world.material('#576d6b');
  mesh.checkCollisions=true; mesh.freezeWorldMatrix();
}
