import {recordCost} from './ledger.js';
import {W,H,DEFS,completed,accessRoute,edgeCells,capacity,hash,noise,log,influenceCap} from './world.js';
import {RECIPES} from './industry.js';

export const GOODS=['wood','stone','food','water','planks','tools','meals','ammo'];
export const isDepot=b=>['hearth','store','outpost'].includes(b.type);
const depots=s=>s.buildings.filter(b=>isDepot(b)&&b.hp>0&&(b.progress>=1||b.type==='hearth'));

// The HUD counts unreserved stock. Warehouse bins record where it actually is.
// Town-wide consumption/trade still uses the HUD stock; reconcile those withdrawals.
export function syncWarehouses(s){
  s.stock.ammo??=0;
  const ds=depots(s);if(!ds.length)return;
  for(const d of ds)d.bins??={};
  for(const k of GOODS){
    let delta=(s.stock[k]||0)-ds.reduce((n,d)=>n+(d.bins[k]||0),0);
    if(delta>0)ds[0].bins[k]=(ds[0].bins[k]||0)+delta;
    else for(const d of ds){const n=Math.min(d.bins[k]||0,-delta);d.bins[k]=(d.bins[k]||0)-n;delta+=n;}
  }
}
export function deposit(s,b,key,n){
  syncWarehouses(s);
  const add=Math.max(0,Math.min(n,capacity(s)-(s.stock[key]||0)));
  s.stock[key]=(s.stock[key]||0)+add;b.bins??={};b.bins[key]=(b.bins[key]||0)+add;
}
export function reserveFreight(s,cost){
  syncWarehouses(s);const parcels=[];
  for(const k of ['wood','stone']){
    let left=cost[k]||0;
    for(const d of depots(s))while(left>0&&(d.bins[k]||0)>0){
      const n=Math.min(8,left,d.bins[k]);d.bins[k]-=n;left-=n;parcels.push({source:d.id,key:k,n});
    }
  }
  return parcels;
}
export function supplied(s,b){return !b.replacement&&!b.freight?.length&&!s.people.some(p=>p.carry?.target===b.id&&p.carry.construction);}
function demand(s,b){
  if(b.progress<1||b.paused)return {};
  if(b.type==='tower')return s.stock.ammo>0?{ammo:12}:{stone:6};
  if(b.project)return {};
  const recipe=RECIPES[b.type];if(recipe&&(s.stock[recipe.output]||0)>=(b.target??recipe.target))return {};return recipe?Object.fromEntries(Object.entries(recipe.input).map(([k,n])=>[k,n*2])):{};
}
export function freightJobs(s,grid){
  syncWarehouses(s);const jobs=[],ds=depots(s);
  for(const b of s.buildings){
    const parcel=b.freight?.[0];
    if(parcel){
      const source=ds.find(d=>d.id===parcel.source);
      if(source)jobs.push({key:'freight'+b.id,kind:'freight',b:source,target:b.id,construction:true,priority:-2});
      continue;
    }
    for(const [key,target] of Object.entries(demand(s,b))){
      const inbound=s.people.filter(p=>p.carry?.target===b.id&&p.carry.key===key).reduce((n,p)=>n+p.carry.n,0);
      const missing=target-(b.buffer?.[key]||0)-inbound;
      if(missing<=0)continue;
      const reserve=b.type==='forge'&&key==='stone'?8:b.type==='kitchen'&&key==='food'?8:0;
      if((s.stock[key]||0)<=reserve)continue;
      const sources=ds.filter(d=>(d.bins?.[key]||0)>0).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y));
      const source=sources.find(d=>edgeCells(s,d,grid).some(([x,y])=>accessRoute(s,{x,y},b,grid)!==null));
      if(source){jobs.push({key:'supply'+b.id,kind:'supply',b:source,target:b.id,good:key,amount:Math.min(8,missing,(s.stock[key]||0)-reserve),priority:b.type==='tower'&&((b.buffer?.ammo||0)+(b.buffer?.stone||0)<2)?-4:0});break;}
    }
  }
  return jobs;
}
export function pickupFreight(s,p,b){
  const task=p.task;if(!['freight','supply'].includes(task?.kind))return false;
  const target=s.buildings.find(v=>v.id===task.target);
  if(!target||!b){p.task=null;return true;}
  if(task.kind==='freight'){
    const parcel=target.freight?.[0];
    if(parcel?.source===b.id){target.freight.shift();p.carry={key:parcel.key,n:parcel.n,target:target.id,construction:true};}
  }else{
    syncWarehouses(s);
    const n=Math.min(task.amount,b.bins?.[task.good]||0,s.stock[task.good]||0);
    if(n>0){b.bins[task.good]-=n;s.stock[task.good]-=n;p.carry={key:task.good,n,target:target.id};}
  }
  p.task=null;p.work=0;return true;
}
export function deliverFreight(s,p,grid){
  if(p.carry?.target===undefined)return false;
  const target=s.buildings.find(b=>b.id===p.carry.target&&b.hp>0);
  if(!target){delete p.carry.target;delete p.carry.construction;return false;}
  const path=accessRoute(s,p,target,grid);
  if(path===null){p.state='Supply route blocked — open a trail';return true;}
  if(path.length){p.path=path;p.state='Delivering '+p.carry.key+' to '+DEFS[target.type].name;return true;}
  if(!p.carry.construction){target.buffer??={};target.buffer[p.carry.key]=(target.buffer[p.carry.key]||0)+p.carry.n;}
  target.delivered=(target.delivered||0)+p.carry.n;s.stats.freight=(s.stats.freight||0)+1;s.influence=Math.min(influenceCap(s),(s.influence||0)+.25);
  s.effects.push({x:p.x,y:p.y,text:'Delivered '+p.carry.key,life:1.2,sound:'delivery'});
  p.carry=null;p.task=null;return true;
}
export function loseWarehouse(s,b){
  if(b.bins)for(const k of GOODS)s.stock[k]=Math.max(0,(s.stock[k]||0)-(b.bins[k]||0));
  // Reserved construction loads at this warehouse were already paid for. Expose
  // replacement hauling rather than leaving an impossible construction order.
  for(const target of s.buildings)if(target.freight?.some(v=>v.source===b.id)){
    target.replacement??={};
    for(const v of target.freight.filter(v=>v.source===b.id))target.replacement[v.key]=(target.replacement[v.key]||0)+v.n;
    target.freight=target.freight.filter(v=>v.source!==b.id);
  }
}
export function replaceLostFreight(s){
  for(const b of s.buildings)if(b.replacement&&Object.entries(b.replacement).every(([k,n])=>s.stock[k]>=n)){
    recordCost(s,b.replacement);
    b.freight??=[];b.freight.push(...reserveFreight(s,b.replacement));
    for(const [k,n]of Object.entries(b.replacement))s.stock[k]-=n;
    delete b.replacement;
  }
}

// Surveyed land never disappears when its surface rocks are harvested.
const landCache=new WeakMap();
export function terrainValue(s,x,y){
  if(x<0||y<0||x>=W||y>=H)return {soil:.8,water:.85,seam:.45};
  let cache=landCache.get(s);if(!cache){cache=new Map();landCache.set(s,cache);}
  const key=y*W+x;if(cache.has(key))return cache.get(key);
  const seed=hash(s.seed);let water=0,rock=0;
  const terrain=s.survey||(s.survey=s.tiles.slice());
  for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
    const ax=x+dx,ay=y+dy;if(ax<0||ay<0||ax>=W||ay>=H)continue;
    if(terrain[ay*W+ax]===1)water++;
    if(terrain[ay*W+ax]===4)rock++;
  }
  const value={soil:water>3?1.3:noise(Math.floor(x/7),Math.floor(y/7),seed)>.55?1.1:.8,
    water:water>3?1.35:.85,seam:rock>=8?1.5:rock>=3?1:.45};cache.set(key,value);return value;
}
export function terrainHint(s,type,x,y){
  const v=terrainValue(s,x,y);
  if(type==='farm')return `${Math.round(v.soil*100)}% soil yield · riverside fields are richer`;
  if(type==='well')return `${Math.round(v.water*100)}% water yield · look near water`;
  if(type==='quarry')return v.seam>=1.5?'Rich stone seam · 6 stone per trip':v.seam>=1?'Stone seam · 4 stone per trip':'Poor seam · only 2 stone per trip';
  if(type==='store'||type==='outpost')return 'Local stock and delivery point · shorten supply routes';
  return '';
}
export function networkStatus(s,b){
  if(b.replacement)return 'Warehouse lost. Gather replacement building materials.';
  if(!supplied(s,b))return `Awaiting building materials · ${b.freight?.length||0} loads at warehouses. Keep the route open.`;
  if(b.type==='tower')return `${b.buffer?.ammo||0} crafted shots / ${b.buffer?.stone||0} emergency stone shots. Workers refill automatically.`;
  if(isDepot(b))return 'Stored here: '+Object.entries(b.bins||{}).filter(([,n])=>n>0).map(([k,n])=>Math.floor(n)+' '+k).join(' · ');
  if(RECIPES[b.type])return 'Inputs here: '+Object.entries(b.buffer||{}).map(([k,n])=>n+' '+k).join(' · ');
  return '';
}
export function validateEconomy(s){
  if(s.frontierCycle!==undefined&&(!Number.isInteger(s.frontierCycle)||s.frontierCycle<0||s.frontierCycle>100000))throw Error('Invalid frontier timeline');
  const bag=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,n])=>GOODS.includes(k)&&Number.isFinite(n)&&n>=0&&n<=100000);
  if(s.survey&&(!Array.isArray(s.survey)||s.survey.length!==W*H||s.survey.some(t=>!Number.isInteger(t)||t<0||t>4)))throw Error('Invalid land survey');
  for(const b of s.buildings){
    for(const key of ['bins','buffer','replacement'])if(b[key]!==undefined&&!bag(b[key]))throw Error('Invalid local supplies');
    if(b.freight!==undefined&&(!Array.isArray(b.freight)||b.freight.length>1000||b.freight.some(p=>!Number.isInteger(p.source)||!GOODS.includes(p.key)||!Number.isFinite(p.n)||p.n<=0||p.n>8)))throw Error('Invalid construction freight');
  }
  for(const p of s.people)if(p.carry&&(!GOODS.includes(p.carry.key)||!Number.isFinite(p.carry.n)||p.carry.n<=0||p.carry.n>100000||(p.carry.target!==undefined&&!Number.isInteger(p.carry.target))))throw Error('Invalid carried supplies');
}
