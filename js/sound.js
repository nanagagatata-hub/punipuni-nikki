// 効果音・鳴き声・読み上げ
export function speak(text,lang){
  try{if(!('speechSynthesis' in window)||!text)return;const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.9;speechSynthesis.speak(u);}catch(e){}
}
