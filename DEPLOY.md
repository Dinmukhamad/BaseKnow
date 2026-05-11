# Deploy Guide

Frontend уже настроен на GitHub Pages через `.github/workflows/deploy-frontend.yml`.
Чтобы сайт работал полностью, нужно задеплоить backend и указать его URL в сборке frontend.

## 1. Backend + PostgreSQL на Render

1. Открой Render: https://dashboard.render.com
2. Нажми `New` -> `Blueprint`.
3. Подключи GitHub repository `Dinmukhamad/BaseKnow`.
4. Render увидит `render.yaml` и предложит создать:
   - `baseknow-backend`
   - `baseknow-db`
5. Нажми `Apply`.
6. Дождись статуса `Live`.
7. Скопируй URL backend, например:

```text
https://baseknow-backend.onrender.com
```

Backend сам выполнит:

```bash
alembic upgrade head
python -m app.seed
uvicorn app.main:app
```

Swagger после деплоя:

```text
https://baseknow-backend.onrender.com/docs
```

Health check:

```text
https://baseknow-backend.onrender.com/health
```

## 2. Подключить frontend к backend

В GitHub открой:

```text
https://github.com/Dinmukhamad/BaseKnow/settings/variables/actions
```

Создай repository variable:

```text
Name: VITE_API_URL
Value: https://baseknow-backend.onrender.com
```

После этого открой Actions:

```text
https://github.com/Dinmukhamad/BaseKnow/actions/workflows/deploy-frontend.yml
```

Нажми:

```text
Run workflow
```

## 3. Открыть сайт

Frontend:

```text
https://dinmukhamad.github.io/BaseKnow/#/login
```

Seed users создаются при старте backend:

```text
admin / generated password from Render env
supervisor / Supervisor123!
operator / Operator123!
```

Важно: пароль `admin` в Render генерируется автоматически. Его можно посмотреть или заменить в Render:

```text
baseknow-backend -> Environment -> SEED_ADMIN_PASSWORD
```

Если админ уже создан, смена env-переменной не изменит пароль существующего пользователя. Для первого деплоя сразу задай нужный `SEED_ADMIN_PASSWORD`, например `Admin12345!`, перед первым успешным стартом.

## 4. Что проверить

1. Backend `/health` возвращает:

```json
{"status":"ok"}
```

2. Swagger открывается.
3. GitHub Actions frontend deploy завершился `success`.
4. На странице login нет ошибок в browser console.
5. Login работает под `operator` или `supervisor`.

## Production Notes

- Render free instances могут засыпать, первый запрос будет медленным.
- Загруженные файлы в локальную папку `uploads` на ephemeral-хостингах могут пропадать после redeploy. Для production нужно подключить S3/MinIO.
- Для production лучше сменить seed passwords и отключить публичный seed demo users.
- `CORS_ORIGINS` должен содержать домен frontend: `https://dinmukhamad.github.io`.
