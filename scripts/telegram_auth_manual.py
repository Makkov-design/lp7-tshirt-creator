import argparse
import asyncio
import getpass
import os
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import FloodWaitError, PhoneCodeInvalidError, SessionPasswordNeededError


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
    return f"+{'*' * max(0, len(digits) - 4)}{digits[-4:]}"


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force-sms", action="store_true")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    api_id = int(env["TELEGRAM_API_ID"])
    api_hash = env["TELEGRAM_API_HASH"]
    phone = env["TELEGRAM_PHONE"]
    password = (
        env.get("TELEGRAM_2FA_PASSWORD")
        or env.get("TG_2FA_PASSWORD")
        or os.environ.get("TELEGRAM_2FA_PASSWORD")
        or os.environ.get("TG_2FA_PASSWORD")
    )

    client = TelegramClient(str(SESSION_PATH), api_id, api_hash)
    await client.connect()
    try:
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"already_authorized: {getattr(me, 'first_name', '')} ({getattr(me, 'id', '')})")
            return

        try:
            sent = await client.send_code_request(phone, force_sms=args.force_sms)
        except FloodWaitError as exc:
            print(f"flood_wait_seconds: {exc.seconds}")
            return

        print(f"phone: {mask_phone(phone)}")
        print(f"sent_type: {type(sent.type).__name__}")
        print(f"next_type: {type(sent.next_type).__name__ if sent.next_type else None}")
        print("Do not send the code through Telegram. Type it here or set TELEGRAM_LOGIN_CODE in this shell.")

        code = os.environ.get("TELEGRAM_LOGIN_CODE") or os.environ.get("TG_LOGIN_CODE")
        if not code:
            code = input("Login code: ").strip()

        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=sent.phone_code_hash)
        except PhoneCodeInvalidError:
            print("invalid_code")
            return
        except SessionPasswordNeededError:
            if not password:
                password = getpass.getpass("2FA password: ")
            await client.sign_in(password=password)

        me = await client.get_me()
        print(f"authorized: {getattr(me, 'first_name', '')} ({getattr(me, 'id', '')})")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
