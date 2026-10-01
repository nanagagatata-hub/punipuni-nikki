// ぷにぷに にっき 本体（状態・描画・操作）
import {H,TH,STAGE,TASKS,FOODS,PARAMS,FORMS,ZORDER,WORDS,LINES} from './data.js';
import {dayKey,isNight,taskState,taskNote,decay,afterFeed,chooseForm} from './rules.js';
import {KEY,DEF,sanitize,encodeState,decodeState} from './state.js';
import {petSVG} from './art.js';
import {speak} from './sound.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd=a=>a[Math.floor(Math.random()*a.length)];

function load(){
  try{const r=localStorage.getItem(KEY); if(r) return sanitize(JSON.parse(r));}catch(e){}
  return DEF();
}

function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

let S=load();
let bubble={ja:'',zh:''};
let lastInteract=Date.now();
let happyUntil=0;

function ensureDay(){const k=dayKey(new Date()); if(S.day!==k){S.day=k;S.cnt={};}}
function tick(now){
  if(decay(S,now).becameSick) say(rnd(LINES.sick));
}

/* ---------- drawing ---------- */
/* ---------- speech & fx ---------- */
function say(ja,zh){bubble={ja:ja,zh:zh||''};renderBubble();}
function sayWord(pre){const w=rnd(WORDS);say(`${pre}「${w[1]}」は ちゅうごくごで「${w[2]}」だよ！`,w[0]);}
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
function confirmTask(id){
  const t=TASKS.find(x=>x.id===id);const st=taskState(t,S,new Date());if(!st.ok)return;
  const label=t.id==='hamigaki'?(st.slot==='am'?'あさの はみがき':'よるの はみがき'):t.label;
  openModal(`<div class="center"><div class="big">${t.icon}</div><p class="q">${label} できた？</p>
    <div class="btns"><button class="btn" data-act="yes">できた！</button><button class="btn ghost" data-act="no">まだ</button></div></div>`,
    act=>{closeModal();if(act==='yes')report(t);},true);
}
function report(t){
  ensureDay();const st=taskState(t,S,new Date());if(!st.ok)return;
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
  const f=FOODS[fid],now=Date.now();lastInteract=now;
  if(isNight(new Date(now))){say(rnd(LINES.sleepFeed));return;}
  S.inv[fid]--;afterFeed(S);
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
function checkEvolve(){
  if(S.stage<3&&S.pts>=TH[S.stage+1]){
    const c=chooseForm(S);S.stage++;S.form=c.form;S.shiny=c.shiny;
    if(S.stage===3)S.adultAt=Date.now();
    if(S.zukan.indexOf(c.form)<0)S.zukan.push(c.form);
    if(c.shiny&&S.shinySeen.indexOf(c.form)<0)S.shinySeen.push(c.form);
    if(S.stage===1){const n=Date.now();S.lastTick=n;S.hunger=3;S.mood=3;S.hAcc=0;S.mAcc=0;}
    save();showEvolve();
  }
}
function showEvolve(){
  const msg=S.stage===1?'たまごが かえった！':S.stage===3?'おとなに なった！':'しんか した！';
  openModal(`<div class="center"><div class="evo">${petSVG(S.form,'happy',{shiny:S.shiny})}</div><p class="q">${msg}</p>
    <p class="sub">${esc(S.name)} は「${formName()}」に なったよ</p>
    <div class="btns"><button class="btn" data-act="ok">やったー！</button></div></div>`,
    ()=>{closeModal();say(S.stage===3?'おとなに なったよ！ずかん を みてね':'よろしくね！いっぱい あそぼう');render();checkEvolve();});
}
function petTap(){
  const now=Date.now();lastInteract=now;
  const el=$('#pet');el.classList.remove('wobble');void el.offsetWidth;el.classList.add('wobble');
  if(isNight(new Date(now))){say(rnd(LINES.sleepTap));return;}
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
      const keep={gen:S.gen+1,zukan:S.zukan,lessonDays:S.lessonDays,you:S.you,name:S.name,history:S.history,shinySeen:S.shinySeen,sound:S.sound,inv:S.inv,day:S.day,cnt:S.cnt,boostUntil:S.boostUntil};
      S=Object.assign(DEF(),keep);save();say('あたらしい たまご が きたよ！あたためて あげよう');render();},true);
}
function formName(){return (S.shiny?'きらきら ':'')+FORMS[S.form].name;}
function zukanCell(f){
  const seen=S.zukan.indexOf(f)>=0,F=FORMS[f];
  if(!seen) return `<div class="zc">${petSVG(f,'normal',{sil:true})}<b>？？？</b><span>${F.hint}</span></div>`;
  const hist=S.history.filter(h=>h.f===f),last=hist[hist.length-1],shiny=S.shinySeen.indexOf(f)>=0;
  const mark=(hist.length?'👼':'')+(shiny?'✨':'');
  const memo=last?`${esc(last.n)}・${last.g}ぴきめ${hist.length>1?`<br>ほか ${hist.length-1}ひき`:''}`:'';
  return `<div class="zc">${petSVG(f,'normal')}<b>${F.name}${mark?' '+mark:''}</b><span>${memo}</span></div>`;
}
function openZukan(){
  const sec=(st,title)=>`<h4 class="zh">${title}</h4><div class="zgrid">${ZORDER.filter(f=>FORMS[f].stage===st).map(zukanCell).join('')}</div>`;
  openModal(`<p class="q">ずかん（${S.zukan.length} / ${ZORDER.length}）</p>${sec(1,'あかちゃん')}${sec(2,'こども')}${sec(3,'おとな')}
    <div class="btns"><button class="btn ghost" data-act="close">とじる</button></div>`,()=>closeModal(),true);
}
function openSettings(){
  const wd=WD.map((w,i)=>`<option value="${i}" ${i===S.lessonDays[0]?'selected':''}>${w}</option>`).join('');
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
      if(act==='save'){const n=$('#nameIn').value.trim();if(n)S.name=n;S.lessonDays=[+$('#dayIn').value];save();render();toast('保存しました');}
      if(act==='export'){const ta=$('#codeOut');ta.value=encodeState(S);ta.hidden=false;ta.select();
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
function render(){
  ensureDay();const now=Date.now();
  $('#petName').textContent=S.name;$('#genLabel').textContent=S.gen+'だいめ';
  const sleeping=S.stage>0&&isNight(new Date());
  let face='normal';
  if(sleeping)face='sleep';else if(S.sick)face='sick';else if(now<happyUntil)face='happy';
  else if(S.stage>0&&(S.hunger===0||S.mood===0))face='sad';
  $('#pet').innerHTML=petSVG(S.form,face,{pts:S.pts,shiny:S.shiny});
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
    const st=taskState(t,S,new Date()),note=taskNote(t,S,st);
    let dots='',tf=st.ok?FOODS[t.food].icon:st.why==='done'?'💮':st.why==='day'?'📅':'⏰';
    if(note)dots=note;
    else if(t.id==='hamigaki'){dots=`<span class="dot ${S.cnt.hamigaki_am?'on':''}"></span>あさ <span class="dot ${S.cnt.hamigaki_pm?'on':''}"></span>よる`;}
    else{for(let i=0;i<t.limit;i++)dots+=`<span class="dot ${i<(S.cnt[t.id]||0)?'on':''}"></span>`;}
    return `<button class="task" data-task="${t.id}" ${st.ok?'':'disabled'}><span class="ti">${t.icon}</span><span><span class="tl">${t.label}</span><span class="td">${dots}</span></span><span class="tf">${tf}</span></button>`;
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick(Date.now());save();render();}});

/* ---------- start ---------- */
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(()=>{});}
tick(Date.now());
if(S.sick)say(rnd(LINES.sick));
else if(S.stage===0)say('たまご を あたためよう。できたこと を おしえてね！');
else say(rnd(['おかえり！きょうも いっしょに がんばろうね','あいたかったよ！','きょうは なにが できたかな？']));
save();render();
setInterval(()=>{tick(Date.now());save();render();},30000);
