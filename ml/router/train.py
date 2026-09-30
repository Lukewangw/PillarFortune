"""Train the PillarFortune question router and export it for edge inference.

Two multinomial logistic-regression heads share one sparse featurizer:
  * focus  — career / love / finance / growth / general (personalizes the prompt)
  * safety — none / crisis / medical / high_stakes      (routes or constrains the request)

The exported JSON is loaded by src/core/router/router.ts in the browser and in the
Cloudflare Worker. Weights are int8-quantized per class; Python evaluates the
*dequantized* model so the reported metrics are the metrics of what is served, and
it writes golden probabilities that the TypeScript parity test must reproduce.

Data splits: train.jsonl (+ train_extra.jsonl, targeted examples added after error analysis),
dev.jsonl (error analysis and reporting here), test.jsonl (blind; only read by evaluate.ts --blind-test).

Usage:  python ml/router/train.py            (from the repository root)
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
from scipy import sparse
from sklearn.feature_selection import chi2
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold, cross_val_predict

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "ml" / "router" / "data"
REPORTS = ROOT / "ml" / "router" / "reports"
MODEL_OUT = ROOT / "src" / "core" / "router" / "model.json"
PARITY_OUT = ROOT / "src" / "core" / "router" / "parity.fixture.json"

FOCUS = ["career", "finance", "general", "growth", "love"]
SAFETY = ["crisis", "high_stakes", "medical", "none"]
TOKEN = re.compile(r"[a-z0-9]+(?:'[a-z]+)?|[一-鿿]")
SEED = 7
VOCAB_TOLERANCE = 0.005
MAX_CRISIS_FALSE_ALARM_RATE = 0.05


# --- featurizer: must match src/core/router/features.ts exactly -----------------
def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).lower()
    return text.replace("‘", "'").replace("’", "'").replace("ʼ", "'")


def featurize(text: str, char_ngrams: bool = True, bigrams: bool = True) -> Counter:
    tokens = TOKEN.findall(normalize(text))
    counts: Counter = Counter()
    for i, tok in enumerate(tokens):
        counts[f"w:{tok}"] += 1
        if bigrams and i + 1 < len(tokens):
            counts[f"b:{tok} {tokens[i + 1]}"] += 1
        if char_ngrams and re.match(r"[a-z]", tok) and len(tok) >= 3:
            padded = f"<{tok}>"
            for n in range(3, 6):
                for j in range(0, len(padded) - n + 1):
                    counts[f"c:{padded[j:j + n]}"] += 1
    return counts


# --- vectorization ------------------------------------------------------------------
def build_matrix(feats: list[Counter], vocab: dict[str, int], idf: np.ndarray) -> sparse.csr_matrix:
    """Sublinear TF-IDF with L2 row normalization over in-vocabulary features."""
    rows, cols, vals = [], [], []
    for r, counts in enumerate(feats):
        entries = [(vocab[f], (1.0 + math.log(c)) * idf[vocab[f]]) for f, c in counts.items() if f in vocab]
        norm = math.sqrt(sum(v * v for _, v in entries))
        for col, v in entries:
            rows.append(r)
            cols.append(col)
            vals.append(v / norm if norm > 0 else v)
    return sparse.csr_matrix((vals, (rows, cols)), shape=(len(feats), len(vocab)))


def fit_idf(feats: list[Counter], vocab: dict[str, int]) -> np.ndarray:
    df = np.zeros(len(vocab))
    for counts in feats:
        for f in counts:
            if f in vocab:
                df[vocab[f]] += 1
    n = len(feats)
    return np.log((1 + n) / (1 + df)) + 1.0  # sklearn's smooth idf


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def select_vocab(feats: list[Counter], y_focus: list[str], y_safety: list[str], k: int | None, min_df: int) -> list[str]:
    """Features with document frequency >= min_df; if k is set, the union of the top-k chi2 features for each head."""
    df = Counter(f for counts in feats for f in counts)
    candidates = sorted(f for f, d in df.items() if d >= min_df)
    if k is None or k >= len(candidates):
        return candidates
    vocab = {f: i for i, f in enumerate(candidates)}
    X = build_matrix(feats, vocab, fit_idf(feats, vocab))
    chosen: set[str] = set()
    for y in (y_focus, y_safety):
        scores, _ = chi2(X, y)
        top = np.argsort(-np.nan_to_num(scores), kind="stable")[:k]
        chosen.update(candidates[i] for i in top)
    return sorted(chosen)


def cv_vocab_search(feats, y_focus, y_safety, grid_k, min_df, c_focus=16.0, c_safety=16.0) -> tuple[int | None, dict]:
    """Nested model selection on the training set only: vocabulary selection runs inside each fold."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    yf, ys = np.array(y_focus), np.array(y_safety)
    results = {}
    for k in grid_k:
        f1s = []
        for tr, va in cv.split(np.zeros(len(feats)), yf):
            ftr = [feats[i] for i in tr]
            features = select_vocab(ftr, list(yf[tr]), list(ys[tr]), k, min_df)
            vocab = {f: i for i, f in enumerate(features)}
            idf = fit_idf(ftr, vocab)
            Xtr, Xva = build_matrix(ftr, vocab, idf), build_matrix([feats[i] for i in va], vocab, idf)
            pf = LogisticRegression(C=c_focus, max_iter=4000).fit(Xtr, yf[tr]).predict(Xva)
            ps = LogisticRegression(C=c_safety, max_iter=4000, class_weight="balanced").fit(Xtr, ys[tr]).predict(Xva)
            f1s.append((f1_score(yf[va], pf, average="macro") + f1_score(ys[va], ps, average="macro")) / 2)
        results["all" if k is None else str(k)] = round(float(np.mean(f1s)), 4)
    # Prefer the smallest vocabulary whose CV score is within TOLERANCE of the best: the model
    # ships to browsers, so size matters, and differences this small are within fold noise.
    best = max(results.values())
    size = lambda key: 10**9 if key == "all" else int(key)
    best_key = min((key for key, v in results.items() if v >= best - VOCAB_TOLERANCE), key=size)
    return (None if best_key == "all" else int(best_key)), results


def tune_c(X, y, grid=(1, 2, 4, 8, 16, 32, 64, 128), class_weight=None) -> tuple[float, dict]:
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    results = {}
    for c in grid:
        pred = cross_val_predict(LogisticRegression(C=c, max_iter=4000, class_weight=class_weight), X, y, cv=cv)
        results[c] = f1_score(y, pred, average="macro")
    best = max(results, key=lambda c: (results[c], -c))
    return best, {str(k): round(v, 4) for k, v in results.items()}


def quantize(model: LogisticRegression, labels: list[str]) -> tuple[dict, np.ndarray, np.ndarray]:
    assert list(model.classes_) == labels, (model.classes_, labels)
    W = model.coef_
    scale = np.abs(W).max(axis=1) / 127.0
    scale[scale == 0] = 1.0
    Wq = np.clip(np.rint(W / scale[:, None]), -127, 127).astype(np.int8)
    head = {
        "labels": labels,
        "scale": [float(s) for s in scale],
        "weights": base64.b64encode(Wq.tobytes(order="C")).decode("ascii"),
        "bias": [float(b) for b in model.intercept_],
    }
    return head, Wq.astype(np.float64) * scale[:, None], model.intercept_.astype(np.float64)


def served_proba(X: sparse.csr_matrix, W: np.ndarray, b: np.ndarray) -> np.ndarray:
    logits = X @ W.T + b
    logits -= logits.max(axis=1, keepdims=True)
    e = np.exp(logits)
    return e / e.sum(axis=1, keepdims=True)


def report(y_true: list[str], y_pred: list[str], labels: list[str]) -> dict:
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "macro_f1": round(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), 4),
        "per_class": {
            lab: {"precision": round(p[i], 4), "recall": round(r[i], 4), "f1": round(f[i], 4), "support": int(s[i])}
            for i, lab in enumerate(labels)
        },
        "confusion": {"labels": labels, "matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist()},
    }


def safety_decision(proba: np.ndarray, threshold: float) -> list[str]:
    """Crisis if P(crisis) >= threshold, else the most likely non-crisis class (mirrors router.ts, minus rules)."""
    out = []
    for row in proba:
        if row[0] >= threshold:
            out.append("crisis")
        else:
            out.append(SAFETY[1 + int(np.argmax(row[1:]))])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-df", type=int, default=2)
    args = ap.parse_args()

    # The blind test split (data/test.jsonl) is never read here: model selection uses CV on
    # train, error analysis uses dev, and ml/router/evaluate.ts --blind-test reports test once.
    train = load(DATA / "train.jsonl")
    extra_path = DATA / "train_extra.jsonl"
    if extra_path.exists():
        train += load(extra_path)
    test = load(DATA / "dev.jsonl")
    train_texts = {r["text"].strip().lower() for r in train}
    overlap = sum(1 for r in test if r["text"].strip().lower() in train_texts)

    feats_tr = [featurize(r["text"]) for r in train]
    feats_te = [featurize(r["text"]) for r in test]
    yf_tr, ys_tr = [r["focus"] for r in train], [r["safety"] for r in train]
    yf_te, ys_te = [r["focus"] for r in test], [r["safety"] for r in test]

    best_k, vocab_search = cv_vocab_search(feats_tr, yf_tr, ys_tr, (1000, 2000, 4000, 8000, None), args.min_df)
    features = select_vocab(feats_tr, yf_tr, ys_tr, best_k, args.min_df)
    vocab = {f: i for i, f in enumerate(features)}
    idf = fit_idf(feats_tr, vocab)
    X_tr, X_te = build_matrix(feats_tr, vocab, idf), build_matrix(feats_te, vocab, idf)

    c_focus, cv_focus = tune_c(X_tr, yf_tr)
    c_safety, cv_safety = tune_c(X_tr, ys_tr, class_weight="balanced")

    # Recall-oriented crisis threshold from out-of-fold probabilities (F2 favours recall).
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    oof = cross_val_predict(LogisticRegression(C=c_safety, max_iter=4000, class_weight="balanced"), X_tr, ys_tr, cv=cv, method="predict_proba")
    y_crisis = np.array([y == "crisis" for y in ys_tr])
    # Operating point for the soft gate: the highest crisis recall such that at most
    # MAX_CRISIS_FALSE_ALARM_RATE of ordinary questions would see the support card
    # (estimated on out-of-fold predictions; explicit rules add recall on top).
    best_t, best_recall, best_far = 0.95, -1.0, 0.0
    for t in np.arange(0.05, 0.96, 0.01):
        pred = oof[:, 0] >= t
        recall = float((pred & y_crisis).sum()) / max(int(y_crisis.sum()), 1)
        far = float((pred & ~y_crisis).sum()) / max(int((~y_crisis).sum()), 1)
        if far <= MAX_CRISIS_FALSE_ALARM_RATE and recall > best_recall + 1e-9:
            best_t, best_recall, best_far = float(round(t, 2)), recall, far
    best_f2 = best_recall  # reported as the OOF recall at the chosen operating point

    focus_model = LogisticRegression(C=c_focus, max_iter=4000).fit(X_tr, yf_tr)
    safety_model = LogisticRegression(C=c_safety, max_iter=4000, class_weight="balanced").fit(X_tr, ys_tr)
    focus_head, Wf, bf = quantize(focus_model, FOCUS)
    safety_head, Ws, bs = quantize(safety_model, SAFETY)
    safety_head["crisisThreshold"] = best_t

    pf_te, ps_te = served_proba(X_te, Wf, bf), served_proba(X_te, Ws, bs)
    focus_pred = [FOCUS[i] for i in pf_te.argmax(axis=1)]
    safety_argmax = [SAFETY[i] for i in ps_te.argmax(axis=1)]
    safety_pred = safety_decision(ps_te, best_t)

    # Quantization check: served (int8) vs float model agreement on the test set.
    float_focus = focus_model.predict(X_te)
    agree = float(np.mean([a == b for a, b in zip(float_focus, focus_pred)]))

    # Feature-set ablation (reported on test, fixed C, min_df vocabulary) to document what each feature family adds.
    ablation = {}
    for name, kw in {"words": dict(char_ngrams=False, bigrams=False), "words+bigrams": dict(char_ngrams=False), "words+bigrams+char3-5": {}}.items():
        ftr = [featurize(r["text"], **kw) for r in train]
        fte = [featurize(r["text"], **kw) for r in test]
        v = {f: i for i, f in enumerate(select_vocab(ftr, yf_tr, ys_tr, None, args.min_df))}
        idf_a = fit_idf(ftr, v)
        m = LogisticRegression(C=c_focus, max_iter=4000).fit(build_matrix(ftr, v, idf_a), yf_tr)
        ablation[name] = round(f1_score(yf_te, m.predict(build_matrix(fte, v, idf_a)), average="macro"), 4)

    majority_focus = Counter(yf_tr).most_common(1)[0][0]
    by_lang = {}
    for lang in sorted({r.get("lang", "en") for r in test}):
        idx = [i for i, r in enumerate(test) if r.get("lang", "en") == lang]
        by_lang[lang] = {
            "n": len(idx),
            "focus_macro_f1": round(f1_score([yf_te[i] for i in idx], [focus_pred[i] for i in idx], average="macro", zero_division=0), 4),
            "safety_macro_f1": round(f1_score([ys_te[i] for i in idx], [safety_pred[i] for i in idx], average="macro", zero_division=0), 4),
        }

    version = f"router-{dt.date.today().isoformat()}"
    model = {
        "version": version,
        "features": features,
        "idf": [round(float(x), 4) for x in idf],
        "heads": {"focus": focus_head, "safety": safety_head},
        "meta": {"trainExamples": len(train), "cFocus": c_focus, "cSafety": c_safety},
    }
    MODEL_OUT.write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # Golden probabilities for the TypeScript parity test. Use the rounded idf the TS side will load.
    idf_served = np.array(model["idf"])
    X_par = build_matrix(feats_te, vocab, idf_served)
    pf_par, ps_par = served_proba(X_par, Wf, bf), served_proba(X_par, Ws, bs)
    step = max(1, len(test) // 80)
    parity = [
        {"text": test[i]["text"], "focus": [round(float(p), 8) for p in pf_par[i]], "safety": [round(float(p), 8) for p in ps_par[i]]}
        for i in range(0, len(test), step)
    ]
    PARITY_OUT.write_text(json.dumps(parity, ensure_ascii=False, indent=0), encoding="utf-8")

    metrics = {
        "version": version,
        "data": {
            "train": len(train),
            "dev": len(test),
            "dev_texts_also_in_train": overlap,
            "train_focus": dict(Counter(yf_tr)),
            "train_safety": dict(Counter(ys_tr)),
            "dev_focus": dict(Counter(yf_te)),
            "dev_safety": dict(Counter(ys_te)),
            "dev_lang": dict(Counter(r.get("lang", "en") for r in test)),
        },
        "model": {
            "features": len(features),
            "min_df": args.min_df,
            "vocab_search_cv": vocab_search,
            "vocab_k": "all" if best_k is None else best_k,
            "c_focus": c_focus,
            "c_safety": c_safety,
            "cv_macro_f1_focus": cv_focus,
            "cv_macro_f1_safety": cv_safety,
            "crisis_threshold": best_t,
            "crisis_threshold_rule": f"max OOF recall s.t. false-alarm rate <= {MAX_CRISIS_FALSE_ALARM_RATE}",
            "crisis_oof_recall": round(best_recall, 4),
            "crisis_oof_false_alarm_rate": round(best_far, 4),
            "int8_vs_float_focus_agreement": round(agree, 4),
            "size_bytes": MODEL_OUT.stat().st_size,
        },
        "dev": {
            "focus": report(yf_te, focus_pred, FOCUS),
            "focus_majority_baseline_macro_f1": round(f1_score(yf_te, [majority_focus] * len(yf_te), average="macro", zero_division=0), 4),
            "safety_argmax": report(ys_te, safety_argmax, SAFETY),
            "safety_thresholded": report(ys_te, safety_pred, SAFETY),
            "by_language": by_lang,
            "feature_ablation_focus_macro_f1": ablation,
        },
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: metrics[k] for k in ("data", "model")}, indent=2, ensure_ascii=False))
    print("focus dev:", metrics["dev"]["focus"]["accuracy"], metrics["dev"]["focus"]["macro_f1"])
    print("safety dev (thresholded):", metrics["dev"]["safety_thresholded"]["macro_f1"], metrics["dev"]["safety_thresholded"]["per_class"]["crisis"])
    print("ablation:", ablation, "by_lang:", by_lang)


if __name__ == "__main__":
    main()
