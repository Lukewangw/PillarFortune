import { DrawnCard, Interpretation } from "./types";

function interpretationPrompt(question: string, focusArea: string, cards: DrawnCard[]) {
  return `You are a careful tarot interpreter. Use only the supplied cards and positions.
Rules:
- Do not mention cards that were not drawn.
- Avoid certainty and supernatural guarantees.
- Keep tone reflective, practical, and supportive.
- Avoid hard medical/legal/financial directives.
Return strict JSON with keys: summary, love, career, advice, warnings.
Question: ${question}
Focus area: ${focusArea}
Cards: ${JSON.stringify(cards)}`;
}

function followUpPrompt(message: string, cards: DrawnCard[], question: string, history: Array<{ role: string; content: string }>) {
  return `Continue a tarot follow-up conversation grounded only in the original question and drawn cards.
Original question: ${question}
Drawn cards: ${JSON.stringify(cards)}
Recent history: ${JSON.stringify(history.slice(-6))}
User follow-up: ${message}
Respond in plain text, <= 120 words, practical and non-alarmist.`;
}

export async function generateInterpretation(env: any, args: { question: string; focusArea: string; cards: DrawnCard[] }): Promise<Interpretation> {
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    prompt: interpretationPrompt(args.question, args.focusArea, args.cards),
    max_tokens: 500,
  });

  const raw = typeof response?.response === "string" ? response.response : "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      summary: parsed.summary || "No summary provided.",
      love: parsed.love ?? null,
      career: parsed.career ?? null,
      advice: parsed.advice || "Reflect and act in small practical steps.",
      warnings: parsed.warnings || "Avoid rushed decisions; stay grounded.",
    };
  } catch {
    return {
      summary: raw.slice(0, 260),
      love: null,
      career: null,
      advice: "Use the reading as reflection, not certainty.",
      warnings: "Avoid all-or-nothing thinking when deciding next steps.",
    };
  }
}

export async function generateFollowUp(env: any, args: { message: string; cards: DrawnCard[]; question: string; history: Array<{ role: string; content: string }> }) {
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    prompt: followUpPrompt(args.message, args.cards, args.question, args.history),
    max_tokens: 220,
  });
  return typeof response?.response === "string" ? response.response : "I can expand if you share a more specific follow-up.";
}
