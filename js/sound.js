// 効果音・鳴き声・読み上げ（音声ファイルは使わず Web Audio で合成する）
let on=true,ctx=null,master=null;

export function setSound(v){on=!!v;if(!on){try{speechSynthesis.cancel();}catch(e){}}}
/* iPad は最初のユーザー操作の中でしか音を鳴らせないので、pointerdown で呼ぶ */
export function unlock(){
  try{
    if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      ctx=new AC();master=ctx.createGain();master.gain.value=.25;master.connect(ctx.destination);}
    if(ctx.state==='suspended')ctx.resume();
  }catch(e){ctx=null;}
}

/* 1 音：f0→f1 へ滑らせる。vib はビブラートの幅（Hz） */
function tone(f0,f1,dur,type,gain,when,vib){
  const t=ctx.currentTime+(when||0),o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f0,t);
  if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  if(vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=7;lg.gain.value=vib;l.connect(lg);lg.connect(o.frequency);l.start(t);l.stop(t+dur);}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain||.6,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);
}
/* 鳴き声「ぷにゅ〜」：上がって下がる三角波＋ビブラート（3 種） */
function cry(){
  const v=Math.floor(Math.random()*3);
  if(v===0){tone(700,1100,.18,'triangle',.7,0,40);tone(1100,800,.3,'triangle',.6,.17,40);}
  else if(v===1){tone(900,1300,.12,'triangle',.6,0,30);tone(1000,1400,.12,'triangle',.6,.16,30);tone(1300,900,.22,'triangle',.5,.3,40);}
  else{tone(650,1000,.25,'triangle',.7,0,45);tone(1000,750,.25,'triangle',.5,.24,45);}
}
const notes=(list,type,len)=>list.forEach((f,i)=>tone(f,f,len||.18,type||'sine',.5,i*(len||.18)*.8));
const SFX={
  pop:()=>tone(600,900,.08,'sine',.5),
  chime:()=>notes([1047,1319,1568,2093],'triangle',.14),
  munch:()=>{tone(300,220,.07,'square',.25);tone(320,240,.07,'square',.25,.12);},
  fanfare:()=>notes([523,659,784,1047,784,1047],'triangle',.16),
  heal:()=>notes([784,988,1175,1568],'sine',.2),
  cry,
  giggle:()=>[0,1,2,3].forEach(i=>tone(1200,1500,.06,'triangle',.4,i*.08)),
  hug:()=>tone(500,750,.35,'sine',.6,0,20),
  dizzy:()=>{tone(900,400,.4,'sine',.4,0,60);tone(800,350,.4,'sine',.3,.2,60);},
  snore:()=>tone(180,120,.6,'sine',.3,0,8),
  egg:()=>{tone(500,500,.07,'triangle',.4);tone(560,560,.07,'triangle',.4,.1);},
  farewell:()=>notes([784,659,523,659,784,1047],'sine',.3)
};
export function sfx(name){
  if(!on||!ctx||!SFX[name])return;
  try{SFX[name]();}catch(e){}
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
