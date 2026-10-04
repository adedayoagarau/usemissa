"use client";
/* eslint-disable @next/next/no-img-element -- Upload previews use owned media and local data URLs. */
import { useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  BadgeCheck,
  ArrowUp,
  ChevronDown,
  ImageUp,
  Music,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { PortfolioPublicationPicker } from "@/components/portfolio-publication-picker";
import { PortfolioLinkPreview } from "@/components/portfolio-link-preview";
import { ProvenanceBadge } from "@/components/missa/provenance-badge";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY_STATES,
  EVENT_STATUSES,
  PORTFOLIO_HEROES,
  PORTFOLIO_LENSES,
  PORTFOLIO_THEMES,
  RECORD_KINDS,
  SHELF_KINDS,
  createItemId,
  type PortfolioAvailability,
  type PortfolioData,
  type PortfolioEvent,
  type PortfolioPress,
  type PortfolioRecordItem,
  type PortfolioShelfItem,
  type PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import {
  EVENT_STATUS_COPY,
  LENSES,
  applyLensOrder,
  featuredWork,
} from "@/lib/creator-profile";
import type { StudioOutcome } from "./use-profile-draft";
import styles from "./profile-studio.module.css";

export type Update = (
  change: (current: PortfolioData) => PortfolioData,
) => void;
export type Upload = (file: File, kind: "image" | "audio") => Promise<string>;
type EditorProps = {
  draft: PortfolioData;
  update: Update;
  upload: Upload;
  onError: (message: string) => void;
};

/* ---------- Field building blocks ---------- */

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
  maxLength,
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {!required && <span className={styles.optional}> · optional</span>}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        autoComplete={autoComplete ?? "off"}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  hint,
  rows = 4,
  maxLength,
  reading = false,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  maxLength?: number;
  reading?: boolean;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {!required && <span className={styles.optional}> · optional</span>}
      </label>
      <div className={reading ? cn("font-heading", styles.reading) : undefined}>
        <Textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {(hint || maxLength) && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
          {maxLength && value.length > maxLength * 0.8
            ? ` ${maxLength - value.length} characters left.`
            : ""}
        </p>
      )}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <NativeSelect
        id={id}
        value={value}
        className={styles.select}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function MediaField({
  label,
  value,
  kind,
  hint,
  onChange,
  upload,
  onError,
}: {
  label: string;
  value: string;
  kind: "image" | "audio";
  hint?: string;
  onChange: (value: string) => void;
  upload: Upload;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const Icon = kind === "audio" ? Music : ImageUp;
  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {label}
        <span className={styles.optional}> · optional</span>
      </span>
      <div className={styles.media}>
        {value && kind === "image" && (
          <img src={value} alt="" className={styles.mediaPreview} />
        )}
        {value && kind === "audio" && (
          <audio controls src={value} className={styles.audioPreview}>
            Your browser can’t play this audio.
          </audio>
        )}
        <div className={styles.mediaActions}>
          <input
            ref={input}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label={label}
            accept={
              kind === "audio"
                ? "audio/*"
                : "image/jpeg,image/png,image/webp,image/gif"
            }
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                onChange(await upload(file, kind));
              } catch (error) {
                onError(
                  error instanceof Error
                    ? error.message
                    : "This file could not be added. Try another file.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Icon aria-hidden="true" />
            {busy
              ? "Uploading…"
              : value
                ? `Replace ${label.toLowerCase()}`
                : `Add ${label.toLowerCase()}`}
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
        <p className={styles.hint}>
          {hint ??
            (kind === "audio"
              ? "MP3, WAV, OGG, FLAC or M4A · up to 20 MB."
              : "JPG, PNG, WebP or GIF · up to 20 MB.")}
        </p>
      </div>
    </div>
  );
}

/** One editable list: compact rows, one open at a time, reorder, remove with undo. */
function ItemList<T extends { id?: string }>({
  items,
  onChange,
  noun,
  titleOf,
  metaOf,
  create,
  addLabel,
  empty,
  max,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  noun: string;
  titleOf: (item: T) => string;
  metaOf?: (item: T) => string;
  create: () => T;
  addLabel: string;
  empty: string;
  max: number;
  children: (item: T, change: (patch: Partial<T>) => void) => ReactNode;
}) {
  const [open, setOpen] = useState<string | undefined>();
  const [removed, setRemoved] = useState<{ item: T; index: number } | null>(
    null,
  );
  const keyOf = (item: T, index: number) => item.id ?? String(index);
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };
  return (
    <div className={styles.list}>
      {items.length === 0 && <p className={styles.emptyList}>{empty}</p>}
      <ol>
        {items.map((item, index) => {
          const key = keyOf(item, index);
          const title = titleOf(item).trim() || `Untitled ${noun}`;
          const expanded = open === key;
          return (
            <li
              key={key}
              className={cn(styles.item, expanded && styles.itemOpen)}
            >
              <div className={styles.itemRow}>
                <button
                  type="button"
                  className={styles.itemToggle}
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? undefined : key)}
                >
                  <span className={styles.itemTitle}>{title}</span>
                  {metaOf && (
                    <span className={styles.itemMeta}>{metaOf(item)}</span>
                  )}
                  <ChevronDown aria-hidden="true" className={styles.chevron} />
                </button>
                <span className={styles.itemTools}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    aria-label={`Move ${noun} ${index + 1} up`}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === items.length - 1}
                    aria-label={`Move ${noun} ${index + 1} down`}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${title}`}
                    onClick={() => {
                      setRemoved({ item, index });
                      onChange(items.filter((_, at) => at !== index));
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </span>
              </div>
              {expanded && (
                <div className={styles.itemBody}>
                  {children(item, (patch) =>
                    onChange(
                      items.map((entry, at) =>
                        at === index ? { ...entry, ...patch } : entry,
                      ),
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className={styles.doneButton}
                    onClick={() => setOpen(undefined)}
                  >
                    Done
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p role="status" className={styles.undo}>
        {removed && (
          <>
            Removed “{titleOf(removed.item).trim() || `Untitled ${noun}`}”.{" "}
            <button
              type="button"
              onClick={() => {
                const next = [...items];
                next.splice(removed.index, 0, removed.item);
                onChange(next);
                setRemoved(null);
              }}
            >
              Undo
            </button>
          </>
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={items.length >= max}
        onClick={() => {
          const item = create();
          onChange([...items, item]);
          setOpen(keyOf(item, items.length));
          setRemoved(null);
        }}
      >
        <Plus aria-hidden="true" />
        {items.length >= max ? `Limit of ${max} reached` : addLabel}
      </Button>
    </div>
  );
}

function EditorHead({ title, lead }: { title: string; lead: string }) {
  return (
    <div className={styles.editorHead}>
      <h2 className="font-heading" tabIndex={-1}>
        {title}
      </h2>
      <p>{lead}</p>
    </div>
  );
}

const set =
  (update: Update) =>
  <K extends keyof PortfolioData>(key: K) =>
  (value: PortfolioData[K]) =>
    update((current) => ({ ...current, [key]: value }));

/* ---------- Basics ---------- */

const PRACTICE_SUGGESTIONS = [
  "Poet",
  "Writer",
  "Visual artist",
  "Photographer",
  "Musician",
  "Composer",
  "Choreographer",
  "Filmmaker",
  "Designer",
  "Illustrator",
  "Performer",
];

export function BasicsEditor({ draft, update, upload, onError }: EditorProps) {
  const field = set(update);
  const [practice, setPractice] = useState("");
  const addPractice = (value: string) => {
    const clean = value.trim().slice(0, 80);
    if (!clean || draft.selected.includes(clean) || draft.selected.length >= 12)
      return;
    field("selected")([...draft.selected, clean]);
    setPractice("");
  };
  return (
    <>
      <EditorHead
        title="Basics"
        lead="Who you are, in the words visitors see first."
      />
      <TextField
        label="Name"
        required
        value={draft.name}
        maxLength={100}
        autoComplete="name"
        onChange={field("name")}
      />
      <MediaField
        label="Portrait"
        kind="image"
        value={draft.photo}
        upload={upload}
        onError={onError}
        hint="Shown beside your name. Without one, your initials appear."
        onChange={field("photo")}
      />
      <div className={styles.field}>
        <span className={styles.label} id="practices-label">
          How you describe your practice
        </span>
        <ul className={styles.tags} aria-labelledby="practices-label">
          {draft.selected.map((item) => (
            <li key={item}>
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() =>
                  field("selected")(
                    draft.selected.filter((entry) => entry !== item),
                  )
                }
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.inline}>
          <Input
            aria-label="Add a practice"
            placeholder="Add your own"
            value={practice}
            maxLength={80}
            onChange={(event) => setPractice(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPractice(practice);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addPractice(practice)}
          >
            Add
          </Button>
        </div>
        <div className={styles.suggestions}>
          {PRACTICE_SUGGESTIONS.filter(
            (item) => !draft.selected.includes(item),
          ).map((item) => (
            <button key={item} type="button" onClick={() => addPractice(item)}>
              <Plus aria-hidden="true" />
              {item}
            </button>
          ))}
        </div>
      </div>
      <TextField
        label="One-line statement"
        value={draft.statement}
        maxLength={200}
        placeholder="Poems, images and field recordings about how places carry memory."
        hint="Set in large italic under your name."
        onChange={field("statement")}
      />
      <TextField
        label="Location"
        value={draft.location}
        maxLength={80}
        placeholder="Lisbon, or Lagos / Lisbon"
        onChange={field("location")}
      />
      <AreaField
        label="Bio"
        value={draft.bio}
        rows={5}
        maxLength={600}
        hint="Shown in the About section."
        onChange={field("bio")}
      />
      <fieldset className={styles.group}>
        <legend>Now</legend>
        <p className={styles.hint}>
          One line on what you’re working on. It hides itself after the end
          date.
        </p>
        <TextField
          label="What you’re doing now"
          value={draft.now.text}
          maxLength={160}
          placeholder="In residence at Saltmarsh until November."
          onChange={(text) => field("now")({ ...draft.now, text })}
        />
        <TextField
          label="Show until"
          type="date"
          value={draft.now.until}
          onChange={(until) => field("now")({ ...draft.now, until })}
        />
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Open to</legend>
        <p className={styles.hint}>
          What you’ll say yes to. “From a date” switches itself on.
        </p>
        <ItemList<PortfolioAvailability>
          items={draft.openTo}
          onChange={field("openTo")}
          noun="item"
          max={8}
          addLabel="Add something you’re open to"
          empty="Nothing listed. Visitors won’t see this section."
          titleOf={(item) => item.label}
          metaOf={(item) =>
            item.state === "open"
              ? "Open"
              : item.state === "from"
                ? `From ${item.date || "a date"}`
                : `Booked${item.date ? ` until ${item.date}` : ""}`
          }
          create={() => ({
            id: createItemId("o"),
            label: "",
            state: "open",
            date: "",
          })}
        >
          {(item, change) => (
            <>
              <TextField
                label="Label"
                required
                value={item.label}
                maxLength={48}
                placeholder="Commissions"
                onChange={(label) => change({ label })}
              />
              <SelectField
                label="State"
                value={item.state}
                options={AVAILABILITY_STATES.map((value) => ({
                  value,
                  label:
                    value === "open"
                      ? "Open now"
                      : value === "from"
                        ? "Open from a date"
                        : "Booked until a date",
                }))}
                onChange={(state) => change({ state })}
              />
              {item.state !== "open" && (
                <TextField
                  label={item.state === "from" ? "Opens on" : "Booked until"}
                  type="date"
                  value={item.date}
                  onChange={(date) => change({ date })}
                />
              )}
            </>
          )}
        </ItemList>
      </fieldset>
    </>
  );
}

/* ---------- Appearance ---------- */

const THEME_LABELS: Record<PortfolioData["theme"], string> = {
  sage: "Sage",
  paper: "Paper",
  mineral: "Mineral",
  night: "After hours",
};
const HERO_COPY: Record<
  PortfolioData["hero"],
  { label: string; lead: string }
> = {
  portrait: {
    label: "Portrait",
    lead: "Your photo, with the featured work beside it.",
  },
  plate: {
    label: "Image",
    lead: "The featured image fills the top of the page.",
  },
  type: { label: "Type only", lead: "Your name, set large. No images needed." },
};

export function AppearanceEditor({
  draft,
  update,
}: Omit<EditorProps, "upload" | "onError">) {
  const plateReady = Boolean(
    featuredWork(draft.works.filter((w) => w.title.trim()))?.image,
  );
  return (
    <>
      <EditorHead
        title="Appearance"
        lead="Choose what leads. Colour and type stay on the Missa system, so every choice reads well."
      />
      <fieldset className={styles.group}>
        <legend>Craft lens</legend>
        <div
          className={styles.choiceGrid}
          role="radiogroup"
          aria-label="Craft lens"
        >
          {PORTFOLIO_LENSES.map((lens) => (
            <button
              key={lens}
              type="button"
              role="radio"
              aria-checked={draft.lens === lens}
              className={styles.choice}
              onClick={() => update((current) => ({ ...current, lens }))}
            >
              <span className={styles.choiceTitle}>{LENSES[lens].label}</span>
              <span className={styles.choiceLead}>{LENSES[lens].lead}</span>
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            update((current) => ({
              ...current,
              modules: applyLensOrder(current.modules, current.lens),
            }))
          }
        >
          Order sections for {LENSES[draft.lens].label.toLowerCase()}
        </Button>
        <p className={styles.hint}>Keeps any sections you’ve hidden hidden.</p>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Theme</legend>
        <div className={styles.themes} role="radiogroup" aria-label="Theme">
          {PORTFOLIO_THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              role="radio"
              aria-checked={draft.theme === theme}
              className={styles.theme}
              onClick={() => update((current) => ({ ...current, theme }))}
            >
              <span
                data-creator-theme={theme}
                className={cn(styles.swatch, "font-heading")}
              >
                Aa
              </span>
              {THEME_LABELS[theme]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Top of the page</legend>
        <div
          className={styles.choiceGrid}
          role="radiogroup"
          aria-label="Top of the page"
        >
          {PORTFOLIO_HEROES.map((hero) => (
            <button
              key={hero}
              type="button"
              role="radio"
              aria-checked={draft.hero === hero}
              className={styles.choice}
              onClick={() => update((current) => ({ ...current, hero }))}
            >
              <span className={styles.choiceTitle}>
                {HERO_COPY[hero].label}
              </span>
              <span className={styles.choiceLead}>{HERO_COPY[hero].lead}</span>
            </button>
          ))}
        </div>
        {draft.hero === "plate" && !plateReady && (
          <p className={styles.notice}>
            Feature a work with an image to use this. Until then, visitors see
            the type-only top.
          </p>
        )}
      </fieldset>
    </>
  );
}

/* ---------- Work ---------- */

export function WorkEditor({ draft, update, upload, onError }: EditorProps) {
  const field = set(update);
  return (
    <>
      <EditorHead
        title="Selected work"
        lead="Add writing, images, sound or a link — or combine them. Untitled work stays private."
      />
      <ItemList<PortfolioWork>
        items={draft.works}
        onChange={field("works")}
        noun="work"
        max={50}
        addLabel="Add work"
        empty="No work yet. Add a poem, a series, a recording or a link."
        titleOf={(work) => work.title}
        metaOf={(work) =>
          [work.featured ? "Featured" : "", work.kind, work.year]
            .filter(Boolean)
            .join(" · ")
        }
        create={() => ({
          id: createItemId("w"),
          title: "",
          text: "",
          url: "",
          image: "",
          audio: "",
          formats: [],
          kind: "",
          year: "",
          summary: "",
          caption: "",
          featured: draft.works.length === 0,
        })}
      >
        {(work, change) => (
          <>
            <TextField
              label="Title"
              required
              value={work.title}
              maxLength={200}
              onChange={(title) => change({ title })}
            />
            <div className={styles.pair}>
              <TextField
                label="Kind"
                value={work.kind}
                maxLength={60}
                placeholder="Poem, series, album…"
                onChange={(kind) => change({ kind })}
              />
              <TextField
                label="Year"
                value={work.year}
                maxLength={4}
                placeholder="2026"
                onChange={(year) => change({ year: year.replace(/\D/g, "") })}
              />
            </div>
            <div className={styles.switchRow}>
              <Switch
                checked={work.featured}
                aria-label="Feature this work"
                onCheckedChange={(featured) =>
                  update((current) => ({
                    ...current,
                    works: current.works.map((entry) => ({
                      ...entry,
                      featured:
                        entry.id === work.id
                          ? featured
                          : featured
                            ? false
                            : entry.featured,
                    })),
                  }))
                }
              />
              <span>
                <Star aria-hidden="true" /> Feature this work at the top of your
                profile
              </span>
            </div>
            <TextField
              label="One-line description"
              value={work.summary}
              maxLength={300}
              onChange={(summary) => change({ summary })}
            />
            <AreaField
              label="Text"
              reading
              rows={8}
              value={work.text}
              maxLength={20000}
              hint="Line breaks are kept exactly. The first lines appear on your profile."
              onChange={(text) => change({ text })}
            />
            <MediaField
              label="Image"
              kind="image"
              value={work.image}
              upload={upload}
              onError={onError}
              onChange={(image) => change({ image })}
            />
            {work.image && (
              <TextField
                label="Image description"
                required
                value={work.caption}
                maxLength={300}
                hint="Read by screen readers, and shown as the caption in the visual lens — medium, size, year."
                onChange={(caption) => change({ caption })}
              />
            )}
            <MediaField
              label="Audio"
              kind="audio"
              value={work.audio}
              upload={upload}
              onError={onError}
              onChange={(audio) => change({ audio })}
            />
            <TextField
              label="Link"
              type="url"
              value={work.url}
              placeholder="https://"
              hint="Where the full work lives, if it’s elsewhere."
              onChange={(url) => change({ url })}
            />
            {work.url && (
              <PortfolioLinkPreview url={work.url} title={work.title} />
            )}
          </>
        )}
      </ItemList>
    </>
  );
}

/* ---------- Upcoming ---------- */

export function EventsEditor({
  draft,
  update,
}: Omit<EditorProps, "upload" | "onError">) {
  return (
    <>
      <EditorHead
        title="Upcoming"
        lead="Readings, shows, premieres and screenings. Past dates hide themselves."
      />
      <ItemList<PortfolioEvent>
        items={draft.events}
        onChange={(events) => update((current) => ({ ...current, events }))}
        noun="event"
        max={24}
        addLabel="Add event"
        empty="No dates yet."
        titleOf={(event) => event.title}
        metaOf={(event) =>
          [event.date, event.place].filter(Boolean).join(" · ")
        }
        create={() => ({
          id: createItemId("e"),
          kind: "",
          title: "",
          date: "",
          time: "",
          place: "",
          url: "",
          status: "open",
        })}
      >
        {(event, change) => (
          <>
            <TextField
              label="Title"
              required
              value={event.title}
              maxLength={200}
              onChange={(title) => change({ title })}
            />
            <TextField
              label="Kind"
              value={event.kind}
              maxLength={40}
              placeholder="Reading, exhibition, premiere…"
              onChange={(kind) => change({ kind })}
            />
            <div className={styles.pair}>
              <TextField
                label="Date"
                required
                type="date"
                value={event.date}
                onChange={(date) => change({ date })}
              />
              <TextField
                label="Start time"
                type="time"
                value={event.time}
                onChange={(time) => change({ time })}
              />
            </div>
            <TextField
              label="Place"
              value={event.place}
              maxLength={200}
              placeholder="Venue, city — or Online"
              onChange={(place) => change({ place })}
            />
            <SelectField
              label="Booking"
              value={event.status}
              options={EVENT_STATUSES.map((value) => ({
                value,
                label: EVENT_STATUS_COPY[value],
              }))}
              onChange={(status) => change({ status })}
            />
            <TextField
              label="Booking or details link"
              type="url"
              value={event.url}
              placeholder="https://"
              onChange={(url) => change({ url })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

/* ---------- Shelf ---------- */

export function ShelfEditor({ draft, update, upload, onError }: EditorProps) {
  return (
    <>
      <EditorHead
        title="Shelf"
        lead="Books, records, chapbooks and catalogues — shown as objects."
      />
      <ItemList<PortfolioShelfItem>
        items={draft.shelf}
        onChange={(shelf) => update((current) => ({ ...current, shelf }))}
        noun="item"
        max={24}
        addLabel="Add to shelf"
        empty="Nothing on your shelf yet."
        titleOf={(item) => item.title}
        metaOf={(item) =>
          [item.publisher, item.year].filter(Boolean).join(" · ")
        }
        create={() => ({
          id: createItemId("s"),
          kind: "book",
          title: "",
          publisher: "",
          year: "",
          cover: "",
          url: "",
          note: "",
        })}
      >
        {(item, change) => (
          <>
            <SelectField
              label="Kind"
              value={item.kind}
              options={SHELF_KINDS.map((value) => ({
                value,
                label: {
                  book: "Book",
                  chapbook: "Chapbook",
                  record: "Record or album",
                  catalogue: "Catalogue",
                  other: "Other edition",
                }[value],
              }))}
              onChange={(kind) => change({ kind })}
            />
            <TextField
              label="Title"
              required
              value={item.title}
              maxLength={200}
              onChange={(title) => change({ title })}
            />
            <div className={styles.pair}>
              <TextField
                label="Publisher or label"
                value={item.publisher}
                maxLength={200}
                onChange={(publisher) => change({ publisher })}
              />
              <TextField
                label="Year"
                value={item.year}
                maxLength={4}
                onChange={(year) => change({ year: year.replace(/\D/g, "") })}
              />
            </div>
            <MediaField
              label="Cover"
              kind="image"
              value={item.cover}
              upload={upload}
              onError={onError}
              hint="Without a cover, a typeset cover is made for you."
              onChange={(cover) => change({ cover })}
            />
            <TextField
              label="Note"
              value={item.note}
              maxLength={140}
              placeholder="Edition of 200. Out of print."
              onChange={(note) => change({ note })}
            />
            <TextField
              label="Where to find it"
              type="url"
              value={item.url}
              placeholder="https://"
              onChange={(url) => change({ url })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

/* ---------- Track record ---------- */

const RECORD_LABELS: Record<PortfolioRecordItem["kind"], string> = {
  publication: "Publication",
  prize: "Prize or shortlist",
  residency: "Residency",
  grant: "Grant or fellowship",
  exhibition: "Exhibition",
  performance: "Performance",
  screening: "Screening",
  other: "Other",
};

export function RecordEditor({
  draft,
  update,
  outcomes,
  confirmedIds,
  isAccount,
}: Omit<EditorProps, "upload" | "onError"> & {
  outcomes: StudioOutcome[];
  confirmedIds: ReadonlyMap<string, unknown>;
  isAccount: boolean;
}) {
  const creator = draft.name.trim().split(/\s+/)[0] || "you";
  const added = new Set(
    draft.record.map((entry) => entry.outcomeId).filter(Boolean),
  );
  const available = outcomes.filter((item) => !added.has(item.outcomeId));
  const provenanceOf = (item: PortfolioRecordItem) =>
    item.outcomeId && confirmedIds.has(item.outcomeId)
      ? "confirmed"
      : item.organization
        ? "linked"
        : "added";
  return (
    <>
      <EditorHead
        title="Track record"
        lead="Publications, prizes, residencies and shows. Link each to the Missa directory so visitors can see who published or awarded it."
      />
      <section className={styles.outcomes} aria-labelledby="outcomes-title">
        <h3 id="outcomes-title">
          <BadgeCheck aria-hidden="true" />
          From your Missa acceptances
        </h3>
        {available.length > 0 ? (
          <ul>
            {available.map((item) => (
              <li key={item.outcomeId}>
                <span>
                  <strong>{item.workTitle}</strong>
                  <span className={styles.hint}>
                    {item.organizationName} · {item.callTitle} ·{" "}
                    {item.decidedAt.slice(0, 4)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update((current) => ({
                      ...current,
                      record: [
                        {
                          id: createItemId("r"),
                          kind: "publication",
                          title: item.workTitle,
                          venue: item.organizationName,
                          year: item.decidedAt.slice(0, 4),
                          url: "",
                          outcomeId: item.outcomeId,
                          provenance: "confirmed",
                        },
                        ...current.record,
                      ],
                    }))
                  }
                >
                  Add as confirmed
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>
            {outcomes.length
              ? "All your Missa acceptances are already on your track record."
              : isAccount
                ? "When an organization accepts work you submitted through Missa, it appears here and can be added as Confirmed."
                : "Signed-in creators see their Missa acceptances here."}
          </p>
        )}
      </section>
      <ItemList<PortfolioRecordItem>
        items={draft.record}
        onChange={(record) => update((current) => ({ ...current, record }))}
        noun="entry"
        max={80}
        addLabel="Add entry"
        empty="No entries yet."
        titleOf={(item) => item.title}
        metaOf={(item) =>
          [
            item.year,
            item.organization?.name || item.venue,
            { confirmed: "Confirmed", linked: "Linked", added: "Added by you" }[
              provenanceOf(item)
            ],
          ]
            .filter(Boolean)
            .join(" · ")
        }
        create={() => ({
          id: createItemId("r"),
          kind: "publication",
          title: "",
          venue: "",
          year: "",
          url: "",
          provenance: "added",
        })}
      >
        {(item, change) => (
          <>
            <SelectField
              label="Kind"
              value={item.kind}
              options={RECORD_KINDS.map((value) => ({
                value,
                label: RECORD_LABELS[value],
              }))}
              onChange={(kind) => change({ kind })}
            />
            {provenanceOf(item) === "confirmed" ? (
              <p className={styles.lockedTitle}>
                <strong>{item.title}</strong>
                <span className={styles.hint}>
                  Wording comes from the organization’s decision, so it can’t be
                  edited.
                </span>
              </p>
            ) : (
              <TextField
                label="What it was"
                required
                value={item.title}
                maxLength={200}
                placeholder="“Tidal glossary”, Issue 14"
                onChange={(title) => change({ title })}
              />
            )}
            {item.outcomeId ? (
              <p className={styles.hint}>
                Recorded by {item.venue} on Missa. The organization can’t be
                changed for a confirmed entry.
              </p>
            ) : (
              <PortfolioPublicationPicker
                name={item.venue}
                organization={item.organization}
                onChange={(venue, organization) =>
                  change({ venue, organization })
                }
              />
            )}
            <TextField
              label="Year"
              value={item.year}
              maxLength={4}
              onChange={(year) => change({ year: year.replace(/\D/g, "") })}
            />
            <TextField
              label="Link"
              type="url"
              value={item.url}
              placeholder="https://"
              onChange={(url) => change({ url })}
            />
            <div className={styles.provenance}>
              <span>Visitors will see</span>
              <ProvenanceBadge
                provenance={provenanceOf(item)}
                creator={creator}
                organization={item.organization?.name || item.venue}
              />
              <p className={styles.hint}>
                {provenanceOf(item) === "confirmed"
                  ? "The organization recorded this acceptance on Missa."
                  : "Only acceptances recorded on Missa can be confirmed. You can’t mark your own."}
              </p>
            </div>
          </>
        )}
      </ItemList>
    </>
  );
}

/* ---------- Press ---------- */

export function PressEditor({
  draft,
  update,
}: Omit<EditorProps, "upload" | "onError">) {
  return (
    <>
      <EditorHead
        title="Press"
        lead="Short quotes from reviews and editors. Each quote needs a link to its source."
      />
      <ItemList<PortfolioPress>
        items={draft.press}
        onChange={(press) => update((current) => ({ ...current, press }))}
        noun="quote"
        max={12}
        addLabel="Add quote"
        empty="No quotes yet."
        titleOf={(item) => item.quote}
        metaOf={(item) => item.source}
        create={() => ({
          id: createItemId("p"),
          quote: "",
          source: "",
          url: "",
        })}
      >
        {(item, change) => (
          <>
            <AreaField
              label="Quote"
              required
              rows={3}
              value={item.quote}
              maxLength={320}
              onChange={(quote) => change({ quote })}
            />
            <TextField
              label="Source"
              required
              value={item.source}
              maxLength={160}
              placeholder="Review, Coastline Quarterly"
              onChange={(source) => change({ source })}
            />
            <TextField
              label="Source link"
              required
              type="url"
              value={item.url}
              placeholder="https://"
              onChange={(url) => change({ url })}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

/* ---------- About and contact ---------- */

export function ContactEditor({
  draft,
  update,
}: Omit<EditorProps, "upload" | "onError">) {
  const contact = (key: keyof PortfolioData["contact"]) => (value: string) =>
    update((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }));
  return (
    <>
      <EditorHead
        title="About and contact"
        lead="Your bio is edited in Basics. Choose how people can reach you; everything here is public once you publish."
      />
      <TextField
        label="Public email"
        type="email"
        value={draft.contact.email}
        autoComplete="email"
        hint="Shown as an Email button. Your sign-in email is never shared."
        onChange={contact("email")}
      />
      <TextField
        label="Website"
        type="url"
        value={draft.contact.website}
        placeholder="https://"
        onChange={contact("website")}
      />
      <TextField
        label="Instagram"
        type="url"
        value={draft.contact.instagram}
        placeholder="https://instagram.com/…"
        onChange={contact("instagram")}
      />
      <TextField
        label="Newsletter"
        type="url"
        value={draft.contact.newsletter}
        placeholder="https://"
        onChange={contact("newsletter")}
      />
    </>
  );
}
