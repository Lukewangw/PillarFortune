export interface TarotReadingRequest {
  question: string;
  focusArea: string;
  spreadType: "single-card" | "three-card" | "five-card-cross";
  userId?: string;
  sessionId?: string;
}

export interface TarotCardResult {
  position: string;
  name: string;
  reversed: boolean;
  keywords: string[];
}

export interface TarotInterpretation {
  summary: string;
  love: string | null;
  career: string | null;
  advice: string;
  warnings: string;
}
