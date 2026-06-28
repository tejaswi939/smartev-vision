import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeedbackForm } from "./FeedbackForm.js";
import { api } from "../lib/apiClient.js";

vi.mock("../lib/apiClient", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

const mockFeedback = {
  id: "fb-1",
  vehicleId: "aurora-s",
  sessionId: "sess-1",
  rating: 5,
  favoriteFeature: "infotainment",
  comment: "Great!",
  suggestion: null,
  sentiment: "positive" as const,
  createdAt: "2026-06-28T00:00:00Z",
};

describe("FeedbackForm", () => {
  it("renders star rating buttons, favorite-feature input, comment and suggestion textareas, and submit button", () => {
    render(<FeedbackForm vehicleId="aurora-s" />);
    expect(screen.getByRole("group", { name: /star rating/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/favorite feature/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/suggestion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit feedback/i })).toBeInTheDocument();
  });

  it("renders a <select> for favorite feature when parts are provided, with leading empty option and part options", () => {
    const parts = [
      { meshName: "seats", name: "Seats" },
      { meshName: "infotainment", name: "Infotainment" },
    ];
    render(<FeedbackForm vehicleId="aurora-s" parts={parts} />);
    const select = screen.getByRole("combobox", { name: /favorite feature/i });
    expect(select).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/infotainment/i)).toBeNull();
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("— select —");
    expect(options[1]).toHaveTextContent("Seats");
    expect(options[2]).toHaveTextContent("Infotainment");
  });

  it("renders a text input for favorite feature when no parts are provided", () => {
    render(<FeedbackForm vehicleId="aurora-s" />);
    expect(screen.queryByRole("combobox", { name: /favorite feature/i })).toBeNull();
    expect(screen.getByRole("textbox", { name: /favorite feature/i })).toBeInTheDocument();
  });

  it("calls api.post with the correct body on submit", async () => {
    vi.mocked(api.post).mockResolvedValue({ feedback: mockFeedback });

    render(<FeedbackForm vehicleId="aurora-s" sessionId="sess-1" />);

    // Click 5th star
    fireEvent.click(screen.getByRole("button", { name: /excellent/i }));
    // Fill favorite feature
    fireEvent.change(screen.getByLabelText(/favorite feature/i), { target: { value: "infotainment" } });
    // Fill comment
    fireEvent.change(screen.getByLabelText(/comment/i), { target: { value: "Great!" } });
    // Submit
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/feedback", {
        vehicleId: "aurora-s",
        sessionId: "sess-1",
        rating: 5,
        favoriteFeature: "infotainment",
        comment: "Great!",
      }),
    );
  });

  it("shows the thank-you state and sentiment after successful submission", async () => {
    vi.mocked(api.post).mockResolvedValue({ feedback: mockFeedback });

    render(<FeedbackForm vehicleId="aurora-s" />);
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => expect(screen.getByText(/thank you for your feedback/i)).toBeInTheDocument());
    expect(screen.getByText("positive")).toBeInTheDocument();
  });

  it("does not include omitted optional fields in the post body", async () => {
    vi.mocked(api.post).mockResolvedValue({
      feedback: { ...mockFeedback, rating: null, favoriteFeature: null, comment: null, sentiment: null },
    });

    render(<FeedbackForm vehicleId="nova-x" />);
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/feedback", { vehicleId: "nova-x" }));
  });

  it("shows the thank-you state without a sentiment line when sentiment is null", async () => {
    vi.mocked(api.post).mockResolvedValue({
      feedback: { ...mockFeedback, sentiment: null },
    });

    render(<FeedbackForm vehicleId="aurora-s" />);
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => expect(screen.getByText(/thank you for your feedback/i)).toBeInTheDocument());
    expect(screen.queryByText(/sentiment/i)).toBeNull();
  });

  it("shows an error message when api.post rejects", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Network error"));

    render(<FeedbackForm vehicleId="aurora-s" />);
    fireEvent.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
  });
});
