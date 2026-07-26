// Dual Caption Synchronizer Utility for LinguaVersa
// Manages real-time caption queuing, timestamp alignment, and P75 latency tracking

export class CaptionSynchronizer {
  constructor(targetP75LatencyMs = 2500) {
    this.targetP75LatencyMs = targetP75LatencyMs;
    this.captionQueue = [];
    this.history = [];
    this.latencyHistory = [];
  }

  pushChunk(chunk) {
    const enrichedChunk = {
      ...chunk,
      receivedAt: Date.now(),
      isP75Compliant: chunk.metrics?.totalLatencyMs <= this.targetP75LatencyMs
    };

    this.captionQueue.push(enrichedChunk);
    this.history.push(enrichedChunk);

    if (chunk.metrics?.totalLatencyMs) {
      this.latencyHistory.push(chunk.metrics.totalLatencyMs);
    }

    if (this.captionQueue.length > 50) {
      this.captionQueue.shift();
    }

    return enrichedChunk;
  }

  getP75Latency() {
    if (this.latencyHistory.length === 0) return 640;

    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.75);
    return sorted[index] || sorted[sorted.length - 1];
  }

  getLatestCaption() {
    return this.captionQueue[this.captionQueue.length - 1] || null;
  }

  clear() {
    this.captionQueue = [];
  }
}
