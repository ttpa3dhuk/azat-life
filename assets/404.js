const lightSwitch = document.getElementById('light-switch');
const lightMessage = document.getElementById('light-message');
const stageStatus = document.getElementById('stage-status');
const stage = document.getElementById('stage');

lightSwitch.addEventListener('click', () => {
  const isLive = document.body.classList.toggle('lights-on');
  lightSwitch.setAttribute('aria-pressed', String(isLive));
  lightSwitch.innerHTML = isLive
    ? '<span class="button__icon" aria-hidden="true">◉</span> Выключить'
    : '<span class="button__icon" aria-hidden="true">◉</span> Дать свет';
  lightMessage.textContent = isLive
    ? 'Свет есть. Страницы всё равно нет.'
    : 'Можно нажать «Дать свет». Страницу это не вернёт, зато будет красиво.';
  stageStatus.textContent = isLive ? 'LIGHTS ON' : 'NO INPUT';
});

if (matchMedia('(pointer: fine)').matches) {
  stage.addEventListener('pointermove', (event) => {
    const bounds = stage.getBoundingClientRect();
    stage.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    stage.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  });
  stage.addEventListener('pointerleave', () => {
    stage.style.removeProperty('--pointer-x');
    stage.style.removeProperty('--pointer-y');
  });
}
