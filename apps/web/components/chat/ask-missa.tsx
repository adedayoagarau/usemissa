'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { chatAssistantPayloadSchema, type ChatAssistantPayload, type ChatMessage, type ChatTurnResponse } from '@missa/contracts';
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  FileText,
  History,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Shapes,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';

import styles from './ask-missa.module.css';

type ConversationSummary = {
  id: string;
  title?: string;
  updatedAt: string;
};

type ConversationView = {
  conversation: ConversationSummary;
  messages: ChatMessage[];
};

type RetryReceipt = {
  conversationId?: string;
  message: string;
  key: string;
};

const suggestions = [
  'Find free fellowships for screenwriters',
  'Show photography residencies closing soon',
  'Find grants for documentary filmmakers',
];

const facetLabels: Record<string, string> = {
  'practice-family': 'Field',
  discipline: 'Discipline',
  form: 'Form',
  genre: 'Genre',
  subgenre: 'Subgenre',
  medium: 'Medium',
  technique: 'Technique or process',
  mode: 'Mode or approach',
  role: 'Role',
  theme: 'Theme or subject',
  audience: 'Audience',
  language: 'Language',
};

function assistantPayload(message: ChatMessage): ChatAssistantPayload | undefined {
  if (message.role !== 'assistant') return undefined;
  const parsed = chatAssistantPayloadSchema.safeParse(message.metadata);
  return parsed.success ? parsed.data : undefined;
}

function feeLabel(result: ChatAssistantPayload['results'][number]): string {
  if (result.fee.status === 'no-fee') return 'No application fee';
  if (result.fee.status === 'unknown') return 'Fee needs confirmation';
  if (result.fee.amountCents !== undefined && result.fee.currency) {
    return new Intl.NumberFormat('en', { style: 'currency', currency: result.fee.currency }).format(result.fee.amountCents / 100);
  }
  return 'Application fee';
}

function ParsedSearch({ payload }: { payload: ChatAssistantPayload }) {
  const filters = [
    ...payload.search.types.map((type) => ({ category: 'Type', label: type.replaceAll('-', ' ') })),
    ...(payload.search.feeStatus ? [{ category: 'Fee', label: payload.search.feeStatus === 'no-fee' ? 'No fee' : payload.search.feeStatus.replaceAll('-', ' ') }] : []),
    ...payload.search.taxonomy.map((term) => ({ category: facetLabels[term.facet] ?? term.facet, label: term.label })),
  ];
  if (!filters.length && !payload.search.query) return null;
  return (
    <section className={styles.parsed} aria-label="Search understood as">
      <p>Search understood as</p>
      <div>
        {payload.search.query ? <span><strong>Words</strong>{payload.search.query}</span> : null}
        {filters.map((filter) => <span key={`${filter.category}-${filter.label}`}><strong>{filter.category}</strong>{filter.label}</span>)}
      </div>
    </section>
  );
}

function EvidenceList({ payload }: { payload: ChatAssistantPayload }) {
  if (!payload.results.length) return null;
  return (
    <section className={styles.evidence} aria-label="Opportunity results">
      {payload.results.map((result) => (
        <article key={result.id}>
          <header>
            <div><p>{result.type.replaceAll('-', ' ')}</p><h3>{result.title}</h3>{result.organizationName ? <span>{result.organizationName}</span> : null}</div>
            <span>{result.status.replaceAll('-', ' ')}</span>
          </header>
          <dl>
            <div><CalendarDays aria-hidden="true" /><dt>Deadline</dt><dd>{result.deadline.date ?? result.deadline.raw ?? 'Needs confirmation'}</dd></div>
            <div><CircleDollarSign aria-hidden="true" /><dt>Fee</dt><dd>{feeLabel(result)}</dd></div>
            {result.taxonomy.length ? <div><Shapes aria-hidden="true" /><dt>Field</dt><dd>{result.taxonomy.slice(0, 4).map((term) => term.label).join(' · ')}</dd></div> : null}
          </dl>
          <footer>
            <Link href={`/opportunities/${encodeURIComponent(result.id)}`}>Open Opportunity <ArrowUpRight aria-hidden="true" /></Link>
            <a href={result.source.url} target="_blank" rel="noreferrer">Official source <ArrowUpRight aria-hidden="true" /></a>
          </footer>
        </article>
      ))}
    </section>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const payload = assistantPayload(message);
  const isUser = message.role === 'user';
  return (
    <article className={styles.message} data-role={message.role} aria-label={`${message.role} message`}>
      <div className={styles.messageLabel}>{isUser ? 'You' : 'Missa'}</div>
      <div>
        <p className={styles.messageText}>{message.content}</p>
        {payload ? <><ParsedSearch payload={payload} /><EvidenceList payload={payload} /></> : null}
      </div>
    </article>
  );
}

function ConversationHistory({
  conversations,
  conversationId,
  newConversation,
  openConversation,
}: {
  conversations: ConversationSummary[];
  conversationId?: string;
  newConversation: () => void;
  openConversation: (summary: ConversationSummary) => Promise<void>;
}) {
  return (
    <>
      <header><div><p>Private history</p><h2>Conversations</h2></div><Button type="button" variant="outline" size="icon" aria-label="Start a new search" onClick={newConversation}><Plus aria-hidden="true" /></Button></header>
      {conversations.length ? <nav>{conversations.map((conversation) => <button key={conversation.id} type="button" aria-current={conversation.id === conversationId ? 'page' : undefined} onClick={() => void openConversation(conversation)}><MessageSquareText aria-hidden="true" /><span><strong>{conversation.title || 'Opportunity search'}</strong><small>Private conversation</small></span></button>)}</nav> : <p className={styles.noHistory}>Your private Opportunity searches will appear here.</p>}
      <small className={styles.historyPolicy}>History is account-scoped. Rename, export, retention, and deletion controls will appear only after their policy is approved.</small>
    </>
  );
}

export function AskMissa() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationHeadingRef = useRef<HTMLHeadingElement>(null);
  const requestSequence = useRef(0);
  const retryReceipt = useRef<RetryReceipt | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const listResponse = await fetch('/api/me/chat', { cache: 'no-store' });
        if (!listResponse.ok) throw new Error(listResponse.status === 503 ? 'Ask Missa is temporarily unavailable. Browse Opportunities while the published collection reconnects.' : 'We could not load your conversation history.');
        const list = await listResponse.json() as { conversations?: ConversationSummary[] };
        const rows = list.conversations ?? [];
        if (cancelled) return;
        setConversations(rows);
        const latest = rows[0];
        if (!latest) return;
        const conversationResponse = await fetch(`/api/me/chat/${encodeURIComponent(latest.id)}`, { cache: 'no-store' });
        if (!conversationResponse.ok) throw new Error('We could not load your latest conversation.');
        const view = await conversationResponse.json() as ConversationView;
        if (!cancelled) {
          setConversationId(latest.id);
          setMessages(view.messages ?? []);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'We could not load your conversation history.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, []);

  async function openConversation(summary: ConversationSummary) {
    const sequence = ++requestSequence.current;
    setLoadingConversation(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/me/chat/${encodeURIComponent(summary.id)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('We could not load that conversation.');
      const view = await response.json() as ConversationView;
      if (sequence !== requestSequence.current) return;
      setConversationId(summary.id);
      setMessages(view.messages ?? []);
      setHistoryOpen(false);
      requestAnimationFrame(() => conversationHeadingRef.current?.focus());
    } catch (caught) {
      if (sequence === requestSequence.current) setError(caught instanceof Error ? caught.message : 'We could not load that conversation.');
    } finally {
      if (sequence === requestSequence.current) setLoadingConversation(false);
    }
  }

  function newConversation() {
    requestSequence.current += 1;
    setConversationId(undefined);
    setMessages([]);
    setInput('');
    setError(undefined);
    setHistoryOpen(false);
    retryReceipt.current = undefined;
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    const existingReceipt = retryReceipt.current;
    const idempotencyKey = existingReceipt?.message === message && existingReceipt.conversationId === conversationId
      ? existingReceipt.key
      : crypto.randomUUID();
    retryReceipt.current = { conversationId, message, key: idempotencyKey };
    const sequence = ++requestSequence.current;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch('/api/me/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ conversationId, message }),
      });
      const body = await response.json().catch(() => undefined) as ChatTurnResponse | { error?: string } | undefined;
      if (!response.ok) throw new Error(body && 'error' in body && body.error ? body.error : 'Missa could not complete that search. Your question is still here.');
      if (sequence !== requestSequence.current) return;
      const result = body as ChatTurnResponse;
      setConversationId(result.conversationId);
      setMessages(result.messages);
      setConversations((current) => {
        const existing = current.find((entry) => entry.id === result.conversationId);
        const next = existing ?? { id: result.conversationId, title: message.slice(0, 120), updatedAt: new Date().toISOString() };
        return [next, ...current.filter((entry) => entry.id !== result.conversationId)];
      });
      setInput('');
      retryReceipt.current = undefined;
    } catch (caught) {
      if (sequence === requestSequence.current) setError(caught instanceof Error ? caught.message : 'Missa could not complete that search. Your question is still here.');
    } finally {
      if (sequence === requestSequence.current) setPending(false);
    }
  }

  const activeConversation = conversations.find((conversation) => conversation.id === conversationId);

  return (
    <div className={styles.desk}>
      <div className={styles.mobileTools}>
        <Drawer open={historyOpen} onOpenChange={setHistoryOpen} direction="left">
          <DrawerTrigger render={<Button type="button" variant="outline" />}><History aria-hidden="true" />Conversations</DrawerTrigger>
          <DrawerContent className={styles.mobileHistoryDrawer} overlayClassName={styles.mobileHistoryOverlay}>
            <DrawerTitle className="sr-only">Ask Missa conversations</DrawerTitle>
            <DrawerDescription className="sr-only">Your private Opportunity-search conversation history.</DrawerDescription>
            <aside className={`${styles.history} ${styles.mobileHistory}`} aria-label="Ask Missa conversations">
              <ConversationHistory conversations={conversations} conversationId={conversationId} newConversation={newConversation} openConversation={openConversation} />
            </aside>
          </DrawerContent>
        </Drawer>
        <Button type="button" variant="ghost" onClick={newConversation}><Plus aria-hidden="true" />New search</Button>
      </div>
      <aside className={`${styles.history} ${styles.desktopHistory}`} aria-label="Ask Missa conversations">
        <ConversationHistory conversations={conversations} conversationId={conversationId} newConversation={newConversation} openConversation={openConversation} />
      </aside>

      <section className={styles.conversation} aria-labelledby="ask-conversation-heading" aria-busy={loadingHistory || loadingConversation || pending}>
        <header>
          <div><p>Published Opportunity search</p><h2 id="ask-conversation-heading" ref={conversationHeadingRef} tabIndex={-1}>{activeConversation?.title || 'New search'}</h2><span>Sources remain attached. Ask does not decide eligibility, quality, or likely outcomes.</span></div>
          {conversationId ? <Button type="button" variant="ghost" onClick={newConversation}><Plus aria-hidden="true" />New search</Button> : null}
        </header>

        <div className={styles.messages}>
          {loadingHistory || loadingConversation ? <div className={styles.loading} role="status"><LoaderCircle aria-hidden="true" />Loading your private conversation…</div> : null}
          {!loadingHistory && !loadingConversation && messages.length === 0 ? (
            <section className={styles.empty}>
              <Search aria-hidden="true" />
              <h3>What published Opportunity are you looking for?</h3>
              <p>Use an Opportunity type, any of the 12 field facets, a fee preference, geography, or deadline. Missa searches its published collection only.</p>
              <div>{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}>{suggestion}</button>)}</div>
            </section>
          ) : null}
          {messages.map((message) => <Message key={message.id} message={message} />)}
          {pending ? <div className={styles.loading} role="status"><LoaderCircle aria-hidden="true" />Searching published Opportunities…</div> : null}
        </div>

        <form onSubmit={submit} className={styles.composer}>
          {error ? <div className={styles.error} role="alert"><FileText aria-hidden="true" /><span>{error}</span>{error.includes('temporarily unavailable') ? <Link href="/opportunities">Browse Opportunities</Link> : null}</div> : null}
          <label htmlFor="ask-missa-message">Ask about published Opportunities</label>
          <div>
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
              placeholder="e.g. Find free fellowships for screenwriters"
              disabled={pending}
            />
            <Button type="submit" size="icon-lg" disabled={pending || !input.trim()} aria-label="Send question">
              {pending ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
            </Button>
          </div>
          <p>Missa searches published Opportunities only. Shift+Enter starts a new line.</p>
        </form>
      </section>
    </div>
  );
}
