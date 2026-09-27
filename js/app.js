'use strict';
(function(){
const KEY='punipuni-nikki-v1';
const H=3600e3;
const TH=[0,3,10,25];
const STAGE=['たまご','あかちゃん','こども','おとな'];
const WD=['にちようび','げつようび','かようび','すいようび','もくようび','きんようび','どようび'];

const TASKS=[
  {id:'lesson', label:'ちゅうごくご れっすん', icon:'🧑‍🏫', food:'nikuman', limit:1},
  {id:'jishu',  label:'ちゅうごくご じしゅう', icon:'📖', food:'kotoba', limit:1},
  {id:'hamigaki',label:'はみがき', icon:'🪥', food:'ame', limit:2},
  {id:'yasai',  label:'おやさい', icon:'🥦', food:'soup', limit:3},
  {id:'ofuro',  label:'おふろ', icon:'🛁', food:'purin', limit:1}
];
const FOODS={
  nikuman:{name:'にくまん', icon:'🥟', pt:3, param:'ka', amt:3},
  kotoba:{name:'ことばのみ', icon:'🍒', pt:1, param:'ka', amt:1},
  ame:{name:'きらきらあめ', icon:'🍬', pt:1, param:'ki', amt:1},
  soup:{name:'やさいすーぷ', icon:'🥣', pt:1, param:'ge', amt:1},
  purin:{name:'あわあわぷりん', icon:'🍮', pt:1, param:'ho', amt:1}
};
const PARAMS=[['ka','🎓','かしこさ'],['ki','✨','きれい'],['ge','💪','げんき'],['ho','♨️','ほかほか']];
const FORMS={
  egg:{name:'たまご'},
  puni:{name:'ぷにぷに', color:'#FFD3E2', dark:'#EFA3BF', hint:'たまごから うまれるよ'},
  hoshi:{name:'ほしぷに', color:'#CFE0FF', dark:'#97B6EE', hint:'かしこさ と きれい を そだてると…'},
  hana:{name:'はなぷに', color:'#FFE9A8', dark:'#EDC766', hint:'げんき と ほかほか を そだてると…'},
  hakase:{name:'はかせぷに', color:'#D2C4FF', dark:'#A28FEE', hint:'かしこさ が いちばん だと…'},
  kirara:{name:'きららぷに', color:'#C4F0FA', dark:'#86D2E6', hint:'きれい が いちばん だと…'},
  morimori:{name:'もりもりぷに', color:'#C6EFC9', dark:'#86CF8E', hint:'げんき が いちばん だと…'},
  pokapoka:{name:'ぽかぽかぷに', color:'#FFD0B5', dark:'#EFA078', hint:'ほかほか が いちばん だと…'},
  niji:{name:'にじぷに', color:'#FFFFFF', dark:'#D9CBEF', hint:'ぜんぶ なかよく そだてると…'}
};
const ZORDER=['puni','hoshi','hana','hakase','kirara','morimori','pokapoka','niji'];
const WORDS=[
  ['你好','にーはお','こんにちは'],['谢谢','しぇしぇ','ありがとう'],['再见','ざいじぇん','ばいばい'],
  ['好吃','はおちー','おいしい'],['早上好','ざおしゃんはお','おはよう'],['晚安','わんあん','おやすみ'],
  ['苹果','ぴんぐお','りんご'],['猫','まお','ねこ'],['狗','ごう','いぬ'],
  ['加油','じゃーよう','がんばれ'],['我爱你','うぉーあいにー','だいすき'],['朋友','ぽんよう','ともだち']
];

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd=a=>a[Math.floor(Math.random()*a.length)];

function DEF(){
  const now=Date.now();
  return {v:1,name:'ぷにちゃん',gen:1,stage:0,form:'egg',pts:0,p:{ka:0,ki:0,ge:0,ho:0},
    hunger:3,mood:3,hAcc:0,mAcc:0,sick:false,cure:0,lastCare:now,lastTick:now,
    inv:{},day:'',cnt:{},lessonDay:6,boostUntil:0,petAt:0,zukan:[]};
}
/* 保存データ・復元コードは信頼しない：既知のキーと型だけを取り込む（__proto__等の混入対策） */
function num(v,d,min,max){v=Number(v);if(!isFinite(v))return d;return Math.min(max,Math.max(min,v));}
function sanitize(o){
  const d=DEF();
  if(!o||typeof o!=='object'||o.v!==1)throw new Error('bad');
  if(typeof o.name==='string'&&o.name.trim())d.name=o.name.trim().slice(0,8);
  d.gen=Math.floor(num(o.gen,1,1,9999));
  d.stage=Math.floor(num(o.stage,0,0,3));
  d.form=(typeof o.form==='string'&&Object.prototype.hasOwnProperty.call(FORMS,o.form))?o.form:'puni';
  if(d.stage===0)d.form='egg'; else if(d.form==='egg')d.form='puni';
  d.pts=num(o.pts,0,0,1e6);
  const p=(o.p&&typeof o.p==='object')?o.p:{};
  ['ka','ki','ge','ho'].forEach(k=>{d.p[k]=num(p[k],0,0,1e6);});
  d.hunger=Math.floor(num(o.hunger,3,0,4));d.mood=Math.floor(num(o.mood,3,0,4));
  d.hAcc=num(o.hAcc,0,0,1e10);d.mAcc=num(o.mAcc,0,0,1e10);
  d.sick=o.sick===true;d.cure=Math.floor(num(o.cure,0,0,2));
  const now=Date.now();
  d.lastCare=num(o.lastCare,now,0,now);d.lastTick=num(o.lastTick,now,0,now);
  d.petAt=num(o.petAt,0,0,now);d.boostUntil=num(o.boostUntil,0,0,now+24*H);
  const inv=(o.inv&&typeof o.inv==='object')?o.inv:{};
  Object.keys(FOODS).forEach(k=>{const n=Math.floor(num(inv[k],0,0,999));if(n)d.inv[k]=n;});
  if(typeof o.day==='string')d.day=o.day.slice(0,12);
  const cnt=(o.cnt&&typeof o.cnt==='object')?o.cnt:{};
  ['lesson','jishu','yasai','ofuro','hamigaki_am','hamigaki_pm'].forEach(k=>{const n=Math.floor(num(cnt[k],0,0,9));if(n)d.cnt[k]=n;});
  d.lessonDay=Math.floor(num(o.lessonDay,6,0,6));
  d.zukan=Array.isArray(o.zukan)?ZORDER.filter(f=>o.zukan.indexOf(f)>=0):[];
  return d;
}
function load(){
  try{const r=localStorage.getItem(KEY); if(r) return sanitize(JSON.parse(r));}catch(e){}
  return DEF();
}

function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

let S=load();
let bubble={ja:'',zh:''};
let lastInteract=Date.now();
let happyUntil=0;

function dayKey(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function ensureDay(){const k=dayKey(); if(S.day!==k){S.day=k;S.cnt={};}}
function isNightH(h){return h>=21||h<7;}
function awakeMs(from,to){
  if(to<=from) return 0;
  from=Math.max(from,to-40*24*H);
  const STEP=5*60e3; let t=from, ms=0;
  while(t<to){const n=Math.min(t+STEP,to); if(!isNightH(new Date(t).getHours())) ms+=n-t; t=n;}
  return ms;
}
function decay(now){
  if(S.stage===0){S.lastTick=now;return;}
  const a=awakeMs(S.lastTick,now);
  S.hAcc+=a; S.mAcc+=a;
  while(S.hAcc>=3*H){S.hAcc-=3*H;S.hunger=Math.max(0,S.hunger-1);}
  while(S.mAcc>=4*H){S.mAcc-=4*H;S.mood=Math.max(0,S.mood-1);}
  S.lastTick=now;
  if(!S.sick && awakeMs(S.lastCare,now)>=12*H){
    S.sick=true;S.cure=0;
    say('なんだか ぐあいが わるいよ… ごはん ちょうだい');
  }
}

/* ---------- drawing ---------- */
function starPts(cx,cy,R,r){
  let p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1));}return p.join(' ');
}
function sparkle(x,y,s,c){return `<path d="M${x} ${y-s} Q${x} ${y} ${x+s} ${y} Q${x} ${y} ${x} ${y+s} Q${x} ${y} ${x-s} ${y} Q${x} ${y} ${x} ${y-s}Z" fill="${c}"/>`;}
function eggSVG(pts){
  const crack=pts>=2?`<path d="M62 108 L76 98 L86 112 L98 96 L110 110 L122 98 L138 108" fill="none" stroke="#C993AE" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`:'';
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><ellipse cx="100" cy="186" rx="46" ry="7" fill="rgba(0,0,0,.08)"/>
  <ellipse cx="100" cy="112" rx="58" ry="72" fill="#FFF7FB" stroke="#F2B8CF" stroke-width="4"/>
  <circle cx="76" cy="80" r="10" fill="#FFD3E2"/><circle cx="127" cy="70" r="7" fill="#CFE0FF"/>
  <circle cx="121" cy="142" r="12" fill="#FFE9A8"/><circle cx="78" cy="150" r="8" fill="#C6EFC9"/>${crack}</svg>`;
}
const BODY='M100 40 C150 40 175 80 175 125 C175 165 145 180 100 180 C55 180 25 165 25 125 C25 80 50 40 100 40 Z';
function silSVG(form){
  const ears=form==='puni'?'':`<circle cx="58" cy="62" r="18" fill="var(--sil)"/><circle cx="142" cy="62" r="18" fill="var(--sil)"/>`;
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${ears}<path d="${BODY}" fill="var(--sil)"/><text x="100" y="138" text-anchor="middle" font-size="56" font-weight="900" fill="var(--card)">？</text></svg>`;
}
function faceSVG(face){
  const ink='#5B3A55',ey=108,ex=[78,122];let eyes='',mouth='',extra='';
  const st=`stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  let blushCol='#FF9EBB';
  if(face==='happy'){
    eyes=ex.map(x=>`<path d="M${x-8} ${ey+3} Q${x} ${ey-8} ${x+8} ${ey+3}" ${st}/>`).join('');
    mouth=`<path d="M89 124 Q100 142 111 124 Z" fill="#FF7FA0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  }else if(face==='sleep'){
    eyes=ex.map(x=>`<path d="M${x-8} ${ey} Q${x} ${ey+6} ${x+8} ${ey}" ${st}/>`).join('');
    mouth=`<ellipse cx="100" cy="130" rx="4" ry="3" fill="${ink}"/>`;
    extra=`<text x="150" y="62" font-size="22" font-weight="900" fill="${ink}" opacity=".55">z</text><text x="164" y="42" font-size="30" font-weight="900" fill="${ink}" opacity=".55">Z</text>`;
  }else if(face==='sick'){
    eyes=`<path d="M71 102 L84 108 L71 114" ${st}/><path d="M129 102 L116 108 L129 114" ${st}/>`;
    mouth=`<path d="M88 132 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" ${st} stroke-width="3"/>`;
    extra=`<path d="M152 78 q7 11 0 15 q-7 -4 0 -15Z" fill="#9FD3F5"/><path d="M66 88 h24 M110 88 h24" stroke="#9FB6E8" stroke-width="3" stroke-linecap="round"/>`;
    blushCol='#B9D8F2';
  }else if(face==='sad'){
    eyes=ex.map(x=>`<circle cx="${x}" cy="${ey+2}" r="5.5" fill="${ink}"/>`).join('');
    mouth=`<path d="M92 133 Q100 125 108 133" ${st} stroke-width="3.5"/>`;
  }else{
    eyes=ex.map(x=>`<circle cx="${x}" cy="${ey}" r="7.5" fill="${ink}"/><circle cx="${x+2.5}" cy="${ey-3}" r="2.6" fill="#fff"/>`).join('');
    mouth=`<path d="M92 127 Q100 135 108 127" ${st} stroke-width="3.5"/>`;
  }
  const blush=`<ellipse cx="60" cy="124" rx="10" ry="5.5" fill="${blushCol}" opacity=".75"/><ellipse cx="140" cy="124" rx="10" ry="5.5" fill="${blushCol}" opacity=".75"/>`;
  return blush+eyes+mouth+extra;
}
function accSVG(form){
  switch(form){
    case 'puni': return '';
    case 'hoshi': return `<polygon points="${starPts(100,28,17,7.5)}" fill="#FFD84D" stroke="#E4B32E" stroke-width="2.5" stroke-linejoin="round"/>`;
    case 'hana': return `<path d="M100 44 V22" stroke="#7CC48A" stroke-width="4" stroke-linecap="round"/>`+
      [0,72,144,216,288].map(a=>{const r=a*Math.PI/180;return `<circle cx="${(100+9*Math.cos(r)).toFixed(1)}" cy="${(18+9*Math.sin(r)).toFixed(1)}" r="7" fill="#FF9EBB"/>`;}).join('')+`<circle cx="100" cy="18" r="5.5" fill="#FFD84D"/>`;
    case 'hakase': return `<circle cx="78" cy="108" r="14" fill="none" stroke="#5B3A55" stroke-width="3"/><circle cx="122" cy="108" r="14" fill="none" stroke="#5B3A55" stroke-width="3"/><path d="M92 108 H108" stroke="#5B3A55" stroke-width="3"/>`+
      `<rect x="80" y="34" width="40" height="12" rx="3" fill="#4B3B6B"/><polygon points="100,14 144,30 100,46 56,30" fill="#4B3B6B"/><path d="M100 30 L138 34 L138 52" stroke="#FFD84D" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="138" cy="55" r="4.5" fill="#FFD84D"/>`;
    case 'kirara': return `<path d="M74 46 L81 24 L91 39 L100 16 L109 39 L119 24 L126 46 Z" fill="#FFD84D" stroke="#E0A92E" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="36" r="4.5" fill="#FF8FB3"/>`+
      sparkle(30,62,11,'#8FD6E8')+sparkle(172,76,9,'#FF9EBB')+sparkle(168,170,8,'#FFD84D');
    case 'morimori': return `<path d="M100 44 C100 30 110 18 130 15 C128 32 117 42 100 44 Z" fill="#6CC47A" stroke="#4E9E5C" stroke-width="2.5"/><path d="M100 44 C99 34 92 26 78 24 C80 36 88 43 100 44 Z" fill="#8DD394" stroke="#4E9E5C" stroke-width="2.5"/>`;
    case 'pokapoka': return `<path d="M70 50 Q100 26 130 50 L126 60 Q100 42 74 60 Z" fill="#FFFFFF" stroke="#EFA078" stroke-width="2.5" stroke-linejoin="round"/><path d="M84 40 v10 M100 35 v10 M116 40 v10" stroke="#FFB7A0" stroke-width="3" stroke-linecap="round"/>`+
      `<path d="M34 58 q-8 -9 0 -17 q8 -8 0 -17" stroke="#EFA078" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/><path d="M168 64 q-8 -9 0 -17 q8 -8 0 -17" stroke="#EFA078" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/>`;
    case 'niji': return `<polygon points="${starPts(100,28,14,6)}" fill="#FFD84D" stroke="#E4B32E" stroke-width="2"/>`;
  }
  return '';
}
function petSVG(form,face,opt){
  opt=opt||{};
  if(form==='egg') return eggSVG(opt.pts||0);
  if(opt.sil) return silSVG(form);
  const F=FORMS[form],col=F.color,dk=F.dark,baby=form==='puni';
  let back='';
  if(form==='niji'){
    back=['#FF9AA2','#FFD28C','#FFF3A0','#B5EAD7','#A7C7FF','#CDB4FF'].map((c,i)=>{const r=80-i*7;return `<path d="M${100-r} 126 A${r} ${r} 0 0 1 ${100+r} 126" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`;}).join('');
  }
  const ears=baby?'':`<circle cx="58" cy="62" r="18" fill="${col}" stroke="${dk}" stroke-width="3"/><circle cx="58" cy="62" r="8" fill="#FFB7CC"/><circle cx="142" cy="62" r="18" fill="${col}" stroke="${dk}" stroke-width="3"/><circle cx="142" cy="62" r="8" fill="#FFB7CC"/>`;
  const tuft=baby?`<path d="M100 42 q-9 -16 5 -21 q11 -2 7 9" fill="none" stroke="${dk}" stroke-width="4" stroke-linecap="round"/>`:'';
  const body=`<ellipse cx="33" cy="132" rx="11" ry="15" fill="${col}" stroke="${dk}" stroke-width="3" transform="rotate(25 33 132)"/><ellipse cx="167" cy="132" rx="11" ry="15" fill="${col}" stroke="${dk}" stroke-width="3" transform="rotate(-25 167 132)"/>
    <ellipse cx="74" cy="180" rx="18" ry="9" fill="${dk}"/><ellipse cx="126" cy="180" rx="18" ry="9" fill="${dk}"/>
    <path d="${BODY}" fill="${col}" stroke="${dk}" stroke-width="3.5"/><ellipse cx="100" cy="150" rx="40" ry="24" fill="#fff" opacity=".5"/>`;
  const inner=ears+tuft+body+faceSVG(face)+accSVG(form);
  const g=baby?`<g transform="translate(100 118) scale(.84) translate(-100 -118)">${inner}</g>`:inner;
  return `<svg viewBox="0 0 200 200" aria-hidden="true"><ellipse cx="100" cy="190" rx="60" ry="7" fill="rgba(0,0,0,.08)"/>${back}${g}</svg>`;
}

/* ---------- speech & fx ---------- */
function say(ja,zh){bubble={ja:ja,zh:zh||''};renderBubble();}
function sayWord(pre){const w=rnd(WORDS);say(`${pre}「${w[1]}」は ちゅうごくごで「${w[2]}」だよ！`,w[0]);}
function speak(text,lang){
  try{if(!('speechSynthesis' in window)||!text)return;const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.9;speechSynthesis.speak(u);}catch(e){}
}
function fxBurst(icon){
  const r=$('#pet').getBoundingClientRect();
  for(let i=0;i<5;i++){
    const s=document.createElement('span');s.className='fx';s.textContent=icon;
    s.style.left=(r.left+r.width/2-17+(Math.random()*80-40))+'px';
    s.style.top=(r.top+r.height*.45)+'px';
    s.style.setProperty('--dx',(Math.random()*120-60)+'px');
    s.style.animationDelay=(i*.08)+'s';
    document.body.appendChild(s);setTimeout(()=>s.remove(),1600);
  }
}
let toastT;
function toast(msg){
  let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{t.hidden=true;},2400);
}

/* ---------- modal ---------- */
let modalHandler=null,modalDismiss=false;
function openModal(html,handler,dismiss){
  $('#sheet').innerHTML=html;modalHandler=handler;modalDismiss=!!dismiss;$('#modal').hidden=false;
  const b=$('#sheet [data-act]');if(b)b.focus({preventScroll:true});
}
function closeModal(){$('#modal').hidden=true;$('#sheet').innerHTML='';modalHandler=null;}
$('#sheet').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&modalHandler)modalHandler(b.dataset.act,b);});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')&&modalDismiss)closeModal();});

/* ---------- logic ---------- */
function taskState(t){
  const now=new Date();
  if(t.id==='lesson'&&now.getDay()!==S.lessonDay) return {ok:false,off:true};
  if(t.id==='hamigaki'){const slot=now.getHours()<15?'am':'pm';return {ok:!(S.cnt['hamigaki_'+slot]),slot:slot};}
  const used=S.cnt[t.id]||0;return {ok:used<t.limit,used:used};
}
function confirmTask(id){
  const t=TASKS.find(x=>x.id===id);const st=taskState(t);if(!st.ok)return;
  const label=t.id==='hamigaki'?(st.slot==='am'?'あさの はみがき':'よるの はみがき'):t.label;
  openModal(`<div class="center"><div class="big">${t.icon}</div><p class="q">${label} できた？</p>
    <div class="btns"><button class="btn" data-act="yes">できた！</button><button class="btn ghost" data-act="no">まだ</button></div></div>`,
    act=>{closeModal();if(act==='yes')report(t);},true);
}
function report(t){
  ensureDay();const st=taskState(t);if(!st.ok)return;
  const key=t.id==='hamigaki'?'hamigaki_'+st.slot:t.id;
  S.cnt[key]=(S.cnt[key]||0)+1;
  S.inv[t.food]=(S.inv[t.food]||0)+1;
  const f=FOODS[t.food];
  if(t.id==='lesson'){S.boostUntil=Date.now()+24*H;say(`すごい！${f.name} を もらったよ。ぐんぐんたいむ が はじまった！`);}
  else say(`${f.name} を もらったよ！した の ${f.icon} を おして あげてね`);
  lastInteract=Date.now();fxBurst(f.icon);save();render();
}
function feed(fid){
  if(!(S.inv[fid]>0))return;
  const f=FOODS[fid],now=Date.now();
  S.inv[fid]--;S.lastCare=now;lastInteract=now;
  if(S.stage>0){S.hunger=Math.min(4,S.hunger+(fid==='nikuman'?2:1));if(fid==='purin')S.mood=Math.min(4,S.mood+1);}
  if(S.sick){
    S.cure++;
    if(S.cure>=2){S.sick=false;S.cure=0;say('げんきに なったよ！ありがとう！');happyUntil=now+2500;fxBurst('🌈');}
    else say('ありがとう… もう ひとつ たべたら なおりそう');
    save();render();return;
  }
  const mul=now<S.boostUntil?1.5:1;
  S.pts+=f.pt*mul;S.p[f.param]+=f.amt*mul;
  fxBurst(f.icon);happyUntil=now+2500;
  if(S.stage===0) say('たまごが ぽかぽか してきた…！');
  else if(fid==='kotoba'||fid==='nikuman') sayWord('もぐもぐ！');
  else say(rnd(['おいしい！','もぐもぐ… しあわせ〜','ありがとう！だいすき！','ぱくぱく！おなか いっぱい']));
  save();render();setTimeout(render,2600);
  checkEvolve();
}
function nextForm(){
  const p=S.p;
  if(S.stage===0)return 'puni';
  if(S.stage===1)return (p.ka+p.ki>=p.ge+p.ho)?'hoshi':'hana';
  const v=[p.ka,p.ki,p.ge,p.ho],mx=Math.max(...v),mn=Math.min(...v);
  if(mn>0&&mx/mn<=1.6)return 'niji';
  return ['hakase','kirara','morimori','pokapoka'][v.indexOf(mx)];
}
function checkEvolve(){
  if(S.stage<3&&S.pts>=TH[S.stage+1]){
    const f=nextForm();S.stage++;S.form=f;
    if(S.zukan.indexOf(f)<0)S.zukan.push(f);
    if(S.stage===1){const n=Date.now();S.lastCare=n;S.lastTick=n;S.hunger=3;S.mood=3;S.hAcc=0;S.mAcc=0;}
    save();showEvolve();
  }
}
function showEvolve(){
  const msg=S.stage===1?'たまごが かえった！':S.stage===3?'おとなに なった！':'しんか した！';
  openModal(`<div class="center"><div class="evo">${petSVG(S.form,'happy')}</div><p class="q">${msg}</p>
    <p class="sub">${esc(S.name)} は「${FORMS[S.form].name}」に なったよ</p>
    <div class="btns"><button class="btn" data-act="ok">やったー！</button></div></div>`,
    ()=>{closeModal();say(S.stage===3?'おとなに なったよ！ずかん を みてね':'よろしくね！いっぱい あそぼう');render();checkEvolve();});
}
function petTap(){
  const now=Date.now();lastInteract=now;
  const el=$('#pet');el.classList.remove('wobble');void el.offsetWidth;el.classList.add('wobble');
  if(S.stage===0){say('ころころ… なかで なにか うごいてる！');return;}
  if(S.sick){say('うーん… ごはん たべたら げんきに なるかも');render();return;}
  if(now-S.petAt>30*60e3){S.mood=Math.min(4,S.mood+1);S.petAt=now;save();}
  fxBurst('💗');happyUntil=now+2500;
  if(S.stage>=2&&Math.random()<.5)sayWord('えへへ。');
  else say(rnd(['えへへ、くすぐったい！','なでなで うれしいな','いっしょに いると たのしいね']));
  render();setTimeout(render,2600);
}
function nextEgg(){
  openModal(`<div class="center"><div class="big">🥚</div><p class="q">つぎの たまご を そだてる？</p>
    <p class="sub">${esc(S.name)} は ずかん に のこるよ。たび に おくりだそう</p>
    <div class="btns"><button class="btn" data-act="yes">そだてる！</button><button class="btn ghost" data-act="no">まだ いっしょに いる</button></div></div>`,
    act=>{closeModal();if(act!=='yes')return;
      const keep={gen:S.gen+1,zukan:S.zukan,lessonDay:S.lessonDay,inv:S.inv,day:S.day,cnt:S.cnt,boostUntil:S.boostUntil};
      S=Object.assign(DEF(),keep);save();say('あたらしい たまご が きたよ！あたためて あげよう');render();},true);
}
function openZukan(){
  const cells=ZORDER.map(f=>{const seen=S.zukan.indexOf(f)>=0;
    return `<div class="zc">${petSVG(f,'normal',{sil:!seen})}<b>${seen?FORMS[f].name:'？？？'}</b><span>${seen?'':FORMS[f].hint}</span></div>`;}).join('');
  openModal(`<p class="q">ずかん（${S.zukan.length} / ${ZORDER.length}）</p><div class="zgrid">${cells}</div>
    <div class="btns"><button class="btn ghost" data-act="close">とじる</button></div>`,()=>closeModal(),true);
}
function encodeState(){return 'PUNI1:'+btoa(unescape(encodeURIComponent(JSON.stringify(S))));}
function decodeState(code){
  const raw=String(code).trim().replace(/^PUNI1:/,'');
  if(raw.length>20000||!/^[A-Za-z0-9+/=]+$/.test(raw))throw new Error('bad');
  return sanitize(JSON.parse(decodeURIComponent(escape(atob(raw)))));
}
function openSettings(){
  const wd=WD.map((w,i)=>`<option value="${i}" ${i===S.lessonDay?'selected':''}>${w}</option>`).join('');
  openModal(`<h3>おうちの方の設定</h3>
    <label class="fl">なまえ（8文字まで）<input id="nameIn" maxlength="8" value="${esc(S.name)}"></label>
    <label class="fl">中国語レッスンの曜日<select id="dayIn">${wd}</select></label>
    <div class="btns"><button class="btn small" data-act="save">保存する</button></div>
    <h3>バックアップ</h3>
    <p class="sub">データはこの端末のブラウザ内に保存されています。ブラウザのデータ削除などで消えることがあるため、ときどきコードを控えておくと安心です。</p>
    <div class="btns"><button class="btn small ghost" data-act="export">コードを表示・コピー</button></div>
    <textarea id="codeOut" class="codeout" readonly hidden></textarea>
    <label class="fl">コードから復元<textarea id="codeIn" placeholder="ここにコードを貼り付け"></textarea></label>
    <div class="btns"><button class="btn small ghost" data-act="import">復元する</button></div>
    <h3>リセット</h3>
    <div class="btns"><button class="btn small danger" data-act="reset">最初からやり直す</button></div>
    <div class="btns"><button class="btn ghost" data-act="close">閉じる</button></div>`,
    (act,btn)=>{
      if(act==='close'){closeModal();return;}
      if(act==='save'){const n=$('#nameIn').value.trim();if(n)S.name=n;S.lessonDay=+$('#dayIn').value;save();render();toast('保存しました');}
      if(act==='export'){const ta=$('#codeOut');ta.value=encodeState();ta.hidden=false;ta.select();
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(()=>toast('コピーしました'),()=>toast('表示されたコードを長押しでコピーしてください'));}
        else toast('表示されたコードを長押しでコピーしてください');}
      if(act==='import'){try{S=decodeState($('#codeIn').value);save();closeModal();say('おかえり！データを もどしたよ');render();toast('復元しました');}catch(e){toast('コードが正しくありません。全体をコピーできているか確認してください');}}
      if(act==='reset'){if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='本当に消す？もう一度タップ';return;}
        S=DEF();save();closeModal();say('あたらしい たまご が きたよ！');render();toast('リセットしました');}
    },true);
}

/* ---------- render ---------- */
function renderBubble(){$('#bubbleText').textContent=bubble.ja;$('#bubbleZh').textContent=bubble.zh;$('#bubbleZh').hidden=!bubble.zh;}
function icons(ic,n){let s='';for(let i=0;i<4;i++)s+=`<span class="gi ${i<n?'on':''}">${ic}</span>`;return s;}
/* なまえ を えにっき の マス に 1もじずつ（textContent のみ・innerHTML は つかわない） */
function renderName(){
  const el=$('#petName');if(el.getAttribute('aria-label')===S.name)return;
  el.textContent='';el.setAttribute('aria-label',S.name);
  // 「👨‍👩‍👧」の ような くみあわせ えもじ も 1マス に（Intl.Segmenter が ない ふるい たんまつ は コードポイント で わける）
  const chars=typeof Intl!=='undefined'&&Intl.Segmenter?Array.from(new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(S.name),x=>x.segment):Array.from(S.name);
  chars.forEach(c=>{const m=document.createElement('span');m.className='masu';m.setAttribute('aria-hidden','true');m.textContent=c;el.appendChild(m);});
}
function render(){
  ensureDay();const now=Date.now();
  renderName();$('#genLabel').textContent=S.gen+'だいめ';
  const td=new Date();$('#dateLine').textContent=(td.getMonth()+1)+'がつ'+td.getDate()+'にち '+WD[td.getDay()];
  const sleeping=S.stage>0&&isNightH(new Date().getHours())&&now-lastInteract>120000;
  let face='normal';
  if(sleeping)face='sleep';else if(S.sick)face='sick';else if(now<happyUntil)face='happy';
  else if(S.stage>0&&(S.hunger===0||S.mood===0))face='sad';
  $('#pet').innerHTML=petSVG(S.form,face,{pts:S.pts});
  $('#screen').classList.toggle('night',sleeping);
  $('#gauges').innerHTML=S.stage===0?`<span class="glabel">たまご を あたためよう</span>`:
    `<div class="gauge"><span class="glabel">おなか</span>${icons('🍙',S.hunger)}</div><div class="gauge"><span class="glabel">ごきげん</span>${icons('🌸',S.mood)}</div>`;
  let b='';
  if(now<S.boostUntil)b+=`<span class="badge">🚀 ぐんぐんたいむ あと ${Math.ceil((S.boostUntil-now)/H)}じかん</span>`;
  if(S.sick)b+=`<span class="badge sick">🤒 びょうき：ごはん あと ${2-S.cure}こ で なおる</span>`;
  if(sleeping)b+=`<span class="badge">💤 ねんね ちゅう</span>`;
  $('#badges').innerHTML=b;
  if(S.stage<3){const pct=Math.min(100,(S.pts-TH[S.stage])/(TH[S.stage+1]-TH[S.stage])*100);
    $('#growth').innerHTML=`${STAGE[S.stage]}　つぎ の しんか まで<div class="bar"><i data-w="${pct}"></i></div>`;}
  else $('#growth').innerHTML=`おとな　ずかん に のったよ<div class="bar"><i data-w="100"></i></div>`;
  const foods=Object.keys(FOODS).filter(k=>S.inv[k]>0);
  $('#tray').innerHTML=foods.length?foods.map(k=>`<button class="food" data-food="${k}" aria-label="${FOODS[k].name} を あげる">${FOODS[k].icon}<span class="n">${S.inv[k]}</span></button>`).join(''):
    `<p class="empty">できたこと を おしえると<br>ごはん が もらえるよ</p>`;
  $('#tasks').innerHTML=TASKS.map(t=>{
    const st=taskState(t);let dots='',tf=st.ok?FOODS[t.food].icon:'💮';
    if(t.id==='lesson'){dots=st.off?`${WD[S.lessonDay]} だけ`:(st.ok?'きょうは れっすんの ひ！ ごはん 3ばい':'できたね！');if(st.off)tf='📅';}
    else if(t.id==='hamigaki'){dots=`<span class="dot ${S.cnt.hamigaki_am?'on':''}"></span>あさ <span class="dot ${S.cnt.hamigaki_pm?'on':''}"></span>よる`;}
    else{for(let i=0;i<t.limit;i++)dots+=`<span class="dot ${i<(S.cnt[t.id]||0)?'on':''}"></span>`;}
    return `<button class="task${st.off?' off':(st.ok?'':' done')}" data-task="${t.id}" ${st.ok?'':'disabled'}><span class="ti">${t.icon}</span><span><span class="tl">${t.label}</span><span class="td">${dots}</span></span><span class="tf">${tf}</span></button>`;
  }).join('');
  const mx=Math.max(10,...PARAMS.map(p=>S.p[p[0]]));
  $('#params').innerHTML=PARAMS.map(p=>`<div class="prow"><span>${p[1]}</span><span>${p[2]}</span><div class="bar"><i data-w="${S.p[p[0]]/mx*100}"></i></div><b>${Math.floor(S.p[p[0]])}</b></div>`).join('');
  $('#nextEggBtn').hidden=S.stage!==3;
  document.querySelectorAll('[data-w]').forEach(el=>{el.style.width=Math.max(0,Math.min(100,+el.dataset.w||0))+'%';});
  renderBubble();
}

/* ---------- events ---------- */
$('#tasks').addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(b&&!b.disabled)confirmTask(b.dataset.task);});
$('#tray').addEventListener('click',e=>{const b=e.target.closest('[data-food]');if(b)feed(b.dataset.food);});
$('#pet').addEventListener('click',petTap);
$('#zukanBtn').addEventListener('click',openZukan);
$('#nextEggBtn').addEventListener('click',nextEgg);
$('#speakBtn').addEventListener('click',()=>{try{speechSynthesis.cancel();}catch(e){}speak(bubble.ja,'ja-JP');speak(bubble.zh,'zh-CN');});
let holdT=null,held=false;
const gear=$('#gear');
gear.addEventListener('pointerdown',()=>{held=false;holdT=setTimeout(()=>{held=true;openSettings();},1000);});
['pointerup','pointerleave','pointercancel'].forEach(ev=>gear.addEventListener(ev,()=>clearTimeout(holdT)));
gear.addEventListener('click',()=>{if(!held)toast('おうちの ひと は ながおし してね');});
gear.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(!document.hidden){decay(Date.now());save();render();}});

/* ---------- start ---------- */
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(()=>{});}
decay(Date.now());
if(S.sick)say('なんだか ぐあいが わるいよ… ごはん ちょうだい');
else if(S.stage===0)say('たまご を あたためよう。できたこと を おしえてね！');
else say(rnd(['おかえり！きょうも いっしょに がんばろうね','あいたかったよ！','きょうは なにが できたかな？']));
save();render();
setInterval(()=>{decay(Date.now());save();render();},30000);
})();
