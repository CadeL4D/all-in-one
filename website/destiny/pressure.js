// Predictable calendars, varied attacks. Building defenses never raises threat.
export function scheduled(s,d,day){
  if(s.peaceful||!d.firstRaid||day<d.firstRaid)return false;
  if(d.name==='Survival'&&day>=16)return (day-16)%3<2;
  return (day-d.firstRaid)%d.interval===0;
}
export function sequence(d,day){
  if(!d.firstRaid||day<d.firstRaid)return 0;
  if(d.name==='Survival'&&day>=16)return 6+Math.floor((day-16)/3)*2+Math.min(2,(day-16)%3+1);
  return Math.floor((day-d.firstRaid)/d.interval)+1;
}
export function pattern(d,day){
  const number=sequence(d,day);
  let kind='raid';
  if(number>2)kind=d.name==='Onslaught'
    ? number%3===0?'patrol':number%3===1?'rush':Math.floor(number/3)%2?'siege':'raid'
    : ['patrol','rush','siege','raid'][(number-3)%4];
  const variants={
    raid:{label:'Raiding party',scale:1,phase:.74,time:'dusk',hint:'A mixed attack. Keep the approach covered.'},
    patrol:{label:'Border patrol',scale:.55,phase:.82,time:'early night',hint:'A smaller attack. A chance to replenish and repair.'},
    rush:{label:'Night rush',scale:.9,phase:.80,time:'early night',hint:'Fast skulkers. Check gaps in your defenses.'},
    siege:{label:'Heavy assault',scale:.72,phase:.86,time:'late night',hint:'Fewer attackers, with brutes. Walls buy firing time.'},
  };
  const side=(number-1)%4,pincer=day>=24&&kind==='raid'&&d.name!=='Settler';
  return {...variants[kind],kind,number,side,pincer,approach:pincer?['east and west','north and south','west and east','south and north'][side]:['east','north','west','south'][side]};
}
export function raidRhythm(s,d){
  if(s.peaceful)return 'No raids.';
  if(d.name==='Survival')return 'Every other night until day 14; from day 16, two raid nights then one clear night.';
  if(d.name==='Onslaught')return 'Every night; each third attack is a smaller patrol.';
  return 'Every three nights, leaving two clear nights to recover.';
}
