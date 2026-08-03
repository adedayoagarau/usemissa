import type { RadarEngine } from '@missa/radar-engine';
import { decryptGmailRefreshToken, encryptGmailRefreshToken, type GmailProviderPort } from '@missa/radar-engine';

export async function processGmailSyncJobs(engine: RadarEngine, provider: GmailProviderPort, maxJobs = 5) {
  const now = Date.now();
  // Cron is also the polling fallback when Pub/Sub is delayed. Enqueue one
  // bounded job per due connection; leases below serialize concurrent runs.
  for (const connection of engine.store.gmailConnections) {
    if (connection.status !== 'active' || (connection.nextSyncAt && Date.parse(connection.nextSyncAt) > now)) continue;
    const busy = engine.store.gmailSyncJobs.some((job) => job.connectionId === connection.id && (job.status === 'queued' || job.status === 'running'));
    if (!busy) {
      const bucket = Math.floor(now / (15 * 60_000));
      try { engine.queueGmailSync(connection.userId, 'cron', `cron:${connection.id}:${bucket}`); } catch { /* connection may have been disconnected between reads */ }
    }
  }
  const jobs = engine.store.gmailSyncJobs.filter((job) => (job.status === 'queued' || job.status === 'failed') && (!job.nextAttemptAt || Date.parse(job.nextAttemptAt) <= now)).slice(0, maxJobs);
  const summary = { jobs: 0, inspected: 0, candidates: 0, ignored: 0, duplicates: 0, failed: 0 };
  for (const queued of jobs) {
    let job;
    try { job = engine.leaseGmailSyncJob(queued.id); } catch { continue; }
    const connection = engine.store.gmailConnections.find((item) => item.id === job.connectionId && (item.status === 'active' || (item.status === 'error' && job.status === 'failed')));
    if (!connection) { try { engine.failGmailSyncJob(job.id, 'connection_unavailable'); } catch { /* already cancelled */ } continue; }
    summary.jobs += 1;
    connection.status = 'syncing';
    try {
      const decrypted = decryptGmailRefreshToken(connection.encryptedRefreshToken);
      const refreshToken = decrypted.token;
      // Re-encrypt a token decrypted with the previous key version so key
      // rotation completes opportunistically without exposing plaintext.
      const activeKeyVersion = Number(process.env.MISSA_GMAIL_TOKEN_KEY_VERSION || '1') || 1;
      if (decrypted.keyVersion !== activeKeyVersion) {
        const rotated = encryptGmailRefreshToken(refreshToken);
        connection.encryptedRefreshToken = rotated.encrypted;
        connection.tokenKeyVersion = rotated.keyVersion;
      }
      const access = await provider.refreshAccessToken(refreshToken);
      let messageIds: Array<{ id: string; threadId?: string; historyId?: string }> = [];
      let targetHistoryId = connection.historyId;
      if (connection.historyId && job.trigger !== 'initial') {
        const history = await provider.listHistory(access.accessToken, connection.historyId);
        targetHistoryId = history.historyId;
        messageIds = history.messageIds.map((id) => ({ id }));
      } else {
        const after = Math.floor((Date.now() - connection.scanWindowDays * 86_400_000) / 1_000).toString();
        messageIds = await provider.listMessages(access.accessToken, { after, labelIds: connection.labelIds, max: 500 });
      }
      for (const item of messageIds.slice(0, 500)) {
        summary.inspected += 1;
        const envelope = await provider.getMessageText(access.accessToken, item.id);
        const result = engine.ingestGmailEnvelope(connection.id, { ...envelope, headers: { ...envelope.headers, ...(item.threadId ? { 'x-gmail-thread-id': item.threadId } : {}), ...(item.historyId ? { 'x-gmail-history-id': item.historyId } : {}) } });
        if (!result.accepted) continue;
        if (result.reason === 'duplicate') summary.duplicates += 1;
        else if (result.candidateId) {
          summary.candidates += 1;
          if (connection.mode === 'autopilot') {
            const gate = engine.gmailAutopilotGate(result.candidateId);
            if (gate.allowed) { engine.applyGmailAutopilotCandidate(result.candidateId); }
          }
        }
      }
      engine.completeGmailSyncJob(job.id, { inspected: summary.inspected, candidates: summary.candidates, ignored: summary.ignored, duplicates: summary.duplicates }, targetHistoryId);
    } catch (error) {
      summary.failed += 1;
      try { engine.failGmailSyncJob(job.id, error instanceof Error ? error.message.replace(/^gmail_/, '').slice(0, 60) : 'provider_error'); } catch { /* preserve the original failure */ }
    }
  }
  return summary;
}
