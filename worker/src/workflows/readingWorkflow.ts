import { drawCards } from "../tarot/engine";
import { generateInterpretation } from "../tarot/ai";
import { TarotReadingRequest } from "../tarot/types";

export async function runReadingWorkflow(env: any, input: TarotReadingRequest, ids: { sessionId: string; readingId: string }) {
  const cards = drawCards(input.spreadType, `${ids.sessionId}:${input.question}:${input.focusArea}`);
  const interpretation = await generateInterpretation(env, {
    question: input.question,
    focusArea: input.focusArea,
    cards,
  });

  return { cards, interpretation };
}
