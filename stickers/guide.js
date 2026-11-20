
const examples={man:"man",woman:"woman"};
const shots=[
["Анфас","Посмотрите прямо в объектив, расслабьте рот и держите подбородок ровно.","Видны макушка, оба глаза, челюсть и плечи. Увеличьте кадр и проверьте резкость век."],
["Три четверти влево","Повернитесь примерно на 45°, нос направлен к левому краю готового снимка.","Дальний глаз виден. Край волос у виска отделяется от фона."],
["Три четверти вправо","Повторите в другую сторону. Нос направлен к правому краю снимка.","Видны оба глаза и линия дальней щеки."]];
const options=[["🔥","Огонь"],["😂","Смех"],["🫶","От души"],["🤪","Дурачусь"],["😉","Подмигиваю"],["😎","Круто"],["😔","Грустно"],["💪","Справимся"],["🙏","Прошу"],["😘","Целую"],["🤷‍♂️","Кто знает"],["😊","Улыбаюсь"],["😬","Упс"],["🤦","Фейспалм"],["😍","Влюблённость"],["😮","Удивление"]];
const stages=["Подготовка","Кадры","Реакции","Отправка"], ids=["setup","shoot","feel","send"];
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const defaults={person:"man",stage:0,shot:0,taken:Array(shots.length).fill(false),selected:[],custom:"",details:""};
let s={...defaults};try{const a=JSON.parse(localStorage.getItem("azat.static.intake.v1"));if(a&&Array.isArray(a.taken)&&a.taken.length>=shots.length&&Array.isArray(a.selected)&&examples[a.person]&&ids[a.stage])s={...defaults,...a,shot:shots[a.shot]?a.shot:0,taken:a.taken.slice(0,shots.length)}}catch{}
function save(){try{localStorage.setItem("azat.static.intake.v1",JSON.stringify(s))}catch{}}
function btn(text,fn){let b=document.createElement("button");b.textContent=text;b.onclick=fn;return b}
function go(n){s.stage=n;save();draw();window.scrollTo(0,0);document.querySelector(".work:not([hidden]) h2")?.focus({preventScroll:true})}
function shot(n){s.shot=n;save();draw();window.scrollTo(0,0);document.querySelector(".work:not([hidden]) h2")?.focus({preventScroll:true})}
function brief(){const yes=shots.filter((_,i)=>s.taken[i]).map(a=>a[0]);const no=shots.filter((_,i)=>!s.taken[i]).map(a=>a[0]);return ["Хочу персональный статичный стикерпак.",yes.length?"Готовые кадры: "+yes.join(", ")+".":"Готовые кадры пока не отмечены.",no.length?"Осталось снять или обсудить: "+no.join(", ")+".":"", "Реакции: "+([...s.selected,s.custom.trim()].filter(Boolean).join(" ")||"подберём вместе")+".",s.details.trim()?"Детали внешности: "+s.details.trim():""].filter(Boolean).join("\n\n")}
function imagePath(i){return "/stickers/img/"+s.person+"-"+i+".jpg"}
function draw(){
 ids.forEach((id,i)=>$("#"+id).hidden=i!==s.stage);
 $$('[data-thumb]').forEach(img=>img.src=imagePath(img.dataset.thumb));
 $$(".switch button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.person===s.person));
 $$("nav button").forEach((b,i)=>{if(i===s.stage)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current")});
 const i=s.shot,[name,pose,quality]=shots[i];$("#num").textContent="Кадр "+(i+1)+" из "+shots.length;$("#count").textContent="Готово "+s.taken.filter(Boolean).length+" из "+shots.length;
 $("#shotname").textContent=name;$("#pose").textContent=pose;$("#quality").textContent=quality;
 $("#camera").textContent="Свет от окна, задняя камера 1× на уровне глаз, расстояние 1,5–2 м. Включите таймер и отключите ретушь.";
 $(".single").src=imagePath(i);$(".single").alt="Пример кадра: "+name;$("#taken").checked=s.taken[i];
 $$(".steps button").forEach((b,j)=>{b.className=(s.taken[j]?"done ":"")+(i===j?"chosen":"");b.setAttribute("aria-label",shots[j][0]+(s.taken[j]?", готов":""));b.setAttribute("aria-pressed",i===j)});
 $("#next").textContent=i===shots.length-1?"Выбрать реакции":"Дальше";$$(".chips button").forEach(b=>b.setAttribute("aria-pressed",s.selected.includes(b.textContent)));
 $("#summary").value=brief();$("#copyhint").textContent="";
}
stages.forEach((name,i)=>$("nav").append(btn(name,()=>go(i))));
for(const el of $$(".switch")){const text=document.createElement("small");text.textContent="Пример";el.append(text);for(const [key,name] of [["man","Парень"],["woman","Девушка"]]){const b=btn(name,()=>{s.person=key;save();draw()});b.dataset.person=key;el.append(b)}}
shots.forEach((v,i)=>$(".steps").append(btn(String(i+1),()=>shot(i))));
options.forEach(([em,name])=>{const b=btn(em,()=>{s.selected=s.selected.includes(em)?s.selected.filter(x=>x!==em):[...s.selected,em];save();draw()});b.setAttribute("aria-label",name);b.title=name;$(".chips").append(b)});
$$("[data-go]").forEach(b=>b.onclick=()=>go(+b.dataset.go));
$("#taken").onchange=e=>{s.taken[s.shot]=e.target.checked;save();draw()};$("#prev").onclick=()=>s.shot===0?go(0):shot(s.shot-1);
$("#next").onclick=()=>s.shot===shots.length-1?go(2):shot(s.shot+1);
for(const id of ["custom","details"]){$("#"+id).value=s[id];$("#"+id).oninput=e=>{s[id]=e.target.value;save()}}
$("#copy").onclick=async()=>{const field=$("#summary");field.focus();field.select();$("#copyhint").textContent="Текст выделен. Если браузер спросит, разрешите копирование или скопируйте вручную.";try{await navigator.clipboard.writeText($("#summary").value);$("#copyhint").textContent="Скопировано. Вставьте текст в чат и приложите фото."}catch{const v=$("#summary");v.focus();v.select();let ok=false;try{ok=document.execCommand("copy")}catch{}$("#copyhint").textContent=ok?"Скопировано. Вставьте текст в чат.":"Текст выделен. Нажмите «Скопировать» в меню телефона."}};
draw();

$("nav").hidden=false;$("#start").onclick=e=>{e.preventDefault();go(1)};
