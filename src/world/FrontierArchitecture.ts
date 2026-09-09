import type { SettlementDefinition } from '../data/world';
import type { StaticGeometry } from './StaticGeometry';

/** All details stay within the reserved building parcel, leaving roads and sidewalks open. */
export function frontierHome(g:StaticGeometry,x:number,z:number,y:number,town:SettlementDefinition,index:number) {
  const style=town.architecture!,alpine=style==='alpine',factory=style==='industrial',villa=style==='riviera';
  const h=alpine?9+(index%2)*3:factory?8+(index%3)*3:villa?6+(index%2)*3:7+(index%3)*2;
  const wall=alpine?'#aaa791':factory?(index%2?'#ae7657':'#956d49'):villa?'#eee3c7':(index%2?'#d3ad66':'#cf9368');
  const trim=alpine?'#645c4e':factory?'#31595b':villa?'#527c78':'#a76b4c';
  g.box(x,y+h/2,z,14,h,13,wall,true);
  g.box(x,y+.45,z,14.3,.9,13.3,alpine?'#9b9d8b':'#c6c2af');
  if(alpine) {
    g.box(x,y+h-2,z,14.1,3.7,13.1,'#9e794f');
    // Narrowing courses form a steep pitched slate roof with overhanging eaves.
    for(let level=0;level<9;level++)g.box(x,y+h+.25+level*.48,z,16-level*1.65,.5,15,'#476764',true);
    for(const side of [-1,1]) {
      g.box(x,y+4,z+side*7.2,13,.25,1.6,'#645c4e',true);
      g.box(x,y+5.1,z+side*7.9,13,.18,.15,'#9e794f');
      for(let dx=-6;dx<=6;dx+=1)g.box(x+dx,y+4.65,z+side*7.9,.15,1,.15,'#645c4e');
      for(let dx=-6;dx<=6;dx+=3)g.box(x+dx,y+h-2,z+side*6.58,.2,3.7,.15,'#645c4e');
    }
    g.box(x-4,y+h+3,z+3,1.1,5,1.1,'#9b9d8b',true);
  } else if(factory) {
    for(let row=1;row<h;row+=1.2)for(const side of [-1,1])g.box(x,y+row,z+side*6.53,14,.06,.07,'#cdb79d');
    for(const dx of [-6,-2,2,6]) {
      g.box(x+dx,y+h/2,z+6.65,.55,h, .4,'#956d49');
      g.box(x+dx,y+h+.65,z,2.8,1.3,12,'#31595b',true);
      g.box(x+dx+.9,y+h+1.1,z,.5,.8,11,'#658f9a');
    }
    g.cylinder(x-5,y+h+3,z-4,.8,6,'#ae7657',true,.65,8);
    g.box(x,y+1.8,z-6.62,5,3.6,.2,'#476764');
    for(let row=0;row<6;row++)g.box(x,y+.4+row*.5,z-6.76,4.8,.06,.08,'#9baeb0');
    g.box(x+4,y+.8,z+7.2,2,1.6,1.2,'#9b8669',true);
  } else if(villa) {
    g.box(x,y+h+.15,z,15,.3,14,'#d8ddc6',true);
    for(const side of [-1,1])g.box(x+side*6.8,y+h+.7,z,.3,1.1,13,'#eee3c7',true);
    for(const dx of [-5,0,5])g.cylinder(x+dx,y+1.8,z+7.7,.24,3.6,'#d8ddc6',true,.24,8);
    g.box(x,y+3.7,z+7.2,15,.25,2.2,'#eee3c7',true);
    for(const dx of [-5,5])g.box(x+dx,y+h+1.8,z+3,.2,3.3,.2,'#645c4e');
    for(let dx=-5;dx<=5;dx+=1)g.box(x+dx,y+h+3.4,z, .18,.18,7,'#9e794f');
    g.box(x,y+h+3.45,z+3,11,.18,.2,'#645c4e');
    g.box(x-3,y+h+.5,z-2,3,.6,1,'#ae7657');
    g.box(x-3,y+h+1,z-2,3.2,.5,1.2,'#648959');
  } else {
    g.box(x-2,y+h+1.4,z+1,8,2.8,8,wall,true);
    for(const side of [-1,1])g.box(x+side*6.8,y+h+.65,z,.35,1.3,13,wall,true);
    g.box(x,y+h+.65,z-6.4,14,1.3,.35,wall,true);
    if(index%2===0)for(let layer=0;layer<5;layer++)g.cylinder(x-2,y+h+2.9+layer*.4,z+1,3.9-layer*.55,.45,'#e4d5b4',true,3.5-layer*.55,12);
    else for(const dx of [-5,1])g.box(x+dx,y+h+4,z+1,1,2.4,1,wall,true);
    g.box(x,y+3.6,z+7.1,13,.16,2,'#c77c56');
    for(let dx=-5;dx<=5;dx+=2)g.box(x+dx,y+3.7,z+7.1,.8,.06,2,'#d3ad66');
    for(const dx of [-5,5])g.cylinder(x+dx,y+.7,z+7.4,.65,1.4,'#ae7657',true,.4,8);
  }
  for(const side of [-1,1]) {
    const front=z+side*6.61;
    g.box(x,y+1.4,front,1.7,2.8,.14,trim);
    for(let floor=0;floor<Math.floor(h/3);floor++)for(const dx of [-4.3,4.3]) {
      const wy=y+1.9+floor*3;
      g.box(x+dx,wy,front,2.7,2.1,.12,villa?'#527c78':'#c6c2af');
      g.box(x+dx,wy,front+side*.09,1.8,1.7,.1,(index+floor)%4===0?'#d3ad66':'#385960');
      g.box(x+dx,wy,front+side*.15,.08,1.7,.08,trim);
      g.box(x+dx,wy-.95,front+side*.22,2.8,.15,.5,trim);
      if(villa)for(const shutter of [-1.2,1.2])g.box(x+dx+shutter,wy,front,.5,2,.2,'#527c78');
    }
  }
  for(const side of [-1,1])for(const dz of [-3,3])g.box(x+side*7.08,y+4.5,z+dz,.14,2,1.8,'#385960');
}

/** Distinct skyline landmarks occupy the same empty corner beyond the housing parcels. */
export function frontierLandmark(g:StaticGeometry,x:number,z:number,y:number,town:SettlementDefinition) {
  if(town.architecture==='alpine') {
    g.box(x,y+13,z,10,26,10,'#9b9d8b',true);
    g.box(x,y+26.5,z,12,1,12,'#aaa791',true);
    for(const dx of [-4.5,0,4.5])for(const dz of [-4.5,4.5])g.box(x+dx,y+28,z+dz,1.8,2,1.8,'#aaa791',true);
    for(const side of [-1,1])for(const h of [8,15,22])g.box(x,y+h,z+side*5.05,1,2.4,.1,'#385960');
  } else if(town.architecture==='industrial') {
    for(const dx of [-4,4])for(const dz of [-4,4])g.box(x+dx,y+10,z+dz,.8,20,.8,'#31595b',true);
    for(const h of [4,10,16])for(const side of [-1,1])g.box(x,y+h,z+side*4,9,.6,.6,'#476764');
    g.cylinder(x,y+22,z,6,8,'#ae7657',true,6,12);
    for(const h of [19,22,25])g.cylinder(x,y+h,z,6.1,.2,'#31595b',false,6.1,12);
    g.cylinder(x,y+27,z,6.5,2,'#476764',false,0,12);
  } else if(town.architecture==='riviera') {
    g.cylinder(x,y+.35,z,7,.7,'#d8ddc6',true,7,12);
    for(let i=0;i<8;i++) {const a=i*Math.PI/4;g.cylinder(x+Math.cos(a)*5,y+4,z+Math.sin(a)*5,.4,8,'#eee3c7',true,.4,8);}
    g.cylinder(x,y+8.2,z,6.5,.5,'#eee3c7',true,6.5,12);
    g.cylinder(x,y+9,z,6.5,1.5,'#527c78',true,0,12);
    g.cylinder(x,y+1.3,z,2,1.2,'#6daaaa');
  } else {
    g.box(x,y+12,z,9,24,9,'#d3ad66',true);
    g.box(x,y+24.5,z,11,1,11,'#a76b4c',true);
    for(const dx of [-3.5,3.5])for(const dz of [-3.5,3.5])g.box(x+dx,y+27,z+dz,1,4,1,'#d3ad66',true);
    g.cylinder(x,y+29.5,z,5,2.5,'#e4d5b4',true,.5,12);
    for(const side of [-1,1])for(const dx of [-2,2])g.box(x+dx,y+20,z+side*4.55,1,3,.1,'#385960');
  }
}
