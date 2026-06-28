import { useState } from "react";
import type { FeedbackDTO } from "@sev/shared";
import { GlassCard, Button } from "../components/ui/index.js";
import { api } from "../lib/apiClient.js";

interface FeedbackFormProps {
  vehicleId: string;
  sessionId?: string;
  parts?: { meshName: string; name: string }[];
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export function FeedbackForm({ vehicleId, sessionId, parts }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [favoriteFeature, setFavoriteFeature] = useState("");
  const [comment, setComment] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<FeedbackDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post("/feedback", {
        vehicleId,
        ...(sessionId ? { sessionId } : {}),
        ...(rating > 0 ? { rating } : {}),
        ...(favoriteFeature.trim() ? { favoriteFeature: favoriteFeature.trim() } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(suggestion.trim() ? { suggestion: suggestion.trim() } : {}),
      });
      setSubmitted((result as { feedback: FeedbackDTO }).feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <GlassCard>
        <div className="space-y-2 text-center">
          <div className="font-display text-lg text-white">Thank you for your feedback!</div>
          {submitted.sentiment && (
            <div className="text-sm text-slate-400">
              Sentiment:{" "}
              <span
                className={
                  submitted.sentiment === "positive"
                    ? "text-emerald-400"
                    : submitted.sentiment === "negative"
                      ? "text-rose-400"
                      : "text-slate-300"
                }
              >
                {submitted.sentiment}
              </span>
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  const displayRating = hovered || rating;

  return (
    <GlassCard>
      <div className="mb-4 font-display text-white">Share your feedback</div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star rating */}
        <div>
          <label className="mb-1.5 block text-sm text-slate-400">Rating</label>
          <div className="flex items-center gap-1" role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={STAR_LABELS[star]}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="text-2xl transition-transform hover:scale-110 focus:outline-none"
              >
                <span className={displayRating >= star ? "text-yellow-400" : "text-slate-600"}>★</span>
              </button>
            ))}
            {displayRating > 0 && (
              <span className="ml-2 text-sm text-slate-400">{STAR_LABELS[displayRating]}</span>
            )}
          </div>
        </div>

        {/* Favorite feature */}
        <div>
          <label htmlFor="favoriteFeature" className="mb-1.5 block text-sm text-slate-400">
            Favorite feature
          </label>
          {parts && parts.length > 0 ? (
            <select
              id="favoriteFeature"
              value={favoriteFeature}
              onChange={(e) => setFavoriteFeature(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-neon/50 focus:outline-none focus:ring-1 focus:ring-neon/30"
            >
              <option value="">— select —</option>
              {parts.map((part) => (
                <option key={part.meshName} value={part.name}>
                  {part.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="favoriteFeature"
              type="text"
              value={favoriteFeature}
              onChange={(e) => setFavoriteFeature(e.target.value)}
              placeholder="e.g. infotainment, range, design..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-neon/50 focus:outline-none focus:ring-1 focus:ring-neon/30"
            />
          )}
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="mb-1.5 block text-sm text-slate-400">
            Comment
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think of the experience?"
            rows={3}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-neon/50 focus:outline-none focus:ring-1 focus:ring-neon/30"
          />
        </div>

        {/* Suggestion */}
        <div>
          <label htmlFor="suggestion" className="mb-1.5 block text-sm text-slate-400">
            Suggestion
          </label>
          <textarea
            id="suggestion"
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="Any improvements you'd like to see?"
            rows={2}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-neon/50 focus:outline-none focus:ring-1 focus:ring-neon/30"
          />
        </div>

        {error && <div className="text-sm text-rose-400">{error}</div>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Submitting…" : "Submit feedback"}
        </Button>
      </form>
    </GlassCard>
  );
}
