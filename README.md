# LP-7 T-Shirt Creator

Интерактивный сайт "Создай свою футболку" для сбора размеров и персонализации брендированных футболок участников Лидерской Программы N7.

Подготовительные документы:
- [PRD](docs/PRD.md)
- [Technical Plan](docs/TECHNICAL_PLAN.md)

Рекомендованный MVP-стек:
- Next.js + TypeScript
- Tailwind CSS
- Motion for React
- Supabase Postgres + Realtime
- Vercel
- Fuse.js для умного поиска участника по имени

Принятые продуктовые решения:
- mobile-first: основной сценарий проектируется в первую очередь под телефон;
- сайт распространяется одной общей ссылкой в чате группы;
- список всех 29 участников заранее известен;
- участник находит себя по имени/фамилии и подтверждает себя по фото;
- повторная отправка блокируется по участнику в базе;
- отдельная админка в MVP не нужна, данные хранятся и экспортируются из Supabase.

Подготовленные данные:
- [data/participants.json](data/participants.json)
- [data/participants.csv](data/participants.csv)
- [supabase/schema.sql](supabase/schema.sql)
- [supabase/seed_participants.sql](supabase/seed_participants.sql)
- [supabase/rls.sql](supabase/rls.sql)
- [docs/NAME_MATCHING.md](docs/NAME_MATCHING.md)

Фото позже добавляются в [public/participants/photos](public/participants/photos). До этого используются плейсхолдеры.

Текущий статус:
- Supabase подключен через `.env.local`;
- база настроена, seed загружен, участников 29;
- RLS включен, публичное чтение разрешено, запись идет через серверный API;
- приложение работает в live-режиме через `/api/bootstrap` и `/api/submissions`.

Локальный запуск:

```bash
npm run dev
```
