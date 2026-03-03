# SubTrack

Трекер подписок — мобильное приложение на Expo (React Native). Демо-проект курса [«Вайбкодинг: мобильное приложение за 3 недели»](https://github.com/serejaris/teach-vibecoding-mobile).

## Что умеет

- Dashboard с общей суммой подписок
- Добавление / редактирование / удаление подписок
- Аналитика с donut-чартами по категориям
- Напоминания о списаниях
- Мультивалютность (RUB, USD, EUR)
- 12 категорий (стриминг, музыка, игры, продуктивность и др.)
- Онбординг с популярными подписками

## Происхождение

Экспорт из [Replit](https://replit.com/@serejaris/Subscription-Insight) — создан на уроке 1 курса через AI-агент, без ручного кода.

## Ветки

| Ветка | Состояние |
|-------|-----------|
| `main` | Актуальная версия |
| `lesson-4-start` | Снимок до онбординга (начало урока 5) |

## Стек

- **Frontend:** Expo SDK 54, React Native 0.81, Expo Router
- **Backend:** Express 5 (scaffolded)
- **Хранение:** AsyncStorage (локально на устройстве)
- **Стилизация:** Dark theme, slate/teal palette, Inter font

## Запуск

```bash
npm install
npm start
```

Приложение откроется в Expo Go на телефоне или в браузере.

## Структура

```
app/                    # Expo Router — экраны
  (tabs)/               # Tab-навигация (dashboard, subscriptions, analytics, reminders)
  add-subscription.tsx  # Модалка добавления
  edit-subscription.tsx # Модалка редактирования
  onboarding.tsx        # Онбординг
components/             # Переиспользуемые компоненты
constants/              # Тема и цвета
lib/                    # Утилиты, контекст, типы
server/                 # Express backend (scaffolded)
shared/                 # Общие типы и схемы
```

## Лицензия

Учебный проект. Используйте как хотите.
