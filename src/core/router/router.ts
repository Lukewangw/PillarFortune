import type { Focus, SafetyLabel } from "../llm/types";
import { matchCrisisRule, type CrisisTier } from "./crisis";
import { featurize } from "./features";

/** Serialized model produced by ml/router/train.py (int8-quantized logistic-regression heads). */
export interface RouterModelJSON {
  version: string;
  features: string[];
  idf: number[];
  heads: {
    focus: HeadJSON;
    safety: HeadJSON & { crisisThreshold: number };
  };
  meta?: Record<string, unknown>;
}

interface HeadJSON {
  labels: string[];
  /** Per-class dequantization scale: weight = int8 * scale. */
  scale: number[];
  /** Base64 of an Int8Array, row-major [label][feature]. */
  weights: string;
  bias: number[];
}

interface Head {
  labels: string[];
  scale: number[];
  weights: Int8Array;
  bias: number[];
}

export interface RouteResult {
  focus: { label: Focus; confidence: number; probs: Record<string, number> };
  safety: {
    label: SafetyLabel;
    confidence: number;
    probs: Record<string, number>;
    rule: string | null;
    /** For crisis: "hard" = explicit rule (no reading), "soft" = model or warning-sign rule (can continue). */
    gate: CrisisTier | null;
  };
  modelVersion: string;
}

function decodeBase64(b64: string): Int8Array {
  const binary = atob(b64);
  const out = new Int8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = (binary.charCodeAt(i) << 24) >> 24;
  return out;
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export class QuestionRouter {
  private readonly index: Map<string, number>;
  private readonly idf: number[];
  private readonly focusHead: Head;
  private readonly safetyHead: Head;
  readonly crisisThreshold: number;
  readonly version: string;

  constructor(model: RouterModelJSON) {
    this.version = model.version;
    this.index = new Map(model.features.map((feature, i) => [feature, i]));
    this.idf = model.idf;
    const load = (h: HeadJSON): Head => ({ labels: h.labels, scale: h.scale, bias: h.bias, weights: decodeBase64(h.weights) });
    this.focusHead = load(model.heads.focus);
    this.safetyHead = load(model.heads.safety);
    this.crisisThreshold = model.heads.safety.crisisThreshold;
  }

  /** Sparse, L2-normalized sublinear TF-IDF vector: [featureIndex, value][]. */
  vectorize(text: string): Array<[number, number]> {
    const entries: Array<[number, number]> = [];
    for (const [feature, count] of featurize(text)) {
      const i = this.index.get(feature);
      if (i !== undefined) entries.push([i, (1 + Math.log(count)) * this.idf[i]]);
    }
    const norm = Math.sqrt(entries.reduce((s, [, v]) => s + v * v, 0));
    return norm > 0 ? entries.map(([i, v]) => [i, v / norm]) : entries;
  }

  private probs(head: Head, x: Array<[number, number]>): number[] {
    const n = this.idf.length;
    const logits = head.labels.map((_, k) => {
      let dot = 0;
      for (const [i, v] of x) dot += head.weights[k * n + i] * v;
      return head.bias[k] + head.scale[k] * dot;
    });
    return softmax(logits);
  }

  /** Raw class probabilities for both heads (used by the parity test and the eval). */
  predictProba(text: string): { focus: number[]; safety: number[] } {
    const x = this.vectorize(text);
    return { focus: this.probs(this.focusHead, x), safety: this.probs(this.safetyHead, x) };
  }

  route(text: string): RouteResult {
    const p = this.predictProba(text);
    const asRecord = (labels: string[], values: number[]) => Object.fromEntries(labels.map((l, i) => [l, values[i]]));

    const fi = p.focus.indexOf(Math.max(...p.focus));
    const focusLabel = this.focusHead.labels[fi] as Focus;

    // Safety decision: explicit rules first, then a recall-oriented threshold for
    // crisis, then the most likely remaining class.
    const labels = this.safetyHead.labels;
    const crisisIndex = labels.indexOf("crisis");
    const match = matchCrisisRule(text);
    let safetyLabel: SafetyLabel;
    let gate: CrisisTier | null = null;
    if (match || p.safety[crisisIndex] >= this.crisisThreshold) {
      safetyLabel = "crisis";
      gate = match?.tier === "hard" ? "hard" : "soft";
    } else {
      let best = -1;
      labels.forEach((label, i) => {
        if (label !== "crisis" && (best === -1 || p.safety[i] > p.safety[best])) best = i;
      });
      safetyLabel = labels[best] as SafetyLabel;
    }

    return {
      focus: { label: focusLabel, confidence: p.focus[fi], probs: asRecord(this.focusHead.labels, p.focus) },
      safety: {
        label: safetyLabel,
        confidence: match ? 1 : p.safety[labels.indexOf(safetyLabel)],
        probs: asRecord(labels, p.safety),
        rule: match?.rule ?? null,
        gate,
      },
      modelVersion: this.version,
    };
  }
}
