import assert from "node:assert/strict";
import test from "node:test";

import type { ChatMessageRecord } from "@missa/radar-adapters";

import { publicChatMessage } from "./chatService";

test("public chat messages strip arbitrary operational metadata", () => {
  const record: ChatMessageRecord = {
    id: "message_1",
    conversationId: "conversation_1",
    runId: "run_1",
    sequence: 2,
    role: "assistant",
    content: "I found one published fellowship.",
    createdAt: "2026-08-08T12:00:00.000Z",
    metadata: {
      intent: "opportunity-search",
      engine: "internal-graph-version",
      answer: "I found one published fellowship.",
      search: { types: ["fellowship"], sort: "soonest-deadline" },
      results: [{
        id: "opp_1",
        title: "Example Fellowship",
        status: "open",
        type: "fellowship",
        deadline: { kind: "fixed", date: "2026-09-01" },
        fee: { status: "no-fee" },
        source: {
          opportunityId: "opp_1",
          title: "Example Fellowship",
          url: "https://example.com/fellowship",
          checkedAt: "2026-08-08T11:55:00.000Z",
          organizationConfirmed: true,
        },
      }],
      evidence: [{
        opportunityId: "opp_1",
        title: "Example Fellowship",
        url: "https://example.com/fellowship",
        checkedAt: "2026-08-08T11:55:00.000Z",
        organizationConfirmed: true,
      }],
      confidence: 0.98,
    },
  };

  const message = publicChatMessage(record);
  assert.equal("engine" in message.metadata, false);
  assert.equal("confidence" in message.metadata, false);
  const metadata = message.metadata as Record<string, unknown>;
  const results = metadata.results as Array<{ source: Record<string, unknown> }>;
  assert.equal("checkedAt" in results[0]!.source, false);
  assert.equal("organizationConfirmed" in results[0]!.source, false);
});

test("user message metadata never crosses the customer boundary", () => {
  const record: ChatMessageRecord = {
    id: "message_2",
    conversationId: "conversation_1",
    runId: "run_1",
    sequence: 1,
    role: "user",
    content: "Find grants for poets",
    createdAt: "2026-08-08T12:00:00.000Z",
    metadata: { accountId: "private", traceId: "private" },
  };

  assert.deepEqual(publicChatMessage(record).metadata, {});
});
