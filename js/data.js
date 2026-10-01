// 定数データ（タスク・エサ・姿・中国語）
export const H=3600e3;
export const TH=[0,3,10,25];
export const STAGE=['たまご','あかちゃん','こども','おとな'];
export const WD=['にちようび','げつようび','かようび','すいようび','もくようび','きんようび','どようび'];

export const TASKS=[
  {id:'lesson', label:'ちゅうごくご れっすん', icon:'🧑‍🏫', food:'nikuman', limit:1},
  {id:'jishu',  label:'ちゅうごくご じしゅう', icon:'📖', food:'kotoba', limit:1},
  {id:'hamigaki',label:'はみがき', icon:'🪥', food:'ame', limit:2},
  {id:'yasai',  label:'おやさい', icon:'🥦', food:'soup', limit:3},
  {id:'ofuro',  label:'おふろ', icon:'🛁', food:'purin', limit:1}
];
export const FOODS={
  nikuman:{name:'にくまん', icon:'🥟', pt:3, param:'ka', amt:3},
  kotoba:{name:'ことばのみ', icon:'🍒', pt:1, param:'ka', amt:1},
  ame:{name:'きらきらあめ', icon:'🍬', pt:1, param:'ki', amt:1},
  soup:{name:'やさいすーぷ', icon:'🥣', pt:1, param:'ge', amt:1},
  purin:{name:'あわあわぷりん', icon:'🍮', pt:1, param:'ho', amt:1}
};
export const PARAMS=[['ka','🎓','かしこさ'],['ki','✨','きれい'],['ge','💪','げんき'],['ho','♨️','ほかほか']];
export const FORMS={
  egg:{name:'たまご'},
  puni:{name:'ぷにぷに', color:'#FFD3E2', dark:'#EFA3BF', hint:'たまごから うまれるよ'},
  hoshi:{name:'ほしぷに', color:'#CFE0FF', dark:'#97B6EE', hint:'かしこさ と きれい を そだてると…'},
  hana:{name:'はなぷに', color:'#FFE9A8', dark:'#EDC766', hint:'げんき と ほかほか を そだてると…'},
  hakase:{name:'はかせぷに', color:'#D2C4FF', dark:'#A28FEE', hint:'かしこさ が いちばん だと…'},
  kirara:{name:'きららぷに', color:'#C4F0FA', dark:'#86D2E6', hint:'きれい が いちばん だと…'},
  morimori:{name:'もりもりぷに', color:'#C6EFC9', dark:'#86CF8E', hint:'げんき が いちばん だと…'},
  pokapoka:{name:'ぽかぽかぷに', color:'#FFD0B5', dark:'#EFA078', hint:'ほかほか が いちばん だと…'},
  niji:{name:'にじぷに', color:'#FFFFFF', dark:'#D9CBEF', hint:'ぜんぶ なかよく そだてると…'}
};
export const ZORDER=['puni','hoshi','hana','hakase','kirara','morimori','pokapoka','niji'];
export const WORDS=[
  ['你好','にーはお','こんにちは'],['谢谢','しぇしぇ','ありがとう'],['再见','ざいじぇん','ばいばい'],
  ['好吃','はおちー','おいしい'],['早上好','ざおしゃんはお','おはよう'],['晚安','わんあん','おやすみ'],
  ['苹果','ぴんぐお','りんご'],['猫','まお','ねこ'],['狗','ごう','いぬ'],
  ['加油','じゃーよう','がんばれ'],['我爱你','うぉーあいにー','だいすき'],['朋友','ぽんよう','ともだち']
];

