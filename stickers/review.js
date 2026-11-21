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
async function download(){
 try{const blob=await (await api("pack")).blob();const a=el("a");a.href=URL.createObjectURL(blob);a.download="stickers.zip";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}
 catch(e){statusLine.textContent=e.message}
}
const titles={portrait_queue:"Портрет в очереди",portrait_review:"Узнаёте себя?",series_queue:"Готовим ваши реакции",series_review:"Посмотрите весь набор",changes_queue:"Правим отмеченные стикеры",choice:"Выберите версии",done:"Ваш стикерпак готов"};
function render(o){
 order=o;renderId++;urls.forEach(URL.revokeObjectURL);urls=[];area.replaceChildren();
 document.querySelector("#title").textContent=titles[o.stage];
 document.querySelector("#price").textContent=(o.package?"Пакет · "+o.package+" шт.":o.items.length+" × "+o.unit+" ₽")+" = "+(o.freePilot?"бесплатно":o.total+" ₽")+(o.payments?.length?" · оплачено за доп. правки: "+o.payments.reduce((a,p)=>a+p.amount,0)+" ₽":"");
 document.querySelector("#order-tools").hidden=false;
 if(o.stage==="portrait_review")portraits();
 else if(o.stage==="series_review")series();
 else if(o.stage==="choice")choose();
 else if(o.stage==="done"){area.append(button("Скачать выбранные стикеры",download,true));quote()}
 else {
  const msg={portrait_queue:"Фотографии получены. Следующий портрет появится здесь. Версия "+(o.portraits.length+1)+" из "+(3+(o.paidPortraits||0))+".",
   series_queue:"Портрет утверждён. Все выбранные реакции появятся здесь вместе.",
   changes_queue:"После правок вы сможете сравнить версии и оставить ту, которая нравится."};
  area.append(el("p",o.quotaWait?"Заказ сохранён. Очередь ждёт восстановления лимита отрисовки.":o.paused?"Заказ сохранён. Отрисовка приостановлена, оператор проверит очередь.":msg[o.stage]),el("p","Ваши реакции: "+o.items.map(i=>i.label).join(" · ")));
 }
}
async function refresh(){
 if(busy)return;
 try{const o=await (await api("order")).json();if(!order||o.revision!==order.revision||o.paused!==order.paused||o.quotaWait!==order.quotaWait)render(o);statusLine.textContent=""}
 catch(e){statusLine.textContent=e.message}
}
document.querySelector("#refresh").onclick=refresh;
document.querySelector("#copy-link").onclick=async()=>{
 const hint=document.querySelector("#copy-status");
 try{await navigator.clipboard.writeText(location.href);hint.textContent="Личная ссылка скопирована."}
 catch{hint.textContent="Скопируйте адрес этой страницы из строки браузера."}
};
if(/^[a-f0-9]{64}$/.test(key)){
 refresh();setInterval(()=>{if(!document.hidden && (order?.stage.endsWith("_queue")||order?.quote))refresh()},7000);
}else{document.querySelector("#title").textContent="Нужна личная ссылка";statusLine.textContent="Откройте сохранённую ссылку заказа целиком."}
