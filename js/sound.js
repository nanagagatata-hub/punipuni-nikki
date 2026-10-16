// 効果音・鳴き声・読み上げ（音声ファイルは使わず Web Audio で合成する）
let on=true,ctx=null,master=null;

export function setSound(v){on=!!v;if(!on){try{speechSynthesis.cancel();}catch(e){}}}
/* iPad は最初のユーザー操作の中でしか音を鳴らせないので、操作のたびに呼ぶ（2 回目以降は再開だけ） */
export function unlock(){
  try{
    if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=.25;master.connect(ctx.destination);}
    if(ctx.state==='suspended'){const p=ctx.resume();if(p&&p.catch)p.catch(()=>{});}
  }catch(e){ctx=null;}
}

/* 1 音：f0→f1 へ滑らせる。vib はビブラートの幅（Hz） */
function tone(f0,f1,dur,type,gain,when,vib,out){
  const t=ctx.currentTime+(when||0),o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f0,t);
  if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  if(vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=7;lg.gain.value=vib;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain||.6,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(out||master);o.start(t);o.stop(t+dur+.02);
}
/* 鳴き声「ぷにゅ〜」：上がって下がる三角波＋ビブラート（3 種） */
/* k：声の高さ（1＝ふつう、あかちゃんは高め） */
function cry(k){
  k=k>0?k:1;const v=Math.floor(Math.random()*3);
  if(v===0){tone(700*k,1100*k,.18,'triangle',.7,0,40);tone(1100*k,800*k,.3,'triangle',.6,.17,40);}
  else if(v===1){tone(900*k,1300*k,.12,'triangle',.6,0,30);tone(1000*k,1400*k,.12,'triangle',.6,.16,30);tone(1300*k,900*k,.22,'triangle',.5,.3,40);}
  else{tone(650*k,1000*k,.25,'triangle',.7,0,45);tone(1000*k,750*k,.25,'triangle',.5,.24,45);}
}
/* スーパーシークレット の声：3 つの音を重ねた きれいな和音 */
function chord(){
  [[523,784],[659,988],[784,1175]].forEach(([a,b],i)=>{tone(a,b,.5,'sine',.45,i*.04,25);tone(b,a*1.5,.4,'triangle',.3,.45+i*.04,25);});
  tone(1568,2093,.6,'sine',.2,.2,10);
}
const notes=(list,type,len)=>list.forEach((f,i)=>tone(f,f,len||.18,type||'sine',.5,i*(len||.18)*.8));
const SFX={
  pop:()=>tone(600,900,.08,'sine',.5),
  chime:()=>notes([1047,1319,1568,2093],'triangle',.14),
  munch:()=>{tone(300,220,.07,'square',.25);tone(320,240,.07,'square',.25,.12);},
  fanfare:()=>notes([523,659,784,1047,784,1047],'triangle',.16),
  heal:()=>notes([784,988,1175,1568],'sine',.2),
  cry,chord,
  giggle:()=>[0,1,2,3].forEach(i=>tone(1200,1500,.06,'triangle',.4,i*.08)),
  hug:()=>tone(500,750,.35,'sine',.6,0,20),
  dizzy:()=>{tone(900,400,.4,'sine',.4,0,60);tone(800,350,.4,'sine',.3,.2,60);},
  snore:()=>tone(180,120,.6,'sine',.3,0,8),
  egg:()=>{tone(500,500,.07,'triangle',.4);tone(560,560,.07,'triangle',.4,.1);},
  farewell:()=>notes([784,659,523,659,784,1047],'sine',.3),
  /* ごはんマナー のおどりの曲（約 5 秒）：ぴょこぴょこ はねる明るいメロディ */
  dance:()=>{const m=[523,659,784,659,880,784,659,784,1047,988,880,784,659,784,880,1047];
    m.forEach((f,i)=>{tone(f,f,.22,'triangle',.45,i*.3);if(i%2===0)tone(f/2,f/2,.12,'square',.12,i*.3);});}
};
export function sfx(name,arg){
  if(!on||!ctx||!SFX[name])return;
  try{SFX[name](arg);}catch(e){}
}
/* 読み上げ：日本語は高め（かわいく）、中国語は聞き取りやすさ優先で少しだけ高く */
export function speak(ja,zh){
  if(!on)return;
  try{
    if(!('speechSynthesis' in window))return;
    speechSynthesis.cancel();
    const u=(text,lang,pitch,rate)=>{if(!text)return;const x=new SpeechSynthesisUtterance(text);x.lang=lang;x.pitch=pitch;x.rate=rate;speechSynthesis.speak(x);};
    u(ja,'ja-JP',1.7,1.05);u(zh,'zh-CN',1.3,.85);
  }catch(e){}
}

/* うた：1 行ずつ 鳴き声の音色で うたい、行が かわるたびに onLine(n)、おわったら onEnd()。
   音がオフ・音が出せないときも、同じ間隔で 行だけ すすめる。もどり値は とちゅうで止める関数 */
export function sing(lines,onLine,onEnd){
  const BEAT=.42,timers=[];let at=0,bus=null;
  /* 歌だけを止められるように、専用の音量つまみ（GainNode）を通す */
  try{if(on&&ctx){bus=ctx.createGain();bus.gain.value=1;bus.connect(master);}}catch(e){bus=null;}
  const mf=m=>440*Math.pow(2,(m-69)/12);
  lines.forEach((l,n)=>{
    timers.push(setTimeout(()=>onLine(n),at*1000));
    if(bus){let b=0;l.notes.forEach(([m,len])=>{try{tone(mf(m),mf(m)*1.01,len*BEAT*.92,'triangle',.55,at+b*BEAT,18,bus);}catch(e){}b+=len;});}
    at+=l.notes.reduce((a,x)=>a+x[1],0)*BEAT+.4;
  });
  timers.push(setTimeout(onEnd,at*1000));
  return ()=>{timers.forEach(clearTimeout);try{if(bus)bus.disconnect();}catch(e){}};
}
