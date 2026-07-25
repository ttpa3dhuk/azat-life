"""Забирает последние записи из публичного Telegram-канала в assets/posts.json.

Прямой запрос к t.me из браузера невозможен (CORS), а виджета «лента канала»
у Telegram нет — есть только вставка одного поста по номеру. Поэтому посты
складываются в статический JSON, который сайт читает при загрузке.

Запускается по расписанию из .github/workflows/telegram.yml.
"""
import html
import json
import re
import sys
import urllib.request
from pathlib import Path

CHANNEL = "azatlife"
LIMIT = 3
OUT = Path(__file__).resolve().parent.parent / "assets" / "posts.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"

# в разметке t.me/s/<channel> каждый пост завёрнут в этот блок
WRAP = "tgme_widget_message_wrap js-widget_message_wrap"
ID_RE = re.compile(r'data-post="([^"]+)"')
DATE_RE = re.compile(r'datetime="([^"]+)"')
TEXT_RE = re.compile(r'class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', re.S)


def strip_tags(fragment: str) -> str:
    """HTML поста → плоский текст с сохранением переносов строк."""
    text = re.sub(r"<br\s*/?>", "\n", fragment)
    text = re.sub(r"</p\s*>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def excerpt(text: str, limit: int = 240) -> str:
    """Пост в одну строку: у записей в Telegram нет заголовков, показываем начало текста."""
    body = " ".join(text.split())
    if len(body) <= limit:
        return body
    return body[:limit].rsplit(" ", 1)[0] + "…"


def fetch(channel: str) -> str:
    req = urllib.request.Request(f"https://t.me/s/{channel}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "replace")


def parse(page: str, limit: int) -> list[dict]:
    posts = []
    for chunk in page.split(WRAP)[1:]:
        body = TEXT_RE.search(chunk)
        if not body:                      # пост без текста (только фото или видео) — пропускаем
            continue
        text = strip_tags(body.group(1))
        post_id = ID_RE.search(chunk)
        date = DATE_RE.search(chunk)
        if not (text and post_id and date):
            continue
        posts.append({
            "url": f"https://t.me/{post_id.group(1)}",
            "date": date.group(1),
            "text": excerpt(text),
        })
    posts.reverse()                       # на странице сверху старые, снизу свежие
    return posts[:limit]


def main() -> int:
    try:
        posts = parse(fetch(CHANNEL), LIMIT)
    except Exception as exc:
        print(f"не удалось получить посты: {exc}", file=sys.stderr)
        return 1

    if not posts:
        print("постов не найдено — файл не трогаем", file=sys.stderr)
        return 1

    payload = {"channel": CHANNEL, "posts": posts}
    new = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    if OUT.exists() and OUT.read_text(encoding="utf-8") == new:
        print("изменений нет")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(new, encoding="utf-8")
    print(f"записано постов: {len(posts)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
