# cf_ai_pillarfortune

## Project name
**cf_ai_pillarfortune** (Cloudflare-native evolution of PillarFortune).

## Overview
cf_ai_pillarfortune is a tarot-first guidance app that combines deterministic card drawing with grounded LLM interpretation. The frontend is chat-first and optimized for Cloudflare Pages compatibility, while the backend is a Cloudflare Worker using Workers AI (Llama 3.3), Durable Objects for session memory, and D1 for persistent reading history.

## Why this project fits the Cloudflare AI app pattern
- AI inference runs on **Workers AI**.
- Stateful multi-turn context runs in a **Durable Object per session**.
- Persistent data is stored in **D1**.
- Orchestration is separated into workflow-style backend steps.
- Frontend and backend are cleanly split for Pages + Worker deployment.

## Features
- Tarot reading flow:
  1. choose spread
  2. ask question
  3. draw deterministic cards
  4. receive structured interpretation JSON
  5. ask follow-up session chat questions
  6. fetch saved history
- Supported spreads:
  - single-card
  - three-card
  - five-card-cross
- Session memory backed by Durable Objects.
- Reading + message persistence in D1.
- Worker API layer and frontend API client abstraction.

## Architecture
- **Frontend (CRA, React)**: `src/components/tarot/*`
- **API client**: `src/lib/api/tarotApi.js`
- **Worker API**: `worker/src/index.ts`
- **Tarot deterministic engine**: `worker/src/tarot/engine.ts`
- **Workers AI prompts/parsing**: `worker/src/tarot/ai.ts`
- **Durable Object session state**: `worker/src/durable-objects/TarotSession.ts`
- **Workflow step function**: `worker/src/workflows/readingWorkflow.ts`
- **D1 migrations**: `worker/migrations/*`

## Tech stack
- React + Tailwind (frontend)
- Cloudflare Workers (TypeScript)
- Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Durable Objects
- D1 (SQLite)
- Wrangler

## Repository structure
```txt
README.md
PROMPTS.md
src/
  components/tarot/
  lib/api/
worker/
  src/
    durable-objects/
    tarot/
    workflows/
    utils/
  migrations/
shared/types/
wrangler.jsonc
```

## Local development instructions
### 1) Install dependencies
```bash
npm install
```

### 2) Run frontend
```bash
npm start
```
Frontend default: `http://localhost:3000`

### 3) Create D1 database
```bash
npx wrangler d1 create cf-ai-pillarfortune-db
```
Copy returned `database_id` into `wrangler.jsonc`.

### 4) Apply migrations
```bash
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --local
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --remote
```

### 5) Run Worker backend locally
```bash
npx wrangler dev
```
Worker default: `http://127.0.0.1:8787`

### 6) Connect frontend to local worker
Create `.env.local`:
```bash
REACT_APP_API_BASE_URL=http://127.0.0.1:8787
```
Restart frontend after changing env vars.

## Environment variables / bindings required
Configured in `wrangler.jsonc`:
- `AI` (Workers AI binding)
- `DB` (D1 binding)
- `TAROT_SESSION` (Durable Object binding)

Optional future bindings:
- `VECTORIZE` (semantic memory)
- Realtime binding/tooling for voice session transport

## How to run the frontend
```bash
npm start
```
Open `http://localhost:3000`, go to **Tarot Reading** tab.

## How to run the Worker backend
```bash
npx wrangler dev
```

## How to create/apply D1 migrations
```bash
npx wrangler d1 migrations create cf-ai-pillarfortune-db add_tarot_tables
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --local
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --remote
```

## How Durable Objects are used
- One `TarotSession` DO per `sessionId`.
- Stores active reading context (question + cards + spread).
- Stores recent chat turns for follow-up grounding.
- Exposes `/initialize`, `/message`, and `/state` internal methods.

## How Workflows are used
`worker/src/workflows/readingWorkflow.ts` models reading generation in durable steps:
1. validate input
2. draw cards deterministically
3. call Workers AI for structured interpretation
4. persist reading
5. return assembled payload

Current implementation runs these steps directly through the API route to keep dev fast; this can be moved to explicit Cloudflare Workflows binding later with minimal code movement.

## How Workers AI with Llama 3.3 is used
- Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- Used for:
  - initial interpretation JSON
  - follow-up grounded chat reply
- Prompt constraints enforce:
  - only drawn cards + positions
  - no unseen card invention
  - reflective, practical, non-alarmist tone
  - no high-certainty medical/legal/financial guidance

## How to test the tarot reading flow
1. Start frontend + worker.
2. Enter a question and choose spread.
3. Click **Draw Cards**.
4. Verify cards and interpretation render.
5. Ask follow-up question in chat panel.
6. Click **Refresh** in history panel and verify persisted readings.

## API endpoints overview
- `POST /api/tarot/reading`
- `POST /api/tarot/follow-up`
- `GET /api/tarot/history?userId=...`
- `GET /api/tarot/reading/:id`

Example request:
```json
{
  "question": "What should I focus on in my career this month?",
  "focusArea": "career",
  "spreadType": "three-card",
  "userId": "optional-user-id"
}
```

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step deployment guide, including first-time infrastructure setup and how to deploy the newest version.

**Quick summary:**

```bash
# First-time only: create and migrate the D1 database
npx wrangler d1 create cf-ai-pillarfortune-db
# (paste returned database_id into wrangler.jsonc)
npx wrangler d1 migrations apply cf-ai-pillarfortune-db --remote

# Every deployment (initial + updates)
npm run deploy
```

## Future improvements
- Native Cloudflare Workflow binding for long-running generation chains.
- Vectorize memory retrieval augmentation.
- Realtime voice integration using the same follow-up session orchestration.
- Auth + user ownership constraints for history endpoints.

## Deployed link
- _Add deployed URL here after launch._
