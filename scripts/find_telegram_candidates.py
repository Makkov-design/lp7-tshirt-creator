import argparse
import asyncio
import json
import os
import re
from pathlib import Path

from telethon import TelegramClient, functions


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / "telegram.env.local"
SESSION_PATH = PROJECT_ROOT / ".telegram_avatar_lookup"

NAMES = [
    "Альона Дейниченко",
    "Альона Савош",
    "Андрей Дейниченко",
    "Андрей Зибницкий",
    "Андрей Троян",
    "Андрій Препелиця",
    "Артем Аншиц",
    "Богдан Демиденко",
    "Валерия Мерзликина",
    "Валерия Фоменко",
    "Виктор Петрик",
    "Виолетта Архипова",
    "Виталий Кордин",
    "Віталій Максимук",
    "Владислав Левкович",
    "Владислав Руденко",
    "Дарина Плужникова",
    "Дмитрий Ковшовик",
    "Евгений Задорин",
    "Євген Гончаров",
    "Елизавета Коновалова",
    "Катерина Мазур",
    "Константин Свіжак",
    "Максим Рыжков",
    "Мария Богатченко",
    "Мария Косякова",
    "Матвій Медоренко",
    "Михайло Дейниченко",
    "Никита Лаптинов",
    "Руслана Козакова",
    "Элла Водопьянова",
]


def load_env(path: Path) -> dict[str, str]:
    values = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value
    return values


def normalize(value: str) -> str:
    value = value.lower().replace("ё", "е").replace("є", "е").replace("і", "и")
    return re.sub(r"\s+", " ", value).strip()


def full_name(user) -> str:
    return " ".join(part for part in [user.first_name, user.last_name] if part).strip()


def candidate_score(query: str, user) -> int:
    query_norm = normalize(query)
    full_norm = normalize(full_name(user))
    if full_norm == query_norm:
        return 100
    if query_norm in full_norm or full_norm in query_norm:
        return 80
    query_parts = set(query_norm.split())
    full_parts = set(full_norm.split())
    return len(query_parts & full_parts) * 20


def public_candidate(user, query: str) -> dict[str, object]:
    return {
        "display_name": full_name(user),
        "username": f"@{user.username}" if user.username else None,
        "score": candidate_score(query, user),
    }


async def search_one(client: TelegramClient, name: str) -> list[dict[str, object]]:
    seen = set()
    candidates = []

    result = await client(functions.contacts.SearchRequest(q=name, limit=10))
    for user in result.users:
        if user.bot or user.id in seen:
            continue
        seen.add(user.id)
        candidates.append(public_candidate(user, name))

    candidates.sort(key=lambda item: (item["score"], bool(item["username"])), reverse=True)
    return candidates[:5]


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    api_id = int(env["TELEGRAM_API_ID"])
    api_hash = env["TELEGRAM_API_HASH"]
    phone = env["TELEGRAM_PHONE"]
    login_code = (
        env.get("TELEGRAM_LOGIN_CODE")
        or env.get("TG_LOGIN_CODE")
        or os.environ.get("TELEGRAM_LOGIN_CODE")
        or os.environ.get("TG_LOGIN_CODE")
    )
    password = (
        env.get("TELEGRAM_2FA_PASSWORD")
        or env.get("TG_2FA_PASSWORD")
        or os.environ.get("TELEGRAM_2FA_PASSWORD")
        or os.environ.get("TG_2FA_PASSWORD")
    )

    client = TelegramClient(str(SESSION_PATH), api_id, api_hash)
    await client.start(
        phone=phone,
        code_callback=(lambda: login_code) if login_code else None,
        password=password,
    )

    rows = []
    for name in NAMES:
        candidates = await search_one(client, name)
        rows.append({"name": name, "candidates": candidates})

    await client.disconnect()

    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return

    for row in rows:
        print(row["name"])
        if not row["candidates"]:
            print("  - not found")
            continue
        for candidate in row["candidates"]:
            username = candidate["username"] or "no public username"
            print(f"  - {username} | {candidate['display_name']} | score {candidate['score']}")


if __name__ == "__main__":
    asyncio.run(main())
