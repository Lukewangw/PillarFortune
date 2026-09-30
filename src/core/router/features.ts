/**
 * Feature extraction for the question router. This must stay byte-for-byte
 * identical to `featurize()` in ml/router/train.py — the parity test
 * (router.test.ts) replays Python's predictions on the test set to enforce it.
 *
 * Features: word unigrams and bigrams, CJK characters and character bigrams
 * (so Chinese questions work without a tokenizer), and character 3–5-grams of
 * English words (robust to typos and inflection).
 */
const TOKEN = /[a-z0-9]+(?:'[a-z]+)?|[一-鿿]/g;

export function normalizeText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[\u2018\u2019\u02bc]/g, "'");
}

export function tokenize(text: string): string[] {
  return normalizeText(text).match(TOKEN) ?? [];
}

export function featurize(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  const add = (feature: string) => counts.set(feature, (counts.get(feature) ?? 0) + 1);
  tokens.forEach((token, i) => {
    add(`w:${token}`);
    if (i + 1 < tokens.length) add(`b:${token} ${tokens[i + 1]}`);
    if (/^[a-z]/.test(token) && token.length >= 3) {
      const padded = `<${token}>`;
      for (let n = 3; n <= 5; n++) {
        for (let j = 0; j + n <= padded.length; j++) add(`c:${padded.slice(j, j + n)}`);
      }
    }
  });
  return counts;
}
