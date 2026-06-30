import asyncio
import json
import os
from pathlib import Path

from telethon import TelegramClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / "telegram.env.local"
SESSION_PATH = PROJECT_ROOT / ".telegram_avatar_lookup"
AVATAR_DIR = PROJECT_ROOT / "assets" / "avatars"
MANIFEST_PATH = AVATAR_DIR / "avatars-manifest.json"


PEOPLE = [
    ("Альона Дейниченко", "@Alyona_Deinychenko", "alona-deinychenko"),
    ("Альона Савош", "@aalona", "alona-savosh"),
    ("Андрей Дейниченко", "@solarvip", "andrey-deynichenko"),
    ("Андрей Зибницкий", "@blvckPL", "andrey-zibnitskiy"),
    ("Андрій Препелиця", "@prepelytsia_andrii", "andrii-prepelytsia"),
    ("Артем Аншиц", "@Cooper_0012", "artem-anshits"),
    ("Богдан Демиденко", "@bodyadem", "bogdan-demidenko"),
    ("Валерия Мерзликина", "@merzlikina_valeriia", "valeria-merzlikina"),
    ("Валерия Фоменко", "@lerafmnk", "valeria-fomenko"),
    ("Виктор Петрик", "@pan_producer", "viktor-petrik"),
    ("Виолетта Архипова", "@arhipovavi", "violetta-arkhipova"),
    ("Виталий Кордин", "@KordinVitaliy", "vitaliy-kordin"),
    ("Владислав Левкович", "@Vladyslav_Levkovych", "vladislav-levkovich"),
    ("Владислав Руденко", "@Vladislav_RDNK", "vladislav-rudenko"),
    ("Дарина Плужникова", "@itzrinaa", "darina-pluzhnikova"),
    ("Дмитрий Ковшовик", "@dimakaushovik", "dmytro-kovshovyk"),
    ("Евгений Задорин", "@x100digital", "evgeniy-zadorin"),
    ("Євген Гончаров", "@honchy1703", "yevgen-honcharov"),
    ("Елизавета Коновалова", "@elizavetava1", "elizaveta-konovalova"),
    ("Катерина Мазур", "@si_kattee", "katerina-mazur"),
    ("Константин Свіжак", "@Blecord", "konstantin-svizhak"),
    ("Мария Богатченко", "@marusyabx", "maria-bogatchenko"),
    ("Мария Косякова", "@mariisinica", "maria-kosyakova"),
    ("Матвій Медоренко", "@dimonupumba", "matvii-medorenko"),
    ("Михайло Дейниченко", "@MishaDey", "mykhailo-deinychenko"),
    ("Никита Лаптинов", "@ghghghghghgke", "nikita-laptinov"),
    ("Руслана Козакова", "@rkozakova", "ruslana-kozakova"),
    ("Элла Водопьянова", "@ella_vodopianova", "ella-vodopianova"),
]


def load_env(path: Path) -> dict[str, str]:
    values = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


async def main() -> None:
    env = load_env(ENV_PATH)
    client = TelegramClient(
        str(SESSION_PATH),
        int(env["TELEGRAM_API_ID"]),
        env["TELEGRAM_API_HASH"],
    )

    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    await client.connect()
    try:
        if not await client.is_user_authorized():
            raise RuntimeError("Telegram session is not authorized. Run telegram_auth_manual.py first.")

        for table_name, username, slug in PEOPLE:
            output_path = AVATAR_DIR / f"{slug}.jpg"
            record = {
                "tableName": table_name,
                "username": username,
                "file": None,
                "status": "pending",
            }

            try:
                entity = await client.get_entity(username)
                downloaded = await client.download_profile_photo(
                    entity,
                    file=str(output_path),
                    download_big=True,
                )
                if downloaded:
                    record["status"] = "downloaded"
                    record["file"] = Path(downloaded).name
                else:
                    record["status"] = "no_profile_photo"
            except Exception as exc:
                record["status"] = "error"
                record["error"] = f"{type(exc).__name__}: {exc}"

            print(f"{table_name} -> {record['status']} -> {record.get('file', '')}", flush=True)
            manifest.append(record)
    finally:
        await client.disconnect()

    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    asyncio.run(main())
