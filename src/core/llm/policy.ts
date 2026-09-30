import type { ValidationIssue } from "./types";

/**
 * Content policy for generated text: a tarot reading is a prompt for reflection,
 * so the interpreter must not state outcomes as certain or issue medical or
 * financial directives. Patterns are deliberately narrow (high precision) —
 * every hit triggers a repair round-trip, so false positives cost latency.
 */
const RULES: Array<{ code: string; pattern: RegExp; message: string }> = [
  {
    code: "certainty",
    pattern:
      /\byou will (?:definitely|certainly|surely|absolutely|undoubtedly) (?:get|be|find|win|lose|marry|meet|receive|succeed|fail|become|have)\b|\b(?:is|are) (?:guaranteed|destined) to\b|\bguaranteed (?:to|success|outcome)\b|\bwithout (?:a|any) doubt\b|\b100 ?% (?:certain|sure|guaranteed)\b|一定会|注定会|百分之百|必然会/i,
    message: "states an outcome as certain",
  },
  {
    code: "medical_directive",
    pattern:
      /\b(?:stop|quit|skip|double|increase|reduce|change) (?:taking )?(?:your |the )?(?:medication|meds|medicine|dose|dosage|prescription|treatment)\b|\byou (?:do not|don't) need (?:a doctor|to see a doctor|treatment)\b|\byou (?:have|do not have|don't have) (?:cancer|diabetes|depression|an? (?:infection|illness|disease))\b|停药|不用看医生/i,
    message: "gives a medical directive or diagnosis",
  },
  {
    code: "financial_directive",
    pattern:
      /\b(?:invest|put|move) (?:all|everything|your (?:entire|whole) (?:savings|paycheck|salary))\b|\b(?:buy|sell) (?:bitcoin|crypto|stocks?|shares) (?:now|today|immediately)\b|\btake out (?:a|another) (?:big |large )?loan\b|\bbet (?:it all|everything)\b|全部投入|梭哈/i,
    message: "gives a financial directive",
  },
];

export function checkPolicy(text: string, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      issues.push({ stage: "policy", code: rule.code, path, message: `${rule.message}: "${match[0]}"` });
    }
  }
  return issues;
}
