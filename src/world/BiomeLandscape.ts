import { biomeAt, landscapeSites, type BiomeId } from '../data/biomes';
import { bases } from '../data/bases';
import { assets } from '../data/assets';
import { distanceToRoad, settlements, worldLocations, worldRoads } from '../data/world';
import { townEdgeDistance } from '../data/townPlans';
import { terrainHeight } from './Terrain';
import type { StaticGeometry } from './StaticGeometry';
import type { WorldManager } from './WorldManager';

export function buildBiomeLandscape(g:StaticGeometry,world:WorldManager,jobs:Promise<unknown>[]) {
  let seed=91247;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const roads=Object.values(worldRoads);
  const clear=(x:number,z:number,r=16)=>terrainHeight(x,z)>3&&
    !settlements.some(t=>townEdgeDistance(t,x,z)<r+12)&&
    !bases.some(b=>Math.hypot(x-b.center[0],z-b.center[2])<110+r)&&
    !worldLocations.some(p=>Math.hypot(x-p.position[0],z-p.position[1])<100+r)&&distanceToRoad([x,z],roads)>r;
  const counts:Record<BiomeId,number>={meadow:0,woodland:0,alpine:0,wetland:0,dunes:0,volcanic:0,coast:0};
  function tree(x:number,z:number,s:number,kind:'pine'|'oak'|'palm'|'birch') {
    const y=terrainHeight(x,z),h=(kind==='pine'?12:kind==='palm'?9:8)*s;
    g.cylinder(x,y+h*.42,z,.28*s,h*.84,kind==='birch'?'#d8ddc6':'#817459',true,.17*s,6);
    if(kind==='pine')for(let layer=0;layer<4;layer++)g.cylinder(x,y+h*(.45+layer*.15),z,(3.6-layer*.65)*s,4.5*s,'#385d50',false,.1,7);
    else if(kind==='palm')for(let leaf=0;leaf<7;leaf++) {
      const a=leaf*Math.PI*2/7;g.box(x+Math.sin(a)*2*s,y+h,z+Math.cos(a)*2*s,1.3*s,.3,5*s,'#648959',false,a);
    } else {
      const foliage=kind==='birch'?'#c7ad59':'#527c58';
      g.cylinder(x,y+h*.84,z,3.4*s,4*s,foliage,false,2.1*s,8);
      g.cylinder(x+1.8*s,y+h*.7,z+.8*s,2.7*s,3*s,foliage,false,1.4*s,7);
    }
  }
  function rock(x:number,z:number,s:number,kind:BiomeId) {
    const y=terrainHeight(x,z),color=kind==='volcanic'?'#51555b':kind==='dunes'?'#ae7657':kind==='coast'?'#d8ddc6':'#9b9d8b';
    g.cylinder(x,y+s*.7,z,s*1.6,s*1.6,color,true,s*.85,kind==='volcanic'?6:5);
    if(kind==='dunes')g.cylinder(x,y+s*.9,z,s*1.45,.25*s,'#d3ad66',false,s*1.4,5);
  }
  function cactus(x:number,z:number,s:number) {
    const y=terrainHeight(x,z);g.cylinder(x,y+2*s,z,.4*s,4*s,'#7d9459',true,.3*s,6);
    for(const side of [-1,1]){g.box(x+side*.65*s,y+1.9*s,z,1.3*s,.35*s,.35*s,'#7d9459');g.cylinder(x+side*1.2*s,y+2.4*s,z,.22*s,1.3*s,'#7d9459',false,.17*s,6);}
  }
  function reeds(x:number,z:number,s:number) {
    const y=terrainHeight(x,z);
    for(let i=0;i<5;i++){const dx=Math.sin(i*2.4)*s,dz=Math.cos(i*2.4)*s,h=(1.2+i*.16)*s;g.box(x+dx,y+h/2,z+dz,.1,h,.1,'#8ba34b');g.cylinder(x+dx,y+h,z+dz,.12,.45,'#817459',false,.1,5);}
  }
  // Region-dependent clusters and clearings replace uniform confetti across the map.
  for(let i=0;i<25000;i++) {
    const x=(random()-.5)*4600,z=(random()-.5)*4500,s=.65+random()*.85,choice=random(),b=biomeAt(x,z);
    const cluster=.5+.3*Math.sin(x*.023+Math.sin(z*.009)*2)+.2*Math.cos(z*.019);
    const density=b.id==='woodland'||b.id==='alpine'?.42+cluster*.55:b.id==='dunes'||b.id==='volcanic'?.15+cluster*.38:.28+cluster*.48;
    if(random()>density||!clear(x,z)||landscapeSites.some(p=>Math.hypot(x-p.position[0],z-p.position[1])<55))continue;
    counts[b.id]++;
    if(b.id==='alpine') {if(choice<.75)tree(x,z,s,'pine');else rock(x,z,s*2,b.id);}
    else if(b.id==='woodland') {if(choice<.8)tree(x,z,s,choice<.18?'birch':'oak');else rock(x,z,s,b.id);}
    else if(b.id==='wetland') {if(choice<.82)reeds(x,z,s);else tree(x,z,s*.7,'birch');}
    else if(b.id==='dunes') {if(choice<.42)cactus(x,z,s);else if(choice<.75)rock(x,z,s*2,b.id);else g.cylinder(x,terrainHeight(x,z)+.3,z,1.1,.6,'#d3ad66',false,.2,6);}
    else if(b.id==='volcanic')rock(x,z,s*(choice<.18?4:1.6),b.id);
    else if(b.id==='coast') {if(choice<.48)tree(x,z,s,'palm');else rock(x,z,s*2,b.id);}
    else if(choice<.22)tree(x,z,s,'oak');
    else {
      const y=terrainHeight(x,z);
      for(let tuft=0;tuft<4;tuft++){const dx=tuft*.7;g.box(x+dx,y+.3,z+Math.sin(tuft),.12,.6,.12,'#8ba34b');if(choice>.65)g.cylinder(x+dx,y+.63,z+Math.sin(tuft),.18,.14,i%2?'#d3ad66':'#c77c56',false,.18,5);}
    }
  }
  const builtSites:string[]=[];
  for(const site of landscapeSites) {
    const [x,z]=site.position,b=biomeAt(x,z),before=g.count;
    if(site.kind==='stones')for(let i=0;i<9;i++) {
      const a=i*2.4,r=9+(i%3)*10,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
      if(clear(px,pz,24))rock(px,pz,3+i%4,b.id);
    }
    if(site.kind==='orchard')for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++) {
      const px=x+row*12,pz=z+col*12;if(clear(px,pz))tree(px,pz,.75,row%2?'birch':'oak');
    }
    if(site.kind==='pond'&&clear(x,z,30)) {
      // Raised, stone-lined pools follow a sampled foundation; no water plane clips a hill.
      const ground=Math.max(...[-12,0,12].flatMap(dx=>[-12,0,12].map(dz=>terrainHeight(x+dx,z+dz))));
      g.cylinder(x,ground-.4,z,14,2.4,'#9b9d8b',true,14,20);
      g.cylinder(x,ground+.83,z,12.8,.08,'#6daaaa',false,12.8,20);
      for(let i=0;i<14;i++){const a=i*Math.PI/7,px=x+Math.sin(a)*19,pz=z+Math.cos(a)*19;if(clear(px,pz)){if(b.id==='dunes'&&i%3===0)tree(px,pz,1,'palm');else reeds(px,pz,1);}}
    }
    if(site.kind==='camp'||site.kind==='ruin')for(let i=0;i<3;i++) {
      const px=x-18+i*18,pz=z+(i%2)*16,y=terrainHeight(px,pz);if(!clear(px,pz,22))continue;
      if(site.kind==='camp') {
        g.box(px,y+.12,pz,10,.24,8,'#9b8669',true);
        for(const side of [-1,1])g.box(px+side*4,y+1.6,pz,.2,3.2,.2,'#645c4e',true);
        g.cylinder(px,y+3,pz,6,3,b.id==='dunes'?'#d3ad66':'#527c78',false,0,4);
        g.box(px+6,y+.7,pz+1,1.8,1.4,1.4,'#9b8669',true);
      } else {
        for(const side of [-1,1])g.box(px+side*4,y+2.5,pz,1.5,5,2,'#aaa791',true);
        g.box(px,y+5,pz,10,1,2,'#bdb9a2',true);rock(px+2,pz+5,1.8,b.id);
      }
    }
    if(g.count>before)builtSites.push(site.id);
    // Existing licensed GLBs add recognizable shapes at selected sites, with shared asset caching.
    if(clear(x+32,z-25,24)) {
      const def=site.kind==='stones'?assets.environment.rock:b.id==='dunes'||b.id==='coast'?assets.environment.palm:assets.environment.tree;
      jobs.push(world.place(def,`landscape-model-${site.id}`,x+32,z-25,terrainHeight(x+32,z-25),true));
    }
  }
  // Small roadside rest points break long journeys into recognizable stretches.
  let restStops=0;
  for(const [name,road] of Object.entries(worldRoads)) {
    if(/avenue|street|ring|Access|access/.test(name))continue;
    for(let i=1;i<road.length;i++) {
      const a=road[i-1],b=road[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(length<220)continue;
      const x=(a[0]+b[0])/2-(b[1]-a[1])/length*30,z=(a[1]+b[1])/2+(b[0]-a[0])/length*30;
      if(!clear(x,z,22))continue;
      const y=terrainHeight(x,z);g.box(x,y+.65,z,3.7,.2,.9,'#9e794f',true);g.box(x,y+1.1,z+.45,3.7,.9,.15,'#9e794f');
      g.box(x+4,y+1.5,z,.2,3,.2,'#645c4e',true);g.box(x+4,y+2.6,z,2,.7,.15,'#c8bea0');
      tree(x-6,z+4,.8,biomeAt(x,z).id==='alpine'?'pine':biomeAt(x,z).id==='dunes'?'palm':'oak');restStops++;
    }
  }
  world.scene.metadata={...world.scene.metadata,landscape:{counts,builtSites,restStops}};
}
