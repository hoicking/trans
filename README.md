# Trans

Trans is a restrained, SaaS-style translation management workspace for multiple
projects, languages, import/export workflows, AI-assisted translation, and
review status tracking.

## Stack

- Next.js App Router, React, TypeScript
- shadcn/ui-style components, Tailwind CSS, TanStack Table
- Postgres data model with Prisma
- Better Auth email/password auth route scaffold
- OpenAI-compatible AI translation route with ChatGPT and DeepSeek provider configs
- Excel import/export through `xlsx`

## Run Locally

```bash
npm install
npm run prisma:migrate
npm run dev -- --port 3001
```

Open `http://127.0.0.1:3001`.

The app reads and writes through the Postgres-backed `/api/projects` routes.
`localStorage` is kept only as an offline fallback if the API is unavailable.

## Database Setup

Start the local Docker database:

```bash
docker compose up -d postgres
```

The local connection string is:

```txt
postgresql://trans:trans_dev_password@127.0.0.1:5433/trans?schema=public
```

Copy `.env.example` to `.env`, fill production values when needed, then run:

```bash
npm run prisma:generate
npm run prisma:migrate
```

For production, set a strong `BETTER_AUTH_SECRET`; the in-code fallback is only
for local build and development convenience.

## Docker Production Deploy

This repository is safe to publish to GitHub: runtime secrets, dumps, logs, and
local env files are ignored. Configure AI provider keys later in the app
Settings page after deployment.

On the server:

```bash
git clone <your-repo-url> trans
cd trans
cp .env.production.example .env.production
```

Edit `.env.production`:

```txt
APP_PORT=3000
POSTGRES_USER=trans
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=trans
DATABASE_URL=postgresql://trans:<strong-password>@postgres:5432/trans?schema=public
BETTER_AUTH_SECRET=<long-random-secret>
BETTER_AUTH_URL=http://<server-ip>:3000
```

Start an empty Postgres database and the app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

The app runs at:

```txt
http://<server-ip>:3000
```

Production starts with an empty database. Prisma migrations run automatically
when the app container starts. Translation data and AI API keys should be
imported or configured from the UI after deployment.

Useful operations:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
docker compose --env-file .env.production -f docker-compose.prod.yml restart app
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

## Implemented Workflow

- Multiple translation projects
- Default languages: `en`, `zh`, `ro`, `pl`, `it`
- Custom project languages
- Translation and review status with latest operation timestamps and actors
- Dashboard percentages for translated and reviewed keys
- Translation table with search and status filters
- Dedicated unreviewed review workspace
- JSON import/export with flat key-value format
- Excel import/export with status/time columns in export
- Import preview and duplicate-key conflict handling
- Semantic or text-based underscore key generation
- Project-level ChatGPT and DeepSeek AI provider configuration

## AI Provider Configuration

In Settings > AI Configuration, choose the provider currently used for AI
translation, then fill one or both provider API keys:

```txt
Provider: ChatGPT
Base URL: https://api.openai.com/v1
Model: gpt-4o-mini
API Key: your OpenAI API key

Provider: DeepSeek
Base URL: https://api.deepseek.com
Model: deepseek-v4-flash
API Key: your DeepSeek API key
```

AI translation actions live in the Translation and Import tabs, not in Settings.
For higher DeepSeek translation quality, change the model to `deepseek-v4-pro`.
The older `deepseek-chat` and `deepseek-reasoner` aliases are marked by DeepSeek
as deprecated after 2026-07-24 15:59 UTC.
