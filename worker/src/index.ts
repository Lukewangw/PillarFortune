import { TarotSession } from "./durable-objects/TarotSession";
import { generateFollowUp } from "./tarot/ai";
import { runReadingWorkflow } from "./workflows/readingWorkflow";
import { saveMessage, saveReading } from "./utils/db";
import { validateFollowUpInput, validateReadingInput } from "./utils/validation";

function jsonError(message: string, status = 400) {
  return withCors(Response.json({ error: message }, { status }));
}


const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

async function getSessionStub(env: any, sessionId: string) {
  const doId = env.TAROT_SESSION.idFromName(sessionId);
  return env.TAROT_SESSION.get(doId);
}

const worker = {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    try {
      if (request.method === "POST" && url.pathname === "/api/tarot/reading") {
        const body = validateReadingInput(await request.json());
        const sessionId = body.sessionId || id("sess");
        const readingId = id("rdg");

        const { cards, interpretation } = await runReadingWorkflow(env, body, { sessionId, readingId });
        await saveReading(env, {
          id: readingId,
          userId: body.userId,
          sessionId,
          question: body.question,
          focusArea: body.focusArea,
          spreadType: body.spreadType,
          cards,
          interpretation,
        });

        const stub = await getSessionStub(env, sessionId);
        await stub.fetch("https://do/initialize", {
          method: "POST",
          body: JSON.stringify({
            context: { readingId, question: body.question, focusArea: body.focusArea, spreadType: body.spreadType, cards },
            history: [{ role: "assistant", content: interpretation.summary }],
          }),
        });

        return withCors(Response.json({
          readingId,
          sessionId,
          spreadType: body.spreadType,
          question: body.question,
          focusArea: body.focusArea,
          cards,
          interpretation,
          chatHistory: [{ role: "assistant", content: interpretation.summary }],
        }));
      }

      if (request.method === "POST" && url.pathname === "/api/tarot/follow-up") {
        const body = validateFollowUpInput(await request.json());
        const stub = await getSessionStub(env, body.sessionId);
        const stateResponse = await stub.fetch("https://do/state");
        const state = await stateResponse.json<any>();

        if (!state?.context?.cards) return jsonError("Session context not found.", 404);

        const reply = await generateFollowUp(env, {
          message: body.message,
          cards: state.context.cards,
          question: state.context.question,
          history: state.history || [],
        });

        const update = await stub.fetch("https://do/message", {
          method: "POST",
          body: JSON.stringify({ message: body.message, reply }),
        });
        const updated = await update.json<any>();

        await Promise.all([
          saveMessage(env, body.sessionId, "user", body.message),
          saveMessage(env, body.sessionId, "assistant", reply),
        ]);

        return withCors(Response.json({ reply, sessionId: body.sessionId, history: updated.history || [] }));
      }

      if (request.method === "GET" && url.pathname === "/api/tarot/history") {
        const userId = url.searchParams.get("userId");
        if (!userId) return jsonError("userId query parameter is required.");

        const { results } = await env.DB.prepare(
          `SELECT id, user_id, session_id, question, focus_area, spread_type, summary_text, created_at
           FROM tarot_readings WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 25`
        )
          .bind(userId)
          .all();
        return withCors(Response.json({ readings: results }));
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/tarot/reading/")) {
        const readingId = url.pathname.split("/").pop();
        const reading = await env.DB.prepare(
          `SELECT * FROM tarot_readings WHERE id = ?1 LIMIT 1`
        )
          .bind(readingId)
          .first();

        if (!reading) return jsonError("Reading not found.", 404);
        return withCors(Response.json(reading));
      }

      return withCors(new Response("Not found", { status: 404 }));
    } catch (error: any) {
      return jsonError(error.message || "Unhandled server error", 500);
    }
  },
};

export { TarotSession };
export default worker;
