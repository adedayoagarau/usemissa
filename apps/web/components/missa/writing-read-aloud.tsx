"use client";

import { useEffect, useRef, useState, useImperativeHandle, type Ref } from "react";
import { ButtonGroup } from "@/components/ui/button-group";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Volume2, Pause, Play, Square, ChevronUp, LoaderCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverTitle } from "@/components/ui/popover";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DEFAULT_READ_ALOUD_VOICE, READ_ALOUD_MAX_CHARACTERS, READ_ALOUD_VOICES, READ_ALOUD_MONTHLY_CHARACTERS, type ReadAloudPlan } from "@/lib/writing-read-aloud";
import { readAloudChunks } from "@/lib/writing-read-aloud-chunks";

export type WritingReadAloudHandle = { read: (passage: string) => void };

/** Audio starts only on an explicit click; switching documents releases its URLs. */
export function WritingReadAloud({ text, ref, plan, disabled = false }: {
  text: string;
  ref?: Ref<WritingReadAloudHandle>;
  plan: ReadAloudPlan | null;
  disabled?: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const passage = text;
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelShift, setPanelShift] = useState(0);
  const [panelShiftY, setPanelShiftY] = useState(0);
  const [panelHeight, setPanelHeight] = useState<number>();
  const [panelWidth, setPanelWidth] = useState<number>();
  useEffect(() => {
    if (!settingsOpen) return;
    const measure = () => {
      const zoom = Number.parseFloat(getComputedStyle(window.document.documentElement).zoom) || 1;
      setPanelWidth(Math.min(320, (window.innerWidth - 24) / zoom));
      setPanelHeight((window.innerHeight - 24) / zoom);
      requestAnimationFrame(() => {
        const bounds = panelRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const correction = bounds.right > window.innerWidth - 12 ? window.innerWidth - 12 - bounds.right : bounds.left < 12 ? 12 - bounds.left : 0;
        const correctionY = bounds.bottom > window.innerHeight - 12 ? window.innerHeight - 12 - bounds.bottom : bounds.top < 12 ? 12 - bounds.top : 0;
        if (Math.abs(correctionY) > 1) setPanelShiftY((Number.parseFloat(panelRef.current?.style.translate.split(" ")[1] ?? "0") || 0) + correctionY / zoom);
        if (Math.abs(correction) > 1) setPanelShift((Number.parseFloat(panelRef.current?.style.translate ?? "0") || 0) + correction / zoom);
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(window.document.documentElement);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [settingsOpen]);
  const chunks = useRef<string[]>([]);

  const [voice, setVoice] = useState<string>(DEFAULT_READ_ALOUD_VOICE);
  const [speed, setSpeed] = useState("1");
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused" | "complete">("idle");
  const [part, setPart] = useState(0);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const cache = useRef(new Map<string, string>());
  const rate = useRef(1);

  function stop() {
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current.removeAttribute("src");
      audio.current.load();
      audio.current = null;
    }
    setState("idle");
  }

  useEffect(() => () => {
    generation.current++;
    controller.current?.abort();
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
      audio.current.removeAttribute("src");
      audio.current.load();
    }
    for (const url of cache.current.values()) URL.revokeObjectURL(url);
    cache.current.clear();
  }, []);

  async function play(index: number, session: number) {
    setPart(index);
    setError("");
    const key = `${voice}/${chunks.current[index]}`;
    try {
      let url = cache.current.get(key);
      if (!url) {
        setState("loading");
        const request = new AbortController();
        controller.current = request;
        const response = await fetch("/api/me/writing/read-aloud", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunks.current[index], voice }), signal: request.signal,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || "Couldn’t prepare audio. Try again.");
        }
        const blob = await response.blob();
        if (session !== generation.current) return;
        if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("Couldn’t play this audio. Try again.");
        url = URL.createObjectURL(blob);
        cache.current.set(key, url);
      }
      if (session !== generation.current) return;
      if (audio.current) {
        audio.current.onended = null;
        audio.current.onerror = null;
        audio.current.pause();
        audio.current.removeAttribute("src");
        audio.current.load();
      }
      const player = new Audio(url);
      audio.current = player;
      player.playbackRate = rate.current;
      player.onerror = () => {
        if (session !== generation.current) return;
        setError("Couldn’t play this audio. Your writing is safe. Try again.");
        setState("idle"); setSettingsOpen(true);
      };
      player.onended = () => {
        if (session !== generation.current) return;
        if (index + 1 < chunks.current.length) void play(index + 1, session);
        else setState("complete");
      };
      await player.play();
      if (session === generation.current) setState("playing");
    } catch (cause) {
      if (session !== generation.current) return;
      setError(cause instanceof Error ? cause.message : "Couldn’t prepare audio. Try again.");
      setState("idle"); setSettingsOpen(true);
    }
  }

  const monthlyLimit = plan ? READ_ALOUD_MONTHLY_CHARACTERS[plan] : null;
  function read(selected: string) {
    if (disabled || !selected.trim()) return;
    if (!plan) { setSettingsOpen(true); return; }
    stop();
    chunks.current = readAloudChunks(selected, READ_ALOUD_MAX_CHARACTERS);
    void play(0, generation.current);
  }
  useImperativeHandle(ref, () => ({ read }));

  const active = state === "loading" || state === "playing" || state === "paused";
  const label = state === "loading" ? "Preparing audio" : state === "playing" ? "Pause read aloud" : state === "paused" ? "Resume read aloud" : "Read aloud";
  const Icon = state === "loading" ? LoaderCircle : state === "playing" ? Pause : state === "paused" ? Play : Volume2;
  return (
    <div role="group" aria-label="Read aloud" className="flex items-center gap-1">
      <span role="status" className="sr-only">{state === "loading" ? "Preparing audio" : state === "playing" ? `Reading part ${part + 1}` : state === "paused" ? "Paused" : state === "complete" ? "Finished" : ""}</span>
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} disabled={(!active && (disabled || !plan || !passage.trim())) || state === "loading"} aria-busy={state === "loading" || undefined} onClick={() => {
            if (state === "playing") { audio.current?.pause(); setState("paused"); }
            else if (state === "paused" && audio.current) {
              const session = generation.current;
              void audio.current.play().then(() => {
                if (session === generation.current) setState("playing");
              }).catch(() => {
                if (session !== generation.current) return;
                setError("Couldn’t resume audio. Try again."); setState("idle"); setSettingsOpen(true);
              });
            } else {
              read(passage);
            }
          }} />}>
            <Icon aria-hidden="true" className={state === "loading" ? "animate-spin motion-reduce:animate-none" : undefined} />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Read-aloud settings" />}>
              <ChevronUp aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-80 overflow-y-auto" ref={panelRef} style={{ width: panelWidth, maxHeight: panelHeight, translate: `${panelShift}px ${panelShiftY}px` }}>
              <PopoverTitle>Listening settings</PopoverTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="read-aloud-voice">Voice</FieldLabel>
              <NativeSelect id="read-aloud-voice" value={voice} disabled={active} onChange={(event) => { setVoice(event.target.value); setState("idle"); setError(""); }}>
                {READ_ALOUD_VOICES.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="read-aloud-speed">Speed</FieldLabel>
              <NativeSelect id="read-aloud-speed" value={speed} onChange={(event) => {
                setSpeed(event.target.value); rate.current = Number(event.target.value);
                if (audio.current) audio.current.playbackRate = rate.current;
              }}>
                {[0.75, 1, 1.25, 1.5].map((value) => <NativeSelectOption key={value} value={String(value)}>{value}×</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">{passage.trim() ? `${passage.trim().length.toLocaleString()} characters · English voices` : "Select some text or write a draft to listen."}</p>
          <p className="text-sm text-muted-foreground">{!plan ? "Your allowance is unavailable. Reload the page to check it." : monthlyLimit === null ? "Unlimited read aloud with Pro. Fair-use rate limits apply." : `${monthlyLimit.toLocaleString()} characters per month with ${plan === "free" ? "Free" : "Plus"}.`} Replaying prepared audio in this window uses no extra allowance.</p>

              <p className="text-sm text-muted-foreground">Starting read aloud sends this passage to DeepInfra to make speech. Your draft stays editable.</p>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            </PopoverContent>
          </Popover>
      </ButtonGroup>
      {active ? <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Stop read aloud" onClick={stop} />}><Square aria-hidden="true" /></TooltipTrigger><TooltipContent>Stop read aloud</TooltipContent></Tooltip> : null}
    </div>
  );
}
