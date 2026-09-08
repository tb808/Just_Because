import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { bases } from '../data/bases';
import { assets } from '../data/assets';
import { distanceToRoad, settlements, worldLocations, worldRoads, type GroundPoint, type SettlementDefinition, type WorldLocation } from '../data/world';
import { terrainHeight } from './Terrain';
import { StaticGeometry } from './StaticGeometry';
import type { WorldManager } from './WorldManager';

export async function expandWorld(world: WorldManager) {
  const jobs: Promise<unknown>[] = [], geometry=new StaticGeometry(world);
  for (const base of bases) buildBase(world, base, jobs,geometry);
  for (const [name, points] of Object.entries(worldRoads)) road(world, geometry, `${name}-road`, points);
  for (const settlement of settlements) buildTown(world,geometry,settlement);
  buildMarket(geometry,-335,-306,'#d78958');
  const bridgeY=terrainHeight(-235,-286);
  geometry.box(-235,bridgeY+.12,-286,72,.24,10,'#9da99a',true);
  for(const z of [-292,-280]) for(let x=-267;x<-200;x+=12)geometry.box(x,terrainHeight(x,z)+.8,z,.6,1.6,.6,'#d8ddc6',true);
  // Mirada is now the inland cargo terminal; its original pier remains an elevated loading boardwalk.
  const pierY=terrainHeight(-505,-220)+.5;
  geometry.box(-505,pierY,-220,190,1,13,'#9b8669',true);
  for(let x=-585;x<-420;x+=16)for(const z of [-225,-215])geometry.box(x,terrainHeight(x,z)+1,z,.65,3,.65,'#645c4e',true);
  crane(geometry,-465,terrainHeight(-465,-202),-202);
  for(const location of worldLocations)buildLocation(geometry,location);
  buildLandscape(geometry);
  geometry.flush();
  await Promise.all(jobs);
}

function buildBase(world:WorldManager,base:(typeof bases)[number],jobs:Promise<unknown>[],g:StaticGeometry) {
  const [x,y,z]=base.center,[fx,fy,fz]=base.flag;
  g.box(x,y-.1,z,76,.3,68,'#a9b4a0',true);
  g.box(x,y+1.5,z+34,76,3,.5,'#6d8982',true);
  g.box(x-38,y+1.5,z+23,.5,3,22,'#6d8982',true);
  g.box(x-38,y+1.5,z-23,.5,3,22,'#6d8982',true);
  g.box(x+38,y+1.5,z+16,.5,3,36,'#6d8982',true);
  g.box(fx,fy+4,fz,.2,8,.2,'#e9e0bd',true);
  const flag=world.box(`${base.id}-flag`,fx+1.5,fy+7,fz,3,1.7,.08,'#cf6548',false);world.flags.set(base.id,flag);
  g.box(fx,fy+.02,fz,9,.08,9,'#597e78');
  jobs.push(world.place(assets.environment.warehouse,`${base.id}-depot`,x+9,z+14,y,true));
  for(const [dx,dz] of [[-26,22],[28,25]])jobs.push(world.place(assets.environment.container,`${base.id}-container-${dx}`,x+dx,z+dz,y,true));
  for(const tank of base.tanks)jobs.push(world.place(assets.environment.tank,tank.id,tank.x,tank.z,y,true));
  const supply={x:x+28,z:z+42},supplyY=terrainHeight(supply.x,supply.z);
  jobs.push(world.place(assets.vehicles.car,`${base.id}-supply`,supply.x,supply.z,supplyY+.2,true));
  world.supplies.push({baseId:base.id,position:[supply.x,supplyY+1,supply.z]});
  g.box(x+29,y+7,z-24,6,14,6,'#d5ddd0',true);g.box(x+29,y+14,z-24,8,.4,8,'#31595b',true);
  for(let dz=-28;dz<=28;dz+=8) {g.box(x-37,y+3.35,z+dz,.18,1,.18,'#31595b');g.box(x+37,y+3.35,z+dz,.18,1,.18,'#31595b');}
  for(let i=0;i<7;i++)g.box(x-15+i*5,y+.12,z-8,2,.025,4,'#e9e0bd');
  for(const dx of [-32,32])lamp(g,x+dx,z-35);
  for(let i=0;i<5;i++) {g.box(x+34,y+.75,z-6+i*3,1.5,1.5,1.5,'#9b8669',true);g.box(x+34,y+1.55,z-6+i*3,1.3,.15,1.3,'#645c4e');}
}

function buildTown(world:WorldManager,g:StaticGeometry,town:SettlementDefinition) {
  const [cx,cz]=town.center,y=town.elevation,edge=town.radius-15;
  for(const offset of [-56,0,56])for(const side of [-1,1]) {
    g.box(cx+offset+side*9,y+.055,cz,4,.11,edge*2,'#c6c2af');
    g.box(cx,y+.055,cz+offset+side*9,edge*2,.11,4,'#c6c2af');
    for(const along of [-112,-56,0,56,112]) {
      // Furniture sits on the outer edge, leaving the walking line at eight metres clear.
      const lx=cx+offset+side*11,lz=cz+along+14;
      if(Math.hypot(lx-town.market[0],lz-town.market[1])>32)lamp(g,lx,lz);
    }
  }
  town.homes.forEach(([x,z],index)=>building(g,x,z,y,town,index));
  buildMarket(g,town.market[0],town.market[1],town.color);
  // Four crossing stripes make the traffic/pedestrian crossings legible.
  for(const ox of [-56,0,56])for(const oz of [-56,0,56])for(let stripe=-3;stripe<=3;stripe++) {
    g.box(cx+ox+stripe,y+.205,cz+oz+5.2,.5,.012,2.5,'#e9e0bd');
    g.box(cx+ox+5.2,y+.205,cz+oz+stripe,2.5,.012,.5,'#e9e0bd');
  }
  const tx=cx+edge-18,tz=cz+edge-18;
  g.box(tx,y+13,tz,9,26,9,town.color,true);g.box(tx,y+26.3,tz,10,.6,10,'#d5ddd0',true);
  for(const dx of [-3.5,3.5])for(const dz of [-3.5,3.5])g.box(tx+dx,y+29,tz+dz,.6,5.5,.6,'#d5ddd0',true);
  g.cylinder(tx,y+32.5,tz,7,3,'#a76b4c',false,0,4);
  for(const side of [-1,1]) {g.box(tx,y+21.5,tz+side*4.56,3.3,3.3,.14,'#e9e0bd');g.box(tx,y+22,tz+side*4.67,.16,1.3,.06,'#31595b');g.box(tx+.6,y+21.5,tz+side*4.67,1.3,.16,.06,'#31595b');}
  // Car-free pocket gardens sit outside the ring, with a clear central access path.
  for(const side of [-1,1])for(let i=0;i<4;i++) {
    const x=cx+side*(edge+8),z=cz-75+i*48;
    tree(g,x,z,1.05,town.id==='bellacosta'||town.id==='porto-novo'?'palm':'cypress');
    bench(g,x+side*5,z+7,town.elevation);
  }
  // Distinct civic silhouettes supplement the individual shops and dense housing blocks.
  if(town.id==='oliveto')windmill(g,cx-edge-30,cz+60);
  if(town.id==='sanremo') {g.box(cx+edge+25,y+5,cz-55,25,10,20,'#9baeb0',true);g.box(cx+edge+25,y+10.4,cz-55,29,.8,24,'#31595b',true);}
  if(town.id==='porto-novo'||town.id==='bellacosta')for(let i=0;i<4;i++)boat(g,cx-110+i*17,y+1,cz-edge-13,i%2?'#c77c56':'#658f9a');
  // A small number of reusable vehicle assets add grounded detail without a model per household.
  void world;
}

function building(g:StaticGeometry,x:number,z:number,y:number,town:SettlementDefinition,index:number) {
  const floors=2+((index+town.population)%3),height=floors*3.3+1,width=14+(index%3),depth=13+(index%2);
  const palette=[town.color,'#e4d5b4','#cdb79d','#dfc3a3','#c4cbb6'];const color=palette[index%palette.length],shutter=index%3?'#527c78':'#738eaa';
  g.box(x,y+height/2,z,width,height,depth,color,true);g.box(x,y+.55,z,width+.2,1.1,depth+.2,'#9b9d8b');
  g.box(x,y+height+.2,z,width+1.1,.5,depth+1.1,'#d8ddc6',true);
  if(index%3===0) {
    for(let step=0;step<5;step++)g.box(x,y+height+.5+step*.36,z,width+1.5-step*2.6,.4,depth+1.4,'#ae7657',true);
    for(let dz=-5;dz<=5;dz+=.85)g.box(x,y+height+2.32,z+dz,2,.09,.1,'#cf9368');
  } else {
    for(const side of [-1,1])g.box(x,y+height+.85,z+side*depth/2,width,.8,.3,color,true);
    for(const side of [-1,1])g.box(x+side*width/2,y+height+.85,z,.3,.8,depth,color,true);
    g.box(x+3,y+height+.55,z+2,4,.15,3,'#31595b');
    g.cylinder(x-4,y+height+1.25,z+3,.65,2,'#9baeb0');
  }
  g.box(x-width*.3,y+height+1,z-3,1.1,2.3,1.1,'#bd947a',true);
  for(const side of [-1,1]) {
    const front=z+side*(depth/2+.12);
    g.box(x,y+1.6,front,1.8,3.2,.18,'#645c4e');g.box(x+.5,y+1.5,front+side*.13,.1,.15,.09,'#d3ad66');
    for(let floor=0;floor<floors;floor++)for(const dx of [-4.6,0,4.6]) {
      if(floor===0&&dx===0)continue;const wy=y+2.15+floor*3.3;
      g.box(x+dx,wy,front,2.2,2.2,.15,'#eee3c7');g.box(x+dx,wy,front+side*.12,1.7,1.8,.08,(index+floor)%5===0?'#d3ad66':'#385960');
      g.box(x+dx,wy,front+side*.18,.07,1.8,.08,'#c6c2af');g.box(x+dx,wy+.1,front+side*.18,1.7,.07,.08,'#c6c2af');
      for(const sx of [-1.3,1.3]) {g.box(x+dx+sx,wy,front,.52,1.9,.16,shutter);for(let slat=0;slat<4;slat++)g.box(x+dx+sx,wy-.6+slat*.4,front+side*.12,.48,.06,.08,'#31595b');}
      g.box(x+dx,wy-1.2,front+side*.3,2.3,.17,.7,'#d8ddc6');
      if(floor>0&&dx!==0&&(index+floor)%2===0) {
        g.box(x+dx,wy-1.1,front+side*.75,3,.2,1.6,'#d8ddc6',true);
        g.box(x+dx,wy-.15,front+side*1.5,3,.08,.08,'#31595b');for(let bar=-1.2;bar<=1.2;bar+=.4)g.box(x+dx+bar,wy-.6,front+side*1.5,.055,1,.055,'#31595b');
        g.box(x+dx,wy-.75,front+side*1.3,1.2,.4,.35,'#ae7657');g.box(x+dx,wy-.45,front+side*1.3,1.35,.3,.4,index%2?'#8ba34b':'#c77c56');
      }
    }
    if(index%2===0) {
      g.box(x,y+3.1,front+side*.8,width-1,.2,1.8,shutter);g.box(x,y+2.85,front+side*1.65,width-1,.55,.12,shutter);
      for(let stripe=-5;stripe<=5;stripe+=1.1)g.box(x+stripe,y+3.22,front+side*.8,.35,.03,1.7,'#e9e0bd');
      g.box(x,y+3.85,front+side*.13,5.3,.7,.2,'#645c4e');for(let letter=-1.7;letter<2;letter+=.65)g.box(x+letter,y+3.85,front+side*.25,.36,.34,.06,'#e9e0bd');
    }
  }
  for(const side of [-1,1])for(let floor=0;floor<floors;floor++)for(const dz of [-3.4,3.4]) {
    g.box(x+side*(width/2+.1),y+2.2+floor*3.3,z+dz,.15,2,1.7,'#385960');
    g.box(x+side*(width/2+.23),y+1.1+floor*3.3,z+dz,.45,.16,2,'#e9e0bd');
  }
  g.cylinder(x+width/2-.6,y+.65,z+depth/2+1,.55,1.3,'#ae7657');g.cylinder(x+width/2-.6,y+1.5,z+depth/2+1,.8,1.4,'#648959',false,.5);
  g.box(x-width/2+.7,y+.5,z+depth/2+.8,.8,1,.65,'#527c78');
}

function buildMarket(g:StaticGeometry,cx:number,cz:number,color:string) {
  const y=terrainHeight(cx,cz);g.box(cx,y+.08,cz,51,.15,43,'#c8bea0');
  for(const side of [-1,1])for(const dz of [-5,13]) {
    const x=cx+side*21,z=cz+dz;
    g.box(x,y+.7,z,6,1.4,2.4,'#956d49',true);g.box(x,y+3.2,z,7,.18,4,color);
    for(const dx of [-3,3])g.box(x+dx,y+1.6,z,.13,3.2,.13,'#c7b090',true);
    for(let stripe=-2.8;stripe<=3;stripe+=1)g.box(x+stripe,y+3.31,z,.35,.04,4,'#e9e0bd');
    for(let crate=-2;crate<=2;crate+=2) {g.box(x+crate,y+1.5,z,1.7,.35,1.7,'#9b8669');for(let fruit=0;fruit<3;fruit++)g.cylinder(x+crate-.5+fruit*.5,y+1.8,z,.22,.3,crate===0?'#d3ad66':crate<0?'#8ba34b':'#c77c56',false,.16,5);}
    g.box(x+side*4,y+.55,z,1.2,1.1,1.2,'#9b8669',true);
  }
  // Pick a pocket off the connected traffic lanes and both civilian loops.
  const town=settlements.find(t=>t.market[0]===cx&&t.market[1]===cz);
  const pocket=([[15,15],[-15,15],[15,-15],[-15,-15]] as const).find(([dx,dz])=>distanceToRoad([cx+dx,cz+dz])>6&&(!town||distanceToRoad([cx+dx,cz+dz],[town.residentRoute])>4))??[15,15];
  const fountainX=cx+pocket[0],fountainZ=cz+pocket[1];
  g.cylinder(fountainX,y+.3,fountainZ,2.7,.6,'#9b9d8b',true,2.7,12);g.cylinder(fountainX,y+.63,fountainZ,2.25,.12,'#6daaaa',false,2.25,12);
  g.cylinder(fountainX,y+1.2,fountainZ,.5,1.7,'#d8ddc6',true);g.cylinder(fountainX,y+2,fountainZ,1.4,.25,'#d8ddc6',false,1.4,10);
  for(const dx of [-18,18]) {bench(g,cx+dx,cz-17,y);tree(g,cx+dx,cz-22,.75,'olive');lamp(g,cx+dx,cz+23);}
  for(const dx of [-17,17])for(const dz of [-15,20])g.cylinder(cx+dx,y+.8,cz+dz,.35,1.6,'#645c4e',true);
  // Cafe tables and paired chairs form readable social clusters outside walking corridors.
  for(const dx of [-20,20]) {
    g.cylinder(cx+dx,y+.8,cz-10,1,.12,'#d3ad66');g.cylinder(cx+dx,y+.4,cz-10,.1,.8,'#645c4e');
    for(const sx of [-1.5,1.5]){g.box(cx+dx+sx,y+.5,cz-10,.7,.15,.7,'#d5ddd0');g.box(cx+dx+sx,y+.95,cz-10.3,.7,.9,.12,'#d5ddd0');}
    g.cylinder(cx+dx,y+2.8,cz-10,2.2,.5,color,false,.2,8);g.cylinder(cx+dx,y+1.7,cz-10,.06,3.4,'#645c4e');
  }
}
function lamp(g:StaticGeometry,x:number,z:number) {const y=terrainHeight(x,z);g.cylinder(x,y+3,z,.13,6,'#476764');g.box(x+.55,y+6,z,1.2,.18,.2,'#476764');g.box(x+1,y+5.8,z,.7,.3,.65,'#fff0b4');}
function bench(g:StaticGeometry,x:number,z:number,y=terrainHeight(x,z)) {g.box(x,y+.65,z,3.7,.2,.9,'#9e794f',true);g.box(x,y+1.15,z+.45,3.7,.9,.15,'#9e794f');for(const dx of [-1.3,1.3])g.box(x+dx,y+.3,z,.15,.65,.8,'#476764');}
function tree(g:StaticGeometry,x:number,z:number,scale:number,kind:'olive'|'palm'|'cypress'|'pine') {
  const y=terrainHeight(x,z),height=(kind==='palm'?9:kind==='cypress'?11:7)*scale;
  g.cylinder(x,y+height*.42,z,.24*scale,height*.84,'#817459',true,.15*scale,5);
  if(kind==='palm') {
    for(let leaf=0;leaf<6;leaf++) {const angle=leaf/6*Math.PI*2;g.box(x+Math.sin(angle)*1.8*scale,y+height*.88,z+Math.cos(angle)*1.8*scale,1.1*scale,.3*scale,4.6*scale,'#648959',false,angle);}
    g.cylinder(x,y+height*.98,z,1.25*scale,1.6*scale,'#527c58',false,.4*scale,6);
  }else if(kind==='cypress')g.cylinder(x,y+height*.75,z,1.6*scale,height*.95,'#476f56',false,.15*scale,6);
  else if(kind==='pine')for(let layer=0;layer<3;layer++)g.cylinder(x,y+height*(.55+layer*.18),z,(3.4-layer*.65)*scale,4*scale,layer%2?'#648959':'#476f56',false,.1,6);
  else {g.cylinder(x,y+height*.8,z,3.1*scale,3.8*scale,'#6f9160',false,2*scale,7);g.cylinder(x+1.4*scale,y+height*.72,z+.6*scale,2.1*scale,2.8*scale,'#86a574',false,1.3*scale,6);}
}
function crane(g:StaticGeometry,x:number,y:number,z:number) {g.box(x,y+9,z,1.4,18,1.4,'#d3ad66',true);g.box(x+10,y+17,z,24,1,1.3,'#d3ad66');g.box(x+19,y+12,z,.08,10,.08,'#476764');g.box(x+19,y+6.6,z,1.2,.7,1,'#476764');g.box(x-3,y+14,z,4,3,3,'#31595b',true);}
function boat(g:StaticGeometry,x:number,y:number,z:number,color:string) {g.box(x,y,z,4,1.6,10,color,true);g.box(x,y+1.1,z-1,3,.4,6,'#d5ddd0');g.box(x,y+2,z,2,2,2.5,'#d8ddc6',true);g.box(x,y+2.4,z-1.3,1.6,.6,.1,'#385960');g.box(x,y+4,z,.12,3,.12,'#645c4e');}
function windmill(g:StaticGeometry,x:number,z:number) {const y=terrainHeight(x,z);g.cylinder(x,y+6,z,4.3,12,'#d8ddc6',true,3.3,10);g.cylinder(x,y+13,z,4.7,3,'#a76b4c',false,0,8);g.box(x,y+10,z-3.8,.6,15,.4,'#645c4e');g.box(x,y+10,z-3.8,15,.6,.4,'#645c4e');for(const dx of [-5,5])g.box(x+dx,y+10.8,z-3.85,5,1.5,.2,'#e9e0bd');for(const dy of [-5,5])g.box(x+.8,y+10+dy,z-3.85,1.5,5,.2,'#e9e0bd');}

function buildLocation(g:StaticGeometry,location:WorldLocation) {
  const [x,z]=location.position,y=terrainHeight(x,z);
  if(location.kind==='harbor') {
    // A solid approach extends from the shore to decks above sea level.
    const west=location.id==='porto-novo-docks';
    g.box(west?x+42:x,4,west?z:z+45,west?120:16,1,west?16:130,'#9b8669',true);
    for(let i=-2;i<=2;i++){const dx=west?0:i*22,dz=west?i*22:0;g.box(x+dx,4,z+dz,west?65:9,.8,west?9:65,'#9b8669',true);boat(g,x+dx+(west?-10:8),1.4,z+dz+(west?8:-10),i%2?'#658f9a':'#c77c56');}
    crane(g,west?x+74:x+30,terrainHeight(west?x+74:x+30,west?z-18:z+72),west?z-18:z+72);
    for(let i=0;i<8;i++){const bx=west?x+90:x-45+i*13,bz=west?z-55+i*14:z+90;g.box(bx,terrainHeight(bx,bz)+2,bz,9,4,6,i%2?'#658f9a':'#c77c56',true);}
    return;
  }
  // The center belongs to navigation and mission triggers; structures start at least twelve metres away.
  g.box(x,y+.05,z,28,.1,26,'#c8bea0');bench(g,x-13,z-9,y);lamp(g,x+13,z-9);
  if(location.kind==='farm') {
    g.box(x+22,y+4,z+5,16,8,13,'#d7cb8e',true);g.box(x+22,y+8.3,z+5,18,.6,15,'#a76b4c',true);
    for(let row=0;row<7;row++)for(let col=0;col<7;col++) {
      const fx=x-58+row*9,fz=z+25+col*8,fy=terrainHeight(fx,fz);
      if(location.id==='salt-fields'){g.box(fx,fy+.06,fz,7,.12,6,'#cadacb');g.box(fx,fy+.15,fz,5.8,.13,4.8,'#b0ced0');}
      else if(location.id==='vineyard'){g.box(fx,fy+.9,fz,6.7,1.8,1.1,'#6f9160');g.box(fx,fy+1.1,fz,.12,2.2,.12,'#817459');}
      else tree(g,fx,fz,.55,location.id==='aurora-orchard'?'olive':'olive');
    }
    for(let i=0;i<7;i++)g.box(x+14+i*3,y+.6,z-10,2,1.2,1.6,'#9b8669',true);
    if(location.id==='olive-estate')windmill(g,x+45,z-18);
  } else if(location.kind==='ruins') {
    const count=location.id==='aqueduct'?12:7;
    for(let i=0;i<count;i++) {
      const rx=x-48+i*10,rz=z+22,ry=terrainHeight(rx,rz),h=location.id==='aqueduct'?14:6+(i%3)*2;
      g.box(rx,ry+h/2,rz,2.5,h,4,'#aaa791',true);g.box(rx+4,ry+h,rz,8,1.6,4,'#bdb9a2',true);
      if(i%3===0)g.box(rx-1,ry+.6,rz-9,4,1.2,2.5,'#aaa791',true,.4);
    }
    if(location.id==='old-fort'){g.cylinder(x+32,y+9,z-20,7,18,'#aaa791',true,6,10);g.box(x-20,y+3,z+15,35,6,3,'#aaa791',true);}
    for(let i=0;i<6;i++)tree(g,x-35+i*15,z+38,.75,'cypress');
  } else if(location.kind==='station') {
    g.box(x,y+.09,z+20,68,.18,25,'#576d6b');g.box(x+23,y+3.5,z-5,17,7,13,'#d8ddc6',true);g.box(x-16,y+5,z+16,30,.55,13,'#c77c56',true);
    for(const dx of [-28,-4])g.box(x+dx,y+2.5,z+16,.35,5,.35,'#d8ddc6',true);
    for(let i=0;i<3;i++){g.box(x-25+i*9,y+1,z+15,1.3,2,1.1,'#c77c56',true);g.box(x-25+i*9,y+1.25,z+14.42,.8,.6,.1,'#385960');}
    for(let i=0;i<5;i++)g.box(x-26+i*12,y+.2,z+30,.18,.03,5,'#e9e0bd');
  } else if(location.kind==='lookout') {
    if(location.id==='faro-aurora') {g.cylinder(x+19,y+14,z+17,4.8,28,'#d8ddc6',true,3.3,12);for(let stripe=0;stripe<3;stripe++)g.cylinder(x+19,y+7+stripe*8,z+17,4.4-stripe*.45,2,'#c77c56',false,4.3-stripe*.45,12);g.cylinder(x+19,y+29,z+17,4.1,3,'#385960',false,4.1,10);g.cylinder(x+19,y+31,z+17,4.6,1.4,'#31595b',false,.5,10);}
    else {g.box(x,y+.3,z+13,24,.6,14,'#d8ddc6',true);for(let i=-10;i<=10;i+=4)g.box(x+i,y+1.2,z+20,.15,1.8,.15,'#645c4e',true);g.box(x,y+2.1,z+20,23,.12,.15,'#645c4e');for(const dx of [-16,16])tree(g,x+dx,z+16,.95,'cypress');}
  } else if(location.id==='windfarm') {
    for(let i=0;i<5;i++){const wx=x-55+i*29,wz=z+26+(i%2)*18,wy=terrainHeight(wx,wz);g.cylinder(wx,wy+20,wz,1.1,40,'#d8ddc6',true,.6,8);g.box(wx,wy+39,wz,3,2,4,'#d8ddc6');g.box(wx,wy+39,wz-2,1.3,31,.3,'#e9e0bd');g.box(wx,wy+39,wz-2,27,1.3,.3,'#e9e0bd');}
  } else {
    for(let i=0;i<5;i++){g.box(x-20,y+3+i*2,z+18+i*5,19,6,8,'#9b9d8b',true);g.box(x-20,y+6.1+i*2,z+18+i*5,12,.15,8,'#6daaaa');g.box(x-20,y+3+i*2,z+13.9+i*5,12,6,.1,'#b0ced0');}
    for(let i=0;i<8;i++)tree(g,x-40+i*10,z-18,.8,'olive');
  }
}

function buildLandscape(g:StaticGeometry) {
  let seed=47193;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const roads=Object.values(worldRoads);
  for(let i=0;i<13000;i++) {
    const x=(random()-.5)*3420,z=(random()-.5)*3250,y=terrainHeight(x,z),scale=.6+random()*.8;
    if(y<3||y>158)continue;
    if(settlements.some(t=>Math.max(Math.abs(x-t.center[0]),Math.abs(z-t.center[1]))<t.radius+22))continue;
    if(bases.some(b=>Math.hypot(x-b.center[0],z-b.center[2])<100))continue;
    if(worldLocations.some(l=>Math.hypot(x-l.position[0],z-l.position[1])<100))continue;
    if(distanceToRoad([x,z],roads)<13)continue;
    if(i%5<3)tree(g,x,z,scale,y>65?'pine':y<15&&i%3===0?'palm':i%4===0?'cypress':'olive');
    else if(i%5===3) {g.cylinder(x,y+.6*scale,z,1.6*scale,1.2*scale,'#648959',false,.8*scale,5);g.cylinder(x+.9,y+.35,z+.4,.9,.7,'#86a574',false,.4,5);}
    else {g.cylinder(x,y+.9*scale,z,2.2*scale,1.8*scale,'#9b9d8b',true,1.3*scale,5);for(let tuft=0;tuft<3;tuft++)g.box(x+tuft-.8,y+.45,z+2,.14,.9,.15,'#a5b97a',false,tuft);}
  }
}

function road(world:WorldManager,g:StaticGeometry,name:string,points:readonly GroundPoint[]) {
  // Per-segment bounds let the renderer cull long-distance roads instead of keeping the entire island network active.
  for(let i=1;i<points.length;i++) {
    const [ax,az]=points[i-1],[bx,bz]=points[i],length=Math.hypot(bx-ax,bz-az);if(length<.01)continue;
    const count=Math.ceil(length/6),rx=(bz-az)/length*4,rz=-(bx-ax)/length*4;
    const positions:number[]=[],indices:number[]=[],normals:number[]=[];
    for(let j=0;j<count;j++) {
      const a=j/count,b=(j+1)/count,start=positions.length/3;
      for(const [t,s] of [[a,-1],[a,1],[b,-1],[b,1]]) {const x=ax+(bx-ax)*t+rx*s,z=az+(bz-az)*t+rz*s;positions.push(x,terrainHeight(x,z)+.18,z);}
      indices.push(start,start+2,start+1,start+1,start+2,start+3);
    }
    VertexData.ComputeNormals(positions,indices,normals);const data=new VertexData();Object.assign(data,{positions,indices,normals});const mesh=new Mesh(`${name}-${i}`,world.scene);data.applyToMesh(mesh);mesh.material=world.material('#576d6b');mesh.checkCollisions=true;mesh.receiveShadows=true;mesh.freezeWorldMatrix();
    if(!name.includes('street')&&!name.includes('avenue')&&!name.includes('ring'))for(let marker=18;marker<length;marker+=25) {const t=marker/length,x=ax+(bx-ax)*t,z=az+(bz-az)*t;g.box(x,terrainHeight(x,z)+.2,z,.14,.025,4,'#e9e0bd',false,Math.atan2(bx-ax,bz-az));}
  }
}
