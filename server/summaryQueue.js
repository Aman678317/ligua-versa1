import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

export const summaryQueue = new Queue('call-summaries', { connection });

export const enqueueSummaryJob = async (callSessionId, utterances, targetLangA, targetLangB) => {
  await summaryQueue.add('generate-summary', {
    callSessionId,
    utterances,
    targetLangA,
    targetLangB
  });
  console.log(`[Summary Queue] Enqueued summary job for ${callSessionId}`);
};
