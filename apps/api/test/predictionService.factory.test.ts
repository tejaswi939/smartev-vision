import { describe, it, expect, afterEach } from "vitest";
import { getPredictionService, PythonPredictionService, NoopPredictionService } from "../src/ml/index.js";

describe("getPredictionService factory", () => {
  const originalUrl = process.env.ML_SERVICE_URL;

  afterEach(() => {
    if (originalUrl !== undefined) {
      process.env.ML_SERVICE_URL = originalUrl;
    } else {
      delete process.env.ML_SERVICE_URL;
    }
  });

  it("returns NoopPredictionService when ML_SERVICE_URL is not set", () => {
    delete process.env.ML_SERVICE_URL;
    const svc = getPredictionService();
    expect(svc).toBeInstanceOf(NoopPredictionService);
  });

  it("returns NoopPredictionService when ML_SERVICE_URL is empty string", () => {
    process.env.ML_SERVICE_URL = "";
    const svc = getPredictionService();
    expect(svc).toBeInstanceOf(NoopPredictionService);
  });

  it("returns PythonPredictionService when ML_SERVICE_URL is set to a URL", () => {
    process.env.ML_SERVICE_URL = "http://localhost:8000";
    const svc = getPredictionService();
    expect(svc).toBeInstanceOf(PythonPredictionService);
  });

  it("returns PythonPredictionService when ML_SERVICE_URL is set to a different URL", () => {
    process.env.ML_SERVICE_URL = "http://ml-service:8080";
    const svc = getPredictionService();
    expect(svc).toBeInstanceOf(PythonPredictionService);
  });
});
