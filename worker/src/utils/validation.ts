import { SpreadType, TarotReadingRequest } from "../tarot/types";

const validSpreads: SpreadType[] = ["single-card", "three-card", "five-card-cross"];

export function validateReadingInput(body: any): TarotReadingRequest {
  if (!body || typeof body !== "object") throw new Error("Invalid JSON body.");
  if (typeof body.question !== "string" || body.question.trim().length < 5) {
    throw new Error("question is required and must be at least 5 characters.");
  }
  if (!validSpreads.includes(body.spreadType)) {
    throw new Error("spreadType must be one of: single-card, three-card, five-card-cross.");
  }
  return {
    question: body.question.trim(),
    focusArea: typeof body.focusArea === "string" ? body.focusArea.trim() : "general",
    spreadType: body.spreadType,
    userId: typeof body.userId === "string" ? body.userId : undefined,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
  };
}

export function validateFollowUpInput(body: any): { sessionId: string; message: string; readingId?: string } {
  if (!body || typeof body !== "object") throw new Error("Invalid JSON body.");
  if (typeof body.sessionId !== "string" || !body.sessionId.trim()) {
    throw new Error("sessionId is required.");
  }
  if (typeof body.message !== "string" || body.message.trim().length < 2) {
    throw new Error("message is required.");
  }

  return {
    sessionId: body.sessionId,
    message: body.message.trim(),
    readingId: typeof body.readingId === "string" ? body.readingId : undefined,
  };
}
