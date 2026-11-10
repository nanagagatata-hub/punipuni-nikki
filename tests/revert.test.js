// 普段の画面が v2.4.0 に戻っていて、こいんだけが足されていること（node --test tests/revert.test.js）
// ファイルを文字列として読むだけ。DOM は使わない。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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

test('ヘッダーの並びは こいん・ずかん・せってい',()=>{
  const i=HTML.indexOf('class="topbtns"');assert.ok(i>=0);
  const t=HTML.slice(i,HTML.indexOf('</header>',i));
  const c=t.indexOf('<span class="coin" id="coin" role="status"></span>'),z=t.indexOf('id="zukanBtn"'),g=t.indexOf('id="gear"');
  assert.ok(c>=0&&z>=0&&g>=0,'#coin・#zukanBtn・#gear がある');
  assert.ok(c<z&&z<g,'順番');
});

test('こいんの見た目（.coin と 0.5 秒の coinpop）がある',()=>{
  assert.ok(/\.coin\{/.test(CSS),'.coin');
  assert.ok(/\.coin\.coinpop\{animation:coinpop \.5s/.test(CSS),'.coin.coinpop');
  assert.ok(CSS.includes('@keyframes coinpop'),'@keyframes coinpop');
});
