import { worldConfig } from '../data/config';
import type { GroundPoint } from '../data/world';
import { terrainHeight } from './Terrain';

export const roadLift = .24;
export interface RoadGeometry { positions: number[]; indices: number[]; colors?: number[] }
type Point = [number, number, number];
const grid = worldConfig.size / worldConfig.subdivisions;
const half = worldConfig.size / 2;
const heights = new Map<string,number>();
function vertex(ix:number,iz:number):Point {
  const x=ix*grid-half,z=iz*grid-half,key=`${ix}:${iz}`;
  let y=heights.get(key);
  if(y===undefined) {y=terrainHeight(x,z);heights.set(key,y);}
  return [x,y,z];
}

/** Piecewise planar height of the actual terrain mesh, including its diagonal. */
export function terrainSurfaceHeight(x:number,z:number) {
  const ix=Math.floor((x+half)/grid),iz=Math.floor((z+half)/grid);
  const u=(x+half)/grid-ix,v=(z+half)/grid-iz;
  const a=vertex(ix,iz),b=vertex(ix+1,iz),c=vertex(ix,iz+1);
  return u+v<=1 ? a[1]+u*(b[1]-a[1])+v*(c[1]-a[1])
    : vertex(ix+1,iz+1)[1]*(u+v-1)+b[1]*(1-v)+c[1]*(1-u);
}
export const roadSurfaceHeight=(x:number,z:number)=>terrainSurfaceHeight(x,z)+roadLift;

function clip(polygon:Point[],distance:(p:Point)=>number):Point[] {
  const result:Point[]=[];
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);
    if(da>=0)result.push(a);
    if((da>=0)!==(db>=0)) {const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);}
  }
  return result;
}

/** Clip terrain triangles to a convex road footprint. Every output triangle remains
 * on ONE terrain plane, so neither its centre nor its edges can enter a hill. */
export function appendFootprint(data:RoadGeometry,footprint:readonly GroundPoint[],lift:number) {
  const minX=Math.floor((Math.min(...footprint.map(p=>p[0]))+half)/grid),maxX=Math.floor((Math.max(...footprint.map(p=>p[0]))+half)/grid);
  const minZ=Math.floor((Math.min(...footprint.map(p=>p[1]))+half)/grid),maxZ=Math.floor((Math.max(...footprint.map(p=>p[1]))+half)/grid);
  for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++) {
    const a=vertex(ix,iz),b=vertex(ix+1,iz),c=vertex(ix,iz+1),d=vertex(ix+1,iz+1);
    for(let polygon of [[a,b,c],[b,d,c]]) {
      for(let side=0;side<footprint.length&&polygon.length;side++) {
        const p=footprint[side],q=footprint[(side+1)%footprint.length];
        polygon=clip(polygon,v=>(q[0]-p[0])*(v[2]-p[1])-(q[1]-p[1])*(v[0]-p[0]));
      }
      if(polygon.length<3)continue;
      const start=data.positions.length/3;
      for(const [x,y,z] of polygon)data.positions.push(x,y+lift,z);
      for(let i=1;i<polygon.length-1;i++) {
        const p=polygon[0],q=polygon[i],r=polygon[i+1];
        if(Math.abs((q[0]-p[0])*(r[2]-p[2])-(q[2]-p[2])*(r[0]-p[0]))>1e-8)data.indices.push(start,start+i,start+i+1);
      }
    }
  }
}
export function appendStrip(data:RoadGeometry,a:GroundPoint,b:GroundPoint,width:number,lift:number,shift=0) {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<1e-5)return;
  const nx=-(b[1]-a[1])/length,nz=(b[0]-a[0])/length;
  const at=(p:GroundPoint,s:number):GroundPoint=>[p[0]+nx*(shift+s),p[1]+nz*(shift+s)];
  appendFootprint(data,[at(a,-width/2),at(b,-width/2),at(b,width/2),at(a,width/2)],lift);
}
export function appendJunction(data:RoadGeometry,point:GroundPoint,radius:number,lift:number) {
  appendFootprint(data,Array.from({length:16},(_,i)=>[point[0]+Math.cos(i*Math.PI/8)*radius,point[1]+Math.sin(i*Math.PI/8)*radius] as GroundPoint),lift);
}
