import { SpreadType } from "./types";

export const spreadDefinitions: Record<SpreadType, string[]> = {
  "single-card": ["focus"],
  "three-card": ["past", "present", "future"],
  "five-card-cross": ["situation", "challenge", "advice", "external", "outcome"],
};
