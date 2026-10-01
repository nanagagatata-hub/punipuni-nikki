// DOM に触れない純粋なルール（時間帯・時間経過・分岐）
import {H} from './data.js';

export function dayKey(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
export function isNight(d){const h=d.getHours();return h>=21||h<7;}
export function awakeMs(from,to){
  if(to<=from) return 0;
  from=Math.max(from,to-40*24*H);
  const STEP=5*60e3; let t=from, ms=0;
  while(t<to){const n=Math.min(t+STEP,to); if(!isNight(new Date(t))) ms+=n-t; t=n;}
  return ms;
}
export function nextForm(S){
  const p=S.p;
  if(S.stage===0)return 'puni';
  if(S.stage===1)return (p.ka+p.ki>=p.ge+p.ho)?'hoshi':'hana';
  const v=[p.ka,p.ki,p.ge,p.ho],mx=Math.max(...v),mn=Math.min(...v);
  if(mn>0&&mx/mn<=1.6)return 'niji';
  return ['hakase','kirara','morimori','pokapoka'][v.indexOf(mx)];
}
