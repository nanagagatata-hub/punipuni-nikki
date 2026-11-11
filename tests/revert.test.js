// 普段の画面が v2.4.0 に戻っていて、こいんだけが足されていること（node --test tests/revert.test.js）
// ファイルを文字列として読むだけ。DOM は使わない。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const APP=read('js/app.js'),CSS=read('css/style.css'),HTML=read('index.html');
const count=(s,x)=>s.split(x).length-1;
/* function name( から 次の行頭の function まで */
function body(name){
  const i=APP.indexOf('\nfunction '+name+'(');assert.ok(i>=0,name+' が無い');
  const j=APP.indexOf('\nfunction ',i+1);
  return APP.slice(i,j<0?APP.length:j);
}

/* v2.4.0（4261140）の render() から取った 3 行 */
const V240_PET="  $('#pet').innerHTML=petSVG(S.form,L.face,{pts:S.pts,shiny:S.shiny,final:S.stage===4,arms:L.arms,think:L.think});\n";
const V240_SCREEN="  const bd=band(new Date(),S.cfg);$('#screen').className='screen t-'+bd;\n";
const V240_SCENE="  if(sceneBand!==bd){$('#scene').innerHTML=sceneSVG(bd);sceneBand=bd;}\n";

test('段階1の おへや の組み込みが残っていない',()=>{
  for(const w of ['roomOn','roomHold','roomOff',"from './room.js'"])assert.ok(!APP.includes(w),'app.js に '+w);
  for(const w of ['roomOn','roomHold','roomOff','.screen.room'])assert.ok(!CSS.includes(w),'style.css に '+w);
});

test('render() に v2.4.0 の 3 行がそのままある',()=>{
  const r=body('render');
  assert.ok(r.includes(V240_PET),'#pet の行');
  assert.ok(r.includes(V240_SCREEN),'#screen の行');
  assert.ok(r.includes(V240_SCENE),'#scene の行');
  assert.ok(r.indexOf(V240_PET)<r.indexOf(V240_SCREEN)&&r.indexOf(V240_SCREEN)<r.indexOf(V240_SCENE),'順番');
});

test('report() は こいんを 1 回だけ（等倍で）もらい、取り消し用に c を残す',()=>{
  const r=body('report');
  assert.equal(count(r,'grantCoin(S,FOODS[t.food].pt)'),1);
  assert.equal(count(APP,'grantCoin('),1,'grantCoin( は app.js 全体で 1 か所');
  const m=r.match(/S\.undo\.push\(\{([^}]*)\}\)/);
  assert.ok(m,'undo.push');
  assert.ok(/(^|,)c(:|,|$)/.test(m[1]),'undo の項目に c');
  assert.ok(/import \{[^}]*\bgrantCoin\b[^}]*\} from '\.\/rules\.js'/.test(APP),'grantCoin を rules.js から読む');
});

test('newGeneration() は こいん・持ちもの・部屋を引き継ぐ',()=>{
  const m=body('newGeneration').match(/const keep=\{([\s\S]*?)\};/);
  assert.ok(m,'keep');
  for(const k of ['coin:S.coin','own:S.own','room:S.room'])assert.ok(m[1].includes(k),k);
});

test('render() の最後で こいんの表示を更新する',()=>{
  assert.ok(APP.includes('\nfunction setCoin(n){'),'setCoin(n)');
  const r=body('render');
  assert.ok(r.includes('setCoin(S.coin)'),'render が setCoin を呼ぶ');
  assert.ok(r.indexOf('setCoin(S.coin)')>r.indexOf('renderBubble()'),'最後に呼ぶ');
});

test('ヘッダーの並びは こいん・ずかん・おへや・せってい',()=>{
  const i=HTML.indexOf('class="topbtns"');assert.ok(i>=0);
  const t=HTML.slice(i,HTML.indexOf('</header>',i));
  const c=t.indexOf('<span class="coin" id="coin" role="status"></span>'),z=t.indexOf('id="zukanBtn"'),o=t.indexOf('<button class="pill" id="oheyaBtn">🏠 おへや</button>'),g=t.indexOf('id="gear"');
  assert.ok(c>=0&&z>=0&&o>=0&&g>=0,'#coin・#zukanBtn・#oheyaBtn・#gear がある');
  assert.ok(c<z&&z<o&&o<g,'順番');
});

test('fxBurst() の既定の対象は おへやが開いているかで分かれる',()=>{
  const f=body('fxBurst');
  assert.ok(/isRoomOpen\(\)\?\$\('#roomPet'\):\$\('#pet'\)/.test(f),'isRoomOpen()?#roomPet:#pet');
  assert.ok(/import \{[^}]*\bisRoomOpen\b[^}]*\} from '\.\/room-ui\.js'/.test(APP),'isRoomOpen を room-ui.js から読む');
});

test('#roomView は hidden で始まる静的な枠。インラインの style・onclick なし',()=>{
  const m=HTML.match(/<div[^>]*\bid="roomView"[^>]*>/);
  assert.ok(m,'#roomView');
  assert.ok(/\shidden(\s|>|=)/.test(m[0]),'hidden');
  assert.ok(!/\sstyle=/.test(HTML),'style= が無い');
  assert.ok(!/onclick/i.test(HTML),'onclick が無い');
  for(const id of ['roomBack','roomName','roomCoin','roomStage','roomScene','roomPet','shopBtn','editBtn','editDone','roomBubbleText','roomBubbleZh','roomTray','roomShop',
    'shopCoin','shopClose','shopCards','shopConfirm','shopConfirmArt','shopConfirmName','shopConfirmPrice','shopBuy','shopCancel','trayList','trayRotate','trayStore'])
    assert.ok(HTML.includes('id="'+id+'"'),'#'+id);
});

test('おへやの上の帯：もどる・なまえ・こいん・おみせ・もようがえ・おわり の順。ゲージは無い（部屋を大きく見せる）',()=>{
  const top=HTML.match(/<div class="rtop">([\s\S]*?)<\/div>/);
  assert.ok(top,'.rtop');
  const ids=[...top[1].matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['roomBack','roomName','roomCoin','shopBtn','editBtn','editDone']);
  assert.ok(!HTML.includes('roomGauges'),'#roomGauges が無い');
  assert.ok(!HTML.includes('class="rbar"'),'.rbar が無い');
  assert.ok(!read('js/room-ui.js').includes('roomGauges'),'room-ui.js がゲージを描かない');
});

test('room-ui*.js は innerHTML を使わない（textContent・createElement だけ）',()=>{
  for(const f of ['js/room-ui.js','js/room-ui-shop.js','js/room-ui-edit.js']){
    const src=read(f);
    assert.ok(!src.includes('innerHTML'),f+' に innerHTML');
    assert.ok(!src.includes('outerHTML')&&!src.includes('insertAdjacentHTML'),f+' に HTML の差し込み');
  }
});

test('こいんの見た目（.coin と 0.5 秒の coinpop）がある',()=>{
  assert.ok(/\.coin\{/.test(CSS),'.coin');
  assert.ok(/\.coin\.coinpop\{animation:coinpop \.5s/.test(CSS),'.coin.coinpop');
  assert.ok(CSS.includes('@keyframes coinpop'),'@keyframes coinpop');
});

/* ---- 版とオフライン用キャッシュ ---- */
const SW=read('sw.js');
/* sw.js の ASSETS 配列を文字列の一覧として取り出す */
function swAssets(){
  const m=SW.match(/const ASSETS\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(m,'sw.js に ASSETS が無い');
  return [...m[1].matchAll(/'([^']*)'/g)].map(x=>x[1]);
}
/* js/app.js から import・export from・import() をたどり、実行時に読み込まれうる js をすべて集める（コメント内の型注釈は除く） */
function reachable(){
  const seen=new Set(),todo=['app.js'];
  while(todo.length){
    const f=todo.pop();if(seen.has(f))continue;seen.add(f);
    const src=read('js/'+f).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
    for(const m of src.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*'\.\/([^']+)'/g))todo.push(m[1]);
    for(const m of src.matchAll(/\bimport\(\s*'\.\/([^']+)'\s*\)/g))todo.push(m[1]);
  }
  return [...seen];
}

test('版は v2.6.4（sw.js の VERSION と app.js の APP_VERSION）',()=>{
  assert.ok(/const VERSION = 'v2\.6\.4';/.test(SW),'sw.js VERSION');
  assert.ok(APP.includes("const APP_VERSION='v2.6.4';"),'app.js APP_VERSION');
});

test('sw.js の ASSETS に app.js から読み込まれる js がすべてある',()=>{
  const a=new Set(swAssets()),r=reachable();
  for(const f of ['room-data.js','room-edit.js','room-shop.js','room-ui.js','room-ui-shop.js','room-ui-edit.js','room-art-kit.js','room-art-a.js','room-art-b.js','room-art-c.js'])
    assert.ok(r.includes(f),'app.js からたどれない: '+f);
  for(const f of r)assert.ok(a.has('./js/'+f),'ASSETS に無い: ./js/'+f);
  for(const f of readdirSync(new URL('../js/',import.meta.url)).filter(n=>n.endsWith('.js')))
    assert.ok(a.has('./js/'+f),'ASSETS に無い: ./js/'+f);
});

test('sw.js の ASSETS に dev/・tests/ は入れない。重複せず、どれも実在する',()=>{
  const list=swAssets();
  for(const u of list)assert.ok(!/(^|\/)(dev|tests|docs|\.superpowers|\.playwright-mcp)\//.test(u),'入れてはいけない: '+u);
  assert.equal(new Set(list).size,list.length,'重複');
  for(const u of list)if(u!=='./'){
    let ok=true;try{readFileSync(new URL('../'+u.slice(2),import.meta.url));}catch{ok=false;}
    assert.ok(ok,'ファイルが無い: '+u);
  }
});
