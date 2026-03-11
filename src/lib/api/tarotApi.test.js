import { tarotApi } from "./tarotApi";

describe("tarotApi", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("posts reading payload to reading endpoint", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ readingId: "rdg_1" }),
    });

    await tarotApi.createReading({ question: "Q", focusArea: "career", spreadType: "three-card" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/tarot/reading"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws backend text when response is not ok", async () => {
    fetch.mockResolvedValue({
      ok: false,
      text: async () => "boom",
    });

    await expect(tarotApi.fetchHistory("u1")).rejects.toThrow("boom");
  });
});
