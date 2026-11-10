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
/* 顔の部品。eyes・mouth・extra は [x0, svg] の並び（x0 は部品の中心の x。null は まわりに浮くもの）。
   dup=true は今の faceSVG と 1 文字も変えない文字列（st のあとに stroke-width を重ねて書いたタグもそのまま。HTML は最初の値＝4 を使う）。
   dup=false は 2.5D 用：重ねた stroke-width を書かない（見た目は同じ）。1 本の path で左右を描いている部品は左右に分ける */
function faceParts(face,dup){
  const ink='#5B3A55',ey=108,ex=[78,122];
  const st=`stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const sw=w=>dup?` stroke-width="${w}"`:'';
  const both=f=>ex.map(x=>[x,f(x)]);
  let eyes=[],mouth=[],extra=[];
  let blushCol='#FF9EBB';
  if(face==='happy'){
    eyes=both(x=>`<path d="M${x-8} ${ey+3} Q${x} ${ey-8} ${x+8} ${ey+3}" ${st}/>`);
    mouth=[[100,`<path d="M89 124 Q100 142 111 124 Z" fill="#FF7FA0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`]];
  }else if(face==='sleep'){
    eyes=both(x=>`<path d="M${x-8} ${ey} Q${x} ${ey+6} ${x+8} ${ey}" ${st}/>`);
    mouth=[[100,`<ellipse cx="100" cy="130" rx="4" ry="3" fill="${ink}"/>`]];
    extra=[[null,`<text x="150" y="62" font-size="22" font-weight="900" fill="${ink}" opacity=".55">z</text><text x="164" y="42" font-size="30" font-weight="900" fill="${ink}" opacity=".55">Z</text>`]];
  }else if(face==='sick'){
    eyes=[[78,`<path d="M71 102 L84 108 L71 114" ${st}/>`],[122,`<path d="M129 102 L116 108 L129 114" ${st}/>`]];
    mouth=[[100,`<path d="M88 132 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" ${st}${sw(3)}/>`]];
    const brow=d=>`<path d="${d}" stroke="#9FB6E8" stroke-width="3" stroke-linecap="round"/>`;
    extra=[[null,`<path d="M152 78 q7 11 0 15 q-7 -4 0 -15Z" fill="#9FD3F5"/>`]].concat(dup?[[100,brow('M66 88 h24 M110 88 h24')]]:[[78,brow('M66 88 h24')],[122,brow('M110 88 h24')]]);
    blushCol='#B9D8F2';
  }else if(face==='sad'){
    eyes=both(x=>`<circle cx="${x}" cy="${ey+2}" r="5.5" fill="${ink}"/>`);
    mouth=[[100,`<path d="M92 133 Q100 125 108 133" ${st}${sw(3.5)}/>`]];
  }else if(face==='sparkle'||face==='drool'||face==='shy'||face==='hug'){
    eyes=both(x=>`<path d="M${x-8} ${ey+3} Q${x} ${ey-8} ${x+8} ${ey+3}" ${st}/>`);
    mouth=[[100,face==='shy'?`<path d="M94 128 Q100 133 106 128" ${st}${sw(3)}/>`:`<path d="M88 124 Q100 144 112 124 Z" fill="#FF7FA0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`]];
    if(face==='sparkle') extra=[[58,sparkle(58,92,7,'#FFD84D')],[146,sparkle(146,90,6,'#FFD84D')]];
    if(face==='drool') extra=[[110,`<path d="M110 132 q4 10 0 14 q-4 -4 0 -14Z" fill="#9FD3F5"/>`]];
    if(face==='shy'||face==='hug') blushCol='#FF7FA0';
    if(face==='hug') extra=[[148,`<path d="M148 70 c-6 -8 -16 0 -8 8 l8 8 l8 -8 c8 -8 -2 -16 -8 -8Z" fill="#FF7FA0"/>`]];
  }else if(face==='pout'){
    eyes=both(x=>`<circle cx="${x}" cy="${ey+2}" r="6.5" fill="${ink}"/><path d="M${x-9} ${ey-5} L${x+9} ${ey-3}" ${st}${sw(3.5)}/>`);
    mouth=[[100,`<path d="M94 130 q6 -6 12 0" ${st}${sw(3.5)}/>`],[138,`<circle cx="138" cy="122" r="12" fill="#FFB7CC" opacity=".8"/>`]];
  }else if(face==='tears'){
    eyes=both(x=>`<circle cx="${x}" cy="${ey+2}" r="6" fill="${ink}"/><circle cx="${x+2}" cy="${ey}" r="2" fill="#fff"/>`);
    mouth=[[100,`<path d="M90 134 q5 -6 10 0 q5 6 10 0" ${st}${sw(3)}/>`]];
    const drop=d=>`<path d="${d}" fill="#9FD3F5"/>`;
    extra=dup?[[100,drop('M72 116 q-4 12 0 16 q4 -4 0 -16Z M128 116 q-4 12 0 16 q4 -4 0 -16Z')]]:[[72,drop('M72 116 q-4 12 0 16 q4 -4 0 -16Z')],[128,drop('M128 116 q-4 12 0 16 q4 -4 0 -16Z')]];
  }else if(face==='hungry'){
    eyes=both(x=>`<circle cx="${x}" cy="${ey-2}" r="7" fill="${ink}"/><circle cx="${x+2}" cy="${ey-6}" r="2.5" fill="#fff"/>`);
    mouth=[[100,`<ellipse cx="100" cy="131" rx="5" ry="6" fill="#FF7FA0" stroke="${ink}" stroke-width="3"/>`]];
  }else if(face==='giggle'){
    eyes=[[76,`<path d="M70 102 L82 108 L70 114" ${st}/>`],[124,`<path d="M130 102 L118 108 L130 114" ${st}/>`]];
    mouth=[[100,`<path d="M86 122 Q100 146 114 122 Z" fill="#FF7FA0" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`]];
  }else if(face==='squint'){
    eyes=both(x=>`<path d="M${x-8} ${ey} Q${x} ${ey-5} ${x+8} ${ey}" ${st}/>`);
    mouth=[[100,`<path d="M92 127 Q100 134 108 127" ${st}${sw(3.5)}/>`]];
  }else if(face==='dizzy'){
    eyes=both(x=>`<path d="M${x} ${ey} m-1 0 a2 2 0 1 1 3 0 a4 4 0 1 1 -6 0 a6 6 0 1 1 9 0" ${st}${sw(2.5)}/>`);
    mouth=[[100,`<path d="M88 132 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" ${st}${sw(3)}/>`]];
  }else{
    eyes=both(x=>`<circle cx="${x}" cy="${ey}" r="7.5" fill="${ink}"/><circle cx="${x+2.5}" cy="${ey-3}" r="2.6" fill="#fff"/>`);
    mouth=[[100,`<path d="M92 127 Q100 135 108 127" ${st}${sw(3.5)}/>`]];
  }
  const blush=[60,140].map(x=>[x,`<ellipse cx="${x}" cy="124" rx="10" ry="5.5" fill="${blushCol}" opacity=".75"/>`]);
  /* 目が開いている表情だけ まばたきする（.blink-on） */
  const blink=['normal','hungry','sad','tears','pout'].indexOf(face)>=0;
  return {blush,eyes,mouth,extra,blink};
}
const svgOf=list=>list.map(p=>p[1]).join('');
function faceSVG(face){
  const P=faceParts(face,true);
  return svgOf(P.blush)+`<g class="eyes${P.blink?' blink-on':''}">${svgOf(P.eyes)}</g>`+svgOf(P.mouth)+svgOf(P.extra);
}
/* 小さな雲（そらいろぷに など） */
function cloudMini(x,y){return `<g fill="#FFFFFF" stroke="#C9DDF0" stroke-width="1.5"><ellipse cx="${x}" cy="${y}" rx="12" ry="7"/><circle cx="${x-5}" cy="${y-4}" r="6"/><circle cx="${x+4}" cy="${y-6}" r="7"/></g>`;}
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
    /* v2.4 あかちゃん */
    case 'kirapuni': return `<polygon points="${starPts(100,26,13,5.5)}" fill="#FFE07A" stroke="#E4B32E" stroke-width="2"/>`+sparkle(70,40,6,'#FFD84D')+sparkle(132,38,5,'#FFB3C7');
    case 'pyonpuni': return `<path d="M100 44 q-6 -6 0 -10 q6 -4 0 -10 q-6 -4 0 -10" fill="none" stroke="#7CC48A" stroke-width="3.5" stroke-linecap="round"/><circle cx="100" cy="12" r="7" fill="#9FD48C" stroke="#6FB06A" stroke-width="2"/>`;
    case 'nukupuni': return `<path d="M64 50 Q100 4 136 50 Z" fill="#F7B79C" stroke="#E0907A" stroke-width="2.5"/><path d="M66 48 H134" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/><circle cx="100" cy="14" r="9" fill="#FFFFFF" stroke="#E0907A" stroke-width="2"/>`;
    case 'kazepuni': return `<path d="M30 70 q20 -14 40 0 q14 10 28 -2" fill="none" stroke="#8FD0C6" stroke-width="3.5" stroke-linecap="round"/><path d="M140 64 q14 -10 30 0" fill="none" stroke="#8FD0C6" stroke-width="3.5" stroke-linecap="round"/><path d="M100 44 C100 30 112 22 124 22 C120 34 110 42 100 44 Z" fill="#9FD48C" stroke="#6FB06A" stroke-width="2"/>`;
    case 'awapuni': return [[82,38,9],[100,30,11],[118,38,9],[92,22,6],[110,20,5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF" stroke="#B7A6E8" stroke-width="2"/>`).join('')+`<circle cx="96" cy="26" r="2.5" fill="#DCC8FF"/>`;
    case 'potapuni': return `<path d="M74 46 Q100 20 126 46 Z" fill="#FFD27A" stroke="#E8C26C" stroke-width="2.5"/><circle cx="100" cy="24" r="5" fill="#E8A94C"/><path d="M84 18 q-4 -6 0 -12 M100 12 q-4 -6 0 -12 M116 18 q-4 -6 0 -12" stroke="#E0B88A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    case 'maruppuni': return `<circle cx="100" cy="30" r="12" fill="#FF9EBB" stroke="#E07A9C" stroke-width="2.5"/>`+[[64,120],[136,120],[82,150],[118,150],[100,96]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5" fill="#FFFFFF" opacity=".8"/>`).join('');
    /* v2.4 こども */
    case 'hanabi': return [[60,28,'#FF9EBB'],[140,24,'#8FD6E8'],[100,10,'#FFD84D']].map(([x,y,c])=>[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return `<path d="M${(x+5*Math.cos(r)).toFixed(1)} ${(y+5*Math.sin(r)).toFixed(1)} L${(x+13*Math.cos(r)).toFixed(1)} ${(y+13*Math.sin(r)).toFixed(1)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;}).join('')).join('');
    case 'tanken': return `<path d="M66 50 Q68 22 100 20 Q132 22 134 50 Z" fill="#9CC46A" stroke="#6E9A45" stroke-width="2.5"/><path d="M60 50 H150" stroke="#6E9A45" stroke-width="7" stroke-linecap="round"/><circle cx="100" cy="34" r="5" fill="#FFD84D"/>`;
    case 'hon': return `<path d="M68 40 L100 30 L132 40 L132 50 L100 42 L68 50 Z" fill="#FFFFFF" stroke="#8C7CD6" stroke-width="2.5" stroke-linejoin="round"/><path d="M100 30 V42" stroke="#8C7CD6" stroke-width="2"/><path d="M76 40 h16 M108 40 h16" stroke="#C9BFF0" stroke-width="2"/>`;
    case 'mizutama': return [[66,112],[134,108],[78,146],[124,150],[100,164],[52,140],[148,140]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6" fill="#FFFFFF" opacity=".85"/>`).join('')+`<path d="M150 26 a22 22 0 0 1 44 0 Z" fill="#8EBDE6" stroke="#5E9ACC" stroke-width="2"/><path d="M172 26 v24 q0 6 -6 6" stroke="#5E9ACC" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'ribon': return `<path d="M100 36 L70 20 Q62 36 70 52 Z" fill="#FF8FB3" stroke="#E0709A" stroke-width="2.5" stroke-linejoin="round"/><path d="M100 36 L130 20 Q138 36 130 52 Z" fill="#FF8FB3" stroke="#E0709A" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="36" r="8" fill="#FFB3C7" stroke="#E0709A" stroke-width="2.5"/>`;
    case 'donguri': return `<path d="M100 44 C100 30 112 20 128 18 C124 32 114 42 100 44 Z" fill="#86CF8E" stroke="#4E9E5C" stroke-width="2"/>`+[[24,150],[176,150]].map(([x,y])=>`<ellipse cx="${x}" cy="${y+6}" rx="9" ry="11" fill="#C98E5A" stroke="#A06A3C" stroke-width="2"/><path d="M${x-10} ${y} Q${x} ${y-10} ${x+10} ${y} Z" fill="#8E6238"/>`).join('');
    case 'sorairo': return `<path d="M76 36 L130 18 L108 46 L100 36 Z" fill="#FFFFFF" stroke="#9CC9EE" stroke-width="2.5" stroke-linejoin="round"/><path d="M100 36 L108 46 L104 34" fill="#DDF0FF" stroke="#9CC9EE" stroke-width="2"/>`+cloudMini(160,60)+cloudMini(36,58);
    /* スーパーシークレット：星の王冠 */
    case 'yumeniji': return `<g class="crown"><path d="M64 48 L70 18 L84 34 L100 8 L116 34 L130 18 L136 48 Z" fill="#FFE07A" stroke="#E4B32E" stroke-width="2.5" stroke-linejoin="round"/>`+
      [[70,18],[100,8],[130,18]].map(([x,y])=>`<polygon points="${starPts(x,y,7,3)}" fill="#FFF6C2" stroke="#E4B32E" stroke-width="1.5"/>`).join('')+
      `<circle cx="86" cy="40" r="4" fill="#FF9EBB"/><circle cx="100" cy="38" r="4.5" fill="#8FD6E8"/><circle cx="114" cy="40" r="4" fill="#C6A8F0"/></g>`;
    case 'niji': return `<polygon points="${starPts(100,28,14,6)}" fill="#FFD84D" stroke="#E4B32E" stroke-width="2"/>`;
  }
  return '';
}
const RAINBOW=['#FFB3C7','#FFD9A8','#FFF2A8','#C2F0D6','#BCD8FF','#DCC8FF'];

/* ---------- 2.5D の向き（おへや用。opt.yaw があるときだけ通る。設計書 §3.7） ----------
   体の輪郭はそのまま。顔・おなかなど表面の部品は丸い体の上で回し、耳・足は左右の位置だけ回す。
   頭の上のかざりは横幅だけ変え、腕と まわりに浮くものは回さない。|yaw|>90 は後ろ姿（顔が隠れる） */
const RAD=Math.PI/180;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* 正面図で中心からのずれ u・半径 R の表面の点を th（ラジアン）回す → 画面の x と、こちらを向いている度合い c */
function turnPt(u,R,th){const p=Math.asin(clamp(u/R,-1,1))+th;return {x:100+R*Math.sin(p),c:Math.cos(p)};}
/* 表面に貼った部品：中心 x0 の部品を回したあとの位置へ移し、横に c 倍。裏に回ったら描かない */
function onSurface(svg,x0,R,th,minC=.06){
  const t=turnPt(x0-100,R,th);if(t.c<=minC)return '';
  return `<g transform="translate(${t.x.toFixed(2)} 0) scale(${t.c.toFixed(3)} 1) translate(${-x0} 0)">${svg}</g>`;
}
const R_FACE=62,R_EAR=48,R_FOOT=34,R_HEAD=44;
/* かざりの分け方：accSVG(form) を上から順の部品に分け、その番号で置き場所を決める（書いていない部品は top＝頭の上）。
   face：[番号, 中心 x] 顔・おなかの表面（半径 62 で回す）／
   off：[番号, 中心 x, 作り直し] 頭の上で中心から外れた部品。半径 44 で回した x を作り直しの関数に渡す（関数が無ければ位置だけずらす）／
   float：番号の並び か '*'（全部）。体の外に浮くもの・まわりのきらきら（回さない） */
const ACC_SORT={
  /* はかせのふさ：つけ根は ぼうしの真ん中のまま、たれた先だけ回す（ずらすと後ろ姿で ぼうしから離れるため） */
  hakase:{face:[[0,78],[1,122],[2,100]],off:[[5,138,x=>`<path d="M100 30 L${x} 34 L${x} 52" stroke="#FFD84D" stroke-width="3" fill="none" stroke-linecap="round"/>`],[6,138,x=>`<circle cx="${x}" cy="55" r="4.5" fill="#FFD84D"/>`]]},
  kirara:{float:[2,3,4]},
  pokapoka:{float:[2,3]},
  shabon:{float:'*'},
  bouken:{float:[3]},
  marin:{float:[3]},
  kirapuni:{float:[1,2]},
  kazepuni:{float:[0,1]},
  maruppuni:{face:[[1,64],[2,136],[3,82],[4,118],[5,100]]},
  hanabi:{float:'*'},
  mizutama:{face:[[0,66],[1,134],[2,78],[3,124],[4,100],[5,52],[6,148]],float:[7,8]},
  donguri:{float:[1,2,3,4]},
  sorairo:{float:[2,3]}
};
const PART=/<g\b[^>]*>[\s\S]*?<\/g>|<text\b[\s\S]*?<\/text>|<\w+\b[^>]*\/>/g;
const ACC25={};
/* ACC25[form] = {top: svg, face: [{svg, x0}], off: [{svg, x0, make?}], float: svg}（初めて使うときに作る） */
function acc25(form){
  if(ACC25[form]) return ACC25[form];
  const s=accSVG(form),parts=s.match(PART)||[],k=ACC_SORT[form]||{},used={};
  const r={top:'',face:[],off:[],float:''};
  if(parts.join('')!==s){r.top=s;return ACC25[form]=r;} // 分けられないときは全部 頭の上
  (k.face||[]).forEach(([i,x0])=>{r.face.push({svg:parts[i],x0});used[i]=1;});
  (k.off||[]).forEach(([i,x0,make])=>{r.off.push({svg:parts[i],x0,make});used[i]=1;});
  parts.forEach((p,i)=>{if(used[i])return;if(k.float==='*'||(k.float||[]).indexOf(i)>=0)r.float+=p;else r.top+=p;});
  return ACC25[form]=r;
}
function petSVG25(form,face,opt){
  const F=FORMS[form],dk=F.dark,baby=F.stage===1;
  const yaw=Number.isFinite(opt.yaw)?opt.yaw:0,th=yaw*RAD;
  let defs='',col=F.color;
  /* にじ色はグラデーションのまま（data: 画像では CSS の色回しは動かない） */
  if(opt.shiny||F.secret){
    const id='rb-'+form+(F.secret?'-s':'');col=`url(#${id})`;
    defs=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${RAINBOW.map((c,i)=>`<stop offset="${(i/(RAINBOW.length-1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
  }
  let back='';
  if(form==='niji'){
    back=['#FF9AA2','#FFD28C','#FFF3A0','#B5EAD7','#A7C7FF','#CDB4FF'].map((c,i)=>{const r=80-i*7;return `<path d="M${100-r} 126 A${r} ${r} 0 0 1 ${100+r} 126" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`;}).join('');
  }
  const topK=(.55+.45*Math.abs(Math.cos(th))).toFixed(3);
  const top=svg=>svg?`<g transform="translate(100 0) scale(${topK} 1) translate(-100 0)">${svg}</g>`:'';
  const surf=(list,minC)=>list.map(([x0,svg])=>x0===null?'':onSurface(svg,x0,R_FACE,th,minC)).join('');
  /* 耳：半径 48 で回し、いつも体のうしろ。内側のピンクは前を向いているときだけ */
  const ears=baby?'':[58,142].map(x0=>{const t=turnPt(x0-100,R_EAR,th),x=t.x.toFixed(2);
    return `<circle cx="${x}" cy="62" r="18" fill="${col}" stroke="${dk}" stroke-width="3"/>`+(t.c>.15?`<ellipse cx="${x}" cy="62" rx="${(8*t.c).toFixed(2)}" ry="8" fill="#FFB7CC"/>`:'');}).join('');
  const tuft=form==='puni'?top(`<path d="M100 42 q-9 -16 5 -21 q11 -2 7 9" fill="none" stroke="${dk}" stroke-width="4" stroke-linecap="round"/>`):'';
  /* 腕：回さない。おなかに当てた腕（belly）は おなかの表面に貼り、横向き（|yaw|≥60°）から後ろ姿では横の腕にする（片方の腕だけになるのを避ける） */
  const arm=(x,y,r)=>`<ellipse cx="${x}" cy="${y}" rx="11" ry="15" fill="${col}" stroke="${dk}" stroke-width="3" transform="rotate(${r} ${x} ${y})"/>`;
  const belly=opt.arms==='belly'&&Math.cos(th)>.5+1e-9;
  const arms=opt.arms==='up'?arm(30,98,-35)+arm(170,98,35):belly?'':arm(33,132,25)+arm(167,132,-25);
  const armsFront=belly?onSurface(arm(78,146,60),78,R_FACE,th)+onSurface(arm(122,146,-60),122,R_FACE,th):'';
  /* 足：半径 34 で回し、いつも体のうしろ */
  const feet=[74,126].map(x0=>`<ellipse cx="${turnPt(x0-100,R_FOOT,th).x.toFixed(2)}" cy="180" rx="18" ry="9" fill="${dk}"/>`).join('');
  const body=arms+feet+`<path d="${BODY}" fill="${col}" stroke="${dk}" stroke-width="3.5"/>`+
    onSurface(`<ellipse cx="100" cy="150" rx="40" ry="24" fill="#fff" opacity=".5"/>`,100,R_FACE,th)+armsFront;
  if(opt.final){
    back=`<ellipse cx="100" cy="114" rx="94" ry="88" fill="#FFF8E8" opacity=".6"/>`+
      RAINBOW.map((c,i)=>`<ellipse cx="100" cy="114" rx="${92-i*5}" ry="${86-i*5}" fill="none" stroke="${c}" stroke-width="5" opacity=".85"/>`).join('')+back;
  }
  /* 顔：半径 62 の表面。顔の extra のうち体の外のもの（Z・汗）は浮くもの */
  const P=faceParts(face,false);
  const faceS=surf(P.blush,.2)+surf(P.eyes)+surf(P.mouth)+surf(P.extra);
  const faceFloat=P.extra.filter(p=>p[0]===null).map(p=>p[1]).join('');
  /* かざり */
  const A=acc25(form);
  const accS=A.face.map(p=>onSurface(p.svg,p.x0,R_FACE,th)).join('')+top(A.top)+
    A.off.map(p=>{const x=turnPt(p.x0-100,R_HEAD,th).x;return p.make?p.make(x.toFixed(2)):`<g transform="translate(${(x-p.x0).toFixed(2)} 0)">${p.svg}</g>`;}).join('');
  const think=opt.think?`<circle cx="150" cy="58" r="4" fill="#fff" stroke="#D9CCD6" stroke-width="2"/><circle cx="160" cy="44" r="6" fill="#fff" stroke="#D9CCD6" stroke-width="2"/><ellipse cx="176" cy="24" rx="20" ry="17" fill="#fff" stroke="#D9CCD6" stroke-width="2"/><text x="176" y="32" text-anchor="middle" font-size="20">${opt.think}</text>`:'';
  const fin=opt.final?sparkle(22,70,8,'#FFE08A')+sparkle(180,66,9,'#FFE08A')+sparkle(170,160,6,'#FFFFFF'):'';
  const shine=opt.shiny?sparkle(26,40,10,'#FFD84D')+sparkle(176,112,8,'#FF9EBB')+sparkle(40,172,7,'#8FD6E8'):'';
  const skin=ears+tuft+body;
  const inner=(F.secret?`<g class="secret-skin">${skin}</g>`:skin)+faceS+accS+faceFloat+A.float;
  const glow=F.secret?`<ellipse cx="100" cy="116" rx="96" ry="90" fill="#FFF6FF" opacity=".55"/>`:'';
  const tw=F.secret?`<g class="twinkle">${[[18,60,7,'#FFD84D'],[184,52,8,'#FFB3C7'],[24,150,6,'#BCD8FF'],[178,150,7,'#C2F0D6'],[100,6,5,'#FFF2A8']].map(([x,y,r,c])=>sparkle(x,y,r,c)).join('')}</g>`:'';
  const g=baby?`<g transform="translate(100 118) scale(.84) translate(-100 -118)">${inner}</g>`:inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden="true">${defs}<ellipse cx="100" cy="190" rx="60" ry="7" fill="rgba(0,0,0,.08)"/>${glow}${back}${g}${shine}${fin}${tw}${think}</svg>`;
}
export function petSVG(form,face,opt){
  opt=opt||{};
  if(form==='egg') return eggSVG(opt.pts||0);
  if(opt.sil) return silSVG(form);
  if(typeof opt.yaw==='number') return petSVG25(form,face,opt);
  const F=FORMS[form],dk=F.dark,baby=F.stage===1;
  let defs='',col=F.color;
  /* スーパーシークレット は いつも にじ色の お肌（CSS で ゆっくり色が回る） */
  if(opt.shiny||F.secret){
    const id='rb-'+form+(F.secret?'-s':'');col=`url(#${id})`;
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
  const skin=ears+tuft+body;
  const inner=(F.secret?`<g class="secret-skin">${skin}</g>`:skin)+faceSVG(face)+accSVG(form);
  /* シークレット：まわりに ふわふわした光の粒 */
  const glow=F.secret?`<ellipse cx="100" cy="116" rx="96" ry="90" fill="#FFF6FF" opacity=".55"/>`:'';
  const tw=F.secret?`<g class="twinkle">${[[18,60,7,'#FFD84D'],[184,52,8,'#FFB3C7'],[24,150,6,'#BCD8FF'],[178,150,7,'#C2F0D6'],[100,6,5,'#FFF2A8']].map(([x,y,r,c])=>sparkle(x,y,r,c)).join('')}</g>`:'';
  const g=baby?`<g transform="translate(100 118) scale(.84) translate(-100 -118)">${inner}</g>`:inner;
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${defs}<ellipse cx="100" cy="190" rx="60" ry="7" fill="rgba(0,0,0,.08)"/>${glow}${back}${g}${shine}${fin}${tw}${think}</svg>`;
}

/* 時間帯の景色（絵本のページのうしろの絵）。band：asa / hiru / yuu / yoru。ID は band ごとに分けて重複を避ける */
export const SCENE={
  asa:{sky:['#FFC9C2','#FFE6C7','#FFF6D8'],hill:['#CDEFC4','#B2E2A8'],ink:'#5B4150'},
  hiru:{sky:['#7FC8FF','#B9E3FF','#E3F5FF'],hill:['#A6E09A','#82CC7A'],ink:'#4A3A48'},
  yuu:{sky:['#FF8E6E','#FFB98C','#D7A6E8'],hill:['#B88BB0','#93698F'],ink:'#4A2F45'},
  yoru:{sky:['#2F356F','#4A4690','#6B59A6'],hill:['#3D4A7C','#2C3864'],ink:'#FFF6E8'}
};
function cloud(x,y,s,c){return `<g fill="${c}"><ellipse cx="${x}" cy="${y}" rx="${26*s}" ry="${13*s}"/><circle cx="${x-12*s}" cy="${y-8*s}" r="${12*s}"/><circle cx="${x+9*s}" cy="${y-12*s}" r="${15*s}"/></g>`;}
export function sceneSVG(band){
  const S=SCENE[band]||SCENE.hiru,id='sk-'+band;
  const sky=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${S.sky.map((c,i)=>`<stop offset="${i/(S.sky.length-1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>`;
  const hills=`<path d="M-20 238 Q70 196 170 226 T420 214 V320 H-20Z" fill="${S.hill[0]}"/><path d="M-20 262 Q110 230 230 258 T420 250 V320 H-20Z" fill="${S.hill[1]}"/>`;
  let deco='';
  if(band==='asa') deco=`<circle cx="92" cy="226" r="46" fill="#FFD08A" opacity=".55"/><circle cx="92" cy="226" r="32" fill="#FFB86B"/>`+cloud(300,70,1,'#FFFFFF')+cloud(190,46,.7,'#FFEFF2')+
    `<path d="M250 120 q8 -8 16 0 q8 -8 16 0 M300 100 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#7D6273" stroke-width="3" stroke-linecap="round"/>`;
  else if(band==='hiru') deco=[0,45,90,135,180,225,270,315].map(a=>{const r=a*Math.PI/180;return `<path d="M${(338+36*Math.cos(r)).toFixed(1)} ${(58+36*Math.sin(r)).toFixed(1)} L${(338+48*Math.cos(r)).toFixed(1)} ${(58+48*Math.sin(r)).toFixed(1)}" stroke="#FFD84D" stroke-width="6" stroke-linecap="round"/>`;}).join('')+`<circle cx="338" cy="58" r="28" fill="#FFD84D"/>`+cloud(90,62,1.1,'#FFFFFF')+cloud(220,40,.8,'#FFFFFF')+
    [[60,250,'#FF9EBB'],[118,262,'#FFD84D'],[300,246,'#FFFFFF'],[352,262,'#FF9EBB']].map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="5" fill="${c}"/><circle cx="${x}" cy="${y}" r="2" fill="#F7B733"/>`).join('');
  else if(band==='yuu') deco=`<circle cx="290" cy="222" r="70" fill="#FFB27A" opacity=".45"/><circle cx="290" cy="222" r="48" fill="#FF7F50"/>`+cloud(110,80,1,'#FFC9B0')+cloud(220,52,.6,'#F3C1E0')+
    `<path d="M70 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z" fill="#FFF3B0"/>`;
  else deco=[[40,40,2],[90,90,1.5],[150,30,2.2],[210,80,1.4],[260,36,1.8],[120,140,1.2],[330,120,1.4],[370,40,1.6]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF8D6"/>`).join('')+
    `<path d="M328 46 a30 30 0 1 0 22 52 a24 24 0 1 1 -22 -52Z" fill="#FFF3B0"/>`;
  const front=band==='yoru'?`<g transform="translate(40 212)"><rect x="0" y="12" width="40" height="28" rx="3" fill="#F2D3B8"/><path d="M-6 14 L20 -8 L46 14Z" fill="#C97E8E"/><rect x="14" y="20" width="12" height="11" rx="2" fill="#FFD27A"/></g>`:'';
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" data-band="${band}">${sky}${deco}${hills}${front}</svg>`;
}
export const sceneInk=band=>(SCENE[band]||SCENE.hiru).ink;
