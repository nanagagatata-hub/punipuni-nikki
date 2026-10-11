// ぷにぷに にっき 本体（状態・描画・操作）
import {H,TH,STAGE,WD,TASKS,FOODS,PARAMS,FORMS,ZORDER,WORDS,PHRASES,LINES} from './data.js';
import {dayKey,band,isNight,asleep,nightKey,minLabel,taskState,taskNote,decay,afterFeed,chooseForm,finalDue,farewellReady,look,pickLine,canUndo,undoReport,undoLabel} from './rules.js';
import {KEY,DEF,loadState,encodeState,decodeState,cleanCfg} from './state.js';
import {petSVG,sceneSVG} from './art.js';
let sceneBand='';
import {speak,sfx,setSound,unlock} from './sound.js';
const APP_VERSION='v2.3.0'; // sw.js の VERSION と同じ値にそろえる

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd=a=>a[Math.floor(Math.random()*a.length)];

function load(){try{return loadState(localStorage);}catch(e){return DEF();}}

function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

let S=load();
let bubble={ja:'',zh:''};
let lastInteract=Date.now();
let react=null,reactUntil=0;
function setReact(k){react=k;reactUntil=Date.now()+2500;}

function ensureDay(){const k=dayKey(new Date()); if(S.day!==k){S.day=k;S.cnt={};S.undo=[];save();}}
function tick(now){
  if(decay(S,now).becameSick) say(line('sick'));
  tickLife(now);
}
/* おとな→さいごのすがた（朝6時以降）。さいごのすがた を見せたら finalSeenAt を記録（spec §4.1） */
function tickLife(now){
  if(!$('#modal').hidden) return;
  if(S.stage===3&&!isNight(new Date(now),S.cfg)&&now>=finalDue(S)){S.stage=4;S.finalAt=now;save();showEvolve();}
  else if(S.stage===4&&!S.finalSeenAt&&!isNight(new Date(now),S.cfg)) showEvolve();
}

/* ---------- drawing ---------- */
/* ---------- speech & fx ---------- */
function say(ja,zh){bubble={ja:ja,zh:zh||''};renderBubble();replay($('.bubble'),'talk');}
/* 同じ動きをもう一度最初から（クラスを付けなおす） */
function replay(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}
const line=k=>pickLine(k,S,new Date());
function sayWord(pre){const w=Math.random()<.5?rnd(WORDS):rnd(PHRASES);say(`${pre}「${w[1]}」は ちゅうごくごで「${w[2]}」だよ！`,w[0]);}
/* 星やハートがはじける。from を省くと ぷにちゃんの所から */
function fxBurst(icon,from){
  const r=(from||$('#pet')).getBoundingClientRect(),list=Array.isArray(icon)?icon:[icon];
  for(let i=0;i<5;i++){
    const s=document.createElement('span');s.className='fx';s.textContent=list[i%list.length];
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
  ensureDay();
  const t=TASKS.find(x=>x.id===id);const st=taskState(t,S,new Date()),undo=canUndo(S,t.id);
  if(!st.ok&&!undo)return;
  /* もう報告できない（済んだ）けれど、エサがまだトレイにある → 取り消しだけ聞く */
  if(!st.ok){
    openModal(`<div class="center"><div class="big">${t.icon}</div><p class="q">まちがえちゃった？</p>
      <p class="sub">${undoLabel(S,t.id)} を もどすと、もらった ${FOODS[t.food].icon} も もどるよ</p>
      <div class="btns"><button class="btn" data-act="undo">↩️ もどす</button><button class="btn ghost" data-act="no">そのまま</button></div></div>`,
      act=>{closeModal();if(act==='undo')cancelReport(t);},true);
    return;
  }
  const label=t.id==='hamigaki'?(st.slot==='am'?'あさの はみがき':'よるの はみがき'):t.label;
  openModal(`<div class="center"><div class="big">${t.icon}</div><p class="q">${label} できた？</p>
    <div class="btns"><button class="btn" data-act="yes">できた！</button><button class="btn ghost" data-act="no">まだ</button></div>
    ${undo?`<div class="btns"><button class="btn small ghost" data-act="undo">↩️ ${t.id==='hamigaki'?undoLabel(S,t.id)+' を もどす':'まちがえた（もどす）'}</button></div>`:''}</div>`,
    act=>{closeModal();if(act==='yes')report(t);else if(act==='undo')cancelReport(t);},true);
}
/* 取り消し：その日の最後の報告を戻し、もらったエサも 1 つ戻す（エサをあげる前だけ） */
function cancelReport(t){
  ensureDay();if(!undoReport(S,t.id))return;
  lastInteract=Date.now();sfx('pop');say(line('undo'));save();render();
  replay(document.querySelector(`[data-task="${t.id}"]`),'unpop');
}
function report(t){
  ensureDay();const st=taskState(t,S,new Date());if(!st.ok)return;
  const key=t.id==='hamigaki'?'hamigaki_'+st.slot:t.id;
  S.cnt[key]=(S.cnt[key]||0)+1;
  S.inv[t.food]=(S.inv[t.food]||0)+1;
  S.undo.push({t:t.id,k:key,f:t.food,b:S.boostUntil,n:S.inv[t.food]});if(S.undo.length>30)S.undo.shift();
  const f=FOODS[t.food];
  if(t.id==='lesson'){S.boostUntil=Date.now()+24*H;say(`すごい！${f.name} を もらったよ。ぐんぐんたいむ が はじまった！`);}
  else say(`${f.name} を もらったよ！した の ${f.icon} を おして あげてね`);
  lastInteract=Date.now();sfx('chime');fxBurst(f.icon);mark={task:t.id,food:t.food};save();render();
  fxBurst(['⭐','✨','💖'],document.querySelector(`[data-task="${t.id}"]`));
}
function feed(fid){
  if(!(S.inv[fid]>0))return;
  const f=FOODS[fid],now=Date.now();lastInteract=now;
  if(asleep(S,now)){say(line('sleepFeed'));return;}
  flyFood(fid);S.inv[fid]--;afterFeed(S);
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
  sfx('fanfare');setTimeout(()=>{fxBurst(['🎉','⭐','✨','💖','🌈']);fxBurst(['⭐','✨']);},250);
  const msg=['','たまごが かえった！','しんか した！','おとなに なった！','さいごの すがた に なった！'][S.stage];
  openModal(`<div class="center"><div class="evo">${petSVG(S.form,'happy',{shiny:S.shiny,final:S.stage===4})}</div><p class="q">${msg}</p>
    <p class="sub">${esc(S.name)} は「${formName()}」に なったよ</p>
    <div class="btns"><button class="btn" data-act="ok">やったー！</button></div></div>`,
    ()=>{closeModal();
      if(S.stage===4){if(!S.finalSeenAt)S.finalSeenAt=Date.now();save();say('きらきら ひかってる… さいごの すがた だよ');}
      else say(S.stage===3?'おとなに なったよ！ずかん を みてね':'よろしくね！いっぱい あそぼう');
      render();checkEvolve();});
}
/* ゆらす演出は 1 回だけ。終わったらクラスを外してポーズのアニメーションに戻す */
let wobT=null;
function wobble(){const el=$('#pet');el.classList.remove('wobble');void el.offsetWidth;el.classList.add('wobble');clearTimeout(wobT);wobT=setTimeout(()=>el.classList.remove('wobble'),700);}
$('#pet').addEventListener('animationend',e=>{if(e.animationName==='wob')$('#pet').classList.remove('wobble');});
/* タッチ（spec §6）：kind = head / belly / stroke / hug / mash */
const TOUCH_LINE={head:'tapHead',belly:'tapBelly',stroke:'stroke',hug:'hug',mash:'dizzy'};
const TOUCH_SFX={head:'pop',belly:'giggle',stroke:'cry',hug:'hug',mash:'dizzy'};
const TOUCH_FX={head:'💗',belly:'💗',stroke:'💗',hug:'💞',mash:'💫'};
function petAct(kind){
  const now=Date.now();lastInteract=now;
  wobble();
  if(asleep(S,now)){sfx('snore');say(line('sleepTap'));return;}
  if(farewellReady(S,now)){startFarewell();return;}
  if(S.stage===4&&S.sick){say(line('farewellSick'));render();return;}
  if(S.stage===0){sfx('egg');say(line('egg'));return;}
  if(S.sick){say(line('sickTap'));render();return;}
  if(now-S.petAt>30*60e3){S.mood=Math.min(4,S.mood+1);S.petAt=now;save();}
  setReact(kind==='mash'?'dizzy':kind);fxBurst(TOUCH_FX[kind]);sfx(TOUCH_SFX[kind]);
  if(S.stage>=2&&(kind==='head'||kind==='belly')&&Math.random()<.3)sayWord('えへへ。');
  else say(line(TOUCH_LINE[kind]));
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
    lessonDays:S.lessonDays,inv:S.inv,day:S.day,cnt:S.cnt,boostUntil:S.boostUntil,sound:S.sound,cfg:S.cfg,tempNight:S.tempNight,undo:S.undo};
  S=Object.assign(DEF(),keep);save();say('たまご を もらったよ！あたためて あげよう');render();
}
function formName(){return (S.stage===4?'かがやく ':'')+(S.shiny?'きらきら ':'')+FORMS[S.form].name;}
function zukanCell(f){
  const seen=S.zukan.indexOf(f)>=0,F=FORMS[f];
  if(!seen) return `<div class="zc">${petSVG(f,'normal',{sil:true})}<b>？？？</b><span>${F.hint}</span></div>`;
  const hist=S.history.filter(h=>h.f===f),last=hist[hist.length-1],shiny=S.shinySeen.indexOf(f)>=0;
  const mark=(hist.length?'🌈':'')+(shiny?'✨':'');
  const memo=last?`${esc(last.n)}・${last.g}ぴきめ${hist.length>1?`<br>ほか ${hist.length-1}ひき`:''}`:'';
  return `<div class="zc">${petSVG(f,'normal')}<b>${F.name}${mark?' '+mark:''}</b><span>${memo}</span></div>`;
}
function openZukan(){
  const sec=(st,title)=>`<h4 class="zh">${title}</h4><div class="zgrid">${ZORDER.filter(f=>FORMS[f].stage===st).map(zukanCell).join('')}</div>`;
  openModal(`<p class="q">ずかん（${S.zukan.length} / ${ZORDER.length}）</p>${sec(1,'あかちゃん')}${sec(2,'こども')}${sec(3,'おとな')}
    <div class="btns"><button class="btn ghost" data-act="close">とじる</button></div>`,()=>closeModal(),true);
  document.querySelectorAll('#sheet .zc').forEach((c,n)=>c.style.setProperty('--d',(n*35)+'ms'));
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
/* 分 ⇔ "HH:MM"（<input type="time"> の値） */
const WDK='日月火水木金土';
const hm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const toMin=v=>{const x=/^(\d{2}):(\d{2})$/.exec(v||'');return x?(+x[1])*60+(+x[2]):NaN;};
function openSettings(){
  const C=S.cfg;
  const opts=(sel,none)=>(none?`<option value="" ${sel==null?'selected':''}>なし</option>`:'')+WD.map((w,i)=>`<option value="${i}" ${i===sel?'selected':''}>${w}</option>`).join('');
  openModal(`<h3>おうちの方の設定</h3>
    <label class="fl">なまえ（8文字まで）<input id="nameIn" maxlength="8" value="${esc(S.name)}"></label>
    <label class="fl">よびかた（お子さんの呼び名・8文字まで。例：〇〇ちゃん）<input id="youIn" maxlength="8" value="${esc(S.you)}" placeholder="空欄なら呼びかけません"></label>
    <label class="fl">中国語レッスンの曜日（1つめ）<select id="dayIn">${opts(S.lessonDays[0],false)}</select></label>
    <label class="fl">中国語レッスンの曜日（2つめ）<select id="day2In">${opts(S.lessonDays[1],true)}</select></label>
    <label class="fl">音（効果音・鳴き声・読み上げ）<select id="soundIn"><option value="on" ${S.sound?'selected':''}>オン</option><option value="off" ${S.sound?'':'selected'}>オフ</option></select></label>
    <div class="btns"><button class="btn small" data-act="save">保存する</button></div>
    <h3>生活リズム</h3>
    <label class="fl">ぷにちゃんが寝る時刻（このあとはエサをあげられません）<input id="sleepIn" type="time" step="300" value="${hm(C.sleepAt)}"></label>
    <label class="fl">ぷにちゃんが起きる時刻<input id="wakeIn" type="time" step="300" value="${hm(C.wakeAt)}"></label>
    <label class="fl">「はやおき」を受け付ける時刻<span class="row2"><input id="hoFrom" type="time" step="300" value="${hm(C.hayaoki.from)}">〜<input id="hoUntil" type="time" step="300" value="${hm(C.hayaoki.until)}"></span></label>
    <div class="fl">「はやおき」の曜日<span class="days">${WD.map((w,i)=>`<label><input type="checkbox" id="hoDay${i}" ${C.hayaoki.days.indexOf(i)>=0?'checked':''}>${WDK[i]}</label>`).join('')}</span></div>
    <label class="fl">「はやね」を受け付け始める時刻<input id="hnFrom" type="time" step="300" value="${hm(C.hayane.from)}"></label>
    <div class="fl">「はやね」の締め切り（曜日ごと）<span class="days">${WD.map((w,i)=>`<label class="dl">${WDK[i]}<input id="hnUntil${i}" type="time" step="300" value="${hm(C.hayane.until[i])}"></label>`).join('')}</span></div>
    <label class="fl">ねんね中の「ちょっとだけ おきて」ボタン（ひと晩1回・5分だけエサをあげられます）<select id="tempIn"><option value="off" ${C.tempWake?'':'selected'}>出さない</option><option value="on" ${C.tempWake?'selected':''}>出す</option></select></label>
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
        const cand={sleepAt:toMin($('#sleepIn').value),wakeAt:toMin($('#wakeIn').value),
          hayaoki:{from:toMin($('#hoFrom').value),until:toMin($('#hoUntil').value),days:[0,1,2,3,4,5,6].filter(i=>$('#hoDay'+i).checked)},
          hayane:{from:toMin($('#hnFrom').value),until:[0,1,2,3,4,5,6].map(i=>toMin($('#hnUntil'+i).value))},tempWake:$('#tempIn').value==='on'};
        /* sanitize と同じ検証を通し、1 つでも直されたら保存しない（ほかの設定は保存済み） */
        if(JSON.stringify(cleanCfg(cand))!==JSON.stringify(cand)){save();render();toast('生活リズムの時刻が正しくありません（寝る 18:00〜23:30・起きる 4:00〜9:00、終わりは始まりより後）。ほかの設定は保存しました');return;}
        S.cfg=cand;save();render();toast('保存しました');}
      if(act==='update'){updateApp();return;}
      if(act==='export'){const ta=$('#codeOut');ta.value=encodeState(S);ta.hidden=false;ta.select();
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(()=>toast('コピーしました'),()=>toast('表示されたコードを長押しでコピーしてください'));}
        else toast('表示されたコードを長押しでコピーしてください');}
      if(act==='import'){
        let next;try{next=decodeState($('#codeIn').value);}catch(e){toast('コードが正しくありません。全体をコピーできているか確認してください');return;}
        if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='今のデータを置き換えます。もう一度タップ';return;}
        try{S=next;setSound(S.sound);save();closeModal();say('おかえり！データを もどしたよ');render();toast('復元しました');}catch(e){toast('コードが正しくありません。全体をコピーできているか確認してください');}}
      if(act==='reset'){if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='本当に消す？もう一度タップ';return;}
        S=DEF();setSound(S.sound);save();closeModal();say('あたらしい たまご が きたよ！');render();toast('リセットしました');}
    },true);
}

/* ---------- render ---------- */
function renderBubble(){$('#bubbleText').textContent=bubble.ja;$('#bubbleZh').textContent=bubble.zh;$('#bubbleZh').hidden=!bubble.zh;}
/* ゲージ：前より ふえた所に boing を付ける */
function icons(ic,n,prev){let s='';for(let i=0;i<4;i++)s+=`<span class="gi ${i<n?'on':''} ${i>=prev&&i<n?'boing':''}">${ic}</span>`;return s;}
/* できたこと・エサ の動きの目印（1 回の描画で使って消す）と、前回のゲージ・ポイント */
let mark={},lastG=null,lastPts=null;
/* エサが トレイから ぷにちゃんへ飛んでいく */
function flyFood(fid){
  const b=document.querySelector(`#tray [data-food="${fid}"]`);if(!b)return;
  const r=b.getBoundingClientRect(),p=$('#pet').getBoundingClientRect(),s=document.createElement('span');
  s.className='flyfood';s.textContent=FOODS[fid].icon;s.style.left=(r.left+r.width/2-20)+'px';s.style.top=(r.top+r.height/2-24)+'px';
  s.style.setProperty('--tx',(p.left+p.width/2-r.left-r.width/2)+'px');s.style.setProperty('--ty',(p.top+p.height*.55-r.top-r.height/2)+'px');
  document.body.appendChild(s);setTimeout(()=>s.remove(),700);
}
function render(){
  ensureDay();const now=Date.now();
  $('#petName').textContent=S.name;$('#genLabel').textContent=S.gen+'ぴきめ';
  const sleeping=S.stage>0&&asleep(S,now);
  const L=look(S,{night:sleeping,react:now<reactUntil?react:null});
  $('#pet').innerHTML=petSVG(S.form,L.face,{pts:S.pts,shiny:S.shiny,final:S.stage===4,arms:L.arms,think:L.think});
  $('#pet').dataset.pose=L.pose;
  const bd=band(new Date(),S.cfg);$('#screen').className='screen t-'+bd;
  if(sceneBand!==bd){$('#scene').innerHTML=sceneSVG(bd);sceneBand=bd;}
  $('#gauges').innerHTML=S.stage===0?`<span class="glabel">たまご を あたためよう</span>`:
    `<div class="gauge"><span class="glabel">おなか</span>${icons('🍙',S.hunger,lastG?lastG.h:S.hunger)}</div><div class="gauge"><span class="glabel">ごきげん</span>${icons('🌸',S.mood,lastG?lastG.m:S.mood)}</div>`;
  lastG={h:S.hunger,m:S.mood};
  let b='';
  if(now<S.boostUntil)b+=`<span class="badge">🚀 ぐんぐんたいむ あと ${Math.ceil((S.boostUntil-now)/H)}じかん</span>`;
  if(S.sick)b+=`<span class="badge sick">🤒 びょうき：ごはん あと ${2-S.cure}こ で なおる</span>`;
  if(sleeping)b+=`<span class="badge">💤 ねんね ちゅう</span>`;
  const night=isNight(new Date(now),S.cfg);
  if(night&&now<S.tempUntil)b+=`<span class="badge">⏰ あと ${minLabel(Math.ceil((S.tempUntil-now)/60e3))} おきてるよ</span>`;
  else if(night&&S.cfg.tempWake&&S.tempNight!==nightKey(now,S.cfg))b+=`<button class="badge wakebtn" id="tempWake">⏰ ちょっとだけ おきて</button>`;
  if(farewellReady(S,now))b+=`<span class="badge letter">💌 ${esc(S.name)} が なにか いいたそう</span>`;
  $('#badges').innerHTML=b;
  if(S.stage<3){const pct=Math.min(100,(S.pts-TH[S.stage])/(TH[S.stage+1]-TH[S.stage])*100);
    $('#growth').innerHTML=`${STAGE[S.stage]}　つぎ の しんか まで<div class="bar"><i data-w="${pct}"></i></div>`;}
  else if(S.stage===3){const pct=Math.min(100,(now-S.adultAt)/(finalDue(S)-S.adultAt)*100);
    $('#growth').innerHTML=`おとな　さいごの すがた まで<div class="bar"><i data-w="${pct}"></i></div>`;}
  else $('#growth').innerHTML=`さいごの すがた<div class="bar"><i data-w="100"></i></div>`;
  if(lastPts!=null&&S.pts>lastPts)replay($('#growth .bar'),'shine');
  lastPts=S.pts;
  const foods=Object.keys(FOODS).filter(k=>S.inv[k]>0);
  $('#tray').innerHTML=foods.length?foods.map(k=>`<button class="food${k===mark.food?' popin':''}" data-food="${k}" aria-label="${FOODS[k].name} を あげる">${FOODS[k].icon}<span class="n">${S.inv[k]}</span></button>`).join(''):
    `<p class="empty">できたこと を おしえると<br>ごはん が もらえるよ</p>`;
  $('#tasks').innerHTML=TASKS.map(t=>{
    const st=taskState(t,S,new Date()),note=taskNote(t,S,st);
    let dots='',tf=st.ok?FOODS[t.food].icon:st.why==='done'?'💮':st.why==='day'?'📅':'⏰';
    if(note)dots=note;
    else if(t.id==='hamigaki'){dots=`<span class="dot ${S.cnt.hamigaki_am?'on':''}"></span>あさ <span class="dot ${S.cnt.hamigaki_pm?'on':''}"></span>よる`;}
    else{for(let i=0;i<t.limit;i++)dots+=`<span class="dot ${i<(S.cnt[t.id]||0)?'on':''}"></span>`;}
    /* 済んでいても、取り消せる間は押せる（見た目は済んだまま） */
    const off=!st.ok&&!canUndo(S,t.id);
    return `<button class="task${!st.ok&&!off?' done':''}" data-task="${t.id}" aria-label="${t.label}" ${off?'disabled':''}><span class="tf${t.id===mark.task?' stamp':''}">${tf}</span><span class="ti">${t.icon}</span><span class="tl">${t.short}</span><span class="td">${dots}</span></button>`;
  }).join('');
  mark={};
  const mx=Math.max(10,...PARAMS.map(p=>S.p[p[0]]));
  $('#params').innerHTML=PARAMS.map(p=>`<div class="prow"><span>${p[1]}</span><span>${p[2]}</span><div class="bar"><i data-w="${S.p[p[0]]/mx*100}"></i></div><b>${Math.floor(S.p[p[0]])}</b></div>`).join('');
    document.querySelectorAll('[data-w]').forEach(el=>{el.style.width=Math.max(0,Math.min(100,+el.dataset.w||0))+'%';});
  renderBubble();
}

/* ---------- events ---------- */
/* ちょっとだけ おきて：ひと晩 1 回、5 分 */
$('#badges').addEventListener('click',e=>{
  if(!e.target.closest('#tempWake'))return;
  const now=Date.now();if(!(S.cfg.tempWake&&isNight(new Date(now),S.cfg)&&S.tempNight!==nightKey(now,S.cfg)))return;
  S.tempUntil=now+5*60e3;S.tempNight=nightKey(now,S.cfg);lastInteract=now;save();
  sfx('cry');say(line('tempWake'));render();setTimeout(render,5*60e3+500);
});
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
/* iPad はタッチの pointerdown では音を有効にできないことがあるので、離した時・click でも試す */
['pointerdown','pointerup','touchend','click'].forEach(ev=>document.addEventListener(ev,unlock,true));
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
  else if(S.stage===0)say(isNight(new Date(),S.cfg)?line('egg'):'たまご を あたためよう。できたこと を おしえてね！');
  else say(line('greet'));
}
/* ひとりごと：起きていて、モーダルが無く、90秒操作が無い時に1回だけ（操作すると数え直し） */
let idleFor=-1;
function idle(now){
  if(S.stage===0||S.sick||asleep(S,now)||!$('#modal').hidden)return;
  if(now-lastInteract>=90e3&&idleFor!==lastInteract){idleFor=lastInteract;say(line('idle'));}
}
tick(Date.now());
greet();
setSound(S.sound);
save();render();
setInterval(()=>{const n=Date.now();tick(n);idle(n);save();render();},30000);
