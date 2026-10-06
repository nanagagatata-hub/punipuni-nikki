// DOM に触れない純粋なルール（時間帯・タスク受付・時間経過・分岐）
import {H,WD,ADULT_IDS,LINES} from './data.js';
import {CFG_DEF} from './state.js';
const DEFCFG=CFG_DEF();
const cf=c=>c||DEFCFG;
const mOf=d=>d.getHours()*60+d.getMinutes();

export function dayKey(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
/* よる＝ぷにちゃんの ねんね（寝る時刻〜起きる時刻）／ あさ＝起きる時刻〜10時 ／ ひる 10–16時 ／ ゆうがた＝16時〜寝る時刻 */
export function isNight(d,cfg){const c=cf(cfg),m=mOf(d);return m>=c.sleepAt||m<c.wakeAt;}
export function band(d,cfg){if(isNight(d,cfg))return 'yoru';const m=mOf(d);return m<600?'asa':m<960?'hiru':'yuu';}
/* ねむっているか：夜で、かつ「ちょっとだけ おきて」の 5 分の間ではない */
export function asleep(S,now){return isNight(new Date(now),S.cfg)&&!(now<(S.tempUntil||0));}
/* 何日の夜か（起きる時刻より前は前の日の夜） */
export function nightKey(now,cfg){const d=new Date(now);if(mOf(d)<cf(cfg).wakeAt)d.setDate(d.getDate()-1);return dayKey(d);}
export function awakeMs(from,to,cfg){
  if(to<=from) return 0;
  from=Math.max(from,to-40*24*H);
  const STEP=5*60e3; let t=from, ms=0;
  while(t<to){const n=Math.min(t+STEP,to); if(!isNight(new Date(t),cfg)) ms+=n-t; t=n;}
  return ms;
}

/* はやおき・はやね の受付（分）は設定から。until はその時刻ちょうどで締め切り */
function windowOf(t,c,wd){
  if(t.id==='hayaoki') return {from:c.hayaoki.from,until:c.hayaoki.until,days:c.hayaoki.days};
  if(t.id==='hayane') return {from:c.hayane.from,until:c.hayane.until[wd]};
  return null;
}
export function taskState(t,S,d){
  const h=d.getHours(),m=mOf(d),wd=d.getDay(),w=windowOf(t,cf(S.cfg),wd);
  if(t.id==='lesson'&&S.lessonDays.indexOf(wd)<0) return {ok:false,why:'day'};
  if(w&&w.days&&w.days.indexOf(wd)<0) return {ok:false,why:'weekday'};
  if(w&&m<w.from) return {ok:false,why:'early'};
  if(w&&m>=w.until) return {ok:false,why:'late'};
  if(t.id==='hamigaki'){const slot=h<15?'am':'pm';return S.cnt['hamigaki_'+slot]?{ok:false,why:'done',slot:slot}:{ok:true,slot:slot};}
  const used=S.cnt[t.id]||0;
  return used<t.limit?{ok:true,used:used}:{ok:false,why:'done',used:used};
}
/* 時刻のひらがな表記：6じ／6じ30ぷん／6じ15ふん */
export function clock(min){
  const h=Math.floor(min/60),m=min%60;if(!m)return h+'じ';
  return h+'じ'+m+([2,5,7,9].indexOf(m%10)>=0?'ふん':'ぷん');
}
const WS=['にち','げつ','か','すい','もく','きん','ど'];
/* 曜日の並び：3 つ以上つづくところは「げつ〜きん」、7 つなら「まいにち」 */
export function daysLabel(days){
  if(days.length===7)return 'まいにち';
  if(!days.length)return 'おやすみ';
  const out=[];let i=0;
  while(i<days.length){let j=i;while(j+1<days.length&&days[j+1]===days[j]+1)j++;
    if(j-i>=2)out.push(WS[days[i]]+'〜'+WS[days[j]]);else for(let k=i;k<=j;k++)out.push(WS[days[k]]);i=j+1;}
  return out.join('・');
}
export function taskNote(t,S,st){
  if(st.why==='day') return S.lessonDays.map(x=>WD[x]).join(' と ')+' だけ';
  if(t.id==='lesson') return st.ok?'きょうは ごはん 3ばい！':'できたね！';
  const c=cf(S.cfg);
  if(t.id==='hayaoki'&&st.why&&st.why!=='done') return daysLabel(c.hayaoki.days)+' あさ '+clock(c.hayaoki.from)+'〜'+clock(c.hayaoki.until);
  if(t.id==='hayane'&&st.why==='early') return clock(c.hayane.from)+' から';
  if(st.why==='late') return 'きょうは おしまい';
  return '';
}

/* 起きている時間だけ おなか・ごきげん が減る。おなか0 が起きている時間で3時間続くと びょうき */
export function decay(S,now){
  if(S.stage===0){S.lastTick=now;return {becameSick:false};}
  const a=awakeMs(S.lastTick,now,S.cfg);
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

const PK=['ka','ki','ge','ho'];
const BABY={ka:'puni',ki:'shizuku',ge:'koro',ho:'moko'};
const CHILD={ka:'hoshi',ki:'shabon',ge:'hana',ho:'kumo'};
const SINGLE={ka:'hakase',ki:'kirara',ge:'morimori',ho:'pokapoka'};
const PAIR={'ka+ki':'tsukimi','ka+ge':'bouken','ka+ho':'yumemi','ki+ge':'marin','ki+ho':'keki','ge+ho':'ohisama'};
/* 最大のつよさ（同値は かしこさ→きれい→げんき→ほかほか） */
function topKey(p){return PK.reduce((a,k)=>p[k]>p[a]?k:a,'ka');}
/* 進化先：あかちゃん・こどもは最大のつよさ。おとなは 第1候補→相性スコア順で ずかん に無いもの→全部あれば第1候補の色違い（spec §4.3） */
export function chooseForm(S){
  const p=S.p;
  if(S.stage===0) return {form:BABY[topKey(p)],shiny:false};
  if(S.stage===1) return {form:CHILD[topKey(p)],shiny:false};
  const sorted=PK.slice().sort((a,b)=>p[b]-p[a]||PK.indexOf(a)-PK.indexOf(b));
  const v1=p[sorted[0]],v2=p[sorted[1]],mn=p[sorted[3]];
  let first;
  if(mn>0&&v1/mn<=1.6) first='niji';
  else if(v2>0&&v2>=v1*.75) first=PAIR[[sorted[0],sorted[1]].sort((a,b)=>PK.indexOf(a)-PK.indexOf(b)).join('+')];
  else first=SINGLE[sorted[0]];
  const score={niji:mn*1.6};
  PK.forEach(k=>{score[SINGLE[k]]=p[k];});
  Object.keys(PAIR).forEach(k=>{const [a,b]=k.split('+');score[PAIR[k]]=(p[a]+p[b])/2;});
  const rest=ADULT_IDS.filter(f=>f!==first).sort((a,b)=>score[b]-score[a]||ADULT_IDS.indexOf(a)-ADULT_IDS.indexOf(b));
  const pick=[first].concat(rest).find(f=>S.zukan.indexOf(f)<0);
  return pick?{form:pick,shiny:false}:{form:first,shiny:true};
}

/* 一生の期日（spec §4.1）：ts の日付 + addDays 日の、ぷにちゃんが起きる時刻 */
export function atWake(ts,addDays,cfg){const w=cf(cfg).wakeAt,d=new Date(ts);d.setDate(d.getDate()+addDays);d.setHours(Math.floor(w/60),w%60,0,0);return +d;}
export const at6=(ts,addDays)=>atWake(ts,addDays,DEFCFG);
export function finalDue(S){return atWake(S.adultAt,2,S.cfg);}
export function farewellReady(S,now){
  return S.stage===4&&S.finalSeenAt>0&&now>=atWake(S.finalSeenAt,1,S.cfg)&&!isNight(new Date(now),S.cfg)&&!S.sick;
}

/* 表情とポーズ（spec §5.3）：ねんね ＞ びょうき ＞ リアクション ＞ おなか×ごきげん の表 */
const REACT={head:['shy','squish','side'],belly:['giggle','bounce','up'],stroke:['squint','sway','side'],
  hug:['hug','squish','up'],dizzy:['dizzy','spin','side'],happy:['happy','bounce','up']};
const TABLE={ // [おなか段階][ごきげん段階] = [face, pose]
  full:{low:['pout','tilt'],mid:['happy','sway'],high:['sparkle','bounce']},
  some:{low:['sad','droop'],mid:['normal','bob'],high:['happy','sway']},
  zero:{low:['tears','droop'],mid:['hungry','bob'],high:['drool','bob']}
};
export function look(S,ctx){
  const mk=(face,pose,arms,think)=>({face,pose,arms:arms||'side',think:think||null});
  if(S.stage===0) return mk('normal','bob');
  if(ctx.night) return mk('sleep','none');
  if(S.sick) return mk('sick','droop');
  if(ctx.react&&REACT[ctx.react]){const x=REACT[ctx.react];return mk(x[0],x[1],x[2]);}
  const h=S.hunger===0?'zero':S.hunger<=2?'some':'full', m=S.mood<=1?'low':S.mood<=3?'mid':'high';
  const [face,pose]=TABLE[h][m];
  return mk(face,pose,face==='hungry'?'belly':face==='sparkle'?'up':'side',h==='zero'&&m!=='low'?'🍙':null);
}

/* セリフ選び：時間帯と状態で候補を絞り、よびかた が無ければ {you} 入りを除く */
export function pickLine(key,S,d,rnd){
  rnd=rnd||Math.random;
  const b=band(d,S.cfg);let list;
  if(key==='idle'){
    if(S.hunger===0) list=LINES.hungry;
    else if(S.mood<=1) list=LINES.pout;
    else if(S.mood===4&&S.hunger>=3) list=LINES.happy;
    else list=LINES.idle[b]||LINES.idle.hiru;
  }else{const v=LINES[key];list=Array.isArray(v)?v:(v[b]||[]);}
  const ok=list.filter(t=>S.you?true:t.indexOf('{you}')<0);
  const t=ok[Math.floor(rnd()*ok.length)]||'';
  return t.split('{you}').join(S.you||'');
}
