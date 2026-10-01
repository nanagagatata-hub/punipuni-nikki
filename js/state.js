// 保存形式（DEF・sanitize・バックアップコード）
import {H,TASKS,FOODS,FORMS,ZORDER,ADULT_IDS} from './data.js';
export const KEY='punipuni-nikki-v1';
const CNT_KEYS=TASKS.filter(t=>t.id!=='hamigaki').map(t=>t.id).concat(['hamigaki_am','hamigaki_pm']);
const STAGE_FORM={1:'puni',2:'hoshi',3:'hakase',4:'hakase'};

export function DEF(){
  const now=Date.now();
  return {v:2,name:'ぷにちゃん',you:'',gen:1,stage:0,form:'egg',shiny:false,pts:0,p:{ka:0,ki:0,ge:0,ho:0},
    hunger:3,mood:3,hAcc:0,mAcc:0,zeroAcc:0,sick:false,cure:0,lastTick:now,petAt:0,boostUntil:0,
    adultAt:0,finalAt:0,finalSeenAt:0,inv:{},day:'',cnt:{},lessonDays:[6],
    zukan:[],shinySeen:[],history:[],sound:true};
}
/* 保存データ・復元コードは信頼しない：既知のキーと型だけを取り込む（__proto__等の混入対策）。v1 は v2 に移行する */
function num(v,d,min,max){v=Number(v);if(!isFinite(v))return d;return Math.min(max,Math.max(min,v));}
function int(v,d,min,max){return Math.floor(num(v,d,min,max));}
function str(v,max){return typeof v==='string'?v.replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,max):'';}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const known=(list,a)=>Array.isArray(a)?list.filter(f=>a.indexOf(f)>=0):[];
export function sanitize(o){
  const d=DEF();
  if(!o||typeof o!=='object'||(o.v!==1&&o.v!==2))throw new Error('bad');
  const v1=o.v===1, now=Date.now();
  d.name=str(o.name,8)||d.name;
  d.you=str(o.you,8);
  d.gen=int(o.gen,1,1,9999);
  d.stage=int(o.stage,0,0,4);
  const fs=Math.min(d.stage,3);
  d.form=(typeof o.form==='string'&&own(FORMS,o.form)&&FORMS[o.form].stage===fs)?o.form:(d.stage?STAGE_FORM[d.stage]:'egg');
  d.shiny=d.stage>=3&&o.shiny===true;
  d.pts=num(o.pts,0,0,1e6);
  const p=(o.p&&typeof o.p==='object')?o.p:{};
  ['ka','ki','ge','ho'].forEach(k=>{d.p[k]=num(p[k],0,0,1e6);});
  d.hunger=int(o.hunger,3,0,4);d.mood=int(o.mood,3,0,4);
  d.hAcc=num(o.hAcc,0,0,1e10);d.mAcc=num(o.mAcc,0,0,1e10);d.zeroAcc=num(o.zeroAcc,0,0,1e10);
  d.sick=o.sick===true;d.cure=int(o.cure,0,0,2);
  d.lastTick=num(o.lastTick,now,0,now);d.petAt=num(o.petAt,0,0,now);d.boostUntil=num(o.boostUntil,0,0,now+24*H);
  d.adultAt=num(o.adultAt,0,0,now);d.finalAt=num(o.finalAt,0,0,now);d.finalSeenAt=num(o.finalSeenAt,0,0,now);
  if(d.stage>=3&&!d.adultAt)d.adultAt=now;
  if(d.stage===4&&!d.finalAt)d.finalAt=now;
  if(d.stage<4){d.finalAt=0;d.finalSeenAt=0;}
  if(d.stage<3)d.adultAt=0;
  const inv=(o.inv&&typeof o.inv==='object')?o.inv:{};
  Object.keys(FOODS).forEach(k=>{const n=int(inv[k],0,0,999);if(n)d.inv[k]=n;});
  d.day=typeof o.day==='string'?o.day.slice(0,12):'';
  const cnt=(o.cnt&&typeof o.cnt==='object')?o.cnt:{};
  CNT_KEYS.forEach(k=>{const n=int(cnt[k],0,0,9);if(n)d.cnt[k]=n;});
  const days=v1?[o.lessonDay]:(Array.isArray(o.lessonDays)?o.lessonDays:[]);
  const ld=[];days.forEach(x=>{if(typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=6&&ld.indexOf(x)<0&&ld.length<2)ld.push(x);});
  d.lessonDays=ld.length?ld:[6];
  d.zukan=known(ZORDER,o.zukan);
  d.shinySeen=known(ADULT_IDS,o.shinySeen);
  d.history=(Array.isArray(o.history)?o.history:[]).filter(h=>h&&typeof h==='object'&&typeof h.f==='string'&&ADULT_IDS.indexOf(h.f)>=0)
    .slice(-200).map(h=>({f:h.f,n:str(h.n,8)||'ぷにちゃん',g:int(h.g,1,1,9999),s:h.s===true}));
  d.sound=o.sound!==false;
  return d;
}
export function encodeState(S){return 'PUNI2:'+btoa(unescape(encodeURIComponent(JSON.stringify(S))));}
export function decodeState(code){
  const raw=String(code).trim().replace(/^PUNI[12]:/,'');
  if(raw.length>40000||!/^[A-Za-z0-9+/=]+$/.test(raw))throw new Error('bad');
  return sanitize(JSON.parse(decodeURIComponent(escape(atob(raw)))));
}
