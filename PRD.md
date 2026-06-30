# PRD: LP-7 T-Shirt Creator Figma Redesign

## 1. Контекст

Проект: интерактивный сайт `Создай свою футболку` для участников ЛП-7.

Цель: собрать персональные данные для брендированной футболки и показать участнику живой preview дизайна.

Источник дизайна: Figma файл `LP-7 t-shirts`, только страница `Flow UI`.

Важно:
- Остальные страницы Figma не использовать как UI-source.
- Mobile-first: исходные макеты 390px шириной.
- Desktop адаптив делается самостоятельно на основе мобильной композиции.
- Реализация должна быть максимально pixel-perfect к Figma.
- Каждый шаг должен иметь плавные появления, исчезновения и трансформации.

## 2. Текущий Технический Контекст

Стек проекта:
- Next.js App Router
- React
- TypeScript
- CSS
- Motion for React
- Supabase

Уже есть:
- Supabase persistence.
- Список участников в базе: это production truth.
- Текущий total участников брать из базы, не из Figma. Значение `30` в Figma является примером.
- Локальный anti-duplicate сценарий через browser/session.
- Возможность редактировать уже отправленное решение из того же браузера.

Нужно сохранить:
- fuzzy search по участникам: RU/UA/EN/translit/typos.
- запрет повторной отправки за другого/того же участника.
- кнопку `Поменять решение` для своего результата в этом браузере.

## 3. Assets

Локальные assets:
- `assets/font/SHIFTO.otf`
- `assets/gifs/gif-1.gif`
- `assets/gifs/congrats-1.gif` ... `assets/gifs/congrats-8.gif`
- `assets/avatars/*`

Fonts:
- `Geologica`: подключить из Google Fonts.
- `SHIFTO`: подключить локально через `@font-face` из `assets/font/SHIFTO.otf`.

GIF rules:
- User already completed screen: показывать `assets/gifs/gif-1.gif`.
- Success screen: рандомно выбирать одну gif из `congrats-1..8`.
- Random congrats gif должна выбираться стабильно для текущего завершения, чтобы не мигала при re-render.

Figma export/use:
- Можно использовать изображения/мокапы из Figma как production assets.
- Некоторые Figma media placeholders должны быть заменены gif-ами из `assets/gifs`.

## 4. Данные

Submission должен хранить:
- participant slug/id
- selected size
- 3 association words
- selected initials language: `RU | UA | EN`
- generated initials/back-name variant for selected language
- created timestamp
- updated timestamp

Participant должен иметь/получать:
- display name
- first name
- last name
- avatar/photo
- generated back inscription variants:
  - `RU`: русская версия имени/фамилии
  - `UA`: украинская версия имени/фамилии
  - `EN`: английская/translit версия имени/фамилии

Back inscription requirement:
- Для каждого участника нужно сгенерировать 3 графические версии надписи в едином рукописном стиле.
- В Figma `back-name zone` является vector-графикой, не обычным text layer.
- В UI на Step 4 переключатель `RU / UA / EN` должен менять preview этой графической надписи.
- Если генерация делается программно, результат должен выглядеть как единая handwritten-signature графика, а не как стандартный UI-текст.

## 5. Flow Screens

### 5.1 Splash Screen

Показывать только при первом заходе в этом браузере.

UI:
- Header: logo + `ЛП-7 | ВАРШАВА | СОЗДАТЕЛИ`.
- Header некликабельный: это только logo + text.
- Center animation: `Привет Лидер!`.
- Subheadline: `Создай свою памятную футболку!`.
- CTA: `Start`.

Annotation behavior:
- `welcome-animation` содержит 2 кольца аватарок:
  - внутреннее кольцо: 12 аватарок
  - внешнее кольцо: 16 аватарок
- При загрузке аватарки появляются плавно поочередно.
- Одновременно оба кольца медленно вращаются в разные стороны.
- Каждая аватарка сохраняет свой угол относительно горизонта, то есть не вращается вокруг собственной оси вместе с кольцом.
- Можно добавить слегка разные opacity у аватарок случайным образом для глубины.
- Start button работает как drag control:
  - пользователь тянет левую область со стрелками слева направо
  - после успешного drag активируется переход на Step 1
  - обычный tap/click можно оставить как fallback для desktop/accessibility

### 5.2 Step 1: Найди себя

States:
- default
- search results
- user already completed

Default/search UI:
- Top t-shirt mockup card.
- В стартовом состоянии мокап футболки показывается с opacity 20%.
- Step progress: active `ШАГ 1`, inactive `ШАГ 2..5`.
- Title: `Найди себя`.
- Search placeholder: `Имя, Фамилия`.
- Empty copy: `Начни вводить имя. Можно на русском, украинском или английском`.
- Search results: participant cards with avatar placeholder/photo, name, `% совпадение`, chevron.
- Search input has active state from Figma.

Already completed state:
- Если участник уже прошел flow, показать отдельный screen:
  - title: `Вторая футболка не пройдет! 🙅`
  - copy: `Эта ЛЕГЕНДАРНАЯ футболка уже была сотворена своим СОЗДАТЕЛЕМ! Вторую вселенную пока не запускаем!`
  - media: `assets/gifs/gif-1.gif`
- Не давать создать вторую футболку.
- Если это текущий пользователь в этом браузере, должен быть доступен сценарий `Поменять решение`.

### 5.3 Step 2: Выбери свой размер

UI:
- T-shirt mockup card.
- На этом шаге opacity мокапа 60%.
- Мокап слегка увеличивается относительно Step 1.
- User card: `Привет 👋` + только имя, без фамилии.
- Size grid: `XS`, `S`, `M`, `L`, `XL`, `XXL`.
- Пока размер не выбран, кнопка `Дальше` disabled.
- После выбора:
  - selected size tile changes visual state
  - selected-size badge appears top-right on t-shirt card
  - badge value changes live when size changes
  - button becomes enabled

### 5.4 Step 3: Что создаёшь? [3 слова]

UI:
- На Step 3 футболка масштабируется к груди.
- Mockup opacity становится 100%.
- Words live-preview печатается на футболке друг под другом.

Copy:
- Title: `Что создаёшь? [3 слова]`
- `Примеры:`
- `Ответственность, Любовь, Лидерство, Значимость, Сила, Забота, Поддержка, и тд...`
- Hint: `Каждое слово - до 20 символов`

Input logic:
- Нужно заполнить 3 поля.
- Лимит каждого слова: до 20 символов включительно.
- Изначально активен только первый input.
- `Дальше` disabled до заполнения всех трёх слов.
- По мере ввода слово параллельно появляется на футболке.
- Когда слово заполнено и focus переходит на следующее поле, завершённый input переходит в green completed state с checkmark.
- Кнопка `Дальше` разблокируется только после заполнения всех 3 слов.

### 5.5 Step 4: Инициалы на спине

UI:
- Back t-shirt mockup.
- `selected-size-badge` остается top-right.
- На спине показывается персонализированная handwritten надпись.

Copy:
- Title: `Инициалы на спине`
- Description: `Всё уже продумано 👌, выбери только на каком языке ты хочешь надпись и верно ли написано имя. На выбор 3 опции:`

Controls:
- Segmented language switch: `RU`, `UA`, `EN`.
- Переключение языка меняет back-name graphic preview.
- CTA: `Дальше`.

Telegram helper:
- Banner text: `Если обнаружил ошибку в своём имени - напиши мне в тг!`
- Telegram button opens: `https://t.me/Makkov69`

### 5.6 Step 5: Итоговая проверка

UI:
- Compact front/back preview card with checkmarks.
- Progress strip complete through `ШАГ 5`.
- Title: `Итоговая проверка`.

Summary fields:
- `Размер`
- `Слово #1`
- `Слово #2`
- `Слово #3`
- `Имя лидера`
- `Язык инициалов (спина)`

CTA:
- `Подтверждаю`
- Sends/upserts submission.

### 5.7 Step 6: Success

UI:
- Media card uses random gif from `assets/gifs/congrats-1..8.gif`.
- Full progress strip completed.
- Title: `Футболка создана!`
- Copy: `Твой дизайн успешно улетел в общую сетку. Теперь ждем остальных создателей!`
- Secondary CTA: `Поменять решение`.

Behavior:
- On submit, participant appears/updates in overall readiness grid.
- Current browser remembers completed participant.
- `Поменять решение` reopens editing flow with current values.

## 6. Persistent Overall Readiness Block

Appears at bottom on all non-splash screens.

Annotation:
- This block always remains at bottom for every step.
- It displays all participants.

UI:
- Card title: `Общая готовность`.
- Counter: `{completed} / {totalFromDatabase}`.
- Counter means: number of participants from the database who completed flow.
- Size chips show global selected size counts.
- Size chips start at zero if no submissions.

Cards:
- Waiting user card:
  - state for participant who has not completed flow
  - dark card
  - avatar/photo placeholder
  - name
  - `Ожидаем создателя`
- Completed user card:
  - state for participant who completed flow
  - lime/green card
  - avatar/photo
  - name
  - `WORD-1 / WORD-2 / WORD-3`
  - size badge on right

## 7. Visual System

Canvas:
- Mobile frame width: 390px.
- Source prototype device: iPhone 14, 390x844.
- Actual Figma frames vary in height because pages scroll.

Colors:
- Base background: `#0E0E0E`.
- Card surfaces: `#141414`, `#1F1F1F`, `#242424`.
- Main text: `#CCCCCC`, `#FFFFFF`.
- Muted text: gray/low opacity.
- Primary CTA: gold gradient, around `#E2AB5E` and `#F8BD6B`.
- Success/completed: lime `#C9FF99`.
- Disabled controls: low-contrast dark gray.

Shape language:
- Large rounded cards, roughly 24-32px radius.
- Pill progress segments and buttons.
- No extra decorative glows beyond what exists in Figma assets.

## 8. Typography

Fonts:
- `Geologica` from Google Fonts.
- `SHIFTO` from local `assets/font/SHIFTO.otf`.

Observed usage:
- `SHIFTO`: counters, step labels, some display/numeric UI.
- `Geologica`: body, titles, controls, form text.

Key sizes from Figma:
- Big counter: 48px SHIFTO.
- Section titles: 24-32px Geologica Medium.
- Body text: 14-16px Geologica.
- Chips/step labels: 13-14px, often uppercase.

## 9. Motion Requirements

General:
- Use Motion for React.
- Every step transition must animate.
- Avoid instant content swaps.
- Support `prefers-reduced-motion`.

Required motion:
- Splash avatar rings:
  - staggered avatar appearance
  - inner/outer ring counter-rotation
  - children visually keep upright angle
  - subtle opacity variance
- Drag-to-start:
  - arrow handle moves left-to-right
  - CTA fill/feedback responds to drag progress
  - successful drag transitions to Step 1
- Step transitions:
  - main-flow-section content fades/slides
  - progress strip morphs active/completed segments
  - buttons and inputs animate enabled/completed states
- T-shirt block:
  - smooth scale/opacity transformations between steps:
    - Step 1: front mockup, 20% opacity
    - Step 2: front mockup, 60% opacity, slightly larger
    - Step 3: front chest zoom, 100% opacity
    - Step 4: back view with generated inscription
    - Step 5: compact front/back confirmation
    - Step 6: success gif
- Form:
  - search results stagger in
  - size badge appears with scale/fade
  - words type live onto t-shirt
  - completed word input turns green with checkmark animation
  - readiness completed card animates into list

## 10. Responsive Desktop Adaptation

Mobile source is primary.

Desktop rules:
- Preserve mobile hierarchy and proportions.
- Prefer centered phone-like flow or a two-column stage if it does not break pixel-perfect mobile logic.
- Do not create a marketing landing page.
- Keep overall readiness visible without overwhelming the main flow.
- All desktop choices must derive from mobile design system.

## 11. Implementation Requirements

Must:
- Replace current UI structure with Figma flow.
- Keep Supabase data integration.
- Extend DB/API/types for `initialsLanguage` and generated initials/back-name selection if not present.
- Use database participant total, not Figma placeholder total.
- Export/use necessary Figma visual assets.
- Use local gif/font assets.
- Keep `figma.env.local` secret and uncommitted.

Validation:
- Mobile screenshot at 390px must visually match Figma frames.
- No horizontal overflow.
- Test complete happy path.
- Test duplicate participant path.
- Test edit via `Поменять решение`.
- Test language switch updates back-name preview.
- Test success gif randomization.

## 12. Back-Name Generation Decision

Chosen method: pre-generated SVG assets.

Reason:
- SVG is the most reliable production format for crisp print-like preview on every screen density.
- SVG keeps the handwritten mark sharp when scaled on the t-shirt mockup.
- SVG can be versioned, reviewed, and replaced per participant/language without runtime rendering surprises.
- PNG can be exported as fallback if a specific renderer/browser path needs raster assets.

Asset structure:
- `assets/generated/back-names/{participantSlug}/ru.svg`
- `assets/generated/back-names/{participantSlug}/ua.svg`
- `assets/generated/back-names/{participantSlug}/en.svg`

Runtime behavior:
- App loads the selected participant's SVG for the chosen language.
- `RU / UA / EN` switch swaps the SVG preview on the back t-shirt.
- Submission stores selected language and selected asset key/path.
- Supabase stores this in `submissions.initials_language` and `submissions.back_name_asset_path`.
- Until the migration is applied on the remote database, API routes must gracefully fall back to the legacy schema.

Generation scope:
- Generate `29 participants × 3 languages = 87 SVG` files.
- All SVGs must share one handwritten visual style.
- Output must look like a graphical signature/mark, not regular UI text.
