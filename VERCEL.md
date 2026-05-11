# Deploy Frontend on Vercel

Vercel подходит для frontend части проекта. Backend FastAPI и PostgreSQL нужно деплоить отдельно, например на Render или Railway.

Если хочешь деплоить frontend и backend через Vercel, смотри `VERCEL_FULLSTACK.md`.
Если Vercel показывает `Application Preset: Services`, в repository есть root `vercel.json` для multi-service deploy.

## 1. Подготовить backend URL

Сначала задеплой backend и получи URL, например:

```text
https://baseknow-backend.onrender.com
```

Проверь:

```text
https://baseknow-backend.onrender.com/health
```

Должно вернуть:

```json
{"status":"ok"}
```

## 2. Создать проект в Vercel

1. Открой Vercel: https://vercel.com
2. Нажми `Add New` -> `Project`.
3. Выбери GitHub repository:

```text
Dinmukhamad/BaseKnow
```

4. В настройках проекта укажи:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## 3. Добавить Environment Variable

В Vercel project settings добавь:

```text
Name: VITE_API_URL
Value: https://baseknow-backend.onrender.com
Environment: Production
```

Если backend еще не задеплоен, frontend откроется, но login/API работать не будут.

## 4. Deploy

Нажми `Deploy`.

После деплоя Vercel даст URL вида:

```text
https://baseknow.vercel.app
```

Так как frontend использует hash routing, login будет доступен по:

```text
https://baseknow.vercel.app/#/login
```

## 5. Если после деплоя белый экран

Проверь:

1. В Vercel выбран `Root Directory: frontend`.
2. `VITE_API_URL` задан без `/api/v1` в конце.
3. Build прошел успешно.
4. Открой browser console и проверь ошибки.

## 6. CORS для backend

В backend environment variable `CORS_ORIGINS` нужно добавить Vercel-домен:

```json
["https://dinmukhamad.github.io","https://baseknow.vercel.app"]
```

После изменения env-переменной backend нужно redeploy/restart.
