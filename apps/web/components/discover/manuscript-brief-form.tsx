"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { FilterChip } from "@/components/missa/filter-chip";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  WRITER_NAMES,
  suggestedWriters,
  writerFormsLabel,
} from "./comparable-writers";
import {
  FORMS,
  POEMS,
  WORDS,
  clamp,
  styleOptions,
  type ManuscriptBrief,
} from "./manuscript-match-brief";
import styles from "./manuscript-match-wizard.module.css";

const MAX_WRITERS = 8;

function toggled(list: string[], value: string, on: boolean) {
  return on ? [...list, value] : list.filter((item) => item !== value);
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

/**
 * The brief. Rendered in the side panel from 1024px and inside a sheet below
 * it; only one copy is ever visible, so each keeps its own ids.
 */
export function BriefForm({
  brief,
  update,
  isPending,
  onSubmit,
  inSheet = false,
}: {
  brief: ManuscriptBrief;
  update: (patch: Partial<ManuscriptBrief>) => void;
  isPending: boolean;
  onSubmit: (event: React.FormEvent) => void;
  inSheet?: boolean;
}) {
  const ids = useId();
  const [lengthDraft, setLengthDraft] = useState<string | null>(null);
  const poetry = brief.genre === "poetry";
  const lengthRange = poetry ? POEMS : WORDS;
  const lengthValue = poetry ? brief.poemCount : brief.wordCount;
  const lengthUnit = poetry
    ? brief.poemCount === 1
      ? "poem"
      : "poems"
    : "words";
  const setLength = (value: number) =>
    update(
      poetry
        ? { poemCount: clamp(value, POEMS) }
        : { wordCount: clamp(value, WORDS) },
    );

  return (
    <form
      className={styles.brief}
      data-in-sheet={inSheet || undefined}
      onSubmit={onSubmit}
      aria-labelledby={`${ids}-brief`}
    >
      <h2 id={`${ids}-brief`} className={styles.briefTitle}>
        Your piece
      </h2>

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Form
        </FieldLegend>
        <RadioGroup
          className={styles.segments}
          value={brief.genre}
          onValueChange={(value) =>
            update({ genre: value as ManuscriptBrief["genre"] })
          }
        >
          {FORMS.map((form) => (
            <label key={form.value} className={styles.segment}>
              <RadioGroupItem
                value={form.value}
                className={styles.segmentRadio}
              />
              {form.label}
            </label>
          ))}
        </RadioGroup>
      </FieldSet>

      <Field className={styles.group}>
        <FieldLabel
          id={`${ids}-length-label`}
          htmlFor={`${ids}-length`}
          className={styles.legend}
        >
          {poetry ? "Poems in the packet" : "Length"}
        </FieldLabel>
        <InputGroup className={styles.lengthInput}>
          <InputGroupInput
            id={`${ids}-length`}
            type="number"
            inputMode="numeric"
            min={lengthRange.min}
            max={lengthRange.max}
            value={lengthDraft ?? String(lengthValue)}
            onChange={(event) => {
              setLengthDraft(event.target.value);
              const next = Number(event.target.value);
              if (event.target.value && Number.isFinite(next)) setLength(next);
            }}
            onBlur={() => setLengthDraft(null)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{lengthUnit}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Slider
          className={styles.slider}
          min={lengthRange.sliderMin}
          max={lengthRange.sliderMax}
          step={lengthRange.step}
          value={[lengthValue]}
          onValueChange={(value) => {
            setLengthDraft(null);
            setLength(Array.isArray(value) ? value[0] : value);
          }}
          aria-labelledby={`${ids}-length-label`}
        />
        {poetry ? null : (
          <WordCounter
            onUse={(count) => {
              setLengthDraft(null);
              setLength(count);
            }}
          />
        )}
      </Field>

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Style
        </FieldLegend>
        <FieldDescription className={styles.helper}>
          Pick any that describe the piece.
        </FieldDescription>
        <div className={styles.chips}>
          {styleOptions(brief.genre, brief.aestheticTags).map((style) => (
            <FilterChip
              key={style.value}
              selected={brief.aestheticTags.includes(style.value)}
              onSelectedChange={(on) =>
                update({
                  aestheticTags: toggled(brief.aestheticTags, style.value, on),
                })
              }
            >
              {style.label}
            </FilterChip>
          ))}
        </div>
      </FieldSet>

      <WriterPicker
        genre={brief.genre}
        value={brief.compAuthors}
        onChange={(compAuthors) => update({ compAuthors })}
      />

      <FieldSet className={styles.group}>
        <FieldLegend variant="label" className={styles.legend}>
          Preferences
        </FieldLegend>
        <Field orientation="horizontal" className={styles.switchRow}>
          <FieldContent>
            <FieldLabel htmlFor={`${ids}-debut`}>First publication</FieldLabel>
            <FieldDescription className={styles.helper}>
              Favour magazines that publish new writers.
            </FieldDescription>
          </FieldContent>
          <Switch
            id={`${ids}-debut`}
            checked={brief.isDebutAuthor}
            onCheckedChange={(checked) => update({ isDebutAuthor: checked })}
          />
        </Field>
        <Field orientation="horizontal" className={styles.switchRow}>
          <FieldContent>
            <FieldLabel htmlFor={`${ids}-simultaneous`}>
              Sending it to several magazines
            </FieldLabel>
            <FieldDescription className={styles.helper}>
              Rank down magazines that refuse simultaneous submissions.
            </FieldDescription>
          </FieldContent>
          <Switch
            id={`${ids}-simultaneous`}
            checked={brief.allowSimultaneous}
            onCheckedChange={(checked) =>
              update({ allowSimultaneous: checked })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${ids}-fee`}>Submission fees</FieldLabel>
          <NativeSelect
            id={`${ids}-fee`}
            className={styles.select}
            value={brief.feeTolerance}
            onChange={(event) =>
              update({
                feeTolerance: event.target
                  .value as ManuscriptBrief["feeTolerance"],
              })
            }
          >
            <NativeSelectOption value="free_only">
              Free, or a fee waiver
            </NativeSelectOption>
            <NativeSelectOption value="fee_ok_with_waivers">
              Fees are fine with a waiver option
            </NativeSelectOption>
            <NativeSelectOption value="any">Any fee</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${ids}-pay`}>Payment</FieldLabel>
          <NativeSelect
            id={`${ids}-pay`}
            className={styles.select}
            value={brief.minPayRate}
            onChange={(event) =>
              update({
                minPayRate: event.target.value as ManuscriptBrief["minPayRate"],
              })
            }
          >
            <NativeSelectOption value="all">Paid or unpaid</NativeSelectOption>
            <NativeSelectOption value="any_paying">
              Paying magazines
            </NativeSelectOption>
            <NativeSelectOption value="pro_rates_only">
              Professional rates (8¢ a word or more)
            </NativeSelectOption>
          </NativeSelect>
        </Field>
      </FieldSet>

      <div className={styles.submit}>
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? <Spinner aria-hidden="true" /> : null}
          {isPending ? "Finding magazines…" : "Find magazines"}
        </Button>
      </div>
    </form>
  );
}

/** Paste a draft to count its words; the text never leaves the browser. */
function WordCounter({ onUse }: { onUse: (count: number) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const count = countWords(text);
  return (
    <Collapsible className={styles.counter} open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant="link"
            className={styles.counterTrigger}
          />
        }
      >
        Count the words in your draft
        <ChevronDown aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.counterPanel}>
        <Field>
          <FieldLabel htmlFor={id}>Paste your draft</FieldLabel>
          <Textarea
            id={id}
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className={styles.counterText}
          />
          <FieldDescription className={styles.helper}>
            Counted in your browser. Missa doesn&apos;t send or keep the text.
          </FieldDescription>
        </Field>
        <div className={styles.counterResult}>
          <p aria-live="polite">
            <data value={count} className="font-mono">
              {count.toLocaleString()}
            </data>{" "}
            {count === 1 ? "word" : "words"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={count === 0}
            onClick={() => {
              onUse(count);
              setOpen(false);
            }}
          >
            Use this length
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Search the writer catalogue, or type any name and add it. Suggestions for
 * the chosen form sit underneath for one-tap adding.
 */
function WriterPicker({
  genre,
  value,
  onChange,
}: {
  genre: ManuscriptBrief["genre"];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const id = useId();
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  // Offer the typed name as a custom entry only when nothing listed matches.
  const items = useMemo(() => {
    const needle = trimmed.toLocaleLowerCase();
    const listed = WRITER_NAMES.some((name) =>
      name.toLocaleLowerCase().includes(needle),
    );
    return trimmed.length > 1 && !listed
      ? [...WRITER_NAMES, trimmed]
      : WRITER_NAMES;
  }, [trimmed]);
  const suggestions = suggestedWriters(genre).filter(
    (name) => !value.includes(name),
  );
  const full = value.length >= MAX_WRITERS;

  return (
    <FieldSet className={styles.group}>
      <FieldLegend variant="label" className={styles.legend}>
        Comparable writers
      </FieldLegend>
      <FieldDescription className={styles.helper} id={`${id}-help`}>
        Magazines that publish similar work rank higher. Search{" "}
        {WRITER_NAMES.length} writers or type any name.
      </FieldDescription>
      <Combobox
        multiple
        autoHighlight
        items={items}
        limit={40}
        value={value}
        onValueChange={(next) => {
          onChange((next as string[]).slice(0, MAX_WRITERS));
          setQuery("");
        }}
        inputValue={query}
        onInputValueChange={setQuery}
      >
        <ComboboxChips ref={anchor} className={styles.writerChips}>
          <ComboboxValue>
            {(selected: string[]) => (
              <>
                {selected.map((name) => (
                  <ComboboxChip
                    key={name}
                    className={styles.writerChip}
                    removeLabel={`Remove ${name}`}
                  >
                    {name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  aria-label="Search writers"
                  aria-describedby={`${id}-help`}
                  placeholder={
                    full
                      ? `Up to ${MAX_WRITERS} writers`
                      : selected.length
                        ? "Add another"
                        : "Search writers"
                  }
                  disabled={full}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>
            Type at least two letters to add a name.
          </ComboboxEmpty>
          <ComboboxList>
            {(name: string) => {
              const forms = writerFormsLabel(name);
              return (
                <ComboboxItem
                  key={name}
                  value={name}
                  className={styles.writerOption}
                >
                  <span>{forms ? name : `Add “${name}”`}</span>
                  {forms ? (
                    <span className={styles.writerForms}>{forms}</span>
                  ) : null}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {suggestions.length && !full ? (
        <div className={styles.suggestions}>
          <p className={styles.suggestionsLabel}>
            Often named for{" "}
            {genre === "poetry"
              ? "poetry"
              : genre === "nonfiction"
                ? "nonfiction"
                : "fiction"}
          </p>
          <div className={styles.chips}>
            {suggestions.slice(0, 6).map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                size="sm"
                className={styles.suggestion}
                aria-label={`Add ${name}`}
                onClick={() => onChange([...value, name])}
              >
                <Plus aria-hidden="true" />
                {name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </FieldSet>
  );
}
