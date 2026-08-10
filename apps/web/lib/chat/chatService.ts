import {
  chatAssistantPayloadSchema,
  type ChatAssistantPayload,
  type ChatMessage,
  type ChatPostInput,
  type ChatTurnResponse,
} from "@missa/contracts";
import {
  createPostgresChatStoreFromUrl,
  createPostgresOpportunityRepositoryFromUrl,
  type ChatMessageRecord,
  type ChatRunView,
  type PostgresChatStore,
} from "@missa/radar-adapters";
import type { OpportunityRepository } from "@missa/radar-engine";
import { buildOpportunityAssistantPayload, buildOpportunitySearchPlan } from "./chatContext";

declare global {
  var __missaChatStore: PostgresChatStore | undefined;
  var __missaChatOpportunityRepository: OpportunityRepository | undefined;
}

export class ChatServiceError extends Error {
  constructor(
    message: string,
    readonly code: "unavailable" | "failed" | "not_found" = "failed",
  ) {
    super(message);
    this.name = "ChatServiceError";
  }
}

/** Chat remains dark until chat_*, its migration journal entry, and durable
 * production persistence have been rehearsed together. */
export function chatEnabled(): boolean {
  return process.env.MISSA_CHAT_ENABLED?.trim() === '1';
}

function chatStore(): PostgresChatStore {
  if (!chatEnabled()) throw new ChatServiceError('Ask Missa is not enabled in this environment.', 'unavailable');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ChatServiceError("A durable chat database is not configured.", "unavailable");
  }
  if (!globalThis.__missaChatStore) {
    globalThis.__missaChatStore = createPostgresChatStoreFromUrl(databaseUrl);
  }
  return globalThis.__missaChatStore;
}

function chatOpportunityRepository(): OpportunityRepository {
  if (!chatEnabled()) throw new ChatServiceError('Ask Missa is not enabled in this environment.', 'unavailable');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ChatServiceError("A durable opportunity database is not configured.", "unavailable");
  }
  if (!globalThis.__missaChatOpportunityRepository) {
    // The chatbot uses the relational repository directly so its visibility
    // boundary is published-only in both development and production. It does
    // not fall back to the broad in-memory compatibility projection.
    globalThis.__missaChatOpportunityRepository = createPostgresOpportunityRepositoryFromUrl(databaseUrl);
  }
  return globalThis.__missaChatOpportunityRepository;
}

function scopedIdempotencyKey(input: ChatPostInput, clientKey: string): string {
  const scope = input.organizationId ? `organization:${input.organizationId}` : "personal";
  return `${scope}:${clientKey}`;
}

function payloadFromView(view: ChatRunView): ChatAssistantPayload | undefined {
  const assistant = [...view.messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.runId === view.run.id);
  if (!assistant) return undefined;
  const parsed = chatAssistantPayloadSchema.safeParse(assistant.metadata);
  return parsed.success ? parsed.data : undefined;
}

/** Only this authored projection crosses the customer API boundary. Raw run,
 * graph, source-processing, and arbitrary message metadata remain private. */
export function publicChatMessage(message: ChatMessageRecord): ChatMessage {
  const payload = message.role === 'assistant'
    ? chatAssistantPayloadSchema.safeParse(message.metadata)
    : undefined;
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sequence: message.sequence,
    createdAt: message.createdAt,
    metadata: payload?.success ? payload.data : {},
  };
}

function responseFromView(view: ChatRunView, idempotent: boolean): ChatTurnResponse {
  const payload = payloadFromView(view);

  return {
    conversationId: view.run.conversationId,
    runId: view.run.id,
    status: view.run.status,
    idempotent,
    messages: view.messages.map(publicChatMessage),
    ...(payload ? { payload } : {}),
  };
}

export async function runReadOnlyChatTurn(input: {
  accountId: string;
  chat: ChatPostInput;
  clientIdempotencyKey: string;
}): Promise<ChatTurnResponse> {
  const store = chatStore();
  const idempotencyKey = scopedIdempotencyKey(input.chat, input.clientIdempotencyKey);
  let begun: Awaited<ReturnType<PostgresChatStore["beginTurn"]>>;
  try {
    begun = await store.beginTurn({
      accountId: input.accountId,
      organizationId: input.chat.organizationId,
      conversationId: input.chat.conversationId,
      idempotencyKey,
      message: input.chat.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start chat";
    if (message === "Chat conversation is not available to this account") {
      throw new ChatServiceError("Conversation not found", "not_found");
    }
    throw new ChatServiceError("Durable chat storage is unavailable.", "unavailable");
  }

  if (begun.idempotent) {
    const existing = await store.getRun({
      runId: begun.runId,
      accountId: input.accountId,
      organizationId: input.chat.organizationId,
    });
    if (!existing) throw new ChatServiceError("The existing chat run could not be recovered.");
    return responseFromView(existing, true);
  }

  try {
    const plan = buildOpportunitySearchPlan(input.chat.message);
    const page = await chatOpportunityRepository().browse(plan.repositoryQuery, {
      accountId: input.accountId,
    });
    const payload = buildOpportunityAssistantPayload(plan, page);
    await store.completeRun({
      runId: begun.runId,
      accountId: input.accountId,
      organizationId: input.chat.organizationId,
      content: payload.answer,
      metadata: payload,
    });
  } catch (error) {
    await store.failRun({
      runId: begun.runId,
      accountId: input.accountId,
      organizationId: input.chat.organizationId,
      error: error instanceof Error ? error.message : "Chat run failed",
    }).catch(() => undefined);
    if (error instanceof ChatServiceError) throw error;
    throw new ChatServiceError("The read-only assistant could not complete this run.");
  }

  const completed = await store.getRun({
    runId: begun.runId,
    accountId: input.accountId,
    organizationId: input.chat.organizationId,
  });
  if (!completed) throw new ChatServiceError("The completed chat run could not be recovered.");
  return responseFromView(completed, false);
}

export async function listReadOnlyChatConversations(accountId: string): Promise<PublicChatConversationSummary[]> {
  const conversations = await chatStore().listConversations({ accountId });
  return conversations.map(({ id, status, title, createdAt, updatedAt }) => ({ id, status, title, createdAt, updatedAt }));
}

export type PublicChatConversationSummary = {
  id: string;
  status: 'active' | 'archived';
  title?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicChatConversationView = {
  conversation: PublicChatConversationSummary;
  messages: ChatMessage[];
};

export async function readReadOnlyChatConversation(input: {
  accountId: string;
  conversationId: string;
}): Promise<PublicChatConversationView | null> {
  const view = await chatStore().getConversation(input);
  if (!view) return null;
  const { id, status, title, createdAt, updatedAt } = view.conversation;
  return {
    conversation: { id, status, title, createdAt, updatedAt },
    messages: view.messages.map(publicChatMessage),
  };
}
