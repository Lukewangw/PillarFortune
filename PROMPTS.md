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
