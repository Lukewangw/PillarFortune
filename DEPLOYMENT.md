# Deployment Guide

This guide covers deploying cf_ai_pillarfortune to Cloudflare (Workers + Pages-style assets + D1 + Durable Objects).

---

## Prerequisites

- **Node.js** ≥ 18 and **npm** installed locally.
- A **Cloudflare account** with Workers, D1, and AI access enabled.
- **Wrangler CLI** (installed automatically as a dev dependency via `npm install`).
  - Authenticate once: `npx wrangler login`

---

## First-time deployment

Follow these steps once to provision infrastructure and do the initial deploy.

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser window to grant Wrangler access to your Cloudflare account.

### 3. Create the D1 database

```bash
npx wrangler d1 create cf-ai-pillarfortune-db
```

The command prints output similar to:

```
✅ Successfully created DB 'cf-ai-pillarfortune-db'

[[d1_databases]]
binding = "DB"
database_name = "cf-ai-pillarfortune-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` value.

### 4. Set the database ID in wrangler.jsonc

Open `wrangler.jsonc` and replace `REPLACE_WITH_D1_DATABASE_ID` with the ID you just copied:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "cf-ai-pillarfortune-db",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",   // ← paste here
    "migrations_dir": "worker/migrations"
  }
]
```

### 5. Apply D1 migrations to the remote database

```bash
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --remote
```

This creates the `users`, `tarot_readings`, and `tarot_messages` tables in production.

### 6. Deploy

```bash
npm run deploy
```

This single command:
1. Runs `npm run build` — compiles the React frontend into `build/`.
2. Runs `wrangler deploy` — uploads the Worker code and `build/` assets to Cloudflare.

Wrangler prints the deployed Worker URL when it finishes, for example:

```
https://cf-ai-pillarfortune.<your-subdomain>.workers.dev
```

Your app is now live at that URL.

---

## Deploying a new version (updates)

After the initial setup is complete, deploying any code change is a single command:

```bash
npm run deploy
```

This rebuilds the frontend and re-deploys both the Worker code and the static assets in one step. No other steps are required unless the database schema has changed (see below).

### If there are new D1 migrations

When new files are added under `worker/migrations/`, apply them before deploying:

```bash
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --remote
npm run deploy
```

---

## Verify the deployment

1. Open the Worker URL printed by Wrangler.
2. Choose a spread, enter a question, and click **Draw Cards**.
3. Confirm cards and the AI interpretation are rendered.
4. Ask a follow-up question in the chat panel.
5. Check the history panel refreshes and shows the saved reading.

---

## Environment variables

All required bindings are declared in `wrangler.jsonc` and provisioned automatically by Wrangler:

| Binding | Type | Purpose |
|---|---|---|
| `AI` | Workers AI | Llama 3.3 inference |
| `DB` | D1 | Persistent reading + message history |
| `TAROT_SESSION` | Durable Object | Per-session stateful context |

No secrets or `.env` files need to be set for the Worker in production.

If you host the frontend separately (e.g., Cloudflare Pages as a standalone site), set:

```bash
REACT_APP_API_BASE_URL=https://cf-ai-pillarfortune.<your-subdomain>.workers.dev
```

in your Pages project environment variables before triggering a Pages build.

---

## Useful Wrangler commands

| Command | Purpose |
|---|---|
| `npx wrangler login` | Authenticate with Cloudflare |
| `npx wrangler whoami` | Check which account is active |
| `npx wrangler deploy` | Deploy Worker + assets (skips frontend build) |
| `npm run deploy` | Build frontend **and** deploy (recommended) |
| `npx wrangler tail` | Stream live Worker logs from production |
| `npx wrangler d1 migrations apply cf-ai-pillarfortune-db --remote` | Apply pending DB migrations |
| `npx wrangler dev` | Run Worker locally on `http://127.0.0.1:8787` |
