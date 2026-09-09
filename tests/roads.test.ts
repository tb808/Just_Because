import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { createTerrain } from '../src/world/Terrain';
import { appendStrip, roadLift, terrainSurfaceHeight, type RoadGeometry } from '../src/world/RoadSurface';
import { settlements, worldRoads, type GroundPoint } from '../src/data/world';
import { bases } from '../src/data/bases';

test('asphalt triangle interiors and edges stay above terrain across the entire road network',()=>{
  let checked=0;
  for(const [name,points] of Object.entries(worldRoads))for(let segment=1;segment<points.length;segment++) {
    const data:RoadGeometry={positions:[],indices:[]};appendStrip(data,points[segment-1],points[segment],8.8,roadLift);
    assert.ok(data.indices.length,`${name} must have visible surface geometry`);
    const normals:number[]=[];VertexData.ComputeNormals(data.positions,data.indices,normals);
    for(let i=0;i<data.indices.length;i+=3) {
      const vertices=data.indices.slice(i,i+3).map(index=>data.positions.slice(index*3,index*3+3));
      for(const index of data.indices.slice(i,i+3))assert.ok(normals[index*3+1]>0,`${name} faces away from the sky`);
      for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]) {
        const p=[0,1,2].map(axis=>vertices.reduce((sum,v,j)=>sum+v[axis]*weights[j],0));
        assert.ok(Math.abs(p[1]-terrainSurfaceHeight(p[0],p[2])-roadLift)<1e-6,`${name} intersects or floats above the terrain at ${p}`);checked++;
      }
    }
  }
  assert.ok(checked>10000);
});

test('road height matches the actual collision terrain triangles, not just the smooth height formula',()=>{
  const engine=new NullEngine(),scene=new Scene(engine);
  try {
    createTerrain(scene);
    for(const [name,points] of Object.entries(worldRoads).filter(([name])=>!/street|avenue|ring/.test(name))) {
      const a=points[0],b=points[1];
      for(const t of [.23,.51,.79]) {
        const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
        const hit=scene.pickWithRay(new Ray(new Vector3(x,500,z),Vector3.Down(),600),m=>m.name.startsWith('terrain-'));
        assert.ok(hit?.pickedPoint,`${name} needs supporting terrain`);
        assert.ok(Math.abs(hit.pickedPoint.y-terrainSurfaceHeight(x,z))<.001,`${name} collision plane differs from road plane`);
      }
    }
  } finally {scene.dispose();engine.dispose();}
});

test('all towns and the four new compound gates share a continuous paved network',()=>{
  const segments=Object.values(worldRoads).flatMap(points=>points.slice(1).map((b,i)=>({a:points[i],b})));
  const parent=segments.map((_,i)=>i),find=(i:number):number=>parent[i]===i?i:parent[i]=find(parent[i]);
  const distance=(p:GroundPoint,a:GroundPoint,b:GroundPoint)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);};
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++) {
    const {a,b}=segments[i],{a:c,b:d}=segments[j],ux=b[0]-a[0],uz=b[1]-a[1],vx=d[0]-c[0],vz=d[1]-c[1],cross=ux*vz-uz*vx;
    const t=((c[0]-a[0])*vz-(c[1]-a[1])*vx)/cross,s=((c[0]-a[0])*uz-(c[1]-a[1])*ux)/cross;
    const intersect=Math.abs(cross)>1e-8&&t>=0&&t<=1&&s>=0&&s<=1;
    if(intersect||Math.min(distance(a,c,d),distance(b,c,d),distance(c,a,b),distance(d,a,b))<.01)parent[find(j)]=find(i);
  }
  const components=settlements.map(town=>{const index=segments.findIndex(s=>distance(town.center,s.a,s.b)<.01);assert.ok(index>=0,`${town.name} has no road access`);return find(index);});
  for(const base of bases.slice(6)) {
    const gate:GroundPoint=[base.center[0]-38,base.center[2]];
    const index=segments.findIndex(s=>distance(gate,s.a,s.b)<.01);
    assert.ok(index>=0,`${base.name} gate has no paved access`);components.push(find(index));
  }
  assert.equal(new Set(components).size,1,'the city roads must form a single connected network');
});
