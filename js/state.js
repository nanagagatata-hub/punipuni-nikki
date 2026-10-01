// 保存形式（DEF・sanitize・バックアップコード）
import {H,FOODS,FORMS,ZORDER} from './data.js';
export const KEY='punipuni-nikki-v1';

export function DEF(){
  const now=Date.now();
  return {v:1,name:'ぷにちゃん',gen:1,stage:0,form:'egg',pts:0,p:{ka:0,ki:0,ge:0,ho:0},
    hunger:3,mood:3,hAcc:0,mAcc:0,sick:false,cure:0,lastCare:now,lastTick:now,
    inv:{},day:'',cnt:{},lessonDay:6,boostUntil:0,petAt:0,zukan:[]};
}
/* 保存データ・復元コードは信頼しない：既知のキーと型だけを取り込む（__proto__等の混入対策） */
function num(v,d,min,max){v=Number(v);if(!isFinite(v))return d;return Math.min(max,Math.max(min,v));}
export function sanitize(o){
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
export function encodeState(S){return 'PUNI1:'+btoa(unescape(encodeURIComponent(JSON.stringify(S))));}
export function decodeState(code){
  const raw=String(code).trim().replace(/^PUNI1:/,'');
  if(raw.length>20000||!/^[A-Za-z0-9+/=]+$/.test(raw))throw new Error('bad');
  return sanitize(JSON.parse(decodeURIComponent(escape(atob(raw)))));
}
