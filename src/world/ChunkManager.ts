import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { type TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { worldConfig } from '../data/config';

interface Chunk { x:number;z:number;active:boolean;nodes:TransformNode[] }
export class ChunkManager {
  private chunks=new Map<string,Chunk>();
  private timer=0;
  private count=0;
  get activeCount() {return this.count;}
  get totalCount() {return this.chunks.size;}
  add(node:TransformNode) {
    const x=Math.floor(node.position.x/worldConfig.chunkSize),z=Math.floor(node.position.z/worldConfig.chunkSize),key=`${x}:${z}`;
    let chunk=this.chunks.get(key);
    if(!chunk) {chunk={x,z,active:true,nodes:[]};this.chunks.set(key,chunk);this.count++;}
    chunk.nodes.push(node);node.setEnabled(chunk.active && !node.metadata?.streamHidden);
  }
  update(dt:number,position:Vector3) {
    this.timer-=dt;if(this.timer>0)return;this.timer=.35;
    for(const chunk of this.chunks.values()) {
      // Distance to cell bounds keeps a whole district alive until its nearest edge is out of range.
      const dx=Math.max(chunk.x*worldConfig.chunkSize-position.x,0,position.x-(chunk.x+1)*worldConfig.chunkSize);
      const dz=Math.max(chunk.z*worldConfig.chunkSize-position.z,0,position.z-(chunk.z+1)*worldConfig.chunkSize);
      const range=worldConfig.activeDistance+(chunk.active?80:0),active=dx*dx+dz*dz<range*range;
      if(active!==chunk.active) {chunk.active=active;this.count+=active?1:-1;}
      for(const node of chunk.nodes)if(!node.isDisposed()) {const enabled=(active||node.metadata?.alwaysActive) && !node.metadata?.streamHidden;if(node.isEnabled()!==enabled)node.setEnabled(enabled);}
    }
  }
}
