// おへや：もようがえ の画面（#roomTray・#editDone）
// 設計書 docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §4.4
// room-ui.js は #roomView の中で押されるたびに isEditing() を見て #roomView に .editing を付け外しする
// （.editing の間は #roomPet がタップを受けず、Canvas の onCell に届く）。onCell は mount のあとに登録すること。
// 操作：トレイの持ちもの か 置いた家具 をタップして選ぶ → みどり（置ける）／あか（置けない）のマス → マスをタップで置く・動かす。
// 文字は textContent・createElement だけで入れる。data-id は カタログが自分で持つキーかを確かめてから使う。
import {setEdit,onCell} from './room.js';
import {stock,place,move,rotate,remove,placeMask,itemAt,setFloor,setWall} from './room-edit.js';
import {ITEMS,FLOORS,WALLS,has} from './room-data.js';
import {itemSVG,patternSVG} from './room-art.js';
/** @typedef {import('./room-ui.js').RoomCtx} RoomCtx */
/** 選択：なし／持ちもの（{id,r}）／置いた家具（index） @typedef {null|{kind:'own',id:string,r:number}|{kind:'placed',index:number}} Sel */

const MSG={
  hint:'かぐ を えらんで、おきたい ます を おしてね',
  pick:'みどり の ます を おしてね',
  cant:'そこには おけないよ',
  noRot:'ここでは まわせないよ',
  done:'すてきな おへや に なったね',
  empty:'もちもの は ないよ。おみせ で かえるよ',
};
const $=id=>document.getElementById(id);
const dataURI=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);

/** @type {RoomCtx|null} */
let ctx=null;
let editing=false;
let bound=false;
let tab='kagu';
/** @type {Sel} */
let sel=null;
/** 絵の data: URI（id ごとに 1 回だけ作る） */
const uriCache=new Map();

function S(){return ctx.host.getS();}

function artURI(key,make){
  let u=uriCache.get(key);
  if(u===undefined){
    let svg='';
    try{svg=make()||'';}catch(e){svg='';}
    u=svg?dataURI(svg):'';
    uriCache.set(key,u);
  }
  return u;
}

/** 選んでいるものが いまの部屋で まだ正しいか（復元・世代交代で入れ替わったときのため） */
function checkSel(){
  if(!sel)return;
  const s=S(),room=s.room;
  if(sel.kind==='placed'){
    if(!Number.isInteger(sel.index)||sel.index<0||sel.index>=room.items.length)sel=null;
  }else if(!stock(room,s.own).some(t=>t.id===sel.id))sel=null;
}

/** 部屋のマスの色と きいろの線を出し直す */
function showMask(){
  checkSel();
  const room=S().room;
  if(!sel){setEdit({mask:null,sel:-1});return;}
  if(sel.kind==='own'){setEdit({mask:placeMask(room,sel.id,sel.r),sel:-1});return;}
  const p=room.items[sel.index];
  setEdit({mask:placeMask(room,p.id,p.r,sel.index),sel:sel.index});
}

/** 絵つきのカードを 1 まい作る */
function card(kind,id,label,uri,on,count){
  const b=document.createElement('button');
  b.type='button';b.className='tcard'+(on?' on':'');
  b.dataset.kind=kind;b.dataset.id=id;
  b.setAttribute('aria-pressed',on?'true':'false');
  b.setAttribute('aria-label',label+(count?' '+count+' こ':''));
  const img=document.createElement('img');
  img.alt='';img.draggable=false;
  if(uri)img.src=uri;
  b.appendChild(img);
  if(count){
    const c=document.createElement('span');c.className='tnum';c.textContent='×'+count;b.appendChild(c);
  }
  return b;
}

/** トレイ（タブ・カード・まわす／しまう）を描き直す */
function drawTray(){
  const s=S(),room=s.room,list=$('trayList');
  for(const t of document.querySelectorAll('#roomTray .ttab')){
    const on=t.dataset.tab===tab;
    t.classList.toggle('on',on);t.setAttribute('aria-pressed',on?'true':'false');
  }
  list.replaceChildren();
  if(tab==='kagu'){
    const st=stock(room,s.own);
    if(!st.length){
      const p=document.createElement('p');p.className='tempty';p.textContent=MSG.empty;list.appendChild(p);
    }
    for(const {id,left} of st){
      const on=!!sel&&sel.kind==='own'&&sel.id===id;
      list.appendChild(card('kagu',id,ITEMS[id].name,artURI('i:'+id,()=>itemSVG(id).svg),on,left));
    }
  }else{
    const T=tab==='yuka'?FLOORS:WALLS,cur=tab==='yuka'?room.floor:room.wall;
    for(const id of Object.keys(T)){
      if(!(T[id].price===0||(Number(s.own[id])||0)>0))continue;
      list.appendChild(card(tab,id,T[id].name,artURI('p:'+id,()=>patternSVG(id)),id===cur,0));
    }
  }
  const acts=document.querySelector('#roomTray .tacts');
  if(acts)acts.hidden=tab!=='kagu';
  $('trayRotate').disabled=!sel;
  $('trayStore').disabled=!(sel&&sel.kind==='placed');
}

function refresh(){showMask();drawTray();}

/** 部屋を入れ替えて保存・描き直し（room.js が ぷにを空いたマスへ移す） */
function apply(room){
  S().room=room;
  ctx.commit();
  refresh();
}

/** 床のマスを押したとき（§4.4 の 4 つの場合） */
function cell(x,y){
  if(!editing||!ctx)return;
  const s=S(),room=s.room,h=ctx.host;
  const i=itemAt(room,x,y);
  // 1. 置いた家具があれば それを選ぶ
  if(i>=0){
    sel={kind:'placed',index:i};tab='kagu';
    h.sfx('pop');h.say(MSG.pick);refresh();return;
  }
  // 2. 持ちものを置く
  if(sel&&sel.kind==='own'){
    const next=place(room,s.own,sel.id,x,y,sel.r);
    if(next){
      h.sfx('chime');
      const id=sel.id;
      if(!stock(next,s.own).some(t=>t.id===id))sel=null;
      apply(next);return;
    }
  }
  // 3. 置いた家具を動かす
  else if(sel&&sel.kind==='placed'){
    const next=move(room,sel.index,x,y);
    if(next){h.sfx('chime');apply(next);return;}
  }
  // 4. 置けない（何も変えない）／何も選んでいない
  h.sfx('pop');
  h.say(sel?MSG.cant:MSG.hint);
}

function onTab(e){
  const b=e.currentTarget,t=b.dataset.tab;
  if(!editing||(t!=='kagu'&&t!=='yuka'&&t!=='kabe'))return;
  ctx.host.sfx('pop');
  tab=t;
  if(tab!=='kagu')sel=null;
  refresh();
}

function onList(e){
  if(!editing)return;
  const b=e.target instanceof Element?e.target.closest('.tcard'):null;
  if(!b||!$('trayList').contains(b))return;
  const s=S(),kind=b.dataset.kind,id=b.dataset.id,h=ctx.host;
  if(kind==='kagu'&&tab==='kagu'&&has(ITEMS,id)){
    h.sfx('pop');
    if(sel&&sel.kind==='own'&&sel.id===id){sel=null;h.say(MSG.hint);}   // もう一度おすと やめる
    else{sel={kind:'own',id,r:0};h.say(MSG.pick);}
    refresh();
  }else if(kind==='yuka'&&tab==='yuka'&&has(FLOORS,id)){
    const next=setFloor(s.room,s.own,id);
    if(next){h.sfx('pop');apply(next);}
  }else if(kind==='kabe'&&tab==='kabe'&&has(WALLS,id)){
    const next=setWall(s.room,s.own,id);
    if(next){h.sfx('pop');apply(next);}
  }
}

function onRotate(){
  if(!editing||!sel)return;
  const h=ctx.host;
  checkSel();
  if(!sel){refresh();return;}
  if(sel.kind==='own'){sel={...sel,r:(sel.r+1)%4};h.sfx('pop');refresh();return;}
  const next=rotate(S().room,sel.index);
  if(next){h.sfx('pop');apply(next);}
  else{h.sfx('pop');h.say(MSG.noRot);}
}

function onStore(){
  if(!editing||!sel||sel.kind!=='placed')return;
  const next=remove(S().room,sel.index);
  sel=null;
  if(next){ctx.host.sfx('pop');apply(next);}
  else refresh();
  ctx.host.say(MSG.hint);
}

function onDone(){
  if(!editing)return;
  const h=ctx.host;
  endEdit();
  h.sfx('chime');h.say(MSG.done);
  const b=$('editBtn');if(b)b.focus({preventScroll:true});
}

function bind(){
  if(bound)return;
  bound=true;
  for(const t of document.querySelectorAll('#roomTray .ttab'))t.addEventListener('click',onTab);
  $('trayList').addEventListener('click',onList);
  $('trayRotate').addEventListener('click',onRotate);
  $('trayStore').addEventListener('click',onStore);
  $('editDone').addEventListener('click',onDone);
}

/** ボタンの出し入れ（もようがえ中は おみせ・もようがえ を隠して おわり・トレイを出す） */
function showUI(on){
  const sh=$('shopBtn'),eb=$('editBtn'),dn=$('editDone'),tr=$('roomTray');
  if(sh)sh.hidden=on;
  if(eb)eb.hidden=on;
  if(dn)dn.hidden=!on;
  if(tr)tr.hidden=!on;
}

/** もようがえ を始める（おへやが開いて mount したあとに呼ばれる） @param {RoomCtx} c */
export function startEdit(c){
  if(editing||!c)return;
  ctx=c;bind();
  editing=true;tab='kagu';sel=null;
  showUI(true);
  onCell(cell);
  refresh();
  ctx.host.say(MSG.hint);
}

/** もようがえ を終える（していなければ何もしない） */
export function endEdit(){
  if(!editing)return;
  editing=false;sel=null;
  try{setEdit(null);}catch(e){}
  try{onCell(null);}catch(e){}
  showUI(false);
  const l=$('trayList');if(l)l.replaceChildren();
}

/** もようがえ 中か @returns {boolean} */
export function isEditing(){return editing;}
