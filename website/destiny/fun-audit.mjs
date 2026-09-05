// Exploratory design probe, not a test of whether humans enjoy the game.
// Run from the repository root: node website/destiny/fun-audit.mjs
import {playThrough} from "./playtest.mjs";
import {tick, capacity, dailyNeeds, influenceCap} from "./world.js";
import {mkdirSync, writeFileSync} from "node:fs";

const cases = [
  ["balance-frontier", 0, "survival"],
  ["HEARTH-742", 0, "survival"],
  ["balance-frontier", 14, "survival"],
  ["balance-frontier", 2, "survival"],
  ["balance-frontier", 0, "onslaught"],
];
const snapshot = s => ({day:s.day, lost:!!s.lost, people:s.people.length,
  buildings:s.buildings.length, chapters:s.chapters.length,
  stock:{...s.stock}, capacity:capacity(s), dailyNeeds:dailyNeeds(s),
  morale:s.morale, influence:s.influence, raidsCleared:s.stats.repelled});
const results=[];
for (const [seed,region,mode] of cases) {
  const {state:s,daily}=playThrough(seed,region,mode);
  const before=snapshot(s), targetDay=s.day+32;
  let samples=0, workerSamples=0, occupiedSamples=0, cappedInfluenceSamples=0;
  let minFood=s.stock.food, minWater=s.stock.water, minPeople=s.people.length;
  const lateDaily=[];
  // No new builds, orders, repairs, spells, trades or focus changes after day 23.
  // Existing automated jobs, queued tasks and any surviving guardian continue.
  for (let step=0;s.day<targetDay&&!s.lost&&step<33000;step++) {
    const day=s.day;
    tick(s,.1);
    minFood=Math.min(minFood,s.stock.food); minWater=Math.min(minWater,s.stock.water);
    minPeople=Math.min(minPeople,s.people.length);
    if(step%10===0){
      samples++; workerSamples+=s.people.length;
      occupiedSamples+=s.people.filter(p=>p.task||p.carry).length;
      if(s.influence>=influenceCap(s)-.01)cappedInfluenceSamples++;
    }
    if(s.day!==day)lateDaily.push(snapshot(s));
  }
  const result={seed,region,mode,before,after:snapshot(s),minFood,minWater,minPeople,
    occupiedWorkerShare:occupiedSamples/Math.max(1,workerSamples),
    influenceAtCapShare:cappedInfluenceSamples/Math.max(1,samples),
    scriptedOpeningDaily:daily,passiveDaily:lateDaily};
  results.push(result);
  console.log(JSON.stringify({...result,scriptedOpeningDaily:undefined,passiveDaily:undefined}));
}
const output=new URL("../test-output/",import.meta.url);
mkdirSync(output,{recursive:true});
writeFileSync(new URL("destiny-fun-audit.json",output),JSON.stringify({
  method:"Scripted costed opening to day 23; no player interventions for 32 further simulation days. Task/carry sampling every simulated second is not a measure of human engagement.",
  results},null,2));
