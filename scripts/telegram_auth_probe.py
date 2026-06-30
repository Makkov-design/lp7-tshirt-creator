import asyncio
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import FloodWaitError


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / "telegram.env.local"
SESSION_PATH = PROJECT_ROOT / ".telegram_avatar_lookup"


def load_env(path: Path) -> dict[str, str]:
    values = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) <= 4:
        return "*" * len(digits)
    return f"+{'*' * (len(digits) - 4)}{digits[-4:]}"


async def main() -> None:
    env = load_env(ENV_PATH)
    api_id = int(env["TELEGRAM_API_ID"])
    api_hash = env["TELEGRAM_API_HASH"]
    phone = env["TELEGRAM_PHONE"]

    client = TelegramClient(str(SESSION_PATH), api_id, api_hash)
    await client.connect()
    try:
        sent = await client.send_code_request(phone)
        print(f"phone: {mask_phone(phone)}")
        print(f"sent_type: {type(sent.type).__name__}")
        print(f"timeout: {getattr(sent.type, 'timeout', None)}")
        next_type = getattr(sent, "next_type", None)
        print(f"next_type: {type(next_type).__name__ if next_type else None}")
    except FloodWaitError as exc:
        print(f"flood_wait_seconds: {exc.seconds}")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
