import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "./helpers/db.js";
import { runSeed } from "../prisma/seed.js";
import { createFeedback, summarize } from "../src/services/feedback.service.js";
import type { PredictionService } from "../src/ml/PredictionService.js";
import type { SentimentLabel } from "@sev/shared";

beforeAll(async () => {
  await runSeed(prisma);
});

function makeSvc(sentiment: { sentiment: SentimentLabel; score: number } | null): PredictionService {
  return {
    predict: vi.fn().mockResolvedValue(null),
    recommend: vi.fn().mockResolvedValue(null),
    emotion: vi.fn().mockResolvedValue(null),
    sentiment: vi.fn().mockResolvedValue(sentiment),
  };
}

describe("createFeedback", () => {
  it("saves feedback with sentiment=positive when svc returns positive", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "customer@smartev.io" } });
    const svc = makeSvc({ sentiment: "positive", score: 0.7 });

    const dto = await createFeedback(
      { vehicleId: "byd-atto-3", rating: 5, comment: "love it" },
      user.id,
      svc,
    );

    expect(dto.sentiment).toBe("positive");
    expect(dto.rating).toBe(5);
    expect(dto.comment).toBe("love it");

    // Rating row exists
    const rating = await prisma.rating.findFirst({ where: { userId: user.id, vehicleId: dto.vehicleId, score: 5 } });
    expect(rating).not.toBeNull();
  });

  it("saves feedback with sentiment=null when svc returns null (graceful)", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "customer@smartev.io" } });
    const svc = makeSvc(null);

    const dto = await createFeedback(
      { vehicleId: "byd-atto-3", comment: "nice car" },
      user.id,
      svc,
    );

    expect(dto.sentiment).toBeNull();
    // feedback row exists
    const row = await prisma.feedback.findUnique({ where: { id: dto.id } });
    expect(row).not.toBeNull();
    expect(row!.sentiment).toBeNull();
  });

  it("does not call svc.sentiment and sets sentiment=null when no comment", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "customer@smartev.io" } });
    const sentimentFn = vi.fn().mockResolvedValue({ sentiment: "positive", score: 0.9 });
    const svc: PredictionService = {
      predict: vi.fn().mockResolvedValue(null),
      recommend: vi.fn().mockResolvedValue(null),
      emotion: vi.fn().mockResolvedValue(null),
      sentiment: sentimentFn,
    };

    const dto = await createFeedback(
      { vehicleId: "byd-atto-3", favoriteFeature: "Battery" },
      user.id,
      svc,
    );

    expect(dto.sentiment).toBeNull();
    expect(sentimentFn).not.toHaveBeenCalled();
  });

  it("does not call svc.sentiment and sets sentiment=null when comment is whitespace-only", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "customer@smartev.io" } });
    const sentimentFn = vi.fn().mockResolvedValue({ sentiment: "neutral", score: 0.5 });
    const svc: PredictionService = {
      predict: vi.fn().mockResolvedValue(null),
      recommend: vi.fn().mockResolvedValue(null),
      emotion: vi.fn().mockResolvedValue(null),
      sentiment: sentimentFn,
    };

    const dto = await createFeedback(
      { vehicleId: "byd-atto-3", comment: "   " },
      user.id,
      svc,
    );

    expect(dto.sentiment).toBeNull();
    expect(sentimentFn).not.toHaveBeenCalled();
  });

  it("throws 404 when vehicleId does not resolve to any vehicle", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "customer@smartev.io" } });
    const svc = makeSvc(null);

    await expect(
      createFeedback({ vehicleId: "nonexistent-vehicle" }, user.id, svc),
    ).rejects.toThrow("Vehicle not found");
  });
});

describe("summarize", () => {
  it("counts sentiments correctly and computes avgRating", () => {
    const feedbacks = [
      { sentiment: "positive" },
      { sentiment: "positive" },
      { sentiment: "neutral" },
      { sentiment: "negative" },
      { sentiment: null },
    ];
    const ratings = [{ score: 4 }, { score: 5 }, { score: 3 }];

    const summary = summarize(feedbacks, ratings);

    expect(summary.total).toBe(5);
    expect(summary.sentiment.positive).toBe(2);
    expect(summary.sentiment.neutral).toBe(1);
    expect(summary.sentiment.negative).toBe(1);
    expect(summary.avgRating).toBe(4); // (4+5+3)/3 = 4.00
  });

  it("returns avgRating=null when no ratings", () => {
    const feedbacks = [{ sentiment: "positive" }, { sentiment: null }];
    const summary = summarize(feedbacks, []);
    expect(summary.total).toBe(2);
    expect(summary.avgRating).toBeNull();
  });

  it("handles empty feedbacks array", () => {
    const summary = summarize([], [{ score: 5 }]);
    expect(summary.total).toBe(0);
    expect(summary.sentiment.positive).toBe(0);
    expect(summary.avgRating).toBe(5);
  });

  it("rounds avgRating to 2 decimal places", () => {
    const ratings = [{ score: 4 }, { score: 4 }, { score: 5 }]; // avg = 4.333...
    const summary = summarize([], ratings);
    expect(summary.avgRating).toBe(4.33);
  });
});
