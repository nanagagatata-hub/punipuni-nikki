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
export function petSVG(form,face,opt){
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

