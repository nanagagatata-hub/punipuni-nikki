// キャラクターの SVG 描画
import {FORMS} from './data.js';

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
  const ears=FORMS[form].stage===1?'':`<circle cx="58" cy="62" r="18" fill="var(--sil)"/><circle cx="142" cy="62" r="18" fill="var(--sil)"/>`;
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
  }else if(face==='sparkle'||face==='drool'||face==='shy'||face==='hug'){
    eyes=ex.map(x=>`<path d="M${x-8} ${ey+3} Q${x} ${ey-8} ${x+8} ${ey+3}" ${st}/>`).join('');
    mouth=face==='shy'?`<path d="M94 128 Q100 133 106 128" ${st} stroke-width="3"/>`:`<path d="M88 124 Q100 144 112 124 Z" fill="#FF7FA0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
    if(face==='sparkle') extra=sparkle(58,92,7,'#FFD84D')+sparkle(146,90,6,'#FFD84D');
    if(face==='drool') extra=`<path d="M110 132 q4 10 0 14 q-4 -4 0 -14Z" fill="#9FD3F5"/>`;
    if(face==='shy'||face==='hug') blushCol='#FF7FA0';
    if(face==='hug') extra=`<path d="M148 70 c-6 -8 -16 0 -8 8 l8 8 l8 -8 c8 -8 -2 -16 -8 -8Z" fill="#FF7FA0"/>`;
  }else if(face==='pout'){
    eyes=ex.map(x=>`<circle cx="${x}" cy="${ey+2}" r="6.5" fill="${ink}"/><path d="M${x-9} ${ey-5} L${x+9} ${ey-3}" ${st} stroke-width="3.5"/>`).join('');
    mouth=`<path d="M94 130 q6 -6 12 0" ${st} stroke-width="3.5"/><circle cx="138" cy="122" r="12" fill="#FFB7CC" opacity=".8"/>`;
  }else if(face==='tears'){
    eyes=ex.map(x=>`<circle cx="${x}" cy="${ey+2}" r="6" fill="${ink}"/><circle cx="${x+2}" cy="${ey}" r="2" fill="#fff"/>`).join('');
    mouth=`<path d="M90 134 q5 -6 10 0 q5 6 10 0" ${st} stroke-width="3"/>`;
    extra=`<path d="M72 116 q-4 12 0 16 q4 -4 0 -16Z M128 116 q-4 12 0 16 q4 -4 0 -16Z" fill="#9FD3F5"/>`;
  }else if(face==='hungry'){
    eyes=ex.map(x=>`<circle cx="${x}" cy="${ey-2}" r="7" fill="${ink}"/><circle cx="${x+2}" cy="${ey-6}" r="2.5" fill="#fff"/>`).join('');
    mouth=`<ellipse cx="100" cy="131" rx="5" ry="6" fill="#FF7FA0" stroke="${ink}" stroke-width="3"/>`;
  }else if(face==='giggle'){
    eyes=`<path d="M70 102 L82 108 L70 114" ${st}/><path d="M130 102 L118 108 L130 114" ${st}/>`;
    mouth=`<path d="M86 122 Q100 146 114 122 Z" fill="#FF7FA0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  }else if(face==='squint'){
    eyes=ex.map(x=>`<path d="M${x-8} ${ey} Q${x} ${ey-5} ${x+8} ${ey}" ${st}/>`).join('');
    mouth=`<path d="M92 127 Q100 134 108 127" ${st} stroke-width="3.5"/>`;
  }else if(face==='dizzy'){
    eyes=ex.map(x=>`<path d="M${x} ${ey} m-1 0 a2 2 0 1 1 3 0 a4 4 0 1 1 -6 0 a6 6 0 1 1 9 0" ${st} stroke-width="2.5"/>`).join('');
    mouth=`<path d="M88 132 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" ${st} stroke-width="3"/>`;
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
    case 'shizuku': return `<path d="M100 14 C108 28 114 34 114 42 a14 14 0 0 1 -28 0 C86 34 92 28 100 14Z" fill="#9FD8F7" stroke="#6FB6E0" stroke-width="2.5"/><ellipse cx="95" cy="38" rx="3" ry="5" fill="#fff" opacity=".8"/>`;
    case 'koro': return `<path d="M70 48 Q100 6 130 48 Z" fill="#C98E5A" stroke="#A06A3C" stroke-width="2.5" stroke-linejoin="round"/><path d="M76 44 h48 M82 34 h36" stroke="#A06A3C" stroke-width="2" opacity=".6"/><path d="M100 18 v-8" stroke="#A06A3C" stroke-width="4" stroke-linecap="round"/>`;
    case 'moko': return [[60,52],[80,40],[100,36],[120,40],[140,52]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="#FBF4FF" stroke="#C9A8EC" stroke-width="2.5"/>`).join('');
    case 'shabon': return [[30,56,13],[170,48,10],[178,86,7],[22,94,6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#E6FBFF" fill-opacity=".55" stroke="#8FD3D3" stroke-width="2"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.25}" fill="#fff"/>`).join('');
    case 'kumo': return `<g fill="#FFFFFF" stroke="#B9BEDC" stroke-width="2.5"><circle cx="80" cy="36" r="14"/><circle cx="120" cy="36" r="14"/><circle cx="100" cy="26" r="18"/></g><path d="M68 44 H132" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>`;
    case 'tsukimi': return `<path d="M136 22 a18 18 0 1 0 12 30 a14 14 0 1 1 -12 -30Z" fill="#FFE07A" stroke="#E4B32E" stroke-width="2"/><path d="M84 42 l-16 -10 v20 Z M84 42 l16 -10 v20 Z" fill="#B3A6EC" stroke="#8C7CD6" stroke-width="2" stroke-linejoin="round"/><circle cx="84" cy="42" r="5" fill="#8C7CD6"/>`;
    case 'bouken': return `<ellipse cx="100" cy="44" rx="56" ry="9" fill="#C9A36A" stroke="#9C7A45" stroke-width="2.5"/><path d="M68 44 Q70 16 100 16 Q130 16 132 44 Z" fill="#D9B77E" stroke="#9C7A45" stroke-width="2.5"/><path d="M70 38 H130" stroke="#7DA35A" stroke-width="6"/>`+sparkle(164,150,8,'#FFD84D');
    case 'yumemi': return `<path d="M64 48 Q84 8 128 18 Q150 24 158 50" fill="#A8A0E0" stroke="#7F76C6" stroke-width="2.5"/><path d="M64 48 Q100 36 136 48" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/><circle cx="160" cy="54" r="9" fill="#FFFFFF" stroke="#7F76C6" stroke-width="2"/><polygon points="${starPts(92,30,7,3)}" fill="#FFE07A"/>`;
    case 'marin': return `<path d="M64 48 Q66 18 100 16 Q134 18 136 48 Z" fill="#FFFFFF" stroke="#4E8FD0" stroke-width="3" stroke-linejoin="round"/><path d="M66 40 Q100 32 134 40" stroke="#4E8FD0" stroke-width="6" fill="none"/><path d="M100 22 v-6" stroke="#4E8FD0" stroke-width="5" stroke-linecap="round"/><path d="M28 150 v14 M22 154 h12 M22 162 q6 6 12 0" stroke="#4E8FD0" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'keki': return `<rect x="74" y="28" width="52" height="18" rx="6" fill="#FFF6E8" stroke="#F0A9C0" stroke-width="2.5"/><path d="M74 34 q6.5 6 13 0 q6.5 6 13 0 q6.5 6 13 0 q6.5 6 13 0" stroke="#FF9EBB" stroke-width="3" fill="none"/><path d="M100 26 c-8 -2 -10 -14 0 -16 c10 2 8 14 0 16Z" fill="#FF6F8E"/><path d="M96 12 l4 -5 l4 5" stroke="#6CC47A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    case 'ohisama': return [0,30,60,90,120,150,180,210,240,270,300,330].map(a=>{const r=a*Math.PI/180;return `<path d="M${(100+30*Math.cos(r)).toFixed(1)} ${(30+30*Math.sin(r)).toFixed(1)} L${(100+40*Math.cos(r)).toFixed(1)} ${(30+40*Math.sin(r)).toFixed(1)}" stroke="#F7B733" stroke-width="5" stroke-linecap="round"/>`;}).join('')+`<circle cx="100" cy="30" r="22" fill="#FFD84D" stroke="#F2C55C" stroke-width="2.5"/>`;
    case 'niji': return `<polygon points="${starPts(100,28,14,6)}" fill="#FFD84D" stroke="#E4B32E" stroke-width="2"/>`;
  }
  return '';
}
const RAINBOW=['#FFB3C7','#FFD9A8','#FFF2A8','#C2F0D6','#BCD8FF','#DCC8FF'];
export function petSVG(form,face,opt){
  opt=opt||{};
  if(form==='egg') return eggSVG(opt.pts||0);
  if(opt.sil) return silSVG(form);
  const F=FORMS[form],dk=F.dark,baby=F.stage===1;
  let defs='',col=F.color;
  if(opt.shiny){
    const id='rb-'+form;col=`url(#${id})`;
    defs=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${RAINBOW.map((c,i)=>`<stop offset="${(i/(RAINBOW.length-1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
  }
  let back='';
  if(form==='niji'){
    back=['#FF9AA2','#FFD28C','#FFF3A0','#B5EAD7','#A7C7FF','#CDB4FF'].map((c,i)=>{const r=80-i*7;return `<path d="M${100-r} 126 A${r} ${r} 0 0 1 ${100+r} 126" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`;}).join('');
  }
  const ears=baby?'':`<circle cx="58" cy="62" r="18" fill="${col}" stroke="${dk}" stroke-width="3"/><circle cx="58" cy="62" r="8" fill="#FFB7CC"/><circle cx="142" cy="62" r="18" fill="${col}" stroke="${dk}" stroke-width="3"/><circle cx="142" cy="62" r="8" fill="#FFB7CC"/>`;
  const tuft=form==='puni'?`<path d="M100 42 q-9 -16 5 -21 q11 -2 7 9" fill="none" stroke="${dk}" stroke-width="4" stroke-linecap="round"/>`:'';
  const arm=(x,y,r)=>`<ellipse cx="${x}" cy="${y}" rx="11" ry="15" fill="${col}" stroke="${dk}" stroke-width="3" transform="rotate(${r} ${x} ${y})"/>`;
  const arms=opt.arms==='up'?arm(30,98,-35)+arm(170,98,35):'';
  const armsFront=opt.arms==='belly'?arm(78,146,60)+arm(122,146,-60):'';
  const body=(opt.arms==='up'||opt.arms==='belly'?'':arm(33,132,25)+arm(167,132,-25))+arms+`
    <ellipse cx="74" cy="180" rx="18" ry="9" fill="${dk}"/><ellipse cx="126" cy="180" rx="18" ry="9" fill="${dk}"/>
    <path d="${BODY}" fill="${col}" stroke="${dk}" stroke-width="3.5"/><ellipse cx="100" cy="150" rx="40" ry="24" fill="#fff" opacity=".5"/>`+armsFront;
  /* さいごのすがた：体のうしろの パステルの虹のオーラ＋きらきら（天国を連想させる羽・光の輪は使わない） */
  if(opt.final){
    back=`<ellipse cx="100" cy="114" rx="94" ry="88" fill="#FFF8E8" opacity=".6"/>`+
      RAINBOW.map((c,i)=>`<ellipse cx="100" cy="114" rx="${92-i*5}" ry="${86-i*5}" fill="none" stroke="${c}" stroke-width="5" opacity=".85"/>`).join('')+back;
  }
  const think=opt.think?`<circle cx="150" cy="58" r="4" fill="#fff" stroke="#D9CCD6" stroke-width="2"/><circle cx="160" cy="44" r="6" fill="#fff" stroke="#D9CCD6" stroke-width="2"/><ellipse cx="176" cy="24" rx="20" ry="17" fill="#fff" stroke="#D9CCD6" stroke-width="2"/><text x="176" y="32" text-anchor="middle" font-size="20">${opt.think}</text>`:'';
  const fin=opt.final?sparkle(22,70,8,'#FFE08A')+sparkle(180,66,9,'#FFE08A')+sparkle(170,160,6,'#FFFFFF'):'';
  const shine=opt.shiny?sparkle(26,40,10,'#FFD84D')+sparkle(176,112,8,'#FF9EBB')+sparkle(40,172,7,'#8FD6E8'):'';
  const inner=ears+tuft+body+faceSVG(face)+accSVG(form);
  const g=baby?`<g transform="translate(100 118) scale(.84) translate(-100 -118)">${inner}</g>`:inner;
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${defs}<ellipse cx="100" cy="190" rx="60" ry="7" fill="rgba(0,0,0,.08)"/>${back}${g}${shine}${fin}${think}</svg>`;
}
