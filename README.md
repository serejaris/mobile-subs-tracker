# SubTrack

Трекер подписок — мобильное приложение. Создано без единой строчки кода вручную.

Демо-проект курса [«Вайбкодинг: мобильное приложение за 3 недели»](https://github.com/serejaris/teach-vibecoding-mobile).

## Скриншоты

<p align="center">
  <img src="assets/screenshots/dashboard.png" width="270" alt="Dashboard" />
  <img src="assets/screenshots/subscriptions.png" width="270" alt="Subscriptions" />
  <img src="assets/screenshots/analytics.png" width="270" alt="Analytics" />
</p>

## Что умеет

- Дашборд — сколько ты тратишь на подписки в месяц
- Добавление, редактирование, удаление подписок
- Аналитика по категориям (стриминг, музыка, игры и т.д.)
- Напоминания о списаниях
- Поддержка рублей, долларов и евро
- Онбординг с популярными подписками

## Как создавался

Экспорт из [Replit](https://replit.com/@serejaris/Subscription-Insight) — на уроке 1 курса AI-агент сгенерировал приложение по промпту. Код руками не писали.

## Ветки

| Ветка | Что внутри |
|-------|------------|
| `main` | Актуальная версия |
| `lesson-4-start` | Снимок до добавления онбординга — старт урока 5 |

## Как запустить

**VS Code (с урока 4):**
1. Code → Download ZIP → распакуй в удобную папку
2. Открой папку в VS Code (File → Open Folder)
3. Открой Copilot Chat и напиши: «Установи все зависимости и запусти проект»
4. Приложение откроется в браузере. На телефоне — через [Expo Go](https://expo.dev/go)

**Replit (урок 1):**
1. Открой [Replit](https://replit.com) → Import from GitHub → вставь ссылку на этот репозиторий
2. Нажми Run

---

## Промпты из курса

### Дизайн онбординга в Google Stitch

Открой [stitch.withgoogle.com](https://stitch.withgoogle.com) → App → 3 Flash. Вставь:


```
Create onboarding for a subscription tracker app called "SubTrack" (display name: "Sub Tracker").

Build exactly 5 mobile screens in this order:
1) Welcome
2) Quiz question 1
3) Quiz question 2
4) Quiz question 3
5) Results

Screen details:

1) Welcome screen
- Title: "Welcome to SubTrack"
- Subtitle: "Track all your subscriptions in one place. See where your money goes and find savings."
- Feature bullets:
  - "Spending analytics by category"
  - "Charge reminders"
  - "Smart insights to save money"
- Primary CTA button: "Get Started"

2) Quiz Q1 (single-choice)
- Question: "How much do you spend on subscriptions per month?"
- Options:
  - "Less than 1,000 ₽"
  - "1,000–3,000 ₽"
  - "3,000–7,000 ₽"
  - "More than 7,000 ₽"

3) Quiz Q2 (single-choice)
- Question: "How many active subscriptions do you have?"
- Options:
  - "1–2"
  - "3–5"
  - "6–8"
  - "9+"

4) Quiz Q3 (multi-select chips/cards)
- Question: "Which categories do you pay for most often?"
- Options:
  - "Streaming"
  - "Music"
  - "Cloud"
  - "Productivity"
  - "Social"

5) Results screen
- Title: "Your subscription profile"
- Show:
  - Estimated monthly spend in ₽
  - Estimated yearly spend in ₽
  - Top likely categories based on answers
- Include recommendation card: "You may be overspending on duplicate services."
- Show realistic examples (from app data) in a small list:
  - Netflix — 999 ₽/mo
  - Spotify — 199 ₽/mo
  - YouTube Premium — 399 ₽/mo
  - iCloud+ — 99 ₽/mo
  - Yandex Plus — 399 ₽/mo
  - ChatGPT Plus — $20/mo
  - Notion — $10/mo
  - Telegram Premium — 299 ₽/mo
- Primary CTA button: "Start Tracking"
- Secondary button: "Adjust Answers"

Visual style requirements:
- Dark theme only
- Green accents
- Rounded cards and rounded buttons
- Clean, premium fintech look
- Use this palette:
  - Primary: #0D9488
  - Primary light: #14B8A6
  - Primary dark: #0F766E
  - Background: #0F172A
  - Card: #1E293B
  - Surface: #273548
  - Border: #334155
  - Main text: #F8FAFC
  - Secondary text: #94A3B8
  - Muted text: #64748B

UX constraints:
- Mobile-first
- One clear CTA per screen
- Progress indicator for quiz screens (e.g., 1/3, 2/3, 3/3)
- Keep content concise and readable
- No extra screens beyond these 5
```

20 секунд — 5 экранов готовы. Не нравится — дописывай модификации в то же поле.

### Упрощенный вариант 
```
Onboarding for a subscription tracker app "Sub Tracker".
5 mobile screens: welcome, 3 quiz questions about spending habits, results.
Style: dark theme, green accents, rounded cards.
```

### Промпт для AI-агента (VS Code Copilot / Claude Code / Cursor)

Скопируй HTML из Stitch (вкладка Code), вставь в чат агенту, и допиши:

```
Добавь онбординг в моё приложение. Дизайн экранов — в коде выше.

Экраны:
1. Welcome — "Track Your Subscriptions", кнопка "Get Started"
2. Квиз — 3 вопроса
3. Загрузка с прогресс-баром
4. Результат

Сначала составь план.
```

Агент сначала покажет план — одобряешь, и он строит.

### Если делал урок 3

На уроке 3 ты генерировал структуру онбординга в ChatGPT / Gemini / Claude — экраны, тексты кнопок, варианты ответов квиза. Можно вставить этот текст целиком в Stitch вместо трёх строк — дизайн будет точнее, потому что Stitch увидит все детали.

---

## Лицензия

Учебный проект. Используйте как хотите.
