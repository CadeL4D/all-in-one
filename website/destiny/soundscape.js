// Quiet, spatial work cues. Simulation continues to work with sound disabled.
let lastWork=-1,lastDay=0,lastRaids=0,lastChapter=0;
const played=new WeakSet();
function note(audio,freq,at,duration,volume,pan=0,type='sine'){
  const o=audio.createOscillator(),g=audio.createGain(),p=audio.createStereoPanner();
  o.type=type;o.frequency.value=freq;p.pan.value=Math.max(-1,Math.min(1,pan));
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.01);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(g).connect(p).connect(audio.destination);o.start(at);o.stop(at+duration+.02);
  o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
}
export function worldAudio(audio,s,camera,width){
  if(!audio||audio.state!=='running')return;
  const now=audio.currentTime,pan=x=>((camera.x+x*12*camera.zoom)/Math.max(1,width)-.5)*1.7;
  const chapter=s.chapters?.length||0;
  if(chapter>lastChapter){[392,494,587,784].forEach((f,i)=>note(audio,f,now+i*.1,.5,.022));}
  lastChapter=chapter;
  if(s.raided!==lastRaids&&s.enemies.length){note(audio,110,now,.8,.03,0,'triangle');note(audio,146.8,now+.25,.9,.022);}
  lastRaids=s.raided;
  if(s.day!==lastDay){[196,293.7,392].forEach((f,i)=>note(audio,f,now+i*.22,1.2,.012));lastDay=s.day;}
  for(const e of s.effects)if(e.sound&&!played.has(e)){
    played.add(e);if(e.sound==='delivery')note(audio,260,now,.1,.012,pan(e.x),'triangle');
    else {note(audio,98,now,.6,.025,pan(e.x));note(audio,103,now+.1,.6,.015,pan(e.x));}
  }
  if(now-lastWork<.7)return;lastWork=now;
  const workers=s.people.filter(p=>p.task&&!p.path?.length&&!p.resting&&Math.abs(pan(p.x))<1);
  const worker=workers[Math.floor(s.time)%Math.max(1,workers.length)];if(!worker)return;
  const kind=worker.task.kind;
  if(['build','project','harvest','mine','craft'].includes(kind)){
    note(audio,kind==='craft'?740:kind==='mine'?540:180,now,.08,.016,pan(worker.x),'triangle');
    note(audio,kind==='craft'?1110:230,now+.13,.055,.009,pan(worker.x),'triangle');
  }else if(kind==='well'){note(audio,420,now,.1,.009,pan(worker.x));note(audio,670,now+.11,.12,.008,pan(worker.x));}
  else if(kind==='farm')note(audio,170,now,.18,.006,pan(worker.x),'triangle');
}
