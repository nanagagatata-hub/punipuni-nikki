// ぷにぷに にっき 本体（状態・描画・操作）
import {H,TH,STAGE,WD,TASKS,FOODS,PARAMS,FORMS,ZORDER,WORDS,PHRASES,LINES} from './data.js';
import {dayKey,band,isNight,taskState,taskNote,decay,afterFeed,chooseForm,finalDue,farewellReady,look,pickLine} from './rules.js';
import {KEY,DEF,sanitize,encodeState,decodeState} from './state.js';
import {petSVG} from './art.js';
import {speak,sfx,setSound,unlock} from './sound.js';
const APP_VERSION='v2.0.0'; // sw.js の VERSION と同じ値にそろえる

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
let react=null,reactUntil=0;
function setReact(k){react=k;reactUntil=Date.now()+2500;}

function ensureDay(){const k=dayKey(new Date()); if(S.day!==k){S.day=k;S.cnt={};}}
function tick(now){
  if(decay(S,now).becameSick) say(line('sick'));
  tickLife(now);
}
/* おとな→さいごのすがた（朝6時以降）。さいごのすがた を見せたら finalSeenAt を記録（spec §4.1） */
function tickLife(now){
  if(!$('#modal').hidden) return;
  if(S.stage===3&&!isNight(new Date(now))&&now>=finalDue(S)){S.stage=4;S.finalAt=now;save();showEvolve();}
  else if(S.stage===4&&!S.finalSeenAt&&!isNight(new Date(now))) showEvolve();
}

/* ---------- drawing ---------- */
/* ---------- speech & fx ---------- */
function say(ja,zh){bubble={ja:ja,zh:zh||''};renderBubble();}
const line=k=>pickLine(k,S,new Date());
function sayWord(pre){const w=Math.random()<.5?rnd(WORDS):rnd(PHRASES);say(`${pre}「${w[1]}」は ちゅうごくごで「${w[2]}」だよ！`,w[0]);}
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
$('#sheet').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&modalHandler){sfx('pop');modalHandler(b.dataset.act,b);}});
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
  lastInteract=Date.now();sfx('chime');fxBurst(f.icon);save();render();
}
function feed(fid){
  if(!(S.inv[fid]>0))return;
  const f=FOODS[fid],now=Date.now();lastInteract=now;
  if(isNight(new Date(now))){say(line('sleepFeed'));return;}
  S.inv[fid]--;afterFeed(S);
  if(S.stage>0){S.hunger=Math.min(4,S.hunger+(fid==='nikuman'?2:1));if(fid==='purin')S.mood=Math.min(4,S.mood+1);}
  if(S.sick){
    S.cure++;
    if(S.cure>=2){S.sick=false;S.cure=0;say('げんきに なったよ！ありがとう！');setReact('happy');sfx('heal');fxBurst('🌈');}
    else{sfx('munch');say('ありがとう… もう ひとつ たべたら なおりそう');}
    save();render();return;
  }
  const mul=now<S.boostUntil?1.5:1;
  S.pts+=f.pt*mul;S.p[f.param]+=f.amt*mul;
  sfx('munch');fxBurst(f.icon);setReact('happy');
  if(S.stage===0) say('たまごが ぽかぽか してきた…！');
  else if(fid==='kotoba'||fid==='nikuman') sayWord('もぐもぐ！');
  else say(line('eat'));
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
  sfx('fanfare');
  const msg=['','たまごが かえった！','しんか した！','おとなに なった！','さいごの すがた に なった！'][S.stage];
  openModal(`<div class="center"><div class="evo">${petSVG(S.form,'happy',{shiny:S.shiny,final:S.stage===4})}</div><p class="q">${msg}</p>
    <p class="sub">${esc(S.name)} は「${formName()}」に なったよ</p>
    <div class="btns"><button class="btn" data-act="ok">やったー！</button></div></div>`,
    ()=>{closeModal();
      if(S.stage===4){if(!S.finalSeenAt)S.finalSeenAt=Date.now();save();say('きらきら ひかってる… さいごの すがた だよ');}
      else say(S.stage===3?'おとなに なったよ！ずかん を みてね':'よろしくね！いっぱい あそぼう');
      render();checkEvolve();});
}
/* タッチ（spec §6）：kind = head / belly / stroke / hug / mash */
const TOUCH_LINE={head:'tapHead',belly:'tapBelly',stroke:'stroke',hug:'hug',mash:'dizzy'};
const TOUCH_SFX={head:'pop',belly:'giggle',stroke:'cry',hug:'hug',mash:'dizzy'};
const TOUCH_FX={head:'💗',belly:'💗',stroke:'💗',hug:'💞',mash:'💫'};
function petAct(kind){
  const now=Date.now();lastInteract=now;
  const el=$('#pet');el.classList.remove('wobble');void el.offsetWidth;el.classList.add('wobble');
  if(isNight(new Date(now))){sfx('snore');say(line('sleepTap'));return;}
  if(farewellReady(S,now)){startFarewell();return;}
  if(S.stage===4&&S.sick){say(line('farewellSick'));render();return;}
  if(S.stage===0){sfx('egg');say(line('egg'));return;}
  if(S.sick){say(line('sickTap'));render();return;}
  if(now-S.petAt>30*60e3){S.mood=Math.min(4,S.mood+1);S.petAt=now;save();}
  setReact(kind==='mash'?'dizzy':kind);fxBurst(TOUCH_FX[kind]);sfx(TOUCH_SFX[kind]);
  if(S.stage>=2&&(kind==='head'||kind==='belly')&&Math.random()<.3)sayWord('えへへ。');
  else say(rnd(LINES[TOUCH_LINE[kind]]));
  render();setTimeout(render,2600);
}
/* おわかれ：あいさつ → たまごを渡す → つぎの世代（spec §4.2）。文言は textContent で入れる */
const fill=t=>t.split('{you}').join(S.you).split('{name}').join(S.name);
const pickYou=alts=>fill(alts.find(t=>S.you?t.indexOf('{you}')>=0:t.indexOf('{you}')<0)||alts[0]);
function startFarewell(){
  sfx('farewell');setTimeout(()=>sfx('cry'),1600);
  const pages=LINES.farewell.map(pickYou);let i=0;
  const show=()=>{
    const last=i>=pages.length;
    openModal(`<div class="center"><div class="evo">${last?'<div class="big">🥚</div>':petSVG(S.form,i===pages.length-1?'happy':'normal',{shiny:S.shiny,final:true})}</div>
      <p class="q" id="fwText"></p><div class="btns"><button class="btn" data-act="next">${last?'うけとる':'つぎへ'}</button></div></div>`,
      ()=>{if(last){closeModal();sfx('egg');newGeneration();return;}i++;show();},false);
    $('#fwText').textContent=last?pickYou(LINES.give):pages[i];
  };
  show();
}
function newGeneration(){
  S.history.push({f:S.form,n:S.name,g:S.gen,s:S.shiny});
  if(S.history.length>200)S.history=S.history.slice(-200);
  const keep={name:S.name,you:S.you,gen:Math.min(9999,S.gen+1),zukan:S.zukan,shinySeen:S.shinySeen,history:S.history,
    lessonDays:S.lessonDays,inv:S.inv,day:S.day,cnt:S.cnt,boostUntil:S.boostUntil,sound:S.sound};
  S=Object.assign(DEF(),keep);save();say('たまご を もらったよ！あたためて あげよう');render();
}
function formName(){return (S.stage===4?'かがやく ':'')+(S.shiny?'きらきら ':'')+FORMS[S.form].name;}
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
/* アプリを更新：Service Worker に新しい版を確認させ、入れ替わるのを最大8秒待ってから再読み込み（失敗しても必ず再読み込み） */
async function updateApp(){
  toast('更新を確認しています…');
  try{
    const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
    if(reg){
      await reg.update();
      const w=reg.installing||reg.waiting;
      if(w&&w.state!=='activated') await new Promise(res=>{const t=setTimeout(res,8000);w.addEventListener('statechange',()=>{if(w.state==='activated'||w.state==='redundant'){clearTimeout(t);res();}});});
    }
  }catch(e){}
  location.reload();
}
function openSettings(){
  const opts=(sel,none)=>(none?`<option value="" ${sel==null?'selected':''}>なし</option>`:'')+WD.map((w,i)=>`<option value="${i}" ${i===sel?'selected':''}>${w}</option>`).join('');
  openModal(`<h3>おうちの方の設定</h3>
    <label class="fl">なまえ（8文字まで）<input id="nameIn" maxlength="8" value="${esc(S.name)}"></label>
    <label class="fl">よびかた（お子さんの呼び名・8文字まで。例：はなちゃん）<input id="youIn" maxlength="8" value="${esc(S.you)}" placeholder="空欄なら呼びかけません"></label>
    <label class="fl">中国語レッスンの曜日（1つめ）<select id="dayIn">${opts(S.lessonDays[0],false)}</select></label>
    <label class="fl">中国語レッスンの曜日（2つめ）<select id="day2In">${opts(S.lessonDays[1],true)}</select></label>
    <label class="fl">音（効果音・鳴き声・読み上げ）<select id="soundIn"><option value="on" ${S.sound?'selected':''}>オン</option><option value="off" ${S.sound?'':'selected'}>オフ</option></select></label>
    <div class="btns"><button class="btn small" data-act="save">保存する</button></div>
    <h3>アプリの更新</h3>
    <p class="sub">ホーム画面から開いていて新しい版が反映されないときに押してください。育成データは消えません。（現在の版：${APP_VERSION}）</p>
    <div class="btns"><button class="btn small ghost" data-act="update">アプリを更新する</button></div>
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
      if(act==='save'){
        const n=$('#nameIn').value.trim().slice(0,8);if(n)S.name=n;
        S.you=$('#youIn').value.trim().slice(0,8);
        const d1=+$('#dayIn').value,v2=$('#day2In').value,d2=v2===''?null:+v2;
        S.lessonDays=d2==null||d2===d1?[d1]:[d1,d2];
        S.sound=$('#soundIn').value==='on';setSound(S.sound);
        save();render();toast('保存しました');}
      if(act==='update'){updateApp();return;}
      if(act==='export'){const ta=$('#codeOut');ta.value=encodeState(S);ta.hidden=false;ta.select();
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(()=>toast('コピーしました'),()=>toast('表示されたコードを長押しでコピーしてください'));}
        else toast('表示されたコードを長押しでコピーしてください');}
      if(act==='import'){try{S=decodeState($('#codeIn').value);setSound(S.sound);save();closeModal();say('おかえり！データを もどしたよ');render();toast('復元しました');}catch(e){toast('コードが正しくありません。全体をコピーできているか確認してください');}}
      if(act==='reset'){if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='本当に消す？もう一度タップ';return;}
        S=DEF();setSound(S.sound);save();closeModal();say('あたらしい たまご が きたよ！');render();toast('リセットしました');}
    },true);
}

/* ---------- render ---------- */
function renderBubble(){$('#bubbleText').textContent=bubble.ja;$('#bubbleZh').textContent=bubble.zh;$('#bubbleZh').hidden=!bubble.zh;}
function icons(ic,n){let s='';for(let i=0;i<4;i++)s+=`<span class="gi ${i<n?'on':''}">${ic}</span>`;return s;}
function render(){
  ensureDay();const now=Date.now();
  $('#petName').textContent=S.name;$('#genLabel').textContent=S.gen+'ぴきめ';
  const sleeping=S.stage>0&&isNight(new Date());
  const L=look(S,{night:sleeping,react:now<reactUntil?react:null});
  $('#pet').innerHTML=petSVG(S.form,L.face,{pts:S.pts,shiny:S.shiny,final:S.stage===4,arms:L.arms,think:L.think});
  $('#pet').dataset.pose=L.pose;
  $('#screen').className='screen t-'+band(new Date());
  $('#gauges').innerHTML=S.stage===0?`<span class="glabel">たまご を あたためよう</span>`:
    `<div class="gauge"><span class="glabel">おなか</span>${icons('🍙',S.hunger)}</div><div class="gauge"><span class="glabel">ごきげん</span>${icons('🌸',S.mood)}</div>`;
  let b='';
  if(now<S.boostUntil)b+=`<span class="badge">🚀 ぐんぐんたいむ あと ${Math.ceil((S.boostUntil-now)/H)}じかん</span>`;
  if(S.sick)b+=`<span class="badge sick">🤒 びょうき：ごはん あと ${2-S.cure}こ で なおる</span>`;
  if(sleeping)b+=`<span class="badge">💤 ねんね ちゅう</span>`;
  if(farewellReady(S,now))b+=`<span class="badge letter">💌 ${esc(S.name)} が なにか いいたそう</span>`;
  $('#badges').innerHTML=b;
  if(S.stage<3){const pct=Math.min(100,(S.pts-TH[S.stage])/(TH[S.stage+1]-TH[S.stage])*100);
    $('#growth').innerHTML=`${STAGE[S.stage]}　つぎ の しんか まで<div class="bar"><i data-w="${pct}"></i></div>`;}
  else if(S.stage===3){const pct=Math.min(100,(now-S.adultAt)/(finalDue(S)-S.adultAt)*100);
    $('#growth').innerHTML=`おとな　さいごの すがた まで<div class="bar"><i data-w="${pct}"></i></div>`;}
  else $('#growth').innerHTML=`さいごの すがた<div class="bar"><i data-w="100"></i></div>`;
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
    document.querySelectorAll('[data-w]').forEach(el=>{el.style.width=Math.max(0,Math.min(100,+el.dataset.w||0))+'%';});
  renderBubble();
}

/* ---------- events ---------- */
$('#tasks').addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(b&&!b.disabled)confirmTask(b.dataset.task);});
$('#tray').addEventListener('click',e=>{const b=e.target.closest('[data-food]');if(b)feed(b.dataset.food);});
/* なでなで＝押したまま合計80px、ぎゅー＝700ms ほぼ動かさない、れんだ＝2.5秒に5回、あたま＝上40% */
let ptr=null,holdT2=null,taps=[];
const pet=$('#pet');
pet.addEventListener('pointerdown',e=>{
  const r=pet.getBoundingClientRect();
  ptr={x:e.clientX,y:e.clientY,dist:0,done:false,top:(e.clientY-r.top)/r.height<.4};
  try{pet.setPointerCapture(e.pointerId);}catch(err){}
  clearTimeout(holdT2);holdT2=setTimeout(()=>{if(ptr&&!ptr.done&&ptr.dist<12){ptr.done=true;petAct('hug');}},700);
});
pet.addEventListener('pointermove',e=>{
  if(!ptr)return;
  ptr.dist+=Math.hypot(e.clientX-ptr.x,e.clientY-ptr.y);ptr.x=e.clientX;ptr.y=e.clientY;
  if(!ptr.done&&ptr.dist>=80){ptr.done=true;clearTimeout(holdT2);petAct('stroke');}
});
pet.addEventListener('pointerup',()=>{
  clearTimeout(holdT2);if(!ptr)return;
  const p=ptr;ptr=null;if(p.done)return;
  const now=Date.now();taps=taps.filter(t=>now-t<2500);taps.push(now);
  if(taps.length>=5){taps=[];petAct('mash');}else petAct(p.top?'head':'belly');
});
pet.addEventListener('pointercancel',()=>{clearTimeout(holdT2);ptr=null;});
pet.addEventListener('click',e=>{if(e.detail===0)petAct('belly');});
$('#zukanBtn').addEventListener('click',openZukan);
$('#speakBtn').addEventListener('click',()=>speak(bubble.ja,bubble.zh));
document.addEventListener('pointerdown',unlock,true);
let holdT=null,held=false;
const gear=$('#gear');
gear.addEventListener('pointerdown',()=>{held=false;holdT=setTimeout(()=>{held=true;openSettings();},1000);});
['pointerup','pointerleave','pointercancel'].forEach(ev=>gear.addEventListener(ev,()=>clearTimeout(holdT)));
gear.addEventListener('click',()=>{if(!held)toast('おうちの ひと は ながおし してね');});
gear.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick(Date.now());if(Date.now()-greetAt>=30*60e3)greet();save();render();}});

/* ---------- start ---------- */
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(()=>{});}
/* あいさつ（起動時と、30分以上たって前面に戻った時） */
let greetAt=0;
function greet(){
  greetAt=Date.now();
  if(S.sick)say(line('sick'));
  else if(S.stage===0)say(isNight(new Date())?line('egg'):'たまご を あたためよう。できたこと を おしえてね！');
  else say(line('greet'));
}
/* ひとりごと：起きていて、モーダルが無く、90秒操作が無い時に1回だけ（操作すると数え直し） */
let idleFor=-1;
function idle(now){
  if(S.stage===0||S.sick||isNight(new Date(now))||!$('#modal').hidden)return;
  if(now-lastInteract>=90e3&&idleFor!==lastInteract){idleFor=lastInteract;say(line('idle'));}
}
tick(Date.now());
greet();
setSound(S.sound);
save();render();
setInterval(()=>{const n=Date.now();tick(n);idle(n);save();render();},30000);
