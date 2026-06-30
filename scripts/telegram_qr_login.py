import asyncio
from pathlib import Path

import qrcode
from telethon import TelegramClient


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / "telegram.env.local"
SESSION_PATH = PROJECT_ROOT / ".telegram_avatar_lookup"
QR_PATH = PROJECT_ROOT / "telegram-login-qr.png"


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
    api_id = int(env["TELEGRAM_API_ID"])
    api_hash = env["TELEGRAM_API_HASH"]

    client = TelegramClient(str(SESSION_PATH), api_id, api_hash)
    await client.connect()
    try:
        if await client.is_user_authorized():
            print("already_authorized")
            return

        qr_login = await client.qr_login()
        image = qrcode.make(qr_login.url)
        image.save(QR_PATH)
        print(f"qr_path: {QR_PATH}", flush=True)
        await qr_login.wait(timeout=180)
        print("qr_login_authorized")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
