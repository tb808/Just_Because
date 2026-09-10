import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { WorldManager } from './WorldManager';
import { worldConfig } from '../data/config';

interface NavigationObstacle {minX:number;maxX:number;minZ:number;maxZ:number;minY:number;maxY:number}
interface Batch { x:number;z:number;color:string;collision:boolean;positions:number[];indices:number[];obstacles:NavigationObstacle[] }
/** Thousands of authored facade and landscape parts become a handful of meshes per district. */
export class StaticGeometry {
  private batches=new Map<string,Batch>();
  count=0;
  constructor(private world:WorldManager) {}
  private batch(x:number,z:number,color:string,collision:boolean) {
    const cx=Math.floor(x/worldConfig.chunkSize),cz=Math.floor(z/worldConfig.chunkSize),key=`${cx}:${cz}:${color}:${collision}`;
    let batch=this.batches.get(key);
    if(!batch) { batch={x:(cx+.5)*worldConfig.chunkSize,z:(cz+.5)*worldConfig.chunkSize,color,collision,positions:[],indices:[],obstacles:[]};this.batches.set(key,batch); }
    this.count++;return batch;
  }
  box(x:number,y:number,z:number,width:number,height:number,depth:number,color:string,collision=false,rotation=0) {
    const batch=this.batch(x,z,color,collision),cos=Math.cos(rotation),sin=Math.sin(rotation);
    if(collision) {const halfX=(Math.abs(cos)*width+Math.abs(sin)*depth)/2,halfZ=(Math.abs(sin)*width+Math.abs(cos)*depth)/2;batch.obstacles.push({minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ,minY:y-height/2,maxY:y+height/2});}
    const faces=[[-1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1],[1,-1,1,-1,-1,1,-1,1,1,1,1,1],[-1,-1,1,-1,-1,-1,-1,1,-1,-1,1,1],[1,-1,-1,1,-1,1,1,1,1,1,1,-1],[-1,1,-1,1,1,-1,1,1,1,-1,1,1],[-1,-1,1,1,-1,1,1,-1,-1,-1,-1,-1]];
    for(const face of faces) {
      const first=batch.positions.length/3;
      for(let i=0;i<12;i+=3) {const px=face[i]*width/2,pz=face[i+2]*depth/2;batch.positions.push(x-batch.x+px*cos+pz*sin,y+face[i+1]*height/2,z-batch.z-px*sin+pz*cos);}
      batch.indices.push(first,first+1,first+2,first,first+2,first+3);
    }
  }
  cylinder(x:number,y:number,z:number,radius:number,height:number,color:string,collision=false,topRadius=radius,sides=7) {
    const batch=this.batch(x,z,color,collision);
    if(collision) {const r=Math.max(radius,topRadius);batch.obstacles.push({minX:x-r,maxX:x+r,minZ:z-r,maxZ:z+r,minY:y-height/2,maxY:y+height/2});}
    for(let i=0;i<sides;i++) {
      const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,start=batch.positions.length/3;
      const verts=[[Math.sin(a)*radius,-height/2,Math.cos(a)*radius],[Math.sin(b)*radius,-height/2,Math.cos(b)*radius],[Math.sin(b)*topRadius,height/2,Math.cos(b)*topRadius],[Math.sin(a)*topRadius,height/2,Math.cos(a)*topRadius]];
      for(const [px,py,pz] of verts)batch.positions.push(x-batch.x+px,y+py,z-batch.z+pz);
      batch.indices.push(start,start+2,start+1,start,start+3,start+2);
      const cap=batch.positions.length/3;
      batch.positions.push(x-batch.x,y+height/2,z-batch.z,x-batch.x+Math.sin(a)*topRadius,y+height/2,z-batch.z+Math.cos(a)*topRadius,x-batch.x+Math.sin(b)*topRadius,y+height/2,z-batch.z+Math.cos(b)*topRadius);
      batch.indices.push(cap,cap+2,cap+1);
    }
  }
  flush() {
    const meshes:Mesh[]=[];
    for(const [key,batch] of this.batches) {
      const normals:number[]=[];VertexData.ComputeNormals(batch.positions,batch.indices,normals);
      const data=new VertexData();Object.assign(data,{positions:batch.positions,indices:batch.indices,normals});
      const mesh=new Mesh(`district:${key}`,this.world.scene);data.applyToMesh(mesh);
      mesh.position.set(batch.x,0,batch.z);mesh.material=this.world.material(batch.color);mesh.checkCollisions=batch.collision;mesh.isPickable=batch.collision;mesh.receiveShadows=true;
      mesh.metadata={worldStatic:true,collisionStatic:true,decorative:!batch.collision,navigationObstacles:batch.obstacles};mesh.freezeWorldMatrix();this.world.chunks.add(mesh);meshes.push(mesh);
    }
    this.batches.clear();return meshes;
  }
}
