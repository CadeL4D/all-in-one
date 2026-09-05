import {completed,DEFS,dailyNeeds,capacity,occupancy,accessRoute} from './world.js';
import {RECIPES,recipeStatus,frontier,expeditionCost} from './depth.js';
import {caravan} from './civic.js';
export const PAUSABLE=new Set(['farm','well','quarry','forester','infirmary',...Object.keys(RECIPES)]);
export function opportunities(s) {
  if(s.lost||!completed(s,'hearth').length)return [];
  const result=[],need=dailyNeeds(s);
  const has=type=>s.buildings.some(b=>b.type===type);
  const build=(type,title,why)=>{if(!has(type)&&s.stock.wood>=DEFS[type].wood&&s.stock.stone>=DEFS[type].stone&&(!DEFS[type].unlock||completed(s,DEFS[type].unlock).length))result.push({id:'build-'+type,type,title,why});};
  if(s.stock.water<need.water*2){
    const well=completed(s,'well')[0];
    if(well)result.push({id:'water',building:well.id,title:well.paused?'Restart drinking-water production':'Keep water flowing',why:`${Math.floor(s.stock.water)}/${need.water*2} water for two days. Inspect the well and prioritize its work.`,urgent:s.stock.water<need.water});
    else build('well','Secure drinking water','A well supplies the whole village.');
  }
  if(s.stock.food+(s.stock.meals||0)*2<need.food*2){
    const farm=completed(s,'farm')[0];
    if(farm)result.push({id:'food',building:farm.id,title:farm.paused?'Restart food production':'Prepare another harvest',why:`Daily food need: ${need.food}. Inspect the field, prioritize it or improve its yield.`,urgent:s.stock.food+(s.stock.meals||0)*2<need.food});
    else build('farm','Plant your first field','Renewable food makes room for growth.');
  }
  const damaged=s.buildings.find(b=>b.progress>=1&&b.hp<DEFS[b.type].hp*.6&&!b.project);
  if(damaged)result.push({id:'repair-'+damaged.id,building:damaged.id,title:'Repair '+DEFS[damaged.type].name,why:`${Math.floor(damaged.hp)}/${DEFS[damaged.type].hp} condition. Repairs restore up to 60.`,urgent:true});
  const visit=caravan(s);
  if(visit.open&&!visit.traded&&completed(s,'store').length)result.push({id:'caravan',panel:'caravan-panel',title:'Meet the visiting caravan',why:`Leaves on day ${visit.leaves}. Choose one trade for tools, provisions or stone.`});
  if(s.relicReady&&!s.blessing)result.push({id:'blessing',panel:'exploration-panel',title:'Choose your keeper’s blessing',why:'Your expedition returned. Pick a permanent benefit for industry, rest or defense.'});
  const f=frontier(s);
  if(f.site && !f.site.ordered && s.stock.planks>=6&&s.stock.tools>=2)result.push({id:'rift',site:f.site.id,title:'Reclaim the Hollow Rift',why:`Spend 6 planks and 2 tools to remove its raid pressure permanently.`});
  if(completed(s,'lumber').length)build('workshop','Start making planks','A sawmill opens toolmaking and gives your timber a new purpose.');
  if(completed(s,'workshop').length)build('forge','Equip your workers','Tools speed up work and supply frontier expeditions.');
  const discovery=s.sites?.find(v=>!v.done&&!v.ordered&&v.kind!=='rift'&&Object.entries(expeditionCost(v)).every(([k,n])=>s.stock[k]>=n));
  if(discovery)result.push({id:'discover-'+discovery.id,site:discovery.id,title:'Explore '+discovery.name,why:discovery.kind==='relic'?'Recover a permanent blessing. One worker will travel to the shrine.':'Recover supplies while the rest of your village keeps working.'});
  if(completed(s,'forge').length)build('forester','Renew the woodland','Replace harvested timber and keep the village growing.');
  if(s.chapters?.length===6)result.push({id:'neighbors',panel:'convoy-panel',title:'Support another settlement',why:'Send supplies to a settled neighbor, or choose a new region on the world map.'});
  return result.sort((a,b)=>Number(!!b.urgent)-Number(!!a.urgent)).slice(0,3);
}
export function buildingStatus(s,b) {
  const staff=s.people.find(p=>p.task?.id===b.id);
  const working=staff&&!staff.path?.length&&!staff.resting;
  if(b.progress<1)return staff?`${staff.name} is ${working?'building':'traveling to the site'}. ${Math.floor(b.progress*100)}% complete.`:'Construction queued. An available worker must reach this site.';
  if(b.project)return `${b.project.kind==='repair'?'Repair':'Upgrade'} ${Math.floor(b.project.progress*100)}% · ${staff?staff.name+' assigned':'waiting for a worker'}.`;
  if(b.paused)return 'Production paused. A worker already on a job may finish it. Resume when you need these supplies.';
  if(RECIPES[b.type]){const status=recipeStatus(s,b);if(status!=='Ready for a worker')return status+'.';}
  if(staff)return `${staff.name}: ${staff.resting?'resting':working?'working here':'on the way'}.`;
  if(b.type==='farm'&&s.stock.food>=capacity(s)-8||b.type==='well'&&s.stock.water>=capacity(s)-8)return 'Storage target reached. Workers are helping elsewhere.';
  if(b.type==='quarry'&&s.stock.stone>=60)return 'Stone reserve reached (60). Mark more deposits if you want extra ammunition.';
  if(PAUSABLE.has(b.type)){
    const grid=occupancy(s);
    if(s.people.length&&!s.people.some(p=>accessRoute(s,p,b,grid)!==null))return 'No route from the village. Clear resources or open a gap in the wall.';
    return 'Available for a worker. Prioritize this building to move it ahead of routine jobs.';
  }
  return 'Serving the village.';
}
