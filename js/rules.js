// DOM に触れない純粋なルール（時間帯・タスク受付・時間経過・分岐）
import {H,WD} from './data.js';

export function dayKey(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
/* あさ 6–9 / ひる 10–15 / ゆうがた 16–19 / よる 20–5（よる＝ねんね） */
export function band(d){const h=d.getHours();return h<6||h>=20?'yoru':h<10?'asa':h<16?'hiru':'yuu';}
export function isNight(d){return band(d)==='yoru';}
export function awakeMs(from,to){
  if(to<=from) return 0;
  from=Math.max(from,to-40*24*H);
  const STEP=5*60e3; let t=from, ms=0;
  while(t<to){const n=Math.min(t+STEP,to); if(!isNight(new Date(t))) ms+=n-t; t=n;}
  return ms;
}

export function taskState(t,S,d){
  const h=d.getHours(),wd=d.getDay();
  if(t.id==='lesson'&&S.lessonDays.indexOf(wd)<0) return {ok:false,why:'day'};
  if(t.weekdays&&t.weekdays.indexOf(wd)<0) return {ok:false,why:'weekday'};
  if(t.from!=null&&h<t.from) return {ok:false,why:'early'};
  const until=typeof t.until==='function'?t.until(d):t.until;
  if(until!=null&&h>=until) return {ok:false,why:'late'};
  if(t.id==='hamigaki'){const slot=h<15?'am':'pm';return S.cnt['hamigaki_'+slot]?{ok:false,why:'done',slot:slot}:{ok:true,slot:slot};}
  const used=S.cnt[t.id]||0;
  return used<t.limit?{ok:true,used:used}:{ok:false,why:'done',used:used};
}
export function taskNote(t,S,st){
  if(st.why==='day') return S.lessonDays.map(x=>WD[x]).join(' と ')+' だけ';
  if(t.id==='lesson') return st.ok?'きょうは れっすんの ひ！ ごはん 3ばい':'できたね！';
  if(t.id==='hayaoki'&&st.why&&st.why!=='done') return 'へいじつ あさ 5じ〜7じ';
  if(t.id==='hayane'&&st.why==='early') return '18じ から';
  if(st.why==='late') return 'きょうは おしまい';
  return '';
}

/* 起きている時間だけ おなか・ごきげん が減る。おなか0 が起きている時間で3時間続くと びょうき */
export function decay(S,now){
  if(S.stage===0){S.lastTick=now;return {becameSick:false};}
  const a=awakeMs(S.lastTick,now);
  if(S.hunger===0) S.zeroAcc+=a;
  else{const toZero=S.hunger*3*H-S.hAcc; if(a>toZero) S.zeroAcc+=a-toZero;}
  S.hAcc+=a; S.mAcc+=a;
  while(S.hAcc>=3*H){S.hAcc-=3*H;S.hunger=Math.max(0,S.hunger-1);}
  while(S.mAcc>=4*H){S.mAcc-=4*H;S.mood=Math.max(0,S.mood-1);}
  S.lastTick=now;
  if(!S.sick&&S.zeroAcc>=3*H){S.sick=true;S.cure=0;return {becameSick:true};}
  return {becameSick:false};
}
export function afterFeed(S){S.zeroAcc=0;}

export function nextForm(S){
  const p=S.p;
  if(S.stage===0)return 'puni';
  if(S.stage===1)return (p.ka+p.ki>=p.ge+p.ho)?'hoshi':'hana';
  const v=[p.ka,p.ki,p.ge,p.ho],mx=Math.max(...v),mn=Math.min(...v);
  if(mn>0&&mx/mn<=1.6)return 'niji';
  return ['hakase','kirara','morimori','pokapoka'][v.indexOf(mx)];
}
