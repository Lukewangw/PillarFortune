export interface TarotCard {
  id: string;
  name: string;
  keywords: string[];
}

export const tarotDeck: TarotCard[] = [
  { id: "major_fool", name: "The Fool", keywords: ["beginnings", "curiosity", "leap of faith"] },
  { id: "major_magician", name: "The Magician", keywords: ["agency", "skill", "manifestation"] },
  { id: "major_high_priestess", name: "The High Priestess", keywords: ["intuition", "mystery", "inner knowing"] },
  { id: "major_empress", name: "The Empress", keywords: ["nurture", "abundance", "creativity"] },
  { id: "major_emperor", name: "The Emperor", keywords: ["structure", "leadership", "boundaries"] },
  { id: "major_hierophant", name: "The Hierophant", keywords: ["tradition", "learning", "guidance"] },
  { id: "major_lovers", name: "The Lovers", keywords: ["alignment", "values", "choice"] },
  { id: "major_chariot", name: "The Chariot", keywords: ["willpower", "direction", "discipline"] },
  { id: "major_strength", name: "Strength", keywords: ["courage", "gentle control", "confidence"] },
  { id: "major_hermit", name: "The Hermit", keywords: ["reflection", "wisdom", "solitude"] },
  { id: "major_wheel", name: "Wheel of Fortune", keywords: ["cycles", "timing", "turning point"] },
  { id: "major_justice", name: "Justice", keywords: ["fairness", "truth", "accountability"] },
  { id: "major_hanged_man", name: "The Hanged Man", keywords: ["pause", "perspective", "release"] },
  { id: "major_death", name: "Death", keywords: ["transition", "ending", "renewal"] },
  { id: "major_temperance", name: "Temperance", keywords: ["balance", "integration", "moderation"] },
  { id: "major_devil", name: "The Devil", keywords: ["attachment", "patterns", "awareness"] },
  { id: "major_tower", name: "The Tower", keywords: ["disruption", "truth", "breakthrough"] },
  { id: "major_star", name: "The Star", keywords: ["hope", "clarity", "healing"] },
  { id: "major_moon", name: "The Moon", keywords: ["uncertainty", "intuition", "dreams"] },
  { id: "major_sun", name: "The Sun", keywords: ["vitality", "success", "joy"] },
  { id: "major_judgement", name: "Judgement", keywords: ["calling", "reflection", "awakening"] },
  { id: "major_world", name: "The World", keywords: ["completion", "wholeness", "integration"] },
  { id: "cups_ace", name: "Ace of Cups", keywords: ["emotional opening", "connection", "compassion"] },
  { id: "wands_ace", name: "Ace of Wands", keywords: ["spark", "momentum", "new initiative"] },
  { id: "swords_ace", name: "Ace of Swords", keywords: ["clarity", "truth", "decision"] },
  { id: "pentacles_ace", name: "Ace of Pentacles", keywords: ["grounded opportunity", "resources", "growth"] },
];
