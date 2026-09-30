# PROMPTS.md

## Overview
This document records representative prompts used to accelerate development of `cf_ai_pillarfortune` with AI assistance. Final implementation decisions were reviewed and adjusted manually.

## How AI assistance was used
- Architecture sketching for Cloudflare-native design.
- Drafting TypeScript worker modules and route contracts.
- Prompt engineering for grounded tarot interpretation.
- UI implementation scaffolding for chat-first tarot flow.
- Documentation drafting for reviewer-friendly README.

## Prompts for architecture planning
1. "Design a Cloudflare-native architecture for a tarot app using Workers AI, Durable Objects, D1, and optional Workflows. Keep deterministic tarot draw separate from LLM interpretation."
2. "Propose a modular folder layout for React frontend + TypeScript worker backend with shared tarot contracts."
3. "How should I model one Durable Object instance per tarot session for follow-up memory?"

## Prompts for frontend implementation
1. "Create a React TarotReadingSection component with question input, focus selector, spread selector, draw button, loading/error states, structured interpretation rendering, and follow-up chat panel."
2. "Provide a small API client abstraction layer to avoid scattered fetch calls in React components."
3. "Suggest a compact history panel UI for previously saved readings."

## Prompts for Worker API design
1. "Generate TypeScript Worker route handlers for POST /api/tarot/reading, POST /api/tarot/follow-up, GET /api/tarot/history, and GET /api/tarot/reading/:id with validation and error handling."
2. "Show request/response shapes for a deterministic draw + AI interpretation backend."
3. "Return structured JSON with readingId/sessionId/cards/interpretation and follow-up message history." 

## Prompts for Durable Objects / state management
1. "Implement a Durable Object class that stores active tarot reading context and recent chat turns with simple fetch endpoints for initialize, read state, and append message."
2. "How can I keep only the recent N turns in DO hot storage while using D1 for persistent history?"

## Prompts for Workers AI prompting
1. "Write a safe tarot interpretation prompt that only uses drawn cards and avoids unseen-card claims."
2. "Generate a follow-up chat prompt template with guardrails: practical, supportive tone; no absolute certainty in medical/legal/financial advice."
3. "How should I parse LLM JSON safely with fallback behavior when output is malformed?"

## Prompts for database schema / migrations
1. "Create D1 SQL migration for tarot_readings and tarot_messages tables with indexes for user history and session chat retrieval."
2. "Recommend minimal users table structure for optional user ownership later."

## Prompts for README/documentation generation
1. "Write a README for a Cloudflare AI app with exact commands for local frontend + worker setup, D1 migration flow, and wrangler bindings."
2. "Include reviewer-focused sections: where AI runs, where Durable Objects are used, and how to test tarot flow quickly."

## Notes on human review / edits
- AI-generated drafts were edited for project-specific naming (`cf_ai_pillarfortune`) and endpoint contracts.
- Safety constraints and deterministic/LLM separation were explicitly reviewed.
- Final code structure and documentation reflect human-reviewed integration choices, not raw AI output.

---

## v2 revision (September 2026) — AI-assisted

The v2 rewrite was produced with Claude Code, starting from the request to bring the project in line with its resume description, deploy it publicly, polish the interaction design, and emphasize ML engineering over full-stack plumbing. Representative prompts and decisions:

### Architecture and reliability
- "Separate deterministic card selection from interpretation so the server can recompute any draw from (seed, picks) and the LLM never chooses a card."
- "Generate a JSON Schema per draw with enums of the drawn card ids and positions; constrain decoding with the structural part and validate lengths, pairings, undrawn-card mentions and tone afterwards, with JSON-pointer errors that double as the repair prompt."
- "Bound retries by attempts, deadline and a daily budget; degrade from constrained to unconstrained decoding when the provider cannot meet the schema; end every path in an output that passes the same validator."
- "Build a fault-injection provider that corrupts correct outputs the way real models fail, and use it for tests, a reliability sweep and an in-browser simulator."

### Data and models
- Router training data, the dev set and a separate blind test set were written by independent AI agents that could not see each other's files; a second, targeted batch of training data was written after error analysis on dev. The blind test set was scored once, after the model was frozen.
- The 78 card meanings were written as original text for this project; the BaZi calculator was cross-checked against the `ephem` and `lunar_python` reference libraries.

### Human-facing decisions
- Crisis handling uses a two-tier gate (explicit statements → support only; uncertain detections → support plus the choice to continue), with the operating point chosen as "maximize recall subject to ≤ 5% false alarms".
- Simulated results are labeled as simulated; real-model evaluation results are only published from real runs.

### Visual redesign (v2.1)
- Feedback on v2: the dark "mystical" interface (starfield, gold gradients, glass panels, pill chips) looked generic and AI-made. The request was "learn from other people's taste."
- The redesign replaces it with a printed-almanac system: paper, ink and one vermilion accent, Newsreader and IBM Plex Mono, hairline rules, and figures with captions. The deck was redrawn as a Marseille-style printed deck. References and rules are in [docs/DESIGN.md](docs/DESIGN.md). Chart palettes were checked with a palette validator, not chosen by eye.
