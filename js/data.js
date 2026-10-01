// 定数データ（タスク・エサ・姿・中国語）
export const H=3600e3;
export const TH=[0,3,10,25];
export const STAGE=['たまご','あかちゃん','こども','おとな'];
export const WD=['にちようび','げつようび','かようび','すいようび','もくようび','きんようび','どようび'];

/* from/until：受付する時（until は その時ちょうどで締め切り。関数なら日付ごと）。weekdays：受付する曜日 */
export const TASKS=[
  {id:'lesson', label:'ちゅうごくご れっすん', icon:'🧑‍🏫', food:'nikuman', limit:1},
  {id:'jishu',  label:'ちゅうごくご じしゅう', icon:'📖', food:'kotoba', limit:1},
  {id:'hamigaki',label:'はみがき', icon:'🪥', food:'ame', limit:2},
  {id:'yasai',  label:'おやさい', icon:'🥦', food:'soup', limit:3},
  {id:'ofuro',  label:'おふろ', icon:'🛁', food:'purin', limit:1},
  {id:'katazuke',label:'おかたづけ', icon:'🧸', food:'cookie', limit:1},
  {id:'hayane', label:'はやく べっどに はいれた', icon:'🛏️', food:'milk', limit:1, from:18, until:d=>d.getDay()>=5?21:20},
  {id:'hayaoki',label:'はやおき', icon:'🌅', food:'pan', limit:1, from:5, until:7, weekdays:[1,2,3,4,5]}
];
export const FOODS={
  nikuman:{name:'にくまん', icon:'🥟', pt:3, param:'ka', amt:3},
  kotoba:{name:'ことばのみ', icon:'🍒', pt:1, param:'ka', amt:1},
  ame:{name:'きらきらあめ', icon:'🍬', pt:1, param:'ki', amt:1},
  soup:{name:'やさいすーぷ', icon:'🥣', pt:1, param:'ge', amt:1},
  purin:{name:'あわあわぷりん', icon:'🍮', pt:1, param:'ho', amt:1},
  cookie:{name:'ぴかぴかくっきー', icon:'🍪', pt:2, param:'ki', amt:2},
  milk:{name:'ほっとみるく', icon:'🥛', pt:1, param:'ho', amt:1},
  pan:{name:'おひさまぱん', icon:'🍞', pt:2, param:'ge', amt:2}
};
export const PARAMS=[['ka','🎓','かしこさ'],['ki','✨','きれい'],['ge','💪','げんき'],['ho','♨️','ほかほか']];
/* stage：1=あかちゃん 2=こども 3=おとな（さいごのすがた も おとなの姿を使う） */
export const FORMS={
  egg:{name:'たまご', stage:0},
  puni:{name:'ぷにぷに', stage:1, color:'#FFD3E2', dark:'#EFA3BF', hint:'かしこさ の たまご から…'},
  shizuku:{name:'しずくぷに', stage:1, color:'#CDEBFF', dark:'#93C6EC', hint:'きれい の たまご から…'},
  koro:{name:'ころぷに', stage:1, color:'#FFE3B8', dark:'#E9B77A', hint:'げんき の たまご から…'},
  moko:{name:'もこぷに', stage:1, color:'#F3E3FF', dark:'#C9A8EC', hint:'ほかほか の たまご から…'},
  hoshi:{name:'ほしぷに', stage:2, color:'#CFE0FF', dark:'#97B6EE', hint:'かしこさ を そだてると…'},
  shabon:{name:'しゃぼんぷに', stage:2, color:'#D4F4F4', dark:'#8FD3D3', hint:'きれい を そだてると…'},
  hana:{name:'はなぷに', stage:2, color:'#FFE9A8', dark:'#EDC766', hint:'げんき を そだてると…'},
  kumo:{name:'くもぷに', stage:2, color:'#EEF0FA', dark:'#B9BEDC', hint:'ほかほか を そだてると…'},
  hakase:{name:'はかせぷに', stage:3, color:'#D2C4FF', dark:'#A28FEE', hint:'かしこさ が いちばん だと…'},
  kirara:{name:'きららぷに', stage:3, color:'#C4F0FA', dark:'#86D2E6', hint:'きれい が いちばん だと…'},
  morimori:{name:'もりもりぷに', stage:3, color:'#C6EFC9', dark:'#86CF8E', hint:'げんき が いちばん だと…'},
  pokapoka:{name:'ぽかぽかぷに', stage:3, color:'#FFD0B5', dark:'#EFA078', hint:'ほかほか が いちばん だと…'},
  tsukimi:{name:'つきみぷに', stage:3, color:'#E6E0FF', dark:'#B3A6EC', hint:'かしこさ と きれい が なかよし だと…'},
  bouken:{name:'ぼうけんぷに', stage:3, color:'#E8F3C8', dark:'#B6CC7E', hint:'かしこさ と げんき が なかよし だと…'},
  yumemi:{name:'ゆめみぷに', stage:3, color:'#DCD8F8', dark:'#A8A0E0', hint:'かしこさ と ほかほか が なかよし だと…'},
  marin:{name:'まりんぷに', stage:3, color:'#CDEFFF', dark:'#86C6E6', hint:'きれい と げんき が なかよし だと…'},
  keki:{name:'けーきぷに', stage:3, color:'#FFE0EA', dark:'#F0A9C0', hint:'きれい と ほかほか が なかよし だと…'},
  ohisama:{name:'おひさまぷに', stage:3, color:'#FFEDB0', dark:'#F2C55C', hint:'げんき と ほかほか が なかよし だと…'},
  niji:{name:'にじぷに', stage:3, color:'#FFFFFF', dark:'#D9CBEF', hint:'ぜんぶ なかよく そだてると…'}
};
export const ZORDER=Object.keys(FORMS).filter(k=>k!=='egg');
export const ADULT_IDS=ZORDER.filter(k=>FORMS[k].stage===3);
export const WORDS=[
  ['你好','にーはお','こんにちは'],['谢谢','しぇしぇ','ありがとう'],['再见','ざいじぇん','ばいばい'],
  ['好吃','はおちー','おいしい'],['早上好','ざおしゃんはお','おはよう'],['晚安','わんあん','おやすみ'],
  ['苹果','ぴんぐお','りんご'],['猫','まお','ねこ'],['狗','ごう','いぬ'],
  ['加油','じゃーよう','がんばれ'],['我爱你','うぉーあいにー','だいすき'],['朋友','ぽんよう','ともだち']
];


/* セリフ（タスク8で場面と数を増やす） */
export const LINES={
  sick:['なんだか ぐあいが わるいよ… ごはん ちょうだい','おなか ぺこぺこで ふらふら…'],
  sleepTap:['むにゃむにゃ… もう たべられないよぉ…','すぴー… すぴー…'],
  sleepFeed:['すやすや… あさ に たべるね'],
  farewellSick:['げんきに なったら おはなし したいな'],
  /* おわかれ：ページごとに候補（{you} 入り／なし）。{name} は ぷにちゃん の なまえ */
  farewell:[
    ['{you}、いままで ありがとう','いままで ほんとうに ありがとう'],
    ['{you}と いっしょに いっぱい がんばったね','まいにち いっしょに いっぱい がんばったね'],
    ['そろそろ たび に でる じかん みたい']
  ],
  give:['これ、{you} に わたすね。つぎの こ を よろしくね','これ、わたすね。つぎの こ を よろしくね']
};
