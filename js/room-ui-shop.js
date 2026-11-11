// おへや：おみせ の画面（#roomShop）
// 設計書 docs/superpowers/specs/2026-11-10-oheya-room-mode-and-stage2-design.md §4.3
// 文字は textContent・createElement だけで入れる。data-id は読み戻したら cardState() で確かめる。
import {SHOP_CATS,shopCards,cardState,buy} from './room-shop.js';
import {ITEMS,FLOORS,WALLS,EXPANDS,has} from './room-data.js';
import {itemSVG,patternSVG} from './room-art.js';
/** @typedef {import('./room-ui.js').RoomCtx} RoomCtx */
/** @typedef {import('./room-shop.js').ShopCat} ShopCat */
/** @typedef {import('./room-shop.js').Card} Card */

const $=id=>document.getElementById(id);
const COIN='🪙 ';
/** おみせ を開いている間 さわれなくする、おへや の部分 */
const BEHIND=['roomStage','.rbar','.rbubble'];

/** @type {RoomCtx|null} */
let ctx=null;
let open=false;
let bound=false;
/** @type {ShopCat} */
let cat='kagu';
/** 「これを かう？」で えらんでいる id（無ければ ''） */
let pending='';

/** id → 見本の絵（SVG の文字列）。知らない id は '' */
function artOf(id){
  if(has(ITEMS,id)){const a=itemSVG(id);return a&&typeof a.svg==='string'?a.svg:'';}
  if(has(FLOORS,id)||has(WALLS,id))return patternSVG(id);
  return '';
}

/** id → data: URI（たな を切りかえる・かう たびに 作り直さない。絵が無ければ ''） @type {Map<string,string>} */
const uriCache=new Map();
function artURI(id){
  let u=uriCache.get(id);
  if(u===undefined){
    let svg='';
    try{svg=artOf(id);}catch(e){svg='';}
    u=svg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg):'';
    uriCache.set(id,u);
  }
  return u;
}

/** 絵の <img>（ひろげる は 絵の代わりに 大きな文字） */
function artEl(id){
  if(has(EXPANDS,id)){
    const s=document.createElement('span');s.className='sart-x';s.setAttribute('aria-hidden','true');
    s.textContent=EXPANDS[id].to+'×'+EXPANDS[id].to;
    return s;
  }
  const im=document.createElement('img');
  im.className='sart';im.alt='';im.decoding='async';
  const u=artURI(id);
  if(u)im.src=u;
  return im;
}

/** 状態ごとの ことば @param {Card} c */
function noteOf(c){
  switch(c.state){
    case 'ok':return COIN+c.price;
    case 'short':return 'あと '+COIN+c.need;
    case 'owned':return cat==='hiroge'?'ひろげたよ':'もってる';
    case 'max':return 'いっぱい もってるよ';
    case 'locked':return 'さきに ひろい おへや を かってね';
  }
  return '';
}

/** カードを並べ直す（たな と こいん が変わったとき） */
function renderCards(){
  if(!ctx)return;
  const S=ctx.host.getS();
  for(const b of document.querySelectorAll('#roomShop .stab')){
    const on=b.dataset.cat===cat;
    b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');
  }
  const box=$('shopCards');
  box.replaceChildren();
  for(const c of shopCards(S,cat)){
    const b=document.createElement('button');
    b.type='button';b.className='scard s-'+c.state;b.dataset.id=c.id;
    b.disabled=c.state!=='ok';
    b.appendChild(artEl(c.id));
    const nm=document.createElement('span');nm.className='sname';nm.textContent=c.name;b.appendChild(nm);
    const note=document.createElement('span');note.className='snote';note.textContent=noteOf(c);b.appendChild(note);
    if(cat==='kagu'&&c.have>0&&c.state==='ok'){
      const h=document.createElement('span');h.className='shave';h.textContent='もってる '+c.have;b.appendChild(h);
    }
    box.appendChild(b);
  }
}

/** 「これを かう？」を出す */
function ask(id){
  if(!ctx)return;
  const S=ctx.host.getS();
  if(cardState(S,id)!=='ok')return;
  const c=shopCards(S,cat).find(x=>x.id===id);
  if(!c)return;
  pending=id;
  const art=$('shopConfirmArt');art.replaceChildren(artEl(id));
  const q=document.createElement('span');q.className='sask';q.textContent='これを かう？';
  const n=document.createElement('span');n.className='sname';n.textContent=c.name;
  $('shopConfirmName').replaceChildren(q,n);
  $('shopConfirmPrice').textContent=COIN+c.price;
  $('shopBuy').disabled=false;
  $('shopConfirm').hidden=false;
  $('shopCards').toggleAttribute('inert',true);
  $('shopBuy').focus({preventScroll:true});
}

/** 「これを かう？」を閉じる */
function hideAsk(){
  pending='';
  const c=$('shopConfirm');if(c)c.hidden=true;
  const l=$('shopCards');if(l)l.removeAttribute('inert');
}

/** 「かう」 */
function doBuy(){
  if(!ctx||!pending)return;
  const id=pending;
  hideAsk(); // 2 回目の「かう」は ここで止まる
  const S=ctx.host.getS();
  const kagu=has(ITEMS,id);
  if(!buy(S,id)){ctx.host.sfx('pop');ctx.host.say('ごめんね、いまは かえなかったよ');renderCards();return;}
  ctx.commit();          // 保存・部屋の描き直し・おへや の こいん
  try{ctx.host.render();}catch(e){} // 普段の画面の こいん（#coin）
  ctx.host.sfx('chime');
  const msg=kagu?'かった！ もようがえ で おいてね':'かった！';
  ctx.host.say(msg);ctx.host.toast(msg);
  renderCards();
}

function bind(){
  if(bound)return;
  bound=true;
  for(const b of document.querySelectorAll('#roomShop .stab')){
    b.addEventListener('click',()=>{
      const k=b.dataset.cat;
      if(!open||!SHOP_CATS.includes(/** @type {any} */(k)))return;
      ctx.host.sfx('pop');cat=/** @type {ShopCat} */(k);hideAsk();renderCards();
    });
  }
  $('shopCards').addEventListener('click',e=>{
    if(!open||pending)return;
    const t=e.target instanceof Element?e.target.closest('.scard'):null;
    if(!t||t.disabled)return;
    const id=t.getAttribute('data-id')||'';
    if(cardState(ctx.host.getS(),id)===null)return; // 知らない id は無視
    ctx.host.sfx('pop');ask(id);
  });
  $('shopBuy').addEventListener('click',()=>{if(open)doBuy();});
  $('shopCancel').addEventListener('click',()=>{if(open){ctx.host.sfx('pop');hideAsk();}});
  $('shopClose').addEventListener('click',()=>{if(open){ctx.host.sfx('pop');closeShop();}});
}

/** おへや の部分を さわれなくする／もどす */
function setBehind(on){
  for(const sel of BEHIND){
    const el=sel[0]==='.'?document.querySelector('#roomView '+sel):$(sel);
    if(el)el.toggleAttribute('inert',on);
  }
}

/** おみせ を開く @param {RoomCtx} c */
export function openShop(c){
  if(!c)return;
  ctx=c;bind();
  if(open){renderCards();return;}
  open=true;
  hideAsk();
  renderCards();
  $('roomShop').hidden=false;
  setBehind(true);
  const b=$('shopClose');if(b)b.focus({preventScroll:true});
}

/** おみせ を閉じる（開いていなければ何もしない） */
export function closeShop(){
  if(!open)return;
  open=false;
  hideAsk();
  const s=$('roomShop');if(s)s.hidden=true;
  setBehind(false);
  const b=$('shopBtn');
  const v=$('roomView');
  if(b&&v&&!v.hidden)b.focus({preventScroll:true});
}

/** おみせ が開いているか @returns {boolean} */
export function isShopOpen(){return open;}
