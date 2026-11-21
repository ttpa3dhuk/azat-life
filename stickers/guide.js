
const examples={man:"man",woman:"woman"};
const shots=[
["Анфас","Посмотрите прямо в объектив, расслабьте рот и держите подбородок ровно.","Видны макушка, оба глаза, челюсть и плечи. Увеличьте кадр и проверьте резкость век."],
["Три четверти влево","Повернитесь примерно на 45°, нос направлен к левому краю готового снимка.","Дальний глаз виден. Край волос у виска отделяется от фона."],
["Три четверти вправо","Повторите в другую сторону. Нос направлен к правому краю снимка.","Видны оба глаза и линия дальней щеки."]];
const options=[["🔥","Огонь"],["😂","Смех"],["🫶","От души"],["🤪","Дурачусь"],["😉","Подмигиваю"],["😎","Круто"],["😔","Грустно"],["💪","Справимся"],["🙏","Прошу"],["😘","Целую"],["🤷‍♂️","Кто знает"],["😊","Улыбаюсь"],["😬","Упс"],["🤦","Фейспалм"],["😍","Влюблённость"],["😮","Удивление"]];
const stages=["Подготовка","Кадры","Реакции","Отправка"], ids=["setup","shoot","feel","send"];
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const draftKey="stickers.intake.v2";
const defaults={person:"man",stage:0,shot:0,selected:[],extra:[],custom:"",details:""};
let s={...defaults};
try { const saved=JSON.parse(localStorage.getItem(draftKey)); if(saved && ids[saved.stage] && shots[saved.shot] && examples[saved.person] && Array.isArray(saved.selected) && Array.isArray(saved.extra)) s={...defaults,...saved}; }catch{}
const rates={5:750,12:1490};
if(!rates[s.pack])s.pack=12;
const files=[null,null,null];
const photoMessages=["","",""],checks=[0,0,0];
const roles=["front","left","right"];
const allReactions=()=>[...new Set([...s.selected,...s.extra])];
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
 const i=s.shot,[name,pose,quality]=shots[i];$("#num").textContent="Кадр "+(i+1)+" из "+shots.length;$("#count").textContent="Готово "+files.filter(Boolean).length+" из "+shots.length;
 $("#shotname").textContent=name;$("#pose").textContent=pose;$("#quality").textContent=quality;
 $("#camera").textContent="Свет от окна, задняя камера 1× на уровне глаз, расстояние 1,5–2 м. Включите таймер и отключите ретушь.";
 $(".single").src=imagePath(i);$(".single").alt="Пример кадра: "+name;
 $$(".steps button[data-shot]").forEach((b,j)=>{b.className=(files[j]?"done ":"")+(i===j?"chosen":"");b.setAttribute("aria-label",shots[j][0]+(files[j]?", готов":""));b.setAttribute("aria-pressed",i===j)});
 $("#next").textContent=i===shots.length-1?"Фото готово · к реакциям":"Фото готово · дальше";$$(".chips button").forEach(b=>b.setAttribute("aria-pressed",s.selected.includes(b.textContent)));
 $("#file-status").textContent=photoMessages[i] || files[i]?.name || "Файл пока не выбран";
 $("#shot-file").value="";
 const labels=allReactions();
 $("#fill-pack").disabled=labels.length>=s.pack;
 $("#price").textContent=$("#bill").textContent="Выбрано "+labels.length+" из "+s.pack+" · бесплатно";
 $("#chosen").textContent=labels.join(" · ") || "Пока ничего не выбрано";
 $("#custom-list").replaceChildren(...s.extra.map(v=>btn(v+" ×",()=>{s.extra=s.extra.filter(x=>x!==v);save();draw()})));
 document.querySelectorAll("[name=pack]").forEach(r=>r.checked=Number(r.value)===s.pack);
 $$(".chips button[title]").forEach(b=>b.disabled=labels.length>=s.pack&&!s.selected.includes(b.textContent));
 roles.forEach((r,j)=>{
  $("#name-"+r).textContent=photoMessages[j] || files[j]?.name || "Фото нужно прикрепить";
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
stages.forEach((name,i)=>$("nav").append(btn(i===3?"Загрузка":name,()=>go(i))));
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
 const chosen=new Set(allReactions());
 for(const [emoji] of options){
  if(chosen.size>=s.pack)break;
  if(chosen.has(emoji))continue;
  chosen.add(emoji);
  s.selected.push(emoji);
 }
 save();draw();
 $("#custom-hint").textContent="Набор заполнен. Любую реакцию можно заменить.";
};
function addCustom(){
 const value=$("#custom").value.trim();if(!value){return true;}
 const segments=Intl.Segmenter?new Intl.Segmenter("ru",{granularity:"grapheme"}):null;
 const pending=new Set(allReactions());
 for(const part of value.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean)){
  const chars=segments?Array.from(segments.segment(part),x=>x.segment).filter(v=>v.trim()):[part];
  const group=chars.every(v=>/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(v))?chars:[part];
  for(const entry of group)pending.add(entry);
 }
 if(pending.size>s.pack){$("#custom-hint").textContent="Пакет заполнен. Снимите одну из выбранных реакций.";return false}
 $("#custom-hint").textContent=pending.size===allReactions().length?"Такая реакция уже выбрана.":"Добавлено.";
 s.extra=[...pending].filter(v=>!s.selected.includes(v));s.custom="";$("#custom").value="";save();draw();return true;
}
$("#add-custom").onclick=()=>{if(!$("#custom").value.trim()){$("#custom-hint").textContent="Введите эмодзи или название реакции.";$("#custom").focus()}else addCustom()};
$("#custom").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addCustom()}};
$$("[data-go]").forEach(b=>b.onclick=()=>{if(+b.dataset.go===3){if(!addCustom())return;if(allReactions().length!==s.pack){$("#custom-hint").textContent="Выберите ровно "+s.pack+" реакций.";return}}go(+b.dataset.go)});
$("#prev").onclick=()=>s.shot===0?go(0):shot(s.shot-1);
function nextShot(){if(s.shot===2)go(2);else shot(s.shot+1)}
$("#shot-file").onchange=e=>{const f=e.target.files[0];e.target.value="";selectPhoto(s.shot,f)};
$("#next").onclick=()=>{if(!files[s.shot]){$("#shot-file").click();return}nextShot()};
$("#later").onclick=nextShot;
for(const id of ["custom","details"]){$("#"+id).value=s[id];$("#"+id).oninput=e=>{s[id]=e.target.value;save()}}
const keyName="stickers.pending-upload.v1", recent="stickers.last-order.v1";
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,"0")).join("")}
let uploadKey;
$("#submit").onclick=async()=>{
 addCustom();
 const message=$("#notice"), button=$("#submit"), labels=allReactions();
 const contact=$("#telegram-contact");
 if(!contact.value.trim()){contact.focus();contact.reportValidity();message.textContent="Укажите ваш Telegram.";return}
 if(labels.length!==s.pack){message.textContent="Выберите ровно "+s.pack+" реакций.";return}
 if(files.some(f=>!f)){message.textContent="Прикрепите все три ракурса.";return}
 const extra=Array.from($("#expression").files);if(extra.length>3){message.textContent="Можно приложить до трёх фото мимики.";return}
 if([...files,...extra].reduce((a,f)=>a+f.size,0)>=38*1024*1024){message.textContent="Фото вместе должны занимать меньше 38 МБ.";return}
 button.disabled=true;message.textContent="Загружаем фотографии…";
 try{
  uploadKey=uploadKey || sessionStorage.getItem(keyName) || token();sessionStorage.setItem(keyName,uploadKey);
  const form=new FormData();form.set("packTitle",$("#pack-title").value.trim());form.set("telegramUsername",contact.value.trim());form.set("package",String(s.pack));extra.forEach(f=>form.append("expression",f));form.set("reactions",JSON.stringify(labels));form.set("details",s.details);
  roles.forEach((r,i)=>form.set(r,files[i]));
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
