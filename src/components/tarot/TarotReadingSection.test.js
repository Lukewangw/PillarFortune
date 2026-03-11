import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import TarotReadingSection from "./TarotReadingSection";
import { tarotApi } from "../../lib/api/tarotApi";

jest.mock("../../lib/api/tarotApi", () => ({
  tarotApi: {
    createReading: jest.fn(),
    followUp: jest.fn(),
    fetchHistory: jest.fn(),
    fetchReading: jest.fn(),
  },
}));

const readingResponse = {
  readingId: "rdg_1",
  sessionId: "sess_1",
  spreadType: "three-card",
  question: "What should I focus on?",
  focusArea: "career",
  cards: [
    { position: "past", name: "The Hermit", reversed: false, keywords: ["reflection"] },
    { position: "present", name: "The Sun", reversed: false, keywords: ["success"] },
    { position: "future", name: "Justice", reversed: true, keywords: ["balance"] },
  ],
  interpretation: {
    summary: "Focus on steady reflection and clear decisions.",
    love: null,
    career: "Stay consistent.",
    advice: "Plan your week and review outcomes.",
    warnings: "Avoid overcommitting.",
  },
  chatHistory: [{ role: "assistant", content: "Focus on steady reflection and clear decisions." }],
};

describe("TarotReadingSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tarotApi.fetchHistory.mockResolvedValue({ readings: [] });
  });

  it("keeps draw button disabled until question is entered", () => {
    render(<TarotReadingSection />);
    const drawButton = screen.getByRole("button", { name: /draw cards/i });
    expect(drawButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/what should i focus/i), {
      target: { value: "Career focus for this month" },
    });

    expect(drawButton).toBeEnabled();
  });

  it("draws cards, renders interpretation, and loads history", async () => {
    tarotApi.createReading.mockResolvedValue(readingResponse);
    tarotApi.fetchHistory.mockResolvedValue({
      readings: [{ id: "h1", spread_type: "three-card", question: "Past question" }],
    });

    render(<TarotReadingSection />);

    fireEvent.change(screen.getByPlaceholderText(/what should i focus/i), {
      target: { value: "What should I focus on?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /draw cards/i }));

    await waitFor(() => {
      expect(tarotApi.createReading).toHaveBeenCalledWith(
        expect.objectContaining({
          question: "What should I focus on?",
          focusArea: "general",
          spreadType: "three-card",
        })
      );
    });

    const revealButtons = await screen.findAllByRole("button", { name: /reveal this card/i });
    fireEvent.click(revealButtons[0]);
    expect((await screen.findAllByText("The Hermit")).length).toBeGreaterThan(0);
    expect(screen.getByText("Stay consistent.")).toBeInTheDocument();
    expect(await screen.findByText("Past question")).toBeInTheDocument();
  });

  it("sends a follow-up message and updates chat history", async () => {
    tarotApi.createReading.mockResolvedValue(readingResponse);
    tarotApi.followUp.mockResolvedValue({
      sessionId: "sess_1",
      history: [
        { role: "assistant", content: "Focus on steady reflection and clear decisions." },
        { role: "user", content: "Why does The Hermit matter?" },
        { role: "assistant", content: "It points to pausing before major decisions." },
      ],
    });

    render(<TarotReadingSection />);

    fireEvent.change(screen.getByPlaceholderText(/what should i focus/i), {
      target: { value: "What should I focus on?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /draw cards/i }));

    const revealButtons = await screen.findAllByRole("button", { name: /reveal this card/i });
    fireEvent.click(revealButtons[0]);
    expect((await screen.findAllByText("The Hermit")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText(/ask a follow-up/i), {
      target: { value: "Why does The Hermit matter?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(tarotApi.followUp).toHaveBeenCalledWith({
        sessionId: "sess_1",
        readingId: "rdg_1",
        message: "Why does The Hermit matter?",
      });
    });

    expect(await screen.findByText(/It points to pausing before major decisions\./)).toBeInTheDocument();
  });

  it("shows shuffling feedback while drawing", async () => {
    tarotApi.createReading.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(readingResponse), 20))
    );

    render(<TarotReadingSection />);

    fireEvent.change(screen.getByPlaceholderText(/what should i focus/i), {
      target: { value: "What should I focus on?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /draw cards/i }));

    expect(screen.getByText(/shuffling the deck/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/shuffling the deck/i)).not.toBeInTheDocument();
    });
  });

  it("falls back to a local reading when the API draw fails", async () => {
    tarotApi.createReading.mockRejectedValue(new Error("Failed to fetch"));

    render(<TarotReadingSection />);

    fireEvent.change(screen.getByPlaceholderText(/what should i focus/i), {
      target: { value: "What should I focus on?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /draw cards/i }));

    expect(await screen.findByText(/local traditional fallback spread/i)).toBeInTheDocument();
    const revealButtons = await screen.findAllByRole("button", { name: /reveal this card/i });
    expect(revealButtons.length).toBeGreaterThan(0);
  });
});
