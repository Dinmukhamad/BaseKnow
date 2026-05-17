# BaseKnow 2.0 — База знаний

Внутренняя платформа базы знаний для контакт-центров.  
Редизайн версии 2.0: новая дизайн-система, тёмная тема, поиск Ctrl+K, избранное, TOC.

---

## Стек

| Слой         | Технология                                         |
|--------------|----------------------------------------------------|
| Frontend     | React 18 + TypeScript + Vite 5                     |
| Стили        | CSS Custom Properties + Tailwind (утилиты)         |
| Шрифты       | Syne (UI/заголовки) + Source Serif 4 (контент)     |
| Состояние    | Zustand (auth, theme, favorites)                   |
| Запросы      | TanStack Query v5 + Axios                          |
| Роутинг      | React Router v6 (hash-routing)                     |
| Markdown     | @uiw/react-md-editor (lazy-loaded)                 |
| Backend      | FastAPI + SQLAlchemy + PostgreSQL                  |

---

## Запуск

### Требования
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # настройте VITE_API_URL
npm run dev                 # http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed          # опционально: создать тестовых пользователей
uvicorn app.main:app --reload --port 8000
```

### Docker (всё сразу)

```bash
docker compose up -d
```

Приложение: http://localhost:5173  
API docs: http://localhost:8000/docs

---

## Переменные окружения

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:8000
```

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/baseknow
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=10
```

---

## Роли и доступ

| Роль         | Возможности                                                    |
|--------------|----------------------------------------------------------------|
| `operator`   | Просмотр и поиск статей, избранное                             |
| `supervisor` | + Создание/редактирование статей, справочники, аудит, статистика |
| `admin`      | Полный доступ: пользователи, роли, все функции                 |

---

## Новое в версии 2.0

### Дизайн
- Новая дизайн-система на CSS Custom Properties (токены)
- Тёмная и светлая темы с `data-theme` + `prefers-color-scheme`
- Шрифты Syne + Source Serif 4 (вместо Inter)
- Электрик-синий акцент (#1d68f0) на тёмно-синем фоне
- Сворачиваемый сайдбар с тултипами в collapsed-режиме
- Плавные переходы и hover-эффекты на всех интерактивных элементах

### Функционал
- **Ctrl+K** — глобальный поиск с историей запросов
- **Избранное** — ❤ на каждой статье, страница `/favorites`
- **Прогресс чтения** — полоса прогресса вверху страницы
- **TOC** — оглавление с автоподсветкой текущего раздела
- **Копирование кода** — кнопка на каждом блоке кода
- **Skeleton loaders** — вместо спиннеров
- **Pagination с ellipsis** — для больших списков
- **BackToTop** — кнопка при скролле вниз

### Производительность
- Code splitting: react-vendor, query-vendor, md-editor, ui-vendor
- Lazy loading всех страниц
- TanStack Query кеширование (30s stale time)
- HTTP Cache-Control заголовки на бэкенде
- `optimizeDeps` для быстрого HMR

### Доступность
- `skip-link` — первый элемент DOM
- `focus-visible` стили на всех фокусируемых элементах
- `aria-label` на всех иконочных кнопках
- `aria-current="page"` в навигации
- `aria-live="polite"` на ошибках форм и тостах
- `role="search"` на поисковом блоке
- `prefers-reduced-motion` отключает анимации

---

## Структура

```
frontend/src/
├── api/
│   └── client.ts          # Axios + interceptor авторебефреша
├── components/
│   ├── Layout.tsx          # Сайдбар + main + SearchModal
│   ├── SearchModal.tsx     # Ctrl+K поиск
│   ├── ArticleExtras.tsx   # ReadingProgress, TOC, BackToTop
│   ├── Pagination.tsx      # Пагинация с ellipsis
│   ├── Skeleton.tsx        # Skeleton loaders
│   ├── Toast.tsx           # Уведомления
│   └── ProtectedRoute.tsx  # Защита роутов
├── lib/
│   ├── history.ts          # История просмотров (localStorage)
│   ├── rbac.ts             # Хелперы ролей
│   └── useDebounce.ts      # Debounce хук
├── pages/
│   ├── KBListPage.tsx      # Список статей
│   ├── KBArticlePage.tsx   # Просмотр статьи
│   ├── KBEditorPage.tsx    # Редактор Markdown
│   ├── KBDictionariesPage.tsx
│   ├── FavoritesPage.tsx   # Избранное (новое)
│   ├── LoginPage.tsx
│   ├── ProfilePage.tsx
│   ├── UsersPage.tsx
│   ├── AuditPage.tsx
│   └── StatsPage.tsx
├── store/
│   ├── auth.ts             # Zustand + persist
│   ├── theme.ts            # Тема (light/dark)
│   └── favorites.ts        # Избранное (localStorage)
├── styles/
│   ├── tokens.css          # CSS custom properties (дизайн-токены)
│   ├── global.css          # Глобальные стили + компоненты
│   └── sidebar.css         # Стили сайдбара
├── types/
│   └── index.ts
└── main.tsx
```

---

## Deply

### Vercel (рекомендуется)

```bash
# frontend
vercel --prod

# backend (отдельный проект или Render)
```

Подробнее: [VERCEL.md](./VERCEL.md)

### Docker

```bash
docker compose up -d --build
```

---

## Чеклист обновления

- [x] Дизайн-система (CSS токены, темы, шрифты)
- [x] Тёмная/светлая тема + prefers-color-scheme
- [x] Сворачиваемый сайдбар
- [x] Search modal (Ctrl+K)
- [x] Skeleton loaders
- [x] Pagination с ellipsis
- [x] Избранное (хранение в localStorage)
- [x] История просмотров (localStorage)
- [x] ReadingProgress + BackToTop
- [x] TOC с IntersectionObserver
- [x] Копирование кода (code blocks)
- [x] Scroll-reveal (IntersectionObserver)
- [x] a11y: skip-link, focus-visible, aria-*
- [x] Обновлены зависимости
- [x] Оптимизированный vite.config
- [ ] Service Worker (Workbox) — TODO
- [ ] Fulltext search (Fuse.js) — TODO
- [ ] URL-параметры для фильтров — TODO
- [ ] E2E тесты (Playwright) — TODO
