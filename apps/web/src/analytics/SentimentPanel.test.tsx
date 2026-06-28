import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SentimentPanel } from "./SentimentPanel.js";
import type { FeedbackSummary } from "@sev/shared";

const mockSummary: FeedbackSummary = {
  total: 10,
  sentiment: { positive: 7, neutral: 2, negative: 1 },
  avgRating: 4.2,
};

describe("SentimentPanel", () => {
  it("renders sentiment counts", () => {
    render(<SentimentPanel summary={mockSummary} />);
    expect(screen.getByText("7")).toBeInTheDocument(); // positive
    expect(screen.getByText("2")).toBeInTheDocument(); // neutral
    expect(screen.getByText("1")).toBeInTheDocument(); // negative
  });

  it("renders avg rating formatted to one decimal place", () => {
    render(<SentimentPanel summary={mockSummary} />);
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  it("renders total response count", () => {
    render(<SentimentPanel summary={mockSummary} />);
    expect(screen.getByText("10 responses")).toBeInTheDocument();
  });

  it("shows em-dash for avg rating when avgRating is null", () => {
    render(<SentimentPanel summary={{ ...mockSummary, avgRating: null }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the empty state when total is 0", () => {
    const empty: FeedbackSummary = {
      total: 0,
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      avgRating: null,
    };
    render(<SentimentPanel summary={empty} />);
    expect(screen.getByText("No feedback yet.")).toBeInTheDocument();
  });

  it("uses singular 'response' when total is 1", () => {
    render(<SentimentPanel summary={{ ...mockSummary, total: 1, sentiment: { positive: 1, neutral: 0, negative: 0 } }} />);
    expect(screen.getByText("1 response")).toBeInTheDocument();
  });
});
