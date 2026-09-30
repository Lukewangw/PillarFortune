/**
 * Crisis patterns, OR-ed with the classifier, in two tiers:
 *  - hard: explicit statements of suicidal intent, self-harm, abuse or danger.
 *    These trigger the hard gate (no reading, support resources only).
 *  - soft: warning signs that are usually, but not always, serious (feeling like
 *    a burden, giving belongings away, being controlled). These, like classifier
 *    detections, show the resources but let the person continue.
 * Patterns follow the
 * standard warning signs (talking about wanting to die or being a burden, no
 * reason to live, saying goodbye, giving belongings away, being controlled or
 * hurt). Common idioms and hyperbole — "killing myself studying", "financial
 * suicide", "dying to know", "想死你了" (miss you so much) — are excluded.
 */
export type CrisisTier = "hard" | "soft";
export interface CrisisMatch {
  rule: string;
  tier: CrisisTier;
}

const SOFT_RULES = new Set(["burden", "goodbye", "coercive_control"]);

const EN: Array<[string, RegExp]> = [
  ["self_harm", /\b(?:kill|hurt|harm|cut|cutting|killing|hurting|harming)\s+(?:my ?self)\b(?!\s+(?:studying|working|at work|at the gym|laughing|over|trying|for (?:this|that|the|a|it))\b)/],
  ["suicide", /(?<!\b(?:financial|social|career|political|fashion|commercial|academic)\s)\bsuicid(?:e|al)\b(?!\s+(?:squad|mission|run|pact lol))/],
  ["end_life", /\b(?:end|take|ending|taking) (?:it all|my (?:own )?life)\b/],
  ["want_to_die", /\b(?:want|wanna|wish|going|ready) (?:to )?die\b|\bwish i (?:was|were) (?:dead|never born)\b|\bbetter off dead\b/],
  ["no_will_to_live", /\b(?:don'?t|do not|no longer) want to (?:live|be alive|be here anymore|exist|wake up)\b|\bno (?:reason|point) (?:in |to )?(?:living|going on|being alive|keep going|go on|live)\b|\btired of (?:living|existing|being alive)\b|\b(?:sleep|go to sleep) and (?:never|not) wake up\b/],
  ["burden", /\b(?:better off|be fine|manage fine|happier) without me\b|\bi'?m (?:just )?a burden (?:to|on) (?:everyone|them|my family)\b/],
  ["goodbye", /\b(?:giving|gave) away (?:all )?(?:my )?(?:things|stuff|belongings|possessions)\b|\b(?:goodbye|suicide) (?:note|letter)s?\b|\bafter i'?m gone\b/],
  ["overdose", /\b(?:overdose|od on)\b/],
  ["abuse", /\b(?:he|she|they|my (?:husband|wife|partner|boyfriend|girlfriend|bf|gf|dad|father|mom|mother|stepdad|stepmom|parents)) (?:hits|beats|chokes|strangles|kicks|slaps|threatens to (?:kill|hurt)) (?:me|us)\b/],
  ["coercive_control", /\b(?:won'?t|doesn'?t|don'?t|wont) let me (?:leave|go out|see my (?:friends|family))\b|\b(?:locks|locked) me (?:in|out)\b|\b(?:took|takes|taken) (?:away )?my (?:phone|keys|passport)\b/],
  ["in_danger", /\b(?:afraid|scared) (?:he|she|they)(?:'ll| will| is going to| are going to) (?:kill|hurt) me\b|\bafraid to go home\b/],
  ["harm_others", /\b(?:want|going|plan|planning) to (?:kill|hurt|stab|shoot) (?:him|her|them|someone|my \w+)\b/],
];

const ZH: Array<[string, RegExp]> = [
  ["suicide", /自杀|轻生|寻死|结束(?:自己的)?生命|了结自己|一了百了/],
  ["want_to_die", /想死(?!你)|不想活|活不下去|活着(?:没(?:有)?意思|没意义|好累|太累)|不如死了|不想(?:再)?醒来|离开这个世界/],
  ["self_harm", /割腕|自残|伤害自己|跳楼|跳下去|吃安眠药|遗书/],
  ["abuse", /家暴|(?:他|她|老公|男朋友|女朋友|男友|女友|丈夫|妻子|老婆|爸爸|妈妈|爸妈|父母|爸|妈)(?:每天|天天|经常|总是|又|会|一直)?(?:都)?(?:打我(?!电话)|掐我|威胁要杀)/],
  ["coercive_control", /不让我(?:出门|离开|见朋友)|没收(?:了)?我的(?:手机|护照|钥匙)|把我关在/],
];

/** The first matching pattern, hard rules taking precedence over soft ones. */
export function matchCrisisRule(text: string): CrisisMatch | null {
  const lowered = text.normalize("NFKC").toLowerCase().replace(/[\u2018\u2019]/g, "'");
  const hits = [...EN.filter(([, p]) => p.test(lowered)), ...ZH.filter(([, p]) => p.test(text))].map(([name]) => name);
  const hard = hits.find((name) => !SOFT_RULES.has(name));
  if (hard) return { rule: hard, tier: "hard" };
  return hits.length ? { rule: hits[0], tier: "soft" } : null;
}
