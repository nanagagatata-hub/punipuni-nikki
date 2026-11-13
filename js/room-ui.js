// おへやモードの画面（#roomView）：開く・閉じる・なでる・ゲージ・失敗したとき
// 設計書 docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §4.2
// 段階4（タップのきまり）: docs/superpowers/specs/2026-11-11-oheya-stage4-furniture-play-design.md §4.2
// app.js は host を渡すだけ。おへやの DOM は ここ（と room-ui-shop.js・room-ui-edit.js）だけが触る。
// 文字は textContent・createElement だけで入れる（なまえ も）。
import {mount,unmount,update,hold,poke,setRoom,onTap,useItem,callTo,wiggle,burstAt} from './room.js';
import {USES,has} from './room-data.js';
import {openShop,closeShop} from './room-ui-shop.js';
import {startEdit,endEdit,isEditing} from './room-ui-edit.js';

/** @typedef {{getS:()=>any, save:()=>void, render:()=>void, say:(ja:string,zh?:string)=>void, sfx:(k:string,voice?:string)=>void,
 *   toast:(m:string)=>void, bindPet:(el:HTMLElement,hooks?:{down?:()=>void,up?:()=>void})=>void}} RoomHost */
/** @typedef {{host:RoomHost, commit:()=>void}} RoomCtx */

const FAIL_MSG='おへや を ひらけなかったよ';
const FAR_MSG='とどかないよ';
/** 行けないときの ひとこと（mode ごと。egg・dance は言わない） */
const BUSY_MSG={sleep:'いまは ねむいの…',sick:'ちょっと しんどいの…',hungry:'おなか すいて うごけないよ'};
const $=id=>document.getElementById(id);

/** @type {RoomHost|null} */
let host=null;
/** @type {RoomCtx|null} */
let ctx=null;
let open=false;
let lastRoom=null;   // setRoom に渡した S.room（入れ替わったら渡し直す）
let mode='awake';    // refreshRoom の snap.mode（行けないときの ひとこと に使う）

/** こいんの表示（#roomCoin・#shopCoin） */
function showCoin(){
  const S=host.getS(),n=Math.max(0,Math.floor(Number(S.coin))||0);
  for(const id of ['roomCoin','shopCoin']){
    const el=$(id);if(!el)continue;
    el.textContent='';
    const im=document.createElement('img');im.className='ico';im.alt='';im.draggable=false;im.src='./icons/ui/coin.webp';
    el.append(im,' '+n);el.setAttribute('aria-label','こいん '+n+' まい');
  }
}

/** もようがえ中は #roomPet がタップを受けない（Canvas の onCell に届くように） */
function syncEdit(){
  const v=$('roomView');
  if(v)v.classList.toggle('editing',open&&isEditing());
}

/** 部屋を変えたあと：保存 → 描き直し → こいんの表示 */
function commit(){
  if(!host)return;
  host.save();
  const S=host.getS();
  if(open){lastRoom=S.room;setRoom(S.room);}
  showCoin();
}

/** 背面（普段の画面）を さわれなくする／もどす */
function setBack(on){
  for(const sel of ['.top','.layout']){
    const el=document.querySelector(sel);
    if(el)el.toggleAttribute('inert',on);
  }
  document.body.classList.toggle('inroom',on);
}

/** ぷにが家具を使い始めたとき（room.js から）：その家具の ひとこと */
function onUse(id){
  if(!host||!has(USES,id))return;
  const u=USES[id];
  if(u&&u.say)host.say(u.say);
}

/** 行けなかったときの ひとこと */
function sayResult(res){
  if(res==='busy'){if(has(BUSY_MSG,mode))host.say(BUSY_MSG[mode]);}
  else if(res==='far')host.say(FAR_MSG);
}

/** ふだんの タップ（もようがえ中は何もしない）。家具 → ゆらして使いに行く、床 → ★ を出して呼ぶ */
function tap(x,y,hit,px,py){
  if(!open||!host||isEditing())return;
  if(hit>=0){
    wiggle(hit);host.sfx('pop');
    sayResult(useItem(hit)); // 'none'（USES に無い）は何も言わない
  }else if(x>=0&&y>=0){
    burstAt(px,py);host.sfx('pop');
    sayResult(callTo(x,y));
  }
}

function fail(){
  if(!open)return;
  closeRoom();
  if(host)host.toast(FAIL_MSG);
}

/** 起動時に 1 回。ボタンと なでる を つなぐ
 * @param {RoomHost} h */
export function initRoomUI(h){
  host=h;ctx={host:h,commit};
  $('roomBack').addEventListener('click',()=>{host.sfx('pop');closeRoom();});
  $('shopBtn').addEventListener('click',()=>{if(open){host.sfx('pop');openShop(ctx);}});
  $('editBtn').addEventListener('click',()=>{if(open){host.sfx('pop');startEdit(ctx);syncEdit();}});
  // 中のボタン（おわり など）で もようがえ が終わったら .editing を外す（ボタンの処理のあと、ここまで上がってくる）
  $('roomView').addEventListener('click',syncEdit);
  h.bindPet($('roomPet'),{down:()=>hold(true),up:()=>hold(false)});
}

/** おへや を開く。開けなければ閉じたまま トーストを出して false
 * @returns {boolean} */
export function openRoom(){
  if(open)return true;
  if(!host)return false;
  const S=host.getS();
  open=true;
  $('roomView').hidden=false; // 先に見せる（大きさが測れるように）
  setBack(true);
  let ok=false;
  try{ok=mount($('roomScene'),$('roomPet'),{room:S.room,onFail:fail,onUse});onTap(tap);}catch(e){ok=false;}
  if(!ok||!open){fail();return false;}
  lastRoom=S.room;
  try{host.render();}catch(e){fail();return false;} // render の最後で refreshRoom が呼ばれる
  if(!open)return false;
  const b=$('roomBack');if(b)b.focus({preventScroll:true});
  return true;
}

/** おへや を閉じる（もようがえ・おみせ を先に終わらせる）。閉じている間は rAF・Canvas・リスナーが無い */
export function closeRoom(){
  try{closeShop();}catch(e){}
  try{endEdit();}catch(e){}
  try{unmount();}catch(e){}
  const wasOpen=open;
  open=false;lastRoom=null;
  const v=$('roomView');
  if(v){v.hidden=true;v.classList.remove('editing');}
  setBack(false);
  if(wasOpen){const b=$('oheyaBtn');if(b)b.focus({preventScroll:true});}
}

/** @returns {boolean} */
export function isRoomOpen(){return open;}

/** render() の最後に呼ばれる。閉じていれば何もしない
 * @param {{view:any,mode:string,band:string,now:number}} snap */
export function refreshRoom(snap){
  if(!open||!host)return;
  const S=host.getS();
  if(S.room!==lastRoom){lastRoom=S.room;setRoom(S.room);} // 世代交代・復元などで入れ替わった
  mode=snap&&typeof snap.mode==='string'?snap.mode:'awake';
  try{update(snap);}catch(e){fail();return;}
  $('roomName').textContent=S.name;
  showCoin();
}

/** さわったときの ぷるん（おへやが開いているときだけ） */
export function roomPoke(){if(open)poke();}
