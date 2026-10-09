"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ReaderCopy } from "@/lib/writing-studio-data";

/** A scoped immutable reading copy. Comments never change the author's draft. */
export function WritingReader({ token }: { token: string }) {
  const [copy, setCopy] = useState<ReaderCopy | null>(null);
  const [pieceId, setPieceId] = useState("");
  const [quote, setQuote] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/writing/read/${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("This reader link is unavailable or has expired.");
      const data: ReaderCopy = await response.json();
      if (active) { setCopy(data); setPieceId(data.checkpoint.pieces[0]?.id ?? ""); }
    }).catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  const piece = copy?.checkpoint.pieces.find((item) => item.id === pieceId);
  async function comment() {
    setBusy(true); setError(""); setStatus("");
    try {
      const response = await fetch(`/api/writing/read/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pieceId, quote, body }) });
      const result = await response.json();
      if (response.status === 401) { setSignedOut(true); return; }
      if (!response.ok) throw new Error(result.error || "Couldn’t save your comment. Try again.");
      setCopy((value) => value ? { ...value, comments: [...value.comments, result.comment] } : value);
      setBody(""); setStatus("Comment saved. The author decides how to use it.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t save your comment."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
    <header><Link href="/">Missa</Link><h1 className="mt-4 font-serif text-3xl">{copy?.checkpoint.name || "Reading copy"}</h1>
      <p className="mt-2 text-muted-foreground">A private reader link to a fixed copy. Your comments leave the author’s draft unchanged.</p></header>
    {loading ? <p role="status">Opening reading copy…</p> : null}
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    {copy ? <>
      <p className="text-sm text-muted-foreground">Access expires {new Date(copy.expiresAt).toLocaleString()}.</p>
      <div className="grid min-w-0 gap-8 lg:grid-cols-2">
        <div className="min-w-0"><Label htmlFor="reader-piece">Piece</Label><NativeSelect id="reader-piece" value={pieceId} onChange={(event) => { setPieceId(event.target.value); setQuote(""); }}>
          {copy.checkpoint.pieces.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.title || "Untitled piece"}</NativeSelectOption>)}
        </NativeSelect>
          {piece ? <article className="mt-6" onMouseUp={() => {
            const selected = window.getSelection()?.toString() ?? "";
            if (selected && piece.body.includes(selected) && selected.length <= 2000) setQuote(selected);
          }}><h2 className="font-serif text-2xl">{piece.title || "Untitled piece"}</h2><p className="mt-4 whitespace-pre-wrap break-words font-serif text-lg">{piece.body}</p></article> : <p>This checkpoint has no pieces.</p>}
        </div>
        <section aria-label="Reader comments" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-semibold">Your feedback</h2>
          <p className="text-muted-foreground">Select a passage, or paste an exact quote. Sign in to leave a comment.</p>
          <Label htmlFor="reader-quote">Passage</Label><Input id="reader-quote" value={quote} maxLength={2000} onChange={(event) => setQuote(event.target.value)} />
          <Label htmlFor="reader-comment">Comment</Label><Textarea id="reader-comment" value={body} maxLength={5000} onChange={(event) => setBody(event.target.value)} />
          <Button disabled={busy || !quote || !body.trim() || !piece?.body.includes(quote)} aria-busy={busy || undefined} onClick={() => void comment()}>{busy ? "Saving…" : "Leave comment"}</Button>
          {signedOut ? <Link href={`/login?next=${encodeURIComponent(`/doc/read/${token}`)}`} className="text-primary underline">Sign in to comment</Link> : null}
          <p role="status" className="text-muted-foreground">{status}</p>
          {copy.comments.filter((item) => item.pieceId === pieceId).map((item) => <div key={item.id} className="border-t border-border py-4"><blockquote className="whitespace-pre-wrap break-words text-muted-foreground">{item.quote}</blockquote><p className="mt-2 whitespace-pre-wrap break-words">{item.body}</p></div>)}
        </section>
      </div>
    </> : null}
  </main>;
}
