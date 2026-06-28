export type SentimentLabel = "positive" | "neutral" | "negative";
export type ReportFormat = "json" | "pdf" | "xlsx";
export interface FeedbackDTO {
  id: string; vehicleId: string; sessionId: string | null;
  rating: number | null; favoriteFeature: string | null;
  comment: string | null; suggestion: string | null;
  sentiment: SentimentLabel | null; createdAt: string;
}
export interface FeedbackSummary {
  total: number;
  sentiment: Record<SentimentLabel, number>;
  avgRating: number | null;
}
