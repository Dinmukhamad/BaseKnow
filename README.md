# Contact Center Platform

Внутренняя система контакт-центра: JWT авторизация, RBAC, база знаний, аудит действий пользователей. Проект собран как масштабируемый монорепозиторий под дальнейшее подключение телефонии, CRM, AI, внутреннего чата и тикетной системы.

## Архитектура

```text
backend/
  app/
    api/             FastAPI routes and dependencies
    core/            settings, security, RBAC enums
    db/              SQLAlchemy session and base
    models/          ORM models
    repositories/    database access layer
    services/        business logic and audit publishing boundary
    schemas/         Pydantic DTOs
    middleware/      request context middleware
  alembic/           migrations
frontend/
  src/
    api/             Axios client with JWT refresh
    components/      layout and protected routes
    pages/           auth, KB, audit, users, stats
    store/           Zustand auth store
```

Backend follows API -> service -> repository -> model boundaries. `AuditPublisher` is the extension point for future Celery/Kafka/event bus integration.

## RBAC

Roles:

- `operator`: create appeals, read/search knowledge base.
- `supervisor`: operator permissions plus all appeals, logs, statistics, KB management.
- `admin`: full access, user/role/dictionary management.

Permission guards are implemented in `backend/app/api/deps.py` via `require_permissions(...)`.

## Database

Main tables:

- `users`
- `refresh_tokens`
- `kb_directions`
- `kb_topics`
- `kb_articles`
- `kb_attachments`
- `audit_logs`

The initial Alembic migration also creates a PostgreSQL GIN full-text index for KB article search.
Readable SQL reference: `docs/sql_schema.sql`.

## Run

```bash
docker compose up --build
```

Deployment instructions are in `DEPLOY.md`.
Vercel frontend deployment instructions are in `VERCEL.md`.
Full Vercel deployment instructions are in `VERCEL_FULLSTACK.md`.

Services:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Frontend Static Deploy

The frontend uses hash routing and relative Vite assets, so it can be deployed from a subpath such as GitHub Pages `/BaseKnow/`.
This repository includes `.github/workflows/deploy-frontend.yml`, which builds `frontend` and deploys `frontend/dist` to GitHub Pages.

In GitHub repository settings, set Pages source to `GitHub Actions`.
Set `VITE_API_URL` to the deployed backend URL before building:

```bash
cd frontend
VITE_API_URL=https://your-api.example.com npm run build
```

Seed users:

| Login | Password | Role |
| --- | --- | --- |
| `admin` | `Admin12345!` | admin |
| `supervisor` | `Supervisor123!` | supervisor |
| `operator` | `Operator123!` | operator |

## Local backend commands

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

## API routes

Auth:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Users:

- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/{user_id}`

Knowledge base:

- `GET /api/v1/kb/articles`
- `POST /api/v1/kb/articles`
- `GET /api/v1/kb/articles/{article_id}`
- `PATCH /api/v1/kb/articles/{article_id}`
- `DELETE /api/v1/kb/articles/{article_id}`
- `POST /api/v1/kb/articles/{article_id}/attachments`
- `GET/POST/PATCH /api/v1/kb/directions`
- `GET/POST/PATCH /api/v1/kb/topics`

Audit:

- `GET /api/v1/audit/logs`

## Audit Examples

Logged fields: `user_id`, `action`, `entity_type`, `entity_id`, `before_data`, `after_data`, `changed_fields`, `ip_address`, `user_agent`, `created_at`.

Examples already emitted by services:

- login/logout/token refresh
- user create/update
- KB article create/update/delete/open
- attachment upload
- direction/topic create/update

## Notes for Production

- Replace `JWT_SECRET_KEY` with a strong secret.
- Move uploaded files to S3/MinIO or protected object storage.
- Put backend behind a reverse proxy with TLS.
- Replace synchronous audit persistence with queue publishing when event volume grows.
- Add rate limiting for auth endpoints.
