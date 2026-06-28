import { z } from "zod";
export const feedbackInputSchema = z.object({
  vehicleId: z.string().min(1),
  sessionId: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  favoriteFeature: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
  suggestion: z.string().max(2000).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
