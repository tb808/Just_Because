export type BiomeId='meadow'|'woodland'|'alpine'|'wetland'|'dunes'|'volcanic'|'coast';
export interface BiomeRegion {id:BiomeId;name:string;x:number;z:number;rx:number;rz:number;soil:string;foliage:string}
export const biomeRegions:readonly BiomeRegion[]=[
  {id:'woodland',name:'Wälder von Valverde',x:-690,z:390,rx:600,rz:630,soil:'#758650',foliage:'#527c58'},
  {id:'alpine',name:'Nordkamm',x:-630,z:1670,rx:930,rz:610,soil:'#8d9b87',foliage:'#385d50'},
  {id:'wetland',name:'Westliche Auen',x:-1360,z:540,rx:430,rz:420,soil:'#6d8982',foliage:'#8ba34b'},
  {id:'dunes',name:'Ockerland von Solara',x:1480,z:-1160,rx:780,rz:780,soil:'#cfad76',foliage:'#7d9459'},
  {id:'volcanic',name:'Caldera-Ascheland',x:40,z:690,rx:365,rz:355,soil:'#66686b',foliage:'#817459'},
  {id:'coast',name:'Serena-Kalkküste',x:-1700,z:-630,rx:460,rz:600,soil:'#c8c3a1',foliage:'#648959'},
];
export const meadow:BiomeRegion={id:'meadow',name:'Sonnenwiesen',x:0,z:0,rx:1,rz:1,soil:'#9eaf70',foliage:'#6f9160'};
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export function biomeInfluence(region:BiomeRegion,x:number,z:number) {
  const warp=0.045*Math.sin(x*.008+z*.006);
  return 1-smooth((Math.hypot((x-region.x)/region.rx,(z-region.z)/region.rz)+warp-.68)/.48);
}
export function biomeAt(x:number,z:number):BiomeRegion {
  let best=meadow,strength=.18;
  for(const region of biomeRegions) {const weight=biomeInfluence(region,x,z);if(weight>strength){strength=weight;best=region;}}
  return best;
}
export function biomeRelief(x:number,z:number) {
  let delta=0;
  for(const region of biomeRegions) {
    const w=biomeInfluence(region,x,z);if(!w)continue;
    if(region.id==='alpine')delta+=w*(22+15*Math.sin(x*.007)*Math.cos(z*.006));
    if(region.id==='dunes')delta+=w*(5*Math.sin(x*.018+z*.006)+3*Math.cos(z*.022));
    if(region.id==='volcanic')delta+=w*16*Math.sin(Math.hypot(x-40,z-690)*.018);
    if(region.id==='coast')delta+=w*6*Math.sin(z*.009);
    if(region.id==='wetland')delta-=w*7;
  }
  return delta;
}
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const palette=new Map([...biomeRegions,meadow].map(b=>[b.id,rgb(b.soil)]));
/** Blend soils continuously across ecotones; vegetation uses the same regional fields. */
export function biomeGroundColor(x:number,z:number,height:number):number[] {
  const c=[...palette.get('meadow')!];
  for(const region of biomeRegions) {
    const w=biomeInfluence(region,x,z),target=palette.get(region.id)!;
    for(let i=0;i<3;i++)c[i]+=(target[i]-c[i])*w;
  }
  const beach=1-smooth((height-1)/4),sand=rgb('#d8cba0');
  const snow=biomeInfluence(biomeRegions[1],x,z)*smooth((height-51)/24);
  const mottling=.94+.035*Math.sin(x*.034+z*.019)+.025*Math.cos(x*.012-z*.028);
  return c.map((v,i)=>(v+(sand[i]-v)*beach)*(1-snow)*mottling+.9*snow);
}

export const landscapeSites=[
  {id:'pine-camp',name:'Waldlager am Nordkamm',position:[-850,1370],kind:'camp'},
  {id:'ridge-stones',name:'Steinnadeln am Nordpass',position:[-430,1510],kind:'stones'},
  {id:'reed-pools',name:'Schilfteiche',position:[-1250,470],kind:'pond'},
  {id:'marsh-hide',name:'Beobachtungshütte in den Auen',position:[-1500,650],kind:'camp'},
  {id:'basalt-garden',name:'Basaltorgeln',position:[190,780],kind:'stones'},
  {id:'ash-camp',name:'Verlassenes Geologenlager',position:[-145,470],kind:'camp'},
  {id:'red-mesa',name:'Rote Felstürme',position:[1780,-770],kind:'stones'},
  {id:'oasis',name:'Palmenoase',position:[1320,-1230],kind:'pond'},
  {id:'chalk-stacks',name:'Kalknadeln von Serena',position:[-1890,-420],kind:'stones'},
  {id:'coast-camp',name:'Lager über der Bucht',position:[-1490,-670],kind:'camp'},
  {id:'orchard-meadow',name:'Blütenwiese',position:[-530,-470],kind:'orchard'},
  {id:'old-road-shrine',name:'Verfallener Wegschrein',position:[420,-490],kind:'ruin'},
  {id:'woodland-ruin',name:'Überwachsener Gutshof',position:[-770,180],kind:'ruin'},
  {id:'east-quarry',name:'Alter Steinbruch',position:[1280,680],kind:'stones'},
  {id:'north-orchard',name:'Obstgarten an der Oststrasse',position:[1250,1480],kind:'orchard'},
  {id:'valley-camp',name:'Rastplatz im Osttal',position:[720,40],kind:'camp'},
] as const;
