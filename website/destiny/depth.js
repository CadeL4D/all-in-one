// Living settlement systems. Functions run after world.js has initialized.
import { W, H, DAY, DEFS, completed, capacity, beds, dailyNeeds, occupancy, accessRoute, route, hash, log, influenceCap } from "./world.js";
import { RECIPES } from "./industry.js";
import { initCivic, validateCivic } from "./civic.js";
export { EXTRA_BUILDINGS, RECIPES } from "./industry.js";
export function initDepth(s) {
  initCivic(s);
  for (const key of ["planks", "tools", "meals"]) s.stock[key] ??= 0;
  s.stats ??= {deliveries: 0, crafted: 0, explored: 0, repelled: 0};
  s.guardians ??= [];
  s.convoys ??= [];
  s.receivedConvoys ??= [];
  s.pendingSupplies ??= {wood:0,stone:0,food:0,water:0};
  s.toolReserve ??= 2;
  s.blessing ??= null;
  s.campGather ??= true;
  for (const p of s.people) { p.energy ??= 100; p.toolUses ??= 0; p.health ??= 100; }
}
export function validateDepth(s) {
  initDepth(s);
  validateCivic(s);
  if (!s.stats || typeof s.stats!=="object" || !["deliveries","crafted","explored","repelled"].every(k=>Number.isFinite(s.stats[k])&&s.stats[k]>=0)) throw Error("Invalid village statistics");
  if (![0,2,6].includes(s.toolReserve)) throw Error("Invalid tool reserve");
  if (!Array.isArray(s.convoys) || s.convoys.length>3 || s.convoys.some(c=>typeof c.id!=="string" || typeof c.targetKey!=="string" || typeof c.targetName!=="string" || !Number.isFinite(c.remaining) || c.remaining<0 || c.remaining>30)) throw Error("Invalid supply convoy");
  if (!["wood","stone","food","water"].every(k=>Number.isFinite(s.pendingSupplies[k])&&s.pendingSupplies[k]>=0)) throw Error("Invalid delivered supplies");
  if (!Array.isArray(s.receivedConvoys) || s.receivedConvoys.some(id=>typeof id!=="string")) throw Error("Invalid convoy receipts");
  for (const g of s.guardians) {g.path=[];g.cool=0;}

  for (const key of ["planks", "tools", "meals"]) if (!Number.isFinite(s.stock[key]) || s.stock[key] < 0) throw Error("Invalid crafted stock");
  if (![null, "industry", "shelter", "sentinel"].includes(s.blessing)) throw Error("Invalid blessing");
  if (!Array.isArray(s.guardians) || s.guardians.length > 2 || s.guardians.some(g => ![g.x,g.y,g.hp,g.life].every(Number.isFinite) || g.x < 0 || g.y < 0 || g.x >= W || g.y >= H)) throw Error("Invalid guardian");
  if (s.sites && (!Array.isArray(s.sites) || s.sites.length > 4 || s.sites.some(site => !["cache", "relic", "rift"].includes(site.kind) || !Number.isInteger(site.x) || !Number.isInteger(site.y) || site.x < 2 || site.x >= W-2 || site.y < 2 || site.y >= H-2 || !Number.isFinite(site.progress) || site.progress < 0 || site.progress > 1))) throw Error("Invalid exploration sites");
  for (const p of s.people) {
    if (!Number.isFinite(p.health) || p.health<0 || p.health>100 || !Number.isFinite(p.energy) || p.energy < 0 || p.energy > 100 || !Number.isInteger(p.toolUses) || p.toolUses < 0 || p.toolUses > 10) throw Error("Invalid worker equipment");
  }
}
export function recipeStatus(s, b) {
  const r = RECIPES[b.type];
  if (!r) return "";
  if (b.paused) return "Production paused";
  if (s.stock[r.output] >= (b.target ?? r.target)) return "Target reached";
  for (const [key,n] of Object.entries(r.input)) if ((s.stock[key] || 0) < n) return `Needs ${n} ${key}`;
  if (b.type === "forge" && s.stock.stone < 14) return "Keeping 12 stone for defenses";
  if (b.type === "kitchen" && s.stock.food < 12) return "Keeping raw food for supper";
  return "Ready for a worker";
}
export function campOrders(s) {
  if (!s.campGather || !completed(s, "hearth").length) return;
  const h = completed(s, "hearth")[0];
  for (const [tile,key,threshold] of [[3,"wood",40],[4,"stone",25]]) {
    if (s.stock[key] >= threshold) continue;
    const marked = s.marks.filter(i => s.tiles[i] === tile);
    if (marked.length >= 3) continue;
    const candidates = s.tiles.map((t,i)=>({t,i,x:i%W,y:Math.floor(i/W)})).filter(p => p.t === tile && !s.marks.includes(p.i) && Math.hypot(p.x-h.x,p.y-h.y) <= 11).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y));
    s.marks.push(...candidates.slice(0,3-marked.length).map(p=>p.i));
  }
}
export function depthJobs(s) {
  const jobs = [];
  for (const b of s.buildings) {
    if (b.progress < 1 || b.project || b.paused) continue;
    if (b.type === "quarry" && s.stock.stone<60) jobs.push({key:"mine"+b.id,kind:"mine",b,priority:s.stock.stone<15?0:1});
    if (b.type === "infirmary" && s.stock.food>=2 && s.stock.water>=1 && s.people.some(p=>p.health<95 && Math.hypot(p.x-b.x,p.y-b.y)<7)) jobs.push({key:"heal"+b.id,kind:"heal",b,priority:0});
    if (RECIPES[b.type] && recipeStatus(s,b) === "Ready for a worker") jobs.push({key:"craft"+b.id,kind:"craft",b,priority: 1});
    if (b.type === "forester" && s.tiles.filter(t=>t===3).length < W*H*.45) jobs.push({key:"plant"+b.id,kind:"plant",b,priority:3});
  }
  for (const site of s.sites || []) if (site.ordered && !site.done) jobs.push({key:"explore"+site.id, kind:"explore", site: site.id, b:{type:"wall",x:site.x,y:site.y,rot:0},priority:-1});
  return jobs;
}
export function workDepth(s,p,b,dt) {
  if(p.task.kind==="mine") {
    if(!b){p.task=null;return true;}
    if(p.work>=18){p.carry={key:"stone",n:b.upgraded?6:4};p.task=null;}
    return true;
  }
  if(p.task.kind==="heal") {
    if(!b || s.stock.food<2 || s.stock.water<1){p.task=null;return true;}
    if(p.work>=8){
      const patients=s.people.filter(v=>v.health<95&&Math.hypot(v.x-b.x,v.y-b.y)<7);
      if(patients.length){s.stock.food-=2;s.stock.water--;for(const patient of patients)patient.health=Math.min(100,patient.health+30);s.effects.push({x:b.x,y:b.y,text:"Care +30",life:1.5});}
      p.task=null;
    }
    return true;
  }
  if (p.task.kind === "craft") {
    const r = b && RECIPES[b.type];
    if (!r || recipeStatus(s,b) !== "Ready for a worker") { p.task=null; return true; }
    if (p.work >= r.time) {
      for (const [key,n] of Object.entries(r.input)) s.stock[key]-=n;
      p.carry={key:r.output,n:r.amount}; s.stats.crafted += r.amount; p.task=null;
    }
    return true;
  }
  if (p.task.kind === "plant") {
    if (!b) {p.task=null; return true;}
    if (p.work >= 16) {
      const reserved = new Set(s.roads);
      for (const person of s.people) { reserved.add(Math.floor(person.y)*W+Math.floor(person.x)); for (const [x,y] of person.path || []) reserved.add(Math.floor(y)*W+Math.floor(x)); }
      let planted=false;
      for (let ring=5;ring<=10 && !planted;ring++) for (let dx=-ring;dx<=ring && !planted;dx++) for (const dy of [-ring,ring]) {
        const x=b.x+dx,y=b.y+dy,i=y*W+x;
        if (x<2 || y<2 || x>=W-2 || y>=H-2 || s.tiles[i]!==0 || reserved.has(i) || s.buildings.some(v=>Math.hypot(v.x-x,v.y-y)<5) || s.sites?.some(v=>Math.hypot(v.x-x,v.y-y)<3)) continue;
        let openPatch=true;
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)if(![0,2].includes(s.tiles[(y+oy)*W+x+ox]))openPatch=false;
        if(!openPatch)continue;
        s.tiles[i]=3; planted=true; s.stats.planted=(s.stats.planted||0)+1; s.effects.push({x,y,text:"Sapling planted",life:1.5}); break;
      }
      p.task=null;
    }
    return true;
  }
  if (p.task.kind === "explore") {
    const site=s.sites?.find(v=>v.id===p.task.site);
    if (!site || site.done || !site.ordered) {p.task=null;return true;}
    site.progress=Math.min(1,site.progress+dt/(site.kind==="rift"?24:12));
    p.state=site.kind==="rift"?"Sealing the rift":"Exploring "+site.name;
    if (site.progress>=1) {
      site.done=true; site.ordered=false; s.stats.explored++;
      if (site.kind === "cache") { p.carry={key:"stone",n:28}; s.stock.wood=Math.min(capacity(s),s.stock.wood+12); }
      if (site.kind === "relic") { s.relicReady=true; s.influence=Math.min(influenceCap(s),s.influence+20); }
      if (site.kind === "rift") { s.influence=Math.min(influenceCap(s),s.influence+35); s.stats.riftSealed=true; }
      s.effects.push({x:site.x,y:site.y,text:site.kind==="rift"?"Frontier reclaimed!":"Discovery!",life:2});
      log(s,site.name+" explored. "+(site.kind==="relic"?"Choose a permanent blessing in Village.":site.kind==="rift"?"Its extra raid pressure is gone.":"28 stone carried home; 12 timber recovered."));p.task=null;
    }
    return true;
  }
  return false;
}
export function workRate(s,p) { return (p.toolUses > 0 ? 1.25 : 1) * (s.blessing === "industry" ? 1.1 : 1); }
export function equipWorker(s,p) {
  if (!p.toolUses && s.stock.tools > s.toolReserve) {s.stock.tools--;p.toolUses=10;s.stats.equipped=true;}
}
export function nearestDepot(s,p,grid) {
  const depots=s.buildings.filter(b=>b.progress>=1 && ["hearth","store"].includes(b.type)).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y));
  for (const b of depots) { const path=accessRoute(s,p,b,grid);if(path!==null)return {b,path}; }
  return null;
}
export function workerNeeds(s,p,dt,grid) {
  p.energy ??=100;
  const threat=s.enemies.find(e=>e.hp>0 && Math.hypot(e.x-p.x,e.y-p.y)<4);
  if(threat && (p.fleeUntil||0)<=s.time) {
    const safe=completed(s,"hearth")[0];
    const path=safe&&accessRoute(s,p,safe,grid);
    if(path?.length){p.path=path;p.task=null;p.resting=false;p.fleeUntil=s.time+2;p.state="Fleeing to the hearth";}
  }
  if (p.resting) {
    p.state=p.health<80?"Recovering from injuries":"Resting at home";
    if(s.stock.food>0&&s.stock.water>0)p.health=Math.min(100,p.health+dt*.5);
    p.energy=Math.min(100,p.energy+dt*(s.blessing==="shelter"?12:9));
    if (p.energy>=95 && p.health>=80) {p.resting=false;p.task=null;}
    return true;
  }
  if (p.task || p.carry || p.path.length) p.energy=Math.max(0,p.energy-dt*.18);
  if ((p.energy<20 || p.health<50) && !p.carry && !p.task && !p.path.length) {
    const homes=s.buildings.filter(b=>b.progress>=1 && ["house","hearth","infirmary"].includes(b.type)).sort((a,b)=>(p.health<50 ? (a.type==="infirmary"?-100:0)-(b.type==="infirmary"?-100:0) : 0) + Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y));
    for (const home of homes) { const path=accessRoute(s,p,home,grid);if(path!==null) { if(path.length) {p.path=path;p.state="Heading home to rest";} else p.resting=true; return true;} }
  }
  return false;
}
export function idleActivity(s,p,grid) {
  const h=completed(s,"hearth")[0];if(!h)return;
  // In a quiet village people use the public spaces rather than freezing in a pile.
  const spot=completed(s,"garden")[0] || completed(s,"house")[p.id%Math.max(1,completed(s,"house").length)] || h;
  const phase=Math.floor(s.time/8)+p.id;
  const x=spot.x+((phase*7)%9)-4,y=spot.y+((phase*11)%9)-4;
  if(x>1&&y>1&&x<W-2&&y<H-2&&!grid[y*W+x]) {
    const path=route(s,p.x,p.y,x,y,grid);
    if(path?.length) {p.path=path;p.state=spot.type==="garden"?"Visiting the garden":"Taking a break in the village";}
  }
}
export function ensureSites(s,grid) {
  if(s.sites || !completed(s,"hearth").length)return;
  const h=completed(s,"hearth")[0],p=s.people[0];if(!p)return;
  const candidates=[];
  for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++)if(!grid[y*W+x] && Math.hypot(x-h.x,y-h.y)>13) candidates.push({x,y,rank:hash(s.seed+":"+x+":"+y)});
  candidates.sort((a,b)=>a.rank-b.rank);
  s.sites=[];
  for(const [kind,name] of [["cache","Abandoned supply wagon"],["relic","Old keeper shrine"],["cache","Lost quarry camp"],["rift","The Hollow Rift"]]) {
    const c=candidates.find(v=>s.sites.every(a=>Math.hypot(a.x-v.x,a.y-v.y)>7)&&route(s,p.x,p.y,v.x,v.y,grid)!==null);
    if(!c)continue;
    s.sites.push({id:s.sites.length,kind,name,x:c.x,y:c.y,progress:0,done:false,ordered:false});
  }
  log(s,"Scouts found old sites beyond the clearing. Tap a marker to plan an expedition.");
}
export function expeditionCost(site) {return site.kind==="rift"?{planks:6,tools:2}:site.kind==="relic"?{food:6}:{};}
export function exploreSite(s,site) {
  if(!site || !s.sites?.includes(site) || site.done || site.ordered || s.lost)return "Choose an unexplored site.";
  const cost=expeditionCost(site);
  for(const [key,n] of Object.entries(cost))if((s.stock[key]||0)<n)return `Need ${n} ${key} for this expedition.`;
  const grid=occupancy(s);
  if(!s.people.some(p=>accessRoute(s,p,{type:"wall",x:site.x,y:site.y,rot:0},grid)!==null))return "Open a route to the site first.";
  for(const [key,n] of Object.entries(cost))s.stock[key]-=n;
  site.ordered=true;log(s,"Expedition ordered: "+site.name+". A free worker will travel there.");return "";
}
export function chooseBlessing(s,choice) {
  if(!s.relicReady || s.blessing || !["industry","shelter","sentinel"].includes(choice))return "Find the old keeper shrine first.";
  s.blessing=choice;s.relicReady=false;log(s,"The keeper's blessing: "+choice+". It will remain with this village.");return "";
}
export function frontier(s) {
  const site=s.sites?.find(v=>v.kind==="rift"&&!v.done);
  const pressure=!s.peaceful&&site?Math.min(2,Math.max(0,Math.floor((s.day-5)/4))):0;
  const radius=site?Math.min(10,2+Math.max(0,s.day-4)*.4):0;
  const warded=!!site&&completed(s,"beacon").some(b=>Math.hypot(b.x-site.x,b.y-site.y)<13);
  return {site, pressure:warded?0:pressure, radius:warded?Math.max(1,radius-4):radius, warded};
}
export function summonGuardian(s,x,y) {
  if(s.guardians.length>=2)return "Two guardians are already watching the village.";
  if(occupancy(s)[y*W+x])return "Summon on clear ground.";
  s.guardians.push({id:s.nextId++,x:x+.5,y:y+.5,hp:110,life:90,cool:0,path:[]});return "";
}
export function tickGuardians(s,dt,grid) {
  for(const g of s.guardians) {
    g.life-=dt;g.cool-=dt;
    const enemy=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-g.x,e.y-g.y)<14).sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y))[0];
    if(!enemy)continue;
    const distance=Math.hypot(enemy.x-g.x,enemy.y-g.y);
    if(distance<1.8 && g.cool<=0) {enemy.hp-=16;g.cool=1.2;s.effects.push({x:enemy.x,y:enemy.y,text:"−16",life:.7});}
    else if(distance>=1.8) {
      if(!g.path.length || g.repath<=0) {g.path=route(s,g.x,g.y,Math.floor(enemy.x),Math.floor(enemy.y),grid)||[];g.repath=1;}
      g.repath=(g.repath||0)-dt;
      if(g.path.length){const [tx,ty]=g.path[0],dx=tx-g.x,dy=ty-g.y,d=Math.hypot(dx,dy),step=dt*1.8;if(d<=step){g.x=tx;g.y=ty;g.path.shift();}else{g.x+=dx/d*step;g.y+=dy/d*step;}}
    }
  }
  s.guardians=s.guardians.filter(g=>g.hp>0&&g.life>0);
}
export function depthSummary(s) {
  const f=frontier(s), need=dailyNeeds(s);
  return {working:s.people.filter(p=>p.task||p.carry).length,resting:s.people.filter(p=>p.resting).length,
    foodDays:Math.floor((s.stock.food+(s.stock.meals||0)*2)/Math.max(1,need.food)*10)/10,
    waterDays:Math.floor(s.stock.water/Math.max(1,need.water)*10)/10,
    tools:s.people.filter(p=>p.toolUses>0).length,frontier:f};
}

export const CONVOY_CARGO = {wood:20,stone:15,food:15,water:15};
export function queueConvoy(s,targetKey,targetName,nonce) {
  initDepth(s);
  if (!completed(s,"store").length) return "Build a storehouse to organize a supply convoy.";
  if (s.convoys.length>=3) return "Three convoys are already traveling.";
  if (typeof targetKey!=="string" || typeof targetName!=="string") return "Choose a neighboring village.";
  for (const [key,n] of Object.entries(CONVOY_CARGO)) if(s.stock[key]<n)return `Need ${n} ${key} for this convoy.`;
  for (const [key,n] of Object.entries(CONVOY_CARGO))s.stock[key]-=n;
  const sequence=s.nextId++;
  s.convoys.push({id:nonce || s.seed+":"+sequence,targetKey,targetName,remaining:30});
  log(s,"Supply convoy departed for "+targetName+".");return "";
}
export function applyConvoy(source,convoy,target) {
  initDepth(source);initDepth(target);
  if (!source.convoys.includes(convoy) || convoy.remaining>0)return "The convoy is still traveling.";
  if (!target.receivedConvoys.includes(convoy.id)) {
    receiveCargo(target,convoy.id);
    log(target,"A supply convoy arrived from "+(source.territoryName||"a neighboring village")+".");
  }
  source.convoys=source.convoys.filter(c=>c.id!==convoy.id);
  log(source,"Convoy arrived at "+convoy.targetName+". Supplies beyond storage capacity wait in delivery crates.");
  return "";
}

function receiveCargo(s,id) {
  if(s.receivedConvoys.includes(id))return;
  for(const [key,n] of Object.entries(CONVOY_CARGO))s.pendingSupplies[key]+=n;
  s.receivedConvoys.push(id);unloadSupplies(s);
}
export function unloadSupplies(s) {
  for(const [key,n] of Object.entries(s.pendingSupplies)) {const taken=Math.max(0,Math.min(n,capacity(s)-s.stock[key]));s.stock[key]+=taken;s.pendingSupplies[key]-=taken;}
}
export function reconcileConvoys(s,stored) {
  initDepth(s);
  for(const id of stored.receivedConvoys||[])if(!s.receivedConvoys.includes(id))receiveCargo(s,id);
}
