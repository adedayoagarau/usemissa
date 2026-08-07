'use client';

import { useEffect, useRef, useState } from 'react';
import { chatAssistantPayloadSchema, type ChatAssistantPayload, type ChatMessage, type ChatTurnResponse } from '@missa/contracts';
import { ArrowUpRight, Bot, LoaderCircle, Send, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type ConversationSummary = {
  id: string;
  updatedAt: string;
};

type ConversationView = {
  messages: ChatMessage[];
};

const suggestions = [
  'Find grants for writers',
  'Show free fellowships',
  'What opportunities are closing soon?',
];

function assistantPayload(message: ChatMessage): ChatAssistantPayload | undefined {
  if (message.role !== 'assistant') return undefined;
  const parsed = chatAssistantPayloadSchema.safeParse(message.metadata);
  return parsed.success ? parsed.data : undefined;
}

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'check time unavailable' : `checked ${date.toLocaleString()}`;
}

function EvidenceList({ payload }: { payload: ChatAssistantPayload }) {
  if (!payload.results.length) return null;
  return (
    <div className="mt-4 grid gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sources</p>
      {payload.results.map((result) => (
        <article key={result.id} className="border border-border bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground">{result.title}</h3>
              {result.organizationName && <p className="mt-0.5 text-xs text-muted-foreground">{result.organizationName}</p>}
            </div>
            <a
              href={result.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent-deep underline underline-offset-4 hover:text-primary"
            >
              Source <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{result.deadline.date ?? result.deadline.raw ?? 'Deadline not confirmed'}</span>
            <span>{result.fee.status === 'no-fee' ? 'No fee' : result.fee.status === 'paid' ? 'Fee listed' : 'Fee unknown'}</span>
            <span>{formatCheckedAt(result.source.checkedAt)}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Organization {result.source.organizationConfirmed ? 'confirmed' : 'not independently confirmed'}
          </p>
        </article>
      ))}
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const payload = assistantPayload(message);
  const isUser = message.role === 'user';
  return (
    <article className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`} aria-label={`${message.role} message`}>
      {!isUser && (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-deep">
          <Bot className="size-4" aria-hidden="true" />
        </span>
      )}
      <div className={`max-w-[min(100%,680px)] ${isUser ? 'bg-foreground text-white' : 'border border-border bg-white text-foreground'} px-4 py-3`}>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        {payload && <EvidenceList payload={payload} />}
      </div>
      {isUser && (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
      )}
    </article>
  );
}

export function AskMissa() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const listResponse = await fetch('/api/me/chat', { cache: 'no-store' });
        if (!listResponse.ok) {
          if (listResponse.status !== 503) throw new Error('Chat history could not be loaded.');
          return;
        }
        const list = await listResponse.json() as { conversations?: ConversationSummary[] };
        const latest = list.conversations?.[0];
        if (!latest) return;
        const conversationResponse = await fetch(`/api/me/chat/${encodeURIComponent(latest.id)}`, { cache: 'no-store' });
        if (!conversationResponse.ok) throw new Error('The latest conversation could not be loaded.');
        const view = await conversationResponse.json() as ConversationView;
        if (!cancelled) {
          setConversationId(latest.id);
          setMessages(view.messages ?? []);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Chat history could not be loaded.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch('/api/me/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ conversationId, message }),
      });
      const body = await response.json().catch(() => undefined) as ChatTurnResponse | { error?: string } | undefined;
      if (!response.ok) throw new Error(body && 'error' in body && body.error ? body.error : 'The assistant could not complete that request.');
      const result = body as ChatTurnResponse;
      setConversationId(result.conversationId);
      setMessages(result.messages);
      setInput('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The assistant could not complete that request.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8">
      <Card className="overflow-visible bg-muted/20">
        <CardContent className="p-0">
          <div className="min-h-[360px] space-y-5 p-4 sm:p-6" aria-live="polite">
            {loadingHistory && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Loading your conversation…
              </div>
            )}
            {!loadingHistory && messages.length === 0 && (
              <div className="max-w-xl py-8">
                <p className="text-lg font-medium text-foreground">What are you looking for?</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Start with an opportunity type, practice, fee preference, or deadline.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <Button key={suggestion} type="button" variant="outline" size="sm" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}>
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => <Message key={message.id} message={message} />)}
            {pending && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-tint text-accent-deep"><Bot className="size-4" aria-hidden="true" /></span>
                <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Searching published opportunities…</span>
              </div>
            )}
          </div>
          <form onSubmit={submit} className="border-t border-border bg-white p-4 sm:p-5">
            {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
            <label htmlFor="ask-missa-message" className="sr-only">Ask Missa a question</label>
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                id="ask-missa-message"
                rows={2}
                maxLength={2_000}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="e.g. Find free fellowships for writers"
                disabled={pending}
                className="min-h-16 resize-none"
              />
              <Button type="submit" size="icon-lg" disabled={pending || !input.trim()} aria-label="Send question">
                {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Read-only baseline · Shift+Enter for a new line · sources remain visible</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
