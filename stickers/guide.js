
const examples={man:"man",woman:"woman"};
const shots=[
["Анфас","Посмотрите прямо в объектив, расслабьте рот и держите подбородок ровно.","Видны макушка, оба глаза, челюсть и плечи. Увеличьте кадр и проверьте резкость век."],
["Три четверти влево","Повернитесь примерно на 45°, нос направлен к левому краю готового снимка.","Дальний глаз виден. Край волос у виска отделяется от фона."],
["Три четверти вправо","Повторите в другую сторону. Нос направлен к правому краю снимка.","Видны оба глаза и линия дальней щеки."]];
const options=[["🔥","Огонь"],["😂","Смех"],["🫶","От души"],["🤪","Дурачусь"],["😉","Подмигиваю"],["😎","Круто"],["😔","Грустно"],["💪","Справимся"],["🙏","Прошу"],["😘","Целую"],["🤷‍♂️","Кто знает"],["😊","Улыбаюсь"],["😬","Упс"],["🤦","Фейспалм"],["😍","Влюблённость"],["😮","Удивление"]];
const sceneDefaults=new Map([
 ["🔥","Улыбаюсь и показываю большой палец."],["👍","Киваю и показываю большой палец."],
 ["😂","Запрокидываю голову и смеюсь до слёз."],["🫶","Складываю ладони сердечком."],
 ["🤪","Подмигиваю и показываю язык."],["😉","Подмигиваю с хитрой улыбкой."],
 ["😎","Смотрю поверх солнечных очков."],["😔","Опускаю взгляд и чуть сутулюсь."],
 ["💪","Сгибаю руку и показываю бицепс."],["🙏","Складываю ладони и просительно смотрю в глаза."],
 ["😘","Посылаю воздушный поцелуй."],["🤷‍♂️","Пожимаю плечами и развожу руки."],
 ["😊","Тепло улыбаюсь, слегка наклонив голову."],["😬","Неловко улыбаюсь, стиснув зубы."],
 ["🤦","Прикрываю глаза ладонью."],["😍","С восторгом прижимаю руки к груди."],
 ["😮","Широко открываю глаза и приподнимаю брови."]
]);
function sceneFor(label){
 return Object.hasOwn(s.scenes,label)?s.scenes[label]:(sceneDefaults.get(label)??label);
}
function showScenes(labels){
 const fields=labels.map(label=>{
  const field=document.createElement("label");
  field.textContent=label+" · описание рисунка";
  const input=document.createElement("textarea");
  input.rows=2;input.maxLength=250;input.value=sceneFor(label);
  input.oninput=()=>{s.scenes[label]=input.value;save()};
  field.append(input);return field;
 });
 $("#scenes").replaceChildren(...fields);
}
const stages=["Подготовка","Кадры","Реакции","Отправка"], ids=["setup","shoot","feel","send"];
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const draftKey="stickers.intake.v2";
const defaults={person:"man",stage:0,shot:0,selected:[],extra:[],custom:"",details:""};
let s={...defaults};
try { const saved=JSON.parse(localStorage.getItem(draftKey)); if(saved && ids[saved.stage] && shots[saved.shot] && examples[saved.person] && Array.isArray(saved.selected) && Array.isArray(saved.extra)) s={...defaults,...saved}; }catch{}
s.scenes=Object.assign(Object.create(null),s.scenes);
let rates={5:0,12:0};
let pricingReady=typeof pilotInvite==="undefined"||!pilotInvite;
if(![5,12].includes(s.pack))s.pack=12;
const files=[null,null,null];
const photoMessages=["","",""],checks=[0,0,0];
const roles=["front","left","right"];
const emojiSegments=Intl.Segmenter?new Intl.Segmenter("ru",{granularity:"grapheme"}):null;
const isEmoji=value=>/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(value);
const reactionKey=value=>value.replace(/[\uFE0E\uFE0F]/g,"");
function uniqueReactions(values){
 const unique=new Map();
 for(const value of values){
  const key=reactionKey(value);
  if(!unique.has(key))unique.set(key,value);
 }
 return [...unique.values()];
}
const allReactions=()=>uniqueReactions([...s.selected,...s.extra]);
function typedReactions(){
 return $("#custom").value.split(/[,;\n]/).map(part=>part.trim()).filter(Boolean).flatMap(part=>{
  const chars=emojiSegments?Array.from(emojiSegments.segment(part),item=>item.segment).filter(char=>char.trim()):[part];
  return chars.every(isEmoji)?chars:[part];
 });
}
const previewReactions=()=>uniqueReactions([...allReactions(),...typedReactions()]);
function updateReactionCount(){
 const reactions=previewReactions();
 const count=reactions.length;
 const remaining=s.pack-count;
 $("#price").textContent="Выбрано "+count+" из "+s.pack+" · "+(rates[s.pack]?rates[s.pack]+" ₽":"бесплатно");
 $("#fill-pack").disabled=remaining<=0;
 $("#custom-hint").textContent=remaining<0?"Уберите лишние реакции: "+(-remaining)+".":"";
 $$(".chips button[title]").forEach(b=>{
  const inDraft=reactions.some(value=>reactionKey(value)===reactionKey(b.textContent));
  b.disabled=count>=s.pack&&!inDraft&&!s.selected.includes(b.textContent);
 });
}
function save(){try{localStorage.setItem(draftKey,JSON.stringify(s))}catch{}}
function btn(text,fn){let b=document.createElement("button");b.textContent=text;b.onclick=fn;return b}
function go(n){s.stage=n;save();draw();window.scrollTo(0,0);document.querySelector(".work:not([hidden]) h2")?.focus({preventScroll:true})}
function shot(n){s.shot=n;save();draw();window.scrollTo(0,0);document.querySelector(".work:not([hidden]) h2")?.focus({preventScroll:true})}
function imagePath(i){return "./img/"+s.person+"-"+i+".jpg"}
function draw(){
 ids.forEach((id,i)=>$("#"+id).hidden=i!==s.stage);
 $("nav").hidden=s.stage===0;
 $$(".switch button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.person===s.person));
 $$("nav button").forEach((b,i)=>{if(i===s.stage)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current")});
 const i=s.shot,[name,pose,quality]=shots[i];$("#num").textContent=i===0?"Основное фото":"Дополнительный ракурс";$("#count").textContent="Прикреплено фото: "+files.filter(Boolean).length;
 $("#shotname").textContent=name;$("#pose").textContent=pose;$("#quality").textContent=quality;
 $("#camera").textContent="Свет от окна, задняя камера 1× на уровне глаз, расстояние 1,5–2 м. Включите таймер и отключите ретушь.";
 $(".single").src=imagePath(i);$(".single").alt="Пример кадра: "+name;
 $$(".steps button[data-shot]").forEach((b,j)=>{b.className=(files[j]?"done ":"")+(i===j?"chosen":"");b.setAttribute("aria-label",shots[j][0]+(files[j]?", готов":""));b.setAttribute("aria-pressed",i===j)});
 $("#next").textContent=files[i]?"Перейти к реакциям":"Выбрать фото";$$(".chips button").forEach(b=>b.setAttribute("aria-pressed",s.selected.includes(b.textContent)));
 $("#file-status").textContent=photoMessages[i] || files[i]?.name || "Файл пока не выбран";
 $("#shot-file").value="";
 const labels=allReactions();
 showScenes(labels);
 updateReactionCount();
 $("#bill").textContent=$("#price").textContent;
 $("#chosen").textContent=labels.join(" · ") || "Пока ничего не выбрано";
 $("#custom-list").replaceChildren(...s.extra.map(v=>btn(v+" ×",()=>{s.extra=s.extra.filter(x=>x!==v);save();draw()})));
 document.querySelectorAll("[name=pack]").forEach(r=>r.checked=Number(r.value)===s.pack);
 roles.forEach((r,j)=>{
  $("#name-"+r).textContent=photoMessages[j] || files[j]?.name || (j===0?"Обязательное фото":"По желанию");
  $("#pick-"+r).textContent=files[j]?"Заменить фото":"Выбрать фото";
  const photo=$("#preview-"+r);photo.hidden=!files[j];
  photo.onerror=()=>{photo.hidden=true};
  if(files[j]&&photo.currentFile!==files[j]){
   if(photo.src)URL.revokeObjectURL(photo.src);photo.src=URL.createObjectURL(files[j]);photo.currentFile=files[j];
  }
 });
}
async function selectPhoto(i,file){
 if(!file)return;
 const seq=++checks[i];files[i]=null;photoMessages[i]="Проверяем, видно ли лицо…";draw();
 const form=new FormData();form.set("role",roles[i]);form.set("photo",file);
 try{
  const r=await stickerRequest("check-photo",{method:"POST",body:form});
  const body=await r.json();if(seq!==checks[i])return;
  if(!r.ok)throw Error(body.error||"Повторите проверку.");
  files[i]=file;photoMessages[i]="Фото принято · "+file.name;
 }catch(e){if(seq===checks[i])photoMessages[i]=e.message}
 if(seq===checks[i])draw();
}
stages.forEach((name,i)=>$("nav").append(btn(i===3?"Загрузка":name,i===3?openUpload:()=>go(i))));
for(const el of $$(".switch")) for(const [key,name] of [["man","Парень"],["woman","Девушка"]]){
 const b=btn(name,()=>{s.person=key;save();draw()}); b.dataset.person=key;el.append(b);
}
shots.forEach((v,i)=>{
 const b=btn(String(i+1),()=>shot(i));b.dataset.shot=i;$(".steps").append(b);
 const label=document.createElement("label"), input=document.createElement("input"), note=document.createElement("small");
 input.type="file";input.accept=$("#shot-file").accept;input.id="upload-"+roles[i];
 label.htmlFor=input.id;label.textContent=v[0];note.id="name-"+roles[i];
 input.onchange=()=>{const f=input.files[0];input.value="";selectPhoto(i,f)};
 const pick=document.createElement("label"),preview=document.createElement("img");
 label.removeAttribute("for");pick.id="pick-"+roles[i];pick.htmlFor=input.id;pick.className="pick";input.className="visually-hidden";
 preview.id="preview-"+roles[i];preview.alt=v[0];preview.width=90;
 $("#uploads").append(label,preview,note,pick,input);
});
options.forEach(([em,name])=>{const b=btn(em,()=>{s.selected=s.selected.includes(em)?s.selected.filter(x=>x!==em):[...s.selected,em];save();draw()});b.setAttribute("aria-label",name);b.title=name;$(".chips").append(b)});
$("#fill-pack").onclick=()=>{
 if(!addCustom())return;
 const chosen=new Set(allReactions().map(reactionKey));
 for(const [emoji] of options){
  if(chosen.size>=s.pack)break;
  if(chosen.has(reactionKey(emoji)))continue;
  chosen.add(reactionKey(emoji));
  s.selected.push(emoji);
 }
 save();draw();
 $("#custom-hint").textContent="Набор заполнен. Любую реакцию можно заменить.";
};
function addCustom(){
 const pending=previewReactions();
 if(pending.length>s.pack){
  updateReactionCount();
  return false;
 }
 const selected=new Set(s.selected.map(reactionKey));
 s.extra=pending.filter(value=>!selected.has(reactionKey(value)));
 s.custom="";
 $("#custom").value="";
 save();draw();
 return true;
}
function openUpload(){
 if(!addCustom()){if(s.stage!==2)go(2);return}
 if(allReactions().length!==s.pack){
  if(s.stage!==2)go(2);
  $("#custom-hint").textContent="Добавьте ещё "+(s.pack-allReactions().length)+" до полного набора.";
  return;
 }
 go(3);
}
$("#add-custom").onclick=()=>{if(!$("#custom").value.trim()){$("#custom-hint").textContent="Введите эмодзи или название реакции.";$("#custom").focus()}else addCustom()};
$("#custom").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addCustom()}};
$$("[data-go]").forEach(b=>b.onclick=b.dataset.go==="3"?openUpload:()=>go(+b.dataset.go));
$("#prev").onclick=()=>s.shot===0?go(0):shot(s.shot-1);
function nextShot(){go(2)}
$("#shot-file").onchange=e=>{const f=e.target.files[0];e.target.value="";selectPhoto(s.shot,f)};
$("#next").onclick=()=>{if(!files[s.shot]){$("#shot-file").click();return}nextShot()};
$("#later").onclick=nextShot;
for(const id of ["custom","details"]){$("#"+id).value=s[id];$("#"+id).oninput=e=>{s[id]=e.target.value;save();if(id==="custom")updateReactionCount()}}
const keyName="stickers.pending-upload.v1", recent="stickers.last-order.v1";
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,"0")).join("")}
let uploadKey;
$("#submit").onclick=async()=>{
 if(!addCustom()){go(2);return}
 const message=$("#notice"), button=$("#submit"), labels=allReactions();
 const contact=$("#telegram-contact");
 if(!pricingReady){message.textContent="Не удалось загрузить цену. Обновите страницу.";return}
 if(!contact.value.trim()){contact.focus();contact.reportValidity();message.textContent="Укажите ваш Telegram.";return}
 if(labels.length!==s.pack){message.textContent="Выберите ровно "+s.pack+" реакций.";return}
 if(!files[0]){message.textContent="Прикрепите фото анфас.";return}
 const extra=Array.from($("#expression").files);if(extra.length>3){message.textContent="Можно приложить до трёх фото мимики.";return}
 if([...files.filter(Boolean),...extra].reduce((a,f)=>a+f.size,0)>=38*1024*1024){message.textContent="Фото вместе должны занимать меньше 38 МБ.";return}
 button.disabled=true;message.textContent="Загружаем фотографии…";
 try{
  uploadKey=uploadKey || sessionStorage.getItem(keyName) || token();sessionStorage.setItem(keyName,uploadKey);
  const form=new FormData();form.set("packTitle",$("#pack-title").value.trim());form.set("telegramUsername",contact.value.trim());form.set("package",String(s.pack));if(rates[s.pack])form.set("paidPilot","1");extra.forEach(f=>form.append("expression",f));form.set("reactions",JSON.stringify(labels));form.set("reactionDescriptions",JSON.stringify(Object.fromEntries(labels.map(label=>[label,sceneFor(label)]))));form.set("details",s.details);
  roles.forEach((r,i)=>{if(files[i])form.set(r,files[i])});
  const response=await stickerRequest("orders",{method:"POST",headers:{Authorization:"Bearer "+uploadKey},body:form});
  const body=await response.json();
  if(!response.ok)throw Error(body.error || "Не удалось загрузить заказ.");
  const url="review.html#"+uploadKey;
  localStorage.setItem(recent,url);sessionStorage.removeItem(keyName);localStorage.removeItem(draftKey);location.assign(url);
 }catch(e){message.textContent=e.message+" Можно повторить загрузку."}finally{button.disabled=false}
};
const previous=localStorage.getItem(recent);
if(previous && /^review\.html#[a-f0-9]{64}$/.test(previous)){$("#resume-link").href=previous;$("#resume-order").hidden=false}
$("#start").onclick=()=>{s.shot=0;go(1)};
$$("[name=pack]").forEach(r=>r.onchange=()=>{s.pack=Number(r.value);save();draw()});
$("#camera-file").onchange=$("#shot-file").onchange;draw();

if(!pricingReady){
 stickerRequest("pricing").then(async response=>{
  if(!response.ok)throw Error();
  const data=await response.json();
  rates=data.prices;
  pricingReady=true;
  if(rates[5]){
   $("#pricing-copy").textContent="Выберите размер набора.";
   $$("[data-price-label]").forEach(label=>{const count=label.dataset.priceLabel;label.textContent=count+" шт. · "+rates[count]+" ₽"});
  }
  draw();
 }).catch(()=>{$("#pricing-copy").textContent="Не удалось загрузить цену. Обновите страницу."});
}
