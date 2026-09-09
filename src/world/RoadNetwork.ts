import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateBoxVertexData } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { settlements, worldRoads, type GroundPoint } from '../data/world';
import type { WorldManager } from './WorldManager';
import { appendJunction, appendStrip, roadLift, terrainSurfaceHeight, type RoadGeometry } from './RoadSurface';

/** All transport systems and the atlas use this same authored connected network. */
export function buildRoadNetwork(world:WorldManager) {
  const blank=():RoadGeometry=>({positions:[],indices:[]});
  const urban=(p:GroundPoint)=>settlements.some(t=>Math.max(Math.abs(p[0]-t.center[0]),Math.abs(p[1]-t.center[1]))<t.radius+18);
  const crossing=(p:GroundPoint)=>settlements.some(t=>{
    const offsets=[-t.radius+15,-56,0,56,t.radius-15];
    return offsets.some(x=>Math.abs(p[0]-t.center[0]-x)<10)&&offsets.some(z=>Math.abs(p[1]-t.center[1]-z)<10);
  });
  function mesh(name:string,data:RoadGeometry,color:string,collision:boolean) {
    if(!data.indices.length)return;
    // Centre geometry for spatial activation, rather than assigning every road to cell 0,0.
    let x=0,z=0;for(let i=0;i<data.positions.length;i+=3){x+=data.positions[i];z+=data.positions[i+2];}
    x/=data.positions.length/3;z/=data.positions.length/3;
    for(let i=0;i<data.positions.length;i+=3){data.positions[i]-=x;data.positions[i+2]-=z;}
    const normals:number[]=[];VertexData.ComputeNormals(data.positions,data.indices,normals);
    const vertices=new VertexData();Object.assign(vertices,{positions:data.positions,indices:data.indices,normals,colors:data.colors});
    const result=new Mesh(name,world.scene);vertices.applyToMesh(result);result.position.set(x,0,z);
    result.material=world.material(color);result.checkCollisions=collision;result.isPickable=collision;result.receiveShadows=true;
    result.metadata={roadSurface:true,navigationObstacles:[]};result.freezeWorldMatrix();world.chunks.add(result);
  }
  for(const [name,points] of Object.entries(worldRoads)) {
    const local=/street|avenue|ring/.test(name),width=local?7.5:8.8;
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.01)continue;
      const sample=(distance:number):GroundPoint=>[a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length];
      const count=Math.ceil(length/96);
      for(let section=0;section<count;section++) {
        const from=section*length/count,to=(section+1)*length/count,p=sample(from),q=sample(to);
        const asphalt=blank(),shoulder=blank(),paint=blank();
        appendStrip(shoulder,p,q,width+1.5,.17);appendStrip(asphalt,p,q,width,roadLift);
        if(section===0) {appendJunction(shoulder,a,(width+1.5)/2,.17);appendJunction(asphalt,a,width/2,roadLift);}
        if(section===count-1) {appendJunction(shoulder,b,(width+1.5)/2,.17);appendJunction(asphalt,b,width/2,roadLift);}
        for(let distance=from;distance<to;distance+=3) {
          const end=Math.min(to,distance+3),middle=sample((distance+end)/2);
          // Intersection areas are deliberately unpainted; zebra crossings take over in towns.
          if(urban(middle))continue;
          for(const side of [-1,1])appendStrip(paint,sample(distance),sample(end),.14,roadLift+.016,side*(width/2-.3));
        }
        for(let distance=Math.ceil(from/12)*12;distance<to;distance+=12) {
          if(distance<8||distance+4>length-8||crossing(sample(distance))||crossing(sample(distance+4)))continue;
          appendStrip(paint,sample(distance),sample(Math.min(distance+4,to)),.16,roadLift+.016);
        }
        mesh(`road:${name}:${i}:${section}:verge`,shoulder,'#99978a',false);
        mesh(`road:${name}:${i}:${section}:asphalt`,asphalt,'#363e42',true);
        mesh(`road:${name}:${i}:${section}:paint`,paint,'#eee9d8',false);
      }
      const posts:RoadGeometry={positions:[],indices:[],colors:[]};
      const postBox=(x:number,y:number,z:number,width:number,height:number,depth:number,color:string)=>{
        const box=CreateBoxVertexData({width,height,depth}),start=posts.positions.length/3,c=Color3.FromHexString(color);
        for(let v=0;v<box.positions!.length;v+=3) {posts.positions.push(x+box.positions![v],y+box.positions![v+1],z+box.positions![v+2]);posts.colors!.push(c.r,c.g,c.b,1);}
        for(const index of box.indices!)posts.indices.push(start+index);
      };
      if(!local)for(let distance=20;distance<length-12;distance+=42) {
        const p=sample(distance);if(urban(p))continue;
        for(const side of [-1,1]) {
          const x=p[0]-(b[1]-a[1])/length*(width/2+1.5)*side,z=p[1]+(b[0]-a[0])/length*(width/2+1.5)*side,y=terrainSurfaceHeight(x,z);
          postBox(x,y+.65,z,.14,1.3,.18,'#deded0');postBox(x,y+1.08,z,.16,.22,.2,'#343d41');
          postBox(x,y+1.08,z,.17,.06,.21,side>0?'#d99459':'#f1edcf');
        }
      }
      mesh(`road:${name}:${i}:reflectors`,posts,'#ffffff',false);
    }
  }
}
