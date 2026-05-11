# Full Deploy On Vercel

Эта инструкция деплоит весь проект через Vercel:

- `frontend` как Vite static app
- `backend` как FastAPI Vercel Function
- PostgreSQL через Vercel Marketplace, например Neon

Важно: backend и frontend лучше создать как **два отдельных Vercel проекта** из одного GitHub repository.

## Что уже подготовлено

Frontend:

```text
frontend/vercel.json
```

Backend:

```text
backend/vercel.json
backend/app/index.py
backend/.python-version
backend/.vercelignore
```

Миграции:

```text
.github/workflows/vercel-backend-migrate.yml
```

## 1. Создать PostgreSQL В Vercel

1. Открой Vercel Dashboard: https://vercel.com/dashboard
2. Открой `Storage` или `Marketplace`.
3. Выбери PostgreSQL provider, например `Neon`.
4. Создай database.
5. Скопируй connection string:

```text
DATABASE_URL=postgresql://...
```

Vercel может сам добавить переменные в выбранный проект. Но так как у нас будет два проекта, удобнее скопировать `DATABASE_URL` вручную.

## 2. Deploy Backend На Vercel

1. В Vercel нажми:

```text
Add New -> Project
```

2. Выбери GitHub repository:

```text
Dinmukhamad/BaseKnow
```

3. Настройки проекта:

```text
Project Name: baseknow-backend
Framework Preset: Other
Root Directory: backend
Build Command: empty
Output Directory: empty
Install Command: empty or default
```

Vercel увидит `backend/vercel.json` и запустит FastAPI через:

```text
backend/app/index.py
```

4. Добавь Environment Variables для backend:

```text
APP_NAME=Contact Center Platform
ENVIRONMENT=prod
DEBUG=false
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=replace-with-long-random-secret
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
CORS_ORIGINS=["https://baseknow-frontend.vercel.app"]
UPLOAD_DIR=/tmp/uploads
MAX_UPLOAD_SIZE_MB=25
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=Admin12345!
```

Если frontend domain будет другим, позже обнови `CORS_ORIGINS`.

5. Нажми `Deploy`.

6. После деплоя проверь:

```text
https://baseknow-backend.vercel.app/health
```

Ожидаемый ответ:

```json
{"status":"ok"}
```

Swagger:

```text
https://baseknow-backend.vercel.app/docs
```

## 3. Run Migrations And Seed

Vercel Function не должна запускать Alembic на каждый request. Поэтому миграции запускаются отдельно через GitHub Actions.

1. Открой GitHub repository secrets:

```text
https://github.com/Dinmukhamad/BaseKnow/settings/secrets/actions
```

2. Добавь secrets:

```text
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=the-same-secret-as-vercel-backend
CORS_ORIGINS=["https://baseknow-frontend.vercel.app"]
SEED_ADMIN_PASSWORD=Admin12345!
```

3. Открой workflow:

```text
https://github.com/Dinmukhamad/BaseKnow/actions/workflows/vercel-backend-migrate.yml
```

4. Нажми:

```text
Run workflow
```

Workflow выполнит:

```bash
alembic upgrade head
python -m app.seed
```

Seed users:

```text
admin / Admin12345!
supervisor / Supervisor123!
operator / Operator123!
```

## 4. Deploy Frontend На Vercel

1. В Vercel нажми:

```text
Add New -> Project
```

2. Выбери тот же GitHub repository:

```text
Dinmukhamad/BaseKnow
```

3. Настройки проекта:

```text
Project Name: baseknow-frontend
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. Добавь Environment Variable:

```text
VITE_API_URL=https://baseknow-backend.vercel.app
```

Важно: без `/api/v1` в конце.

5. Нажми `Deploy`.

6. Открой:

```text
https://baseknow-frontend.vercel.app/#/login
```

## 5. Обновить CORS После Frontend Deploy

Когда Vercel выдаст реальный frontend URL, вернись в backend project variables и обнови:

```text
CORS_ORIGINS=["https://baseknow-frontend.vercel.app"]
```

Если хочешь оставить GitHub Pages тоже:

```text
CORS_ORIGINS=["https://baseknow-frontend.vercel.app","https://dinmukhamad.github.io"]
```

После изменения env variables сделай redeploy backend.

## 6. Проверка

1. Backend:

```text
https://baseknow-backend.vercel.app/health
```

2. Swagger:

```text
https://baseknow-backend.vercel.app/docs
```

3. Frontend:

```text
https://baseknow-frontend.vercel.app/#/login
```

4. Login:

```text
operator / Operator123!
supervisor / Supervisor123!
admin / Admin12345!
```

## 7. Важные Ограничения Vercel Backend

### Uploads

Сейчас backend пишет файлы в:

```text
/tmp/uploads
```

Это временное хранилище Vercel Function. Для production нужно заменить storage вложений на:

- Vercel Blob
- S3
- Cloudinary
- Supabase Storage

### Long-running jobs

Vercel Functions подходят для API requests. Для тяжелых фоновых задач, AI jobs, event bus, Kafka/Celery лучше отдельный backend worker вне Vercel.

### Database connections

Используй serverless-friendly Postgres provider, например Neon. Если будут ошибки connection limit, добавь pooling connection string.

## 8. Что Делать Если Не Работает

### Frontend открылся, но login не работает

Проверь `VITE_API_URL` в frontend Vercel project:

```text
VITE_API_URL=https://baseknow-backend.vercel.app
```

Потом redeploy frontend.

### В browser console CORS error

Проверь backend variable:

```text
CORS_ORIGINS=["https://baseknow-frontend.vercel.app"]
```

Потом redeploy backend.

### Backend 500 на `/health` или `/docs`

Проверь backend env variables:

```text
DATABASE_URL
JWT_SECRET_KEY
CORS_ORIGINS
```

### Login говорит, что пользователя нет

Запусти GitHub Actions workflow:

```text
Run backend migrations and seed
```

Он создаст таблицы и seed users.
