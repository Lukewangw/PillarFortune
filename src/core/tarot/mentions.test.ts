import { describe, expect, it } from "vitest";
import { findCardMentions, findForeignCardMentions } from "./mentions";

const ids = (text: string) => findCardMentions(text).map((m) => m.cardId);

describe("findCardMentions", () => {
  it.each([
    ["The Tower suggests sudden change.", ["major-16"]],
    ["Pair it with the Hanged Man and the High Priestess.", ["major-12", "major-02"]],
    ["The Queen of Cups and the ten of swords appear.", ["cups-13", "swords-10"]],
    ["Your Ace of Coins is a pentacles card.", ["pentacles-01"]],
    ["Here Death marks an ending, not doom.", ["major-13"]],
    ["As Justice reminds you, balance matters.", ["major-11"]],
    ["Draw on Strength here.", ["major-08"]],
    ["the strength card is about patience", ["major-08"]],
    ["Look at the Wheel of Fortune turning.", ["major-10"]],
    ["高塔牌代表突变，圣杯王后则温柔。", ["major-16", "cups-13"]],
    ["「星星」给你希望，倒吊人需要等待。", ["major-17", "major-12"]],
  ])("finds cards in %s", (text, expected) => {
    expect(ids(text)).toEqual(expected);
  });

  it.each([
    "Strength comes from patience.",
    "Spend some time in the sun this week.",
    "You are the star of your own story.",
    "There is a tower of paperwork on your desk.",
    "Find the inner strength to rest.",
    "天上的星星和月亮都很美，世界很大。",
    "你需要一些力量和正义感。",
    "This job is killing me, but the world keeps turning.",
  ])("ignores ordinary words in %s", (text) => {
    expect(ids(text)).toEqual([]);
  });

  it("resolves overlapping matches to the longest span", () => {
    expect(findCardMentions("The Emperor and 圣杯皇后牌").map((m) => m.match)).toEqual(["The Emperor", "圣杯皇后"]);
  });

  it("reports only cards outside the allowed set", () => {
    const foreign = findForeignCardMentions("The Tower and The Star both appear.", ["major-16"]);
    expect(foreign.map((m) => m.cardId)).toEqual(["major-17"]);
  });
});
