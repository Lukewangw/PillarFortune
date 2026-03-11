export type SpreadType = "single-card" | "three-card" | "five-card-cross";

export interface TarotReadingRequest {
  question: string;
  focusArea: string;
  spreadType: SpreadType;
  userId?: string;
  sessionId?: string;
}

export interface DrawnCard {
  id: string;
  name: string;
  position: string;
  reversed: boolean;
  keywords: string[];
}

export interface Interpretation {
  summary: string;
  love: string | null;
  career: string | null;
  advice: string;
  warnings: string;
}

export interface TarotReadingResponse {
  readingId: string;
  sessionId: string;
  spreadType: SpreadType;
  question: string;
  focusArea: string;
  cards: DrawnCard[];
  interpretation: Interpretation;
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}
