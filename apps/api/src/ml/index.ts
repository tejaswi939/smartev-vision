import { PythonPredictionService } from "./pythonPredictionService.js";
import { NoopPredictionService } from "./noopPredictionService.js";

export type { PredictionService, RecommendInput, RecommendResult } from "./PredictionService.js";
export { PythonPredictionService } from "./pythonPredictionService.js";
export { NoopPredictionService } from "./noopPredictionService.js";

export function getPredictionService() {
  const raw = process.env.ML_SERVICE_URL;
  if (raw && raw.length > 0) {
    // Platforms like Render expose a peer service as bare "host:port"; default to http:// so the
    // value works whether it includes a scheme or not.
    const url = /^https?:\/\//.test(raw) ? raw : `http://${raw}`;
    return new PythonPredictionService(url);
  }
  return new NoopPredictionService();
}
