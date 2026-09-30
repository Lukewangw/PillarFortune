import { describe, expect, it } from "vitest";
import model from "./model.json";
import parity from "./parity.fixture.json";
import { matchCrisisRule } from "./crisis";
import { QuestionRouter, type RouterModelJSON } from "./router";

const router = new QuestionRouter(model as RouterModelJSON);

describe("question router", () => {
  it("reproduces the Python model's probabilities exactly (train/serve parity)", () => {
    expect(parity.length).toBeGreaterThan(50);
    for (const row of parity) {
      const p = router.predictProba(row.text);
      p.focus.forEach((v, i) => expect(v, row.text).toBeCloseTo(row.focus[i], 6));
      p.safety.forEach((v, i) => expect(v, row.text).toBeCloseTo(row.safety[i], 6));
    }
  });

  it("routes obvious questions", () => {
    expect(router.route("Will I get the promotion I interviewed for last week?").focus.label).toBe("career");
    expect(router.route("Does my girlfriend still love me?").focus.label).toBe("love");
    expect(router.route("我应该怎么还清信用卡的债务？").focus.label).toBe("finance");
  });

  it("escalates explicit crisis language regardless of model confidence", () => {
    for (const text of ["I want to kill myself", "i don't want to be alive anymore", "我不想活了", "my husband hits me when he's drunk"]) {
      const result = router.route(text);
      expect(result.safety.label, text).toBe("crisis");
    }
  });

  it("does not treat idioms as crisis", () => {
    for (const text of ["This job is killing me, should I quit?", "I'm dying to know if he likes me", "想死你了，我们什么时候见面"]) {
      expect(matchCrisisRule(text), text).toBeNull();
    }
  });
});
