import type { QuestionRouter, RouterModelJSON } from "../core/router/router";

let pending: Promise<QuestionRouter> | null = null;

/** The router model (~100 KB) is code-split and loaded on first use. */
export function loadRouter(): Promise<QuestionRouter> {
  pending ??= Promise.all([import("../core/router/router"), import("../core/router/model.json")]).then(
    ([{ QuestionRouter }, model]) => new QuestionRouter(model.default as RouterModelJSON),
  );
  return pending;
}
