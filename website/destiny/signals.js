import {DEFS,occupancy,accessRoute,edgeCells,capacity} from './world.js';
import {RECIPES} from './industry.js';
import {isDepot} from './economy.js';
export const goodName=k=>k==='wood'?'timber':k==='ammo'?'ammunition':k;
const result=(code,label,detail,warning=false)=>({code,label,detail,warning});
export function buildingSignal(s,b,grid=occupancy(s)){
  if(b.hp<=0)return result('lost','Lost','This building has fallen.');
  if(b.progress>=1&&!b.project&&b.hp<DEFS[b.type].hp*.6)return result('repair','Needs repair',`Condition ${Math.floor(b.hp)}/${DEFS[b.type].hp}. Repair restores 60 condition for 4 timber and 2 stone, delivered by workers. Mend is another option.`,true);
  if(b.replacement)return result('stock','Materials lost','Reserved supplies were lost with their warehouse. Replacement materials are still needed.',true);
  const cargo=s.people.filter(p=>p.carry?.target===b.id);
  const construction=b.progress<1||b.project;
  const parcels=b.freight||[];
  const inBuildTransit=cargo.some(p=>p.carry.construction);
  if(b.paused)return result('paused','Paused','Production is paused.');
  const recipe=RECIPES[b.type];
  if(!construction&&recipe&&(s.stock[recipe.output]||0)>=(b.target??recipe.target))return result('target','Target met',`${goodName(recipe.output)} stock has reached the production target of ${b.target??recipe.target}.`);
  if(!construction&&['farm','well'].includes(b.type)&&s.stock[b.type==='farm'?'food':'water']>=capacity(s)-8)return result('target','Storage full','Production is waiting for storage space.');
  if(!construction&&b.type==='quarry'&&s.stock.stone>=60)return result('target','Reserve met','Mining pauses at 60 stone in town stock.');
  let missing={};
  if(parcels.length){for(const p of parcels)missing[p.key]=(missing[p.key]||0)+p.n;}
  else if(construction&&inBuildTransit)missing={};
  else if(!construction&&b.type==='tower'&&!((b.buffer?.ammo||0)+(b.buffer?.stone||0)))missing=s.stock.ammo>0?{ammo:1}:{stone:1};
  else if(!construction&&recipe)for(const [k,n]of Object.entries(recipe.input))if((b.buffer?.[k]||0)<n)missing[k]=n-(b.buffer?.[k]||0);
  if(Object.keys(missing).length||inBuildTransit){
    if(cargo.some(p=>accessRoute(s,p,b,grid)===null))return result('route','Route blocked','A carrier has supplies but cannot reach this building.',true);
    if(!parcels.length&&(inBuildTransit||Object.keys(missing).every(k=>cargo.filter(p=>p.carry.key===k).reduce((n,p)=>n+p.carry.n,0)>=missing[k])))return result('delivery','On the way',`${cargo.length} delivery load${cargo.length===1?'':'s'} on the way.`);
    const depots=s.buildings.filter(d=>isDepot(d)&&d.hp>0&&(d.progress>=1||d.type==='hearth'));
    for(const [key,n]of Object.entries(missing)){
      const inbound=parcels.length?0:cargo.filter(p=>p.carry.key===key).reduce((total,p)=>total+p.carry.n,0);
      if(inbound>=n)continue;
      const reserve=b.type==='forge'&&key==='stone'?8:b.type==='kitchen'&&key==='food'?8:0;
      if(!parcels.length&&(s.stock[key]||0)<=reserve)return result('stock','Needs '+goodName(key),reserve?`${goodName(key)} is held in the town reserve (${reserve}). No surplus is available for this workshop.`:`No ${goodName(key)} is available in town stock.`,true);
      if(!parcels.length&&(s.stock[key]||0)-reserve<n-inbound)return result('stock','Needs '+goodName(key),`Only ${Math.max(0,(s.stock[key]||0)-reserve)} ${goodName(key)} available; ${n-inbound} more must reach this building to begin work.`,true);
      const sources=depots.filter(d=>parcels.length?parcels.some(p=>p.source===d.id&&p.key===key):(d.bins?.[key]||0)>0);
      if(!sources.length)return result('stock','Needs '+goodName(key),`No warehouse currently holds available ${goodName(key)}.`,true);
      const reachable=sources.some(d=>edgeCells(s,d,grid).some(([x,y])=>accessRoute(s,{x,y},b,grid)!==null));
      if(!reachable)return result('route','Route blocked',`${goodName(key)} exists in storage, but no open route connects its warehouse to this building.`,true);
    }
    const collecting=s.people.some(p=>p.task?.target===b.id);
    return result(collecting?'delivery':'hauler',collecting?'Being collected':'Waiting for haul',collecting?'A worker is collecting supplies at a warehouse.':'Supplies are available and the warehouse route is open. No carrier has taken this delivery yet.',!collecting);
  }
  if(b.type==='tower'&&!construction)return result('ready','Loaded',`${b.buffer?.ammo||0} crafted shots + ${b.buffer?.stone||0} stone shots ready.`);
  if(isDepot(b)&&!construction)return result('depot','Local stock',Object.entries(b.bins||{}).filter(([,n])=>n>=1).map(([k,n])=>`${Math.floor(n)} ${goodName(k)}`).join(' · ')||'This warehouse is empty.');
  const productive=construction||recipe||['quarry','farm','well'].includes(b.type);
  if(productive){
    const workers=s.people.filter(p=>p.task?.id===b.id&&!['freight','supply'].includes(p.task.kind));
    if(workers.length)return result('working','Working',workers.some(p=>p.path?.length)?'A worker is walking to this job.':'A worker is working here.');
    if(!s.people.some(p=>accessRoute(s,p,b,grid)!==null))return result('route','No access','Workers cannot reach this building.',true);
    return result('worker','Needs worker','Inputs and access are ready. No worker is assigned to this job yet.',true);
  }
  return result('ready','Ready',DEFS[b.type].name+' is ready.');
}
export function settlementSignals(s){const grid=occupancy(s);return s.buildings.map(b=>({id:b.id,...buildingSignal(s,b,grid)}));}
export function laborSummary(s){
  const counts={working:0,hauling:0,resting:0,idle:0},reasons={};
  for(const p of s.people){
    const kind=p.resting?'resting':p.carry||['freight','supply'].includes(p.task?.kind)?'hauling':p.task?'working':'idle';counts[kind]++;
    if(kind==='idle'){const reason=p.idleReason||'Between jobs';reasons[reason]=(reasons[reason]||0)+1;}
  }
  return {counts,reasons};
}
