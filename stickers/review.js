const key=location.hash.slice(1);
const area=document.querySelector("#order-area"), statusLine=document.querySelector("#activity");
let order=null,busy=false,renderId=0;
let urls=[];
const headers={Authorization:"Bearer "+key};
function el(tag,text="",cl=""){const e=document.createElement(tag);e.textContent=text;if(cl)e.className=cl;return e}
function button(text,run,primary=false){const b=el("button",text,primary?"primary":"");b.onclick=run;return b}
async function api(path,options={}){
 const r=await stickerRequest(path,{...options,headers:{...headers,...options.headers}});
 if(!r.ok){let msg="Соединение прервалось. Попробуйте ещё раз.";try{msg=(await r.json()).error||msg}catch{}throw Error(msg)}return r;
}
async function decision(action,data={}){
 if(busy)return;busy=true;area.inert=true;statusLine.textContent="Сохраняем…";
 try{
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
function quote(){if(order.freePilot)return;
 if(order.quote){
  const q=order.quote;
  if(q.status==="requested")area.append(el("p","Запрос стоимости дополнительных правок получен."));
  if(q.status==="offered")area.append(el("p","Дополнительная правка: "+q.amount+" ₽. "+q.note),
    button("Согласовать цену",()=>decision("accept_quote"),true),button("Отказаться от правки",()=>decision("decline_quote")));
  if(q.status==="accepted")area.append(el("p","Цена согласована: "+q.amount+" ₽. Работа начнётся после подтверждения оплаты оператором."));
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
  area.append(button("Запросить новую версию",()=>decision("redo_portrait",{note:note.value})),el("small"," Осталось версий в стоимости заказа: "+(3-order.portraits.length)));
 }else quote();
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
 const submit=button("Утвердить весь набор",()=>{
  const empty=feedback.find(f=>f.box.checked&&!f.note.value.trim());
  if(empty){statusLine.textContent="Напишите, что изменить в отмеченном стикере.";empty.note.focus();return}
  decision("review_series",{notes:feedback.map(f=>f.box.checked?f.note.value:"")});
 },true);
 grid.onchange=()=>submit.textContent=feedback.some(f=>f.box.checked)?"Отправить все правки":"Утвердить весь набор";area.append(submit);
}
function choose(){
 area.append(el("p","Для каждого исправленного стикера выберите исходный или новый рисунок."));
 const choices=order.items.map(it=>it.selected||it.versions[0]);
 order.items.forEach((item,i)=>{
  if(item.versions.length<2)return;
  area.append(el("h3",(i+1)+". "+item.label));const grid=el("div","","review-grid");area.append(grid);
  item.versions.forEach((v,j)=>{
   const card=el("label","","review-card"),radio=el("input");radio.type="radio";radio.name="pick"+i;radio.checked=v===choices[i];
   radio.onchange=()=>choices[i]=v;card.append(radio,document.createTextNode(j?"Вариант "+(j+1):"Исходный вариант"),art(v,item.label));grid.append(card);
  });
 });
 area.append(button("Сохранить выбранные версии",()=>decision("finish",{choices}),true));
}
async function publishTelegram(){
 if(busy)return;
 busy=true;area.inert=true;statusLine.textContent="Публикуем набор в Telegram…";
 try{render(await (await api("publish-telegram",{method:"POST"})).json());statusLine.textContent="Набор опубликован."}
 catch(e){statusLine.textContent=e.message}
 finally{busy=false;area.inert=false}
}
function finished(o){
 if(o.telegramUrl){
  const link=el("a","Добавить стикерпак в Telegram","primary");link.href=o.telegramUrl;area.append(link);
 }else if(o.telegramAvailable){
  area.append(el("p","После публикации любой человек со ссылкой сможет добавить набор."),
   button("Опубликовать набор в Telegram",publishTelegram,true));
 }
 area.append(button("Скачать выбранные стикеры",download));quote();
}
async function download(){
 try{const blob=await (await api("pack")).blob();const a=el("a");a.href=URL.createObjectURL(blob);a.download="stickers.zip";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}
 catch(e){statusLine.textContent=e.message}
}
const titles={portrait_queue:"Портрет в очереди",portrait_review:"Узнаёте себя?",series_queue:"Готовим ваши реакции",series_review:"Посмотрите весь набор",changes_queue:"Правим отмеченные стикеры",choice:"Выберите версии",done:"Ваш стикерпак готов"};
let autoRefresh=true, refreshing=false;
function waitingPanel(o){
 const panel=el("section","","waiting-panel");
 const paused=o.quotaWait||o.paused;
 const ring=el("span","","waiting-ring");ring.setAttribute("aria-hidden","true");
 if(!paused)panel.append(ring);
 const content=el("div");
 let message;
 if(o.quotaWait)message="Заказ сохранён. Ждём восстановления лимита отрисовки.";
 else if(o.paused)message="Заказ сохранён. Отрисовка на паузе, оператор проверит очередь.";
 else if(o.stage==="portrait_queue")message=o.portraits.length
  ? "Правки получены. Здесь появится портрет № "+(o.portraits.length+1)+"."
  : "Фото получены. Первый портрет появится здесь.";
 else if(o.stage==="series_queue")message="Портрет № "+(o.portraits.indexOf(o.approved)+1)+" утверждён. Когда все стикеры будут готовы, здесь появится набор из "+o.items.length+" шт.";
 else message="Правки получены. Здесь появятся исходные и новые версии для сравнения.";
 const hint=el("p");const toggle=button("",()=>{
  autoRefresh=!autoRefresh;sync();if(autoRefresh)refresh();
 });
 function sync(){
  toggle.textContent=autoRefresh?"Выключить автообновление":"Включить автообновление";
  toggle.setAttribute("aria-pressed",String(autoRefresh));
  hint.textContent=autoRefresh?"Проверяем каждые 15 секунд, пока страница открыта.":"Автообновление выключено. Можно проверить вручную.";
 }
 sync();content.append(el("strong",message));
 if(o.progress){
  const progress=o.progress;
  const count=el("p","Готово "+progress.done+" из "+progress.total);
  const bar=el("progress");bar.max=progress.total;bar.value=progress.done;bar.setAttribute("aria-label",count.textContent);
  content.append(count,bar);
  if(!paused){
   content.append(el("p",progress.active?"Сейчас рисуем: "+progress.active:"Ждём следующую реакцию в очереди."));
   content.append(el("p",progress.minutes?"Осталось примерно "+progress.minutes+" мин по темпу этого заказа.":"Оценка времени появится после первых готовых рисунков."));
  }
 }
 content.append(hint,toggle);panel.append(content);area.append(panel);
}
function render(o){
 order=o;renderId++;urls.forEach(URL.revokeObjectURL);urls=[];area.replaceChildren();
 document.querySelector("#title").textContent=titles[o.stage];
 document.querySelector("#price").textContent=(o.package?"Пакет · "+o.package+" шт.":o.items.length+" × "+o.unit+" ₽")+" = "+(o.freePilot?"бесплатно":o.total+" ₽")+(o.payments?.length?" · оплачено за доп. правки: "+o.payments.reduce((a,p)=>a+p.amount,0)+" ₽":"");
 document.querySelector("#order-tools").hidden=false;
 if(o.stage==="portrait_review")portraits();
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
  const o=await (await api("order")).json();
  if(busy||previousRender!==renderId)return;
  if(!order||o.revision!==order.revision||o.stage!==order.stage||JSON.stringify(o.progress)!==JSON.stringify(order.progress)||o.paused!==order.paused||o.quotaWait!==order.quotaWait)render(o);
  statusLine.textContent="";
 }catch(e){statusLine.textContent=e.message}
 finally{refreshing=false}
}
document.querySelector("#refresh").onclick=refresh;
document.querySelector("#copy-link").onclick=async()=>{
 const hint=document.querySelector("#copy-status");
 try{await navigator.clipboard.writeText(location.href);hint.textContent="Личная ссылка скопирована."}
 catch{hint.textContent="Скопируйте адрес этой страницы из строки браузера."}
};
if(/^[a-f0-9]{64}$/.test(key)){
 function checkWaiting(){
  if(autoRefresh&&!document.hidden&&(!order||order.stage.endsWith("_queue")||order.quote))refresh();
 }
 refresh();setInterval(checkWaiting,15000);
 document.addEventListener("visibilitychange",checkWaiting);
}else{document.querySelector("#title").textContent="Нужна личная ссылка";statusLine.textContent="Откройте сохранённую ссылку заказа целиком."}
