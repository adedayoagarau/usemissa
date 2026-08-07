import { redirect } from 'next/navigation';
import { AskMissa } from '@/components/chat/ask-missa';

export default function AskPage() {
  if (process.env.MISSA_CHAT_ENABLED?.trim() !== '1') redirect('/opportunities');
  return (
    <div className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Missa assistant</p>
        <h1 className="mt-2 font-heading text-3xl font-medium text-foreground">Ask Missa</h1>
        <p className="mt-2 leading-6 text-muted-foreground">
          Search published opportunities in plain language. Every result keeps its source and last checked time visible.
        </p>
      </div>
      <AskMissa />
    </div>
  );
}
