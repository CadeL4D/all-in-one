import {createWorld,place,canPlace,DEFS,tick,serialize,restore,cast,suggestedSite,startProject,campaign} from "./world.js";
import {buildAtlas,createTerritory} from "./geography.js";
import {frontier,exploreSite,chooseBlessing} from "./depth.js";
import {writeFileSync,mkdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const run=(s,seconds)=>{for(let i=0;i<seconds*10;i++)tick(s,.1);};
export function playThrough(seed="balance-frontier",region=0,mode="survival") {
 const s=createTerritory(buildAtlas(seed),region,mode);
 const daily=[];let recorded=0;
 const plan=["hearth","house","well","farm","lumber","tower","quarry","garden","kitchen","store","workshop","forge","forester","farm","tower","well","beacon","tower","infirmary"];
 if(mode==="onslaught")plan.splice(10,0,"quarry","tower","tower");
 let next=0;
 for(let step=0;step<2400 && s.day<23 && !s.lost;step++) {
   if(next<plan.length && s.buildings.filter(b=>b.progress<1).length<2) {
     const type=plan[next],site=type==="hearth"?{x:30,y:22}:suggestedSite(s,type,32,24);
     if(site&&!canPlace(s,type,site.x,site.y,0)){place(s,type,site.x,site.y);next++;}
   }
   if(s.stock.stone<45) {
     const stones=s.tiles.map((t,i)=>({t,i,x:i%64,y:Math.floor(i/64)})).filter(p=>p.t===4&&!s.marks.includes(p.i)).sort((a,b)=>Math.hypot(a.x-32,a.y-24)-Math.hypot(b.x-32,b.y-24));
     s.marks.push(...stones.slice(0,8).map(v=>v.i));
   }
   s.focus=s.stock.food<25||s.stock.water<20?"food":s.stock.stone<15?"harvest":"balanced";
   for(const b of s.buildings)if(b.progress>=1&&!b.project){
     if(b.hp<DEFS[b.type].hp*.6)startProject(s,b,"repair");
     else if(["farm","house","tower"].includes(b.type)&&!b.upgraded&&s.stock.stone>45)startProject(s,b,"upgrade");
   }
   if(s.sites&&!s.sites.some(v=>v.ordered)) {
     const site=s.sites.find(v=>!v.done&&v.kind==="cache")||s.sites.find(v=>!v.done&&v.kind==="relic")||s.sites.find(v=>!v.done&&v.kind==="rift");
     if(site&&s.stock.food>25)exploreSite(s,site);
   }
   if(s.relicReady)chooseBlessing(s,"industry");
   if(s.enemies.length && (s.guardians?.length||0)<(mode==="onslaught"?2:1) && s.influence>=25) {
     const e=s.enemies[0];cast(s,"guardian",Math.floor(e.x),Math.floor(e.y));
   }
   run(s,1);
   if(s.day!==recorded){recorded=s.day;daily.push({day:s.day,people:s.people.length,stock:{...s.stock},morale:s.morale,injured:s.people.filter(p=>p.health<75).length,working:s.people.filter(p=>p.task||p.carry).length,chapters:s.chapters?.length||0,pressure:frontier(s).pressure});}
 }

 return {state:s,daily,placed:next,planned:plan.length};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
 const cases=[["balance-frontier",0,"survival"],["HEARTH-742",0,"survival"],["balance-frontier",14,"survival"],["balance-frontier",2,"survival"],["balance-frontier",0,"settler"],["balance-frontier",0,"onslaught"]];
 const results=[];
 for(const [seed,id,mode] of cases){const r=playThrough(seed,id,mode);const s=r.state;results.push({seed,region:s.territoryName,mode,day:s.day,lost:s.lost,people:s.people.length,chapter:campaign(s).index,stock:s.stock,stats:s.stats,placed:r.placed,daily:r.daily});console.log(JSON.stringify({...results.at(-1),daily:undefined}));if(seed==="balance-frontier"&&id===0&&mode==="survival"){mkdirSync(new URL("../test-output/",import.meta.url),{recursive:true});writeFileSync(new URL("../test-output/destiny-living-village.json",import.meta.url),serialize(s));}}
 writeFileSync(new URL("../test-output/destiny-balance-audit.json",import.meta.url),JSON.stringify(results,null,2));
}
