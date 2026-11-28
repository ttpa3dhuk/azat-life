const paymentReturn="stickers.payment-return.v1";
if(!location.hash&&new URLSearchParams(location.search).get("payment")==="return"){
 const saved=sessionStorage.getItem(paymentReturn);
 if(/^[a-f0-9]{64}$/.test(saved||""))history.replaceState(null,"","review.html#"+saved);
 else location.replace("./");
}
const key=location.hash.slice(1);
const area=document.querySelector("#order-area"), statusLine=document.querySelector("#activity");
let order=null,busy=false,renderId=0;
let urls=[];
const headers={Authorization:"Bearer "+key};
function el(tag,text="",cl=""){const e=document.createElement(tag);e.textContent=text;if(cl)e.className=cl;return e}
function button(text,run,primary=false){const b=el("button",text,primary?"primary":"");b.onclick=run;return b}
async function api(path,options={}){
 let r;
 try{r=await stickerRequest(path,{...options,headers:{...headers,...options.headers}})}
 catch{throw Error("Не удалось загрузить данные. Попробуйте ещё раз.")}
 if(!r.ok){let msg="Соединение прервалось. Попробуйте ещё раз.";try{msg=(await r.json()).error||msg}catch{}throw Error(msg)}return r;
}
const titleForm=document.querySelector("#title-form");
const titleInput=document.querySelector("#pack-title");
titleInput.required=true;
titleForm.onsubmit=async event=>{
 event.preventDefault();
 if(busy)return;
 const notice=document.querySelector("#title-status");
 busy=true;titleForm.inert=true;notice.textContent="Сохраняем…";
 try{
  const result=await (await api("title",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:titleInput.value.trim()})})).json();
  titleInput.value=result.title;
  notice.textContent=order.telegramUrl?"Название обновлено в Telegram.":"Название сохранено.";
  order.packTitle=result.title;
  if(result.revision===order.revision+1)order.revision=result.revision;
 }catch(e){notice.textContent=e.message}
 finally{busy=false;titleForm.inert=false;refresh()}
};
const contactForm=document.querySelector("#contact-form");
const contactInput=document.querySelector("#telegram-contact");
const contactStatus=document.querySelector("#contact-status");
let savedContact="";
async function saveContact(){
 const value=contactInput.value.trim();
 if(savedContact && value==="@"+savedContact)return true;
 if(!value){document.querySelector("#order-settings").open=true;contactInput.focus();contactInput.reportValidity();return false}
 try{
  const r=await api("contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:value})});
  savedContact=(await r.json()).telegramUsername;
  if(contactInput.value.trim()===value)contactInput.value="@"+savedContact;
  contactStatus.textContent="Сохранено: @"+savedContact;
  return true;
 }catch(e){document.querySelector("#order-settings").open=true;contactStatus.textContent=e.message;contactInput.focus();return false}
}
contactForm.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;try{await saveContact()}finally{busy=false}};
async function decision(action,data={}){
 if(busy)return;busy=true;area.inert=true;statusLine.textContent="Сохраняем…";
 try{
  const finalApproval=action==="finish"||(action==="review_series"&&!data.notes.some(Boolean));
  if(finalApproval&&(order.freePilot||order.paidPilot)&&!await saveContact()){statusLine.textContent="Укажите Telegram перед утверждением.";return}
  const r=await api("decision",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:order.revision,action,...data})});
  render(await r.json());statusLine.textContent="Решение сохранено.";
 }catch(e){statusLine.textContent=e.message}
 finally{busy=false;area.inert=false}
}
function art(name,alt){
 const img=el("img");img.alt=alt;const generation=renderId;
 api("media/"+encodeURIComponent(name)).then(r=>r.blob()).then(blob=>{
  if(generation!==renderId)return;const url=URL.createObjectURL(blob);urls.push(url);img.src=url;
 }).catch(e=>{if(generation===renderId)statusLine.textContent=e.message});return img
}
function notes(label,container){
 const l=el("label",label),a=el("textarea");a.rows=2;a.maxLength=700;l.append(a);container.append(l);return a
}
function quote(){if(order.freePilot||order.paidPilot)return;
 if(order.quote){
  const q=order.quote;
  if(q.status==="requested")area.append(el("p","Запрос стоимости дополнительных правок получен."));
  if(q.status==="offered")area.append(el("p","Дополнительная правка: "+q.amount+" ₽. "+q.note),
    button("Согласовать цену",()=>decision("accept_quote"),true),button("Отказаться от правки",()=>decision("decline_quote")));
  if(q.status==="accepted")area.append(el("p","Цена согласована: "+q.amount+" ₽. Начнём правку после подтверждения оплаты."));
  return;
 }
 const d=el("details");d.append(el("summary","Запросить дополнительные платные правки"));
 const note=notes("Укажите номер и что изменить",d);
 d.append(el("p","Стоимость согласуем перед работой."),button("Запросить стоимость",()=>decision("quote",{note:note.value})));area.append(d);
}
function portraits(){
 area.append(el("p","Выберите портрет для всех реакций или опишите, что поправить."));
 const grid=el("div","","review-grid");area.append(grid);
 order.portraits.forEach((v,i)=>{
  const card=el("section","","review-card");card.append(el("h3","Портрет "+(i+1)),art(v,"Версия портрета "+(i+1)),
  button("Утвердить эту версию",()=>decision("approve_portrait",{version:v}),true));grid.append(card);
 });
 if(order.portraits.length<3){
  const note=notes("Что поправить в последней версии?",area);
  const hint=el("p");
  hint.setAttribute("role","status");
  note.oninput=()=>{hint.textContent=""};
  area.append(hint,button("Запросить новую версию",()=>{
   if(!note.value.trim()){
    hint.textContent="Напишите, что изменить в портрете.";
    note.focus();
    return;
   }
   decision("redo_portrait",{note:note.value});
  }),el("small"," Ещё можно запросить версий: "+(3-order.portraits.length)));
  const photo=el("input");photo.type="file";photo.accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";photo.hidden=true;
  photo.onchange=()=>{if(photo.files[0])replacePortraitPhoto(photo.files[0]);photo.value=""};
  const replacement=el("details");replacement.append(el("summary","Заменить исходное фото"),
   el("p","Загрузите новое фото анфас. Мы создадим по нему следующую версию портрета."),
   button("Выбрать другое фото",()=>photo.click()),photo);
  area.append(replacement);
 }else quote();
}
async function replacePortraitPhoto(photo){
 if(busy)return;
 busy=true;area.inert=true;statusLine.textContent="Проверяем новое фото…";
 try{
  const body=new FormData();
  body.set("photo",photo);body.set("revision",String(order.revision));
  render(await (await api("portrait-photo",{method:"POST",body})).json());
  statusLine.textContent="";
 }catch(e){statusLine.textContent=e.message}
 finally{busy=false;area.inert=false}
}
function series(){
 area.append(el("p","Отметьте только те рисунки, которые хотите поправить. Остальные будут приняты. Все замечания отправьте за один раз."));
 const grid=el("div","","review-grid"), feedback=[];area.append(grid);
 order.items.forEach((item,i)=>{
  const card=el("section","","review-card"),label=el("label","Нужна правка"),box=el("input");box.type="checkbox";label.prepend(box);
  const title=(i+1)+". "+item.label;card.append(el("h3",title),art(item.selected||item.versions[0],title),label);
  const note=notes("Что изменить?",card);note.parentElement.hidden=true;
  box.onchange=()=>{note.parentElement.hidden=!box.checked;if(box.checked)note.focus()};
  feedback.push({box,note});grid.append(card);
 });
 const submit=button(order.telegramAvailable?"Утвердить и опубликовать в Telegram":"Утвердить весь набор",()=>{
  const empty=feedback.find(f=>f.box.checked&&!f.note.value.trim());
  if(empty){statusLine.textContent="Напишите, что изменить в отмеченном стикере.";empty.note.focus();return}
  decision("review_series",{publishTelegram:!!order.telegramAvailable,notes:feedback.map(f=>f.box.checked?f.note.value:"")});
 },true);
 grid.onchange=()=>submit.textContent=feedback.some(f=>f.box.checked)?"Отправить все правки":(order.telegramAvailable?"Утвердить и опубликовать в Telegram":"Утвердить весь набор");area.append(submit);
}
function choose(){
 area.append(el("p","Выберите подходящую версию каждого исправленного стикера."));
 const choices=order.items.map(it=>it.selected||it.versions[0]);
 const rounds=order.revisionRounds??Number(Boolean(order.revisionRound));
 const comments=new Map();
 order.items.forEach((item,i)=>{
  if(item.versions.length<2)return;
  area.append(el("h3",(i+1)+". "+item.label));const grid=el("div","","review-grid");area.append(grid);
  item.versions.forEach((v,j)=>{
   const card=el("label","","review-card"),radio=el("input");radio.type="radio";radio.name="pick"+i;radio.checked=v===choices[i];
   radio.onchange=()=>choices[i]=v;card.append(radio,document.createTextNode(j?"Вариант "+(j+1):"Исходный вариант"),art(v,item.label));grid.append(card);
  });
  if(rounds<2){
   const revision=el("details");
   revision.append(el("summary","Запросить ещё одну правку"));
   comments.set(i,notes("Что изменить в выбранной версии?",revision));
   area.append(revision);
  }
 });
 if(comments.size){
  const hint=el("p");
  hint.setAttribute("role","status");
  area.append(button("Отправить правки",()=>{
   const feedback=order.items.map((_,i)=>comments.get(i)?.value.trim()||"");
   if(!feedback.some(Boolean)){
    hint.textContent="Напишите, что изменить в стикере.";
    const first=comments.values().next().value;
    first.closest("details").open=true;
    first.focus();return;
   }
   decision("revise_choices",{choices,notes:feedback});
  }),hint);
 }
 area.append(button(order.telegramAvailable?"Опубликовать выбранные версии в Telegram":"Сохранить выбранные версии",()=>decision("finish",{choices,publishTelegram:!!order.telegramAvailable}),true));
}
function finished(o){
 const receive=el("a","Получить в Telegram","primary");
 receive.href="https://t.me/AzatLifeStickersBot?start=pack_"+o.id;
 receive.addEventListener("click",async event=>{
  if(savedContact&&contactInput.value.trim()==="@"+savedContact)return;
  event.preventDefault();
  if(busy)return;
  busy=true;
  try{if(await saveContact())location.assign(receive.href)}
  finally{busy=false}
 });
 area.append(receive,el("p","Откройте бота с аккаунта, указанного в заказе, и нажмите «Запустить». Файлы для MAX можно скачать в боте."));
 quote();
}
function paymentPanel(o){
 const pending=o.payment?.status==="pending";
 area.append(el("p",pending?"Оплата пока не подтверждена.":"После оплаты начнём рисовать портрет."));
 area.append(button((pending?"Перейти к оплате · ":"Оплатить · ")+o.total+" ₽",async()=>{
  if(busy)return;
  busy=true;area.inert=true;
  try{
   const updated=await (await api("payment",{method:"POST"})).json();
   if(updated.payment?.url){
    sessionStorage.setItem(paymentReturn,key);
    location.assign(updated.payment.url);
   }else render(updated);
  }catch(e){statusLine.textContent=e.message}
  finally{busy=false;area.inert=false}
 },true));
}
const titles={payment_required:"Оплата заказа",portrait_queue:"Готовим ваш портрет",portrait_review:"Узнаёте себя?",series_queue:"Готовим ваши реакции",series_review:"Посмотрите весь набор",changes_queue:"Правим отмеченные стикеры",choice:"Выберите версии",done:"Ваш стикерпак готов"};
let refreshing=false;
function waitingPanel(o){
 const panel=el("section","","waiting-panel");
 const paused=o.quotaWait||o.paused;
 const ring=el("span","","waiting-ring");ring.setAttribute("aria-hidden","true");
 if(!paused)panel.append(ring);
 const content=el("div");
 let message;
 if(paused)message="Заказ сохранён. Подготовка займёт чуть больше времени.";
 else if(o.stage==="portrait_queue")message=o.portraits.length
  ? "Новая версия портрета появится здесь."
  : "Фото получены. Готовый портрет появится здесь.";
 else if(o.stage==="series_queue")message="Готовые стикеры появятся здесь.";
 else message="Здесь можно будет сравнить рисунки до и после правок.";
 content.append(el("strong",message));
 if(o.progress){
  const progress=o.progress;
  const count=el("p","Готово "+progress.done+" из "+progress.total);
  const bar=el("progress");bar.max=progress.total;bar.value=progress.done;bar.setAttribute("aria-label",count.textContent);
  content.append(count,bar);
  if(!paused&&progress.minutes)content.append(el("p","Осталось примерно "+progress.minutes+" мин."));
 }
 panel.append(content);area.append(panel);
}
function render(o){
 if(titleForm.hidden){titleInput.value=o.packTitle||"Мои реакции · azat.life";titleForm.hidden=false}
 if(contactForm.hidden){
  savedContact=o.telegramUsername||"";contactInput.value=savedContact?"@"+savedContact:"";contactForm.hidden=false;
 }
 document.querySelector("#save-order").hidden=!o.telegramAvailable;
 order=o;renderId++;urls.forEach(URL.revokeObjectURL);urls=[];area.replaceChildren();
 document.querySelector("#title").textContent=titles[o.stage];
 const count=o.items.length;
 const extraPaid=o.payments?.reduce((sum,payment)=>sum+payment.amount,0);
 document.querySelector("#price").textContent=count+" стикеров · "+(o.freePilot?"бесплатно":o.total+" ₽")+(extraPaid?" · правки оплачены: "+extraPaid+" ₽":"");
 document.querySelector("#order-tools").hidden=false;
 if(o.stage==="payment_required")paymentPanel(o);
 else if(o.stage==="portrait_review")portraits();
 else if(o.stage==="series_review")series();
 else if(o.stage==="choice")choose();
 else if(o.stage==="done")finished(o);
 else {
  waitingPanel(o);
  area.append(el("p","Ваши реакции: "+o.items.map(i=>i.label).join(" · ")));
 }
}
async function refresh(){
 if(busy||refreshing)return;
 refreshing=true;
 const previousRender=renderId;
 try{
  let o=await (await api("order")).json();
  if(o.stage==="payment_required"&&o.payment?.status==="pending")o=await (await api("payment")).json();
  if(busy||previousRender!==renderId)return;
  if(!order||o.revision!==order.revision||o.stage!==order.stage||JSON.stringify(o.progress)!==JSON.stringify(order.progress)||o.paused!==order.paused||o.quotaWait!==order.quotaWait)render(o);
  statusLine.textContent="";
 }catch(e){statusLine.textContent=e.message}
 finally{refreshing=false}
}
document.querySelector("#copy-link").onclick=async()=>{
 const hint=document.querySelector("#copy-status");
 try{await navigator.clipboard.writeText(location.href);hint.textContent="Личная ссылка скопирована."}
 catch{hint.textContent="Скопируйте адрес этой страницы из строки браузера."}
};
if(/^[a-f0-9]{64}$/.test(key)){
 const keyBytes=key.match(/../g).map(byte=>parseInt(byte,16));
 const code=btoa(String.fromCharCode(...keyBytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 document.querySelector("#save-order-telegram").href="https://t.me/AzatLifeStickersBot?start=order_"+code;
 function checkWaiting(){
  if(!document.hidden&&(!order||order.stage==="payment_required"||order.stage.endsWith("_queue")||order.telegramPending||order.quote))refresh();
 }
 refresh();setInterval(checkWaiting,15000);
 document.addEventListener("visibilitychange",checkWaiting);
}else{document.querySelector("#title").textContent="Нужна личная ссылка";statusLine.textContent="Откройте сохранённую ссылку заказа целиком."}
