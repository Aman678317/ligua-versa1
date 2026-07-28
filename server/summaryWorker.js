import { Worker } from 'bullmq';
import IORedis from 'ioredis';
// In a real app, this would use PrismaClient to save to DB, and a real LLM API.

const connection = new IORedis({
  maxRetriesPerRequest: null,
});

// Create the Call Summary Agent worker
export const summaryWorker = new Worker('call-summaries', async (job) => {
  const { callSessionId, utterances, targetLangA, targetLangB } = job.data;
  
  console.log(`[Summary Agent] Generating summary for call ${callSessionId}...`);
  
  // Simulate LLM Call to generate summary
  const summaryA = `Call Summary:\n- Discussed ${utterances.length} points.\n- Action item: Follow up next week.`;
  const summaryB = `Resumen de la llamada:\n- Se discutieron ${utterances.length} puntos.\n- Acción: Seguimiento la próxima semana.`;
  const actionItems = ["Follow up next week"];
  const sentiment = "Positive";
  
  console.log(`[Summary Agent] Summary generated for ${callSessionId}.`);
  
  // Simulated Email Delivery
  console.log(`[Email Service] Sending summary email to participants of ${callSessionId}`);
  
  // Return the result (which could be saved to Postgres)
  return {
    callSessionId,
    summary_text_a_lang: summaryA,
    summary_text_b_lang: summaryB,
    action_items: actionItems,
    sentiment_tag: sentiment
  };
}, { connection });

summaryWorker.on('completed', (job, returnvalue) => {
  console.log(`[Summary Agent] Job completed for call ${returnvalue.callSessionId}`);
});

summaryWorker.on('failed', (job, err) => {
  console.error(`[Summary Agent] Job failed for call ${job.data.callSessionId}:`, err);
});
