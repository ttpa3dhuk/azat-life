# azat.life

Личный сайт. Статика без сборки: `index.html` + `css/style.css`, хостинг — GitHub Pages.

Открыть `index.html` в браузере — этого достаточно для локального просмотра.
Публикация — обычный `git push` в `main`.

Блок «Пишу в Telegram» обновляется сам: `.github/workflows/telegram.yml` дважды в день
запускает `tools/fetch_posts.py`, тот кладёт свежие записи канала в `assets/posts.json`.
