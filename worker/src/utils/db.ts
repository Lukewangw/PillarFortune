import { DrawnCard, Interpretation } from "../tarot/types";

export async function saveReading(env: any, args: {
  id: string;
  userId?: string;
  sessionId: string;
  question: string;
  focusArea: string;
  spreadType: string;
  cards: DrawnCard[];
  interpretation: Interpretation;
}) {
  await env.DB.prepare(
    `INSERT INTO tarot_readings (id, user_id, session_id, question, focus_area, spread_type, cards_json, interpretation_json, summary_text)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  )
    .bind(
      args.id,
      args.userId || null,
      args.sessionId,
      args.question,
      args.focusArea,
      args.spreadType,
      JSON.stringify(args.cards),
      JSON.stringify(args.interpretation),
      args.interpretation.summary
    )
    .run();
}

export async function saveMessage(env: any, sessionId: string, role: "user" | "assistant", content: string) {
  await env.DB.prepare(
    `INSERT INTO tarot_messages (id, session_id, role, content) VALUES (lower(hex(randomblob(16))), ?1, ?2, ?3)`
  )
    .bind(sessionId, role, content)
    .run();
}
