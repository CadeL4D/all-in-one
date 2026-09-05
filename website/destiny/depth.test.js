import test from "node:test";
import assert from "node:assert/strict";
import {createWorld,place,canPlace,DEFS,tick,serialize,restore,occupancy,route,cast,raidPlan,suggestedSite,startProject,campaign,completed} from "./world.js";
import {buildAtlas,createTerritory} from "./geography.js";
import {initDepth,campOrders,recipeStatus,nearestDepot,frontier,exploreSite,chooseBlessing,queueConvoy,applyConvoy,reconcileConvoys,CONVOY_CARGO} from "./depth.js";
const run=(s,seconds)=>{for(let i=0;i<seconds*10;i++)tick(s,.1);};
function village(){const s=createWorld("depth-fixture",0,true);s.tiles.fill(0);place(s,"hearth",30,22);run(s,10);s.campGather=false;s.stock={wood:150,stone:150,food:150,water:150,planks:0,tools:0,meals:0};return s;}
function add(s,type,x,y){const b={id:s.nextId++,type,x,y,rot:0,progress:1,hp:DEFS[type].hp};s.buildings.push(b);return b;}
test("idle camp gathers only a modest nearby reserve and obeys the player toggle",()=>{
 const s=village();s.stock.wood=0;s.stock.stone=0;s.tiles[19*64+30]=3;s.tiles[19*64+31]=4;s.campGather=true;campOrders(s);assert.equal(s.marks.length,2);s.marks=[];s.campGather=false;campOrders(s);assert.equal(s.marks.length,0);
});
test("a real production chain consumes timber and stone, delivers crafted goods and equips workers",()=>{
 const s=village();add(s,"workshop",25,18);add(s,"forge",35,18);add(s,"farm",25,28);add(s,"well",36,26);
 run(s,110);assert.ok(s.stats.crafted>=4);assert.ok(s.stock.wood<150);assert.ok(s.stock.stone<150);assert.ok(s.people.some(p=>p.toolUses>0));assert.ok(s.stock.tools>=2,"Expedition reserve is retained");
 const copy=restore(serialize(s));assert.equal(copy.stock.planks,s.stock.planks);assert.equal(copy.stock.tools,s.stock.tools);assert.equal(copy.people[0].toolUses,s.people[0].toolUses);
});
test("production pause and target stop resource consumption",()=>{
 const s=village(),b=add(s,"workshop",25,18);b.paused=true;run(s,25);assert.equal(s.stock.wood,150);assert.equal(recipeStatus(s,b),"Production paused");
 b.paused=false;b.target=12;s.stock.planks=12;run(s,25);assert.equal(s.stock.wood,150);assert.equal(recipeStatus(s,b),"Target reached");
});
test("kitchens produce usable meals and summer/farm work remains sustainable",()=>{
 const s=village();add(s,"kitchen",25,18);add(s,"farm",25,28);add(s,"well",36,26);run(s,45);assert.ok(s.stock.meals>0);const meals=s.stock.meals;s.time=99.9;s.day=1;tick(s,.2);assert.ok(s.stock.meals<meals);assert.ok(s.stock.food>0);
});
test("storehouses shorten the actual delivery route",()=>{
 const s=village();const store=add(s,"store",16,18),p={x:14.5,y:18.5};const result=nearestDepot(s,p,occupancy(s));assert.equal(result.b.id,store.id);assert.ok(result.path.length<5);
});
test("a tired worker travels home, rests and resumes work",()=>{
 const s=village(),p=s.people[0];p.energy=10;p.task=null;p.path=[];let rested=false;
 for(let i=0;i<200;i++){tick(s,.1);if(p.resting)rested=true;}
 assert.ok(rested);assert.ok(p.energy>80);assert.equal(p.resting,false);
});
test("exploration produces rewards once and the rift can be permanently sealed",()=>{
 const s=village();assert.equal(s.sites.length,4);const relic=s.sites.find(v=>v.kind==="relic");assert.equal(exploreSite(s,relic),"");const food=s.stock.food;assert.ok(exploreSite(s,relic));assert.equal(s.stock.food,food);run(s,80);assert.ok(relic.done);assert.equal(chooseBlessing(s,"industry"),"");assert.ok(chooseBlessing(s,"sentinel"));
 s.peaceful=false;s.difficulty="survival";s.day=13;assert.equal(frontier(s).pressure,2);s.stock.planks=6;s.stock.tools=2;
 const rift=s.sites.find(v=>v.kind==="rift");assert.equal(exploreSite(s,rift),"");s.peaceful=true;run(s,100);assert.equal(rift.done,true);assert.equal(frontier(s).pressure,0);assert.equal(restore(serialize(s)).blessing,"industry");
});
test("wards suppress extra pressure and guardians absorb attacks",()=>{
 const s=village();s.peaceful=false;s.difficulty="survival";s.day=13;const r=frontier(s).site;const before=raidPlan(s,13).length;add(s,"beacon",r.x+2,r.y);assert.equal(frontier(s).warded,true);assert.ok(raidPlan(s,13).length<before);
 s.influence=80;assert.equal(cast(s,"guardian",27,22),"");assert.equal(cast(s,"guardian",28,22),"");const balance=s.influence;assert.ok(cast(s,"guardian",29,22));assert.equal(s.influence,balance);
 s.enemies=[{id:999,kind:"raveler",x:27.5,y:23.5,hp:100,age:0,cool:0,path:[]}];run(s,3);assert.ok(s.guardians.some(g=>g.hp<110));assert.ok(s.enemies[0].hp<100);
});
test("gate admits workers while the enemy grid blocks it",()=>{
 const s=village();add(s,"gate",20,20);assert.equal(occupancy(s)[20*64+20],0);assert.equal(occupancy(s,true)[20*64+20],1);
});
test("convoy transfer is conserved, persists, and duplicate receipts do not duplicate supplies",()=>{
 const s=village(),target=village();target.seed="neighbor";add(s,"store",25,18);target.stock.wood=target.stock.stone=target.stock.food=target.stock.water=0;
 const before={...s.stock};assert.equal(queueConvoy(s,"neighbor-key","Neighbor"),"");let c=s.convoys[0];assert.equal(s.stock.wood,before.wood-20);assert.ok(applyConvoy(s,c,target));run(s,31);c=s.convoys[0];const replay=JSON.parse(JSON.stringify(c));assert.equal(applyConvoy(s,c,target),"");assert.equal(target.stock.wood,20);assert.equal(s.convoys.length,0);
 s.convoys.push(replay);assert.equal(applyConvoy(s,replay,target),"");assert.equal(target.stock.wood,20);assert.ok(restore(serialize(target)).receivedConvoys.includes(replay.id));
});
test("save validation rejects malformed new systems",()=>{
 const s=village();s.stock.tools=-1;assert.throws(()=>restore(serialize(s)),/stock/);s.stock.tools=0;s.guardians=[{x:NaN,y:2,hp:10,life:10}];assert.throws(()=>restore(serialize(s)),/guardian/);
});

test("a real Survival economy grows through industry, exploration and reclamation",()=>{
 const s=createTerritory(buildAtlas("balance-frontier"),0,"survival");
 const plan=["hearth","house","well","farm","lumber","tower","quarry","garden","kitchen","store","workshop","forge","forester","farm","tower","well","beacon","tower"];
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
   if(s.enemies.length && !s.guardians?.length && s.influence>=25) {
     const e=s.enemies[0];cast(s,"guardian",Math.floor(e.x),Math.floor(e.y));
   }
   run(s,1);
 }
 assert.equal(s.lost,false,JSON.stringify({day:s.day,events:s.events}));
 assert.equal(next,plan.length);
 assert.equal(campaign(s).index,-1,JSON.stringify({day:s.day,chapter:campaign(s).current,stats:s.stats,sites:s.sites,stock:s.stock}));
 assert.ok(s.stock.food>0&&s.stock.water>0);
});

test("an infirmary treats real injuries and uses supplies",()=>{
 const s=village(),clinic=add(s,"infirmary",27,18),patient=s.people[0];patient.health=35;patient.x=26.5;patient.y=18.5;patient.path=[];patient.task=null;
 const water=s.stock.water;run(s,30);assert.ok(patient.health>=80);assert.ok(s.stock.water<water);
});
test("convoy overflow is retained and open-village reconciliation applies it once",()=>{
 const source=village(),target=village();add(source,"store",25,18);target.stock.wood=180;
 const openCopy=restore(serialize(target));queueConvoy(source,"target","Target","unique-run-id");source.convoys[0].remaining=0;applyConvoy(source,source.convoys[0],target);
 assert.equal(target.stock.wood,180);assert.equal(target.pendingSupplies.wood,20);
 reconcileConvoys(openCopy,target);reconcileConvoys(openCopy,target);assert.equal(openCopy.pendingSupplies.wood,20);
 openCopy.stock.wood-=10;tick(openCopy,.1);assert.equal(openCopy.stock.wood,180);assert.equal(openCopy.pendingSupplies.wood,10);
});
