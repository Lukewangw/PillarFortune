/**
 * End-to-end API smoke test against a running Worker (Durable Objects + D1):
 *
 *   npx wrangler dev -c wrangler.test.jsonc      # simulated model, local storage
 *   npx tsx scripts/smoke-api.ts [base-url]
 *
 * Exits non-zero on the first failed check.
 */
import assert from "node:assert/strict";
import { drawCards, sameCards } from "../src/core/tarot/engine";

const BASE = (process.argv[2] ?? "http://127.0.0.1:8787").replace(/\/$/, "");
let checks = 0;

async function call<T = Record<string, any>>(method: string, path: string, body?: unknown): Promise<{ status: number; json: T }> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.7" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as T };
}

function check(name: string, fn: () => void) {
  fn();
  checks++;
  console.log(`  ✓ ${name}`);
}

const clientId = `smoke_${Date.now()}`;
const seed = "a3c2f09b7d1e4c5a8b6f0e9d2c1b3a4f";
const picks = [7, 33, 61];

console.log(`Smoke-testing ${BASE}`);
const health = await call("GET", "/api/health");
check("health", () => assert.equal(health.json.ok, true));

// 1. A reading: routed, drawn server-side from (seed, picks), interpreted, validated, traced.
const created = await call("POST", "/api/readings", { question: "How can I grow into my new team lead role?", spread: "three", seed, picks, focus: "auto", clientId });
const reading = created.json.reading;
check("reading created", () => {
  assert.equal(created.status, 200, JSON.stringify(created.json));
  assert.equal(created.json.status, "ok");
  assert.match(reading.id, /^rdg_[0-9a-f]{16}$/);
  assert.match(reading.sessionId, /^ses_[0-9a-f]{16}$/);
});
check("server draw equals the client's recomputation", () => assert.ok(sameCards(reading.draw, drawCards({ seed, spread: "three", picks }))));
check("interpretation references exactly the drawn cards", () =>
  assert.deepEqual(
    reading.interpretation.cards.map((c: { cardId: string }) => c.cardId),
    reading.draw.cards.map((c: { cardId: string }) => c.cardId),
  ),
);
check("router ran and a trace was returned", () => {
  assert.equal(reading.route.focusSource, "router");
  assert.ok(created.json.trace.spans.some((s: { name: string }) => s.name === "llm.attempt" || s.name === "fallback.compose"));
});

// 2. Follow-ups: two sent concurrently must both land, in order, without losing turns.
const [a, b] = await Promise.all([
  call("POST", `/api/sessions/${reading.sessionId}/messages`, { message: "What does the present card ask of me?" }),
  call("POST", `/api/sessions/${reading.sessionId}/messages`, { message: "How do the past and future cards relate?" }),
]);
check("concurrent follow-ups are serialized by the Durable Object", () => {
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.equal(b.status, 200, JSON.stringify(b.json));
  assert.deepEqual([a.json.turns, b.json.turns].sort(), [1, 2]);
});
for (const message of ["Which card is the most hopeful?", "What should I do this week?", "What should I be careful about?"]) {
  const r = await call("POST", `/api/sessions/${reading.sessionId}/messages`, { message });
  assert.equal(r.status, 200, JSON.stringify(r.json));
}
const session = await call("GET", `/api/sessions/${reading.sessionId}`);
check("session keeps a bounded window and compresses older turns into memory", () => {
  assert.equal(session.json.session.turns, 5);
  assert.equal(session.json.session.history.length, 8);
  assert.ok(session.json.session.memory.length > 0);
});
const foreign = await call("POST", `/api/sessions/${reading.sessionId}/messages`, { message: "What does the Ten of Swords mean for me?" });
check("follow-up about an undrawn card stays grounded", () => {
  assert.equal(foreign.status, 200);
  for (const ref of foreign.json.answer.referencedCards) assert.ok(reading.draw.cards.some((c: { cardId: string }) => c.cardId === ref.cardId));
});

// 3. Persistence and history.
const list = await call("GET", `/api/readings?clientId=${clientId}`);
check("history lists the reading", () => assert.equal(list.json.readings[0]?.id, reading.id));
const fetched = await call("GET", `/api/readings/${reading.id}`);
check("reading can be fetched by id", () => assert.equal(fetched.json.reading.question, reading.question));

// 4. Safety routing.
const crisis = await call("POST", "/api/readings", { question: "I want to kill myself and I don't see a way out", spread: "single", seed: "crisis-1", clientId });
check("explicit crisis → hard gate (support only)", () => {
  assert.equal(crisis.json.status, "support");
  assert.equal(crisis.json.support.canContinue, false);
  assert.equal(crisis.json.route.gate, "hard");
});
const soft = await call("POST", "/api/readings", { question: "everyone would honestly be better off without me around", spread: "single", seed: "soft-1", clientId });
check("warning sign → soft gate (support, may continue)", () => {
  assert.equal(soft.json.status, "support");
  assert.equal(soft.json.support.canContinue, true);
});
const cont = await call("POST", "/api/readings", { question: "everyone would honestly be better off without me around", spread: "single", seed: "soft-1", clientId, acknowledgeSupport: true });
check("soft gate + acknowledgement → gentle reading", () => {
  assert.equal(cont.json.status, "ok");
  assert.equal(cont.json.reading.route.safety, "crisis");
});

// 5. Input validation.
const bad = await call("POST", "/api/readings", { question: "hi", spread: "three", seed: "x" });
check("too-short question → 400", () => assert.equal(bad.status, 400));
const badPicks = await call("POST", "/api/readings", { question: "Valid question here?", spread: "three", seed: "x", picks: [1, 1, 2] });
check("duplicate picks → 400", () => assert.equal(badPicks.status, 400));
const badSpread = await call("POST", "/api/readings", { question: "Valid question here?", spread: "celtic", seed: "x" });
check("unknown spread → 400", () => assert.equal(badSpread.status, 400));
const missing = await call("POST", "/api/sessions/ses_0000000000000000/messages", { message: "hello there" });
check("unknown session → 404", () => assert.equal(missing.status, 404));

// 6. Monitoring.
const metrics = await call("GET", "/api/metrics?days=1");
check("metrics aggregate the traces", () => {
  assert.ok(metrics.json.reading.total >= 2);
  assert.ok(metrics.json.followup.total >= 6);
  assert.ok(metrics.json.reading.byOutcome.blocked >= 1);
});

console.log(`\n${checks} checks passed.`);
