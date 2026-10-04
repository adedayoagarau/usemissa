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
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
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
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FORM_LABELS,
  PRIZE_GROUPS,
  PRIZE_NAMES,
  PRIZE_WINNER_COUNT,
  WRITER_COUNT,
  WRITER_COUNTRY_OPTIONS,
  groupedWriters,
  prizeCounts,
  suggestedWriters,
  writerCountries,
  writerDetail,
  type WriterFilter,
  type WriterForm,
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
              Leave out magazines that refuse simultaneous submissions.
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
        <Field>
          <FieldLabel htmlFor={`${ids}-country`}>Where you’re from</FieldLabel>
          <NativeSelect
            id={`${ids}-country`}
            className={styles.select}
            value={brief.writerCountry}
            aria-describedby={`${ids}-country-help`}
            onChange={(event) => update({ writerCountry: event.target.value })}
          >
            <NativeSelectOption value="">Prefer not to say</NativeSelectOption>
            {WRITER_COUNTRY_OPTIONS.map((country) => (
              <NativeSelectOption key={country} value={country}>
                {country}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription
            id={`${ids}-country-help`}
            className={styles.helper}
          >
            Some prizes only take writers from certain countries. Missa uses
            this to show which prize routes are open to you.
          </FieldDescription>
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
 * Search or browse the writer catalogue, filtered by genre and country and
 * grouped by region; any other name can be typed and added. Suggestions for
 * the chosen form (and country, when one is picked) sit underneath.
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
  const [filter, setFilter] = useState<WriterFilter>({
    form: "all",
    country: "all",
    prize: "all",
  });
  const trimmed = query.trim();
  const countries = useMemo(
    () => writerCountries({ form: filter.form, prize: filter.prize }),
    [filter.form, filter.prize],
  );
  const winners = useMemo(() => prizeCounts(), []);
  // Offer the typed name as a custom entry only when no writer shown matches.
  const groups = useMemo(() => {
    const grouped = groupedWriters(filter);
    const needle = trimmed.toLocaleLowerCase();
    const listed = grouped.some((group) =>
      group.items.some((name) => name.toLocaleLowerCase().includes(needle)),
    );
    return trimmed.length > 1 && !listed
      ? [...grouped, { value: "Not listed", items: [trimmed] }]
      : grouped;
  }, [filter, trimmed]);
  const shown = groups.reduce((total, group) => total + group.items.length, 0);
  const suggestions = suggestedWriters(genre, {
    country: filter.country,
    prize: filter.prize,
  }).filter((name) => !value.includes(name));
  const full = value.length >= MAX_WRITERS;
  const formLabel =
    genre === "poetry"
      ? "poetry"
      : genre === "nonfiction"
        ? "nonfiction"
        : "fiction";

  return (
    <FieldSet className={styles.group}>
      <FieldLegend variant="label" className={styles.legend}>
        Comparable writers
      </FieldLegend>
      <FieldDescription className={styles.helper} id={`${id}-help`}>
        Magazines that published them rank higher. Search or browse{" "}
        {WRITER_COUNT} writers, including {PRIZE_WINNER_COUNT} prize winners, or
        type any name.
      </FieldDescription>
      <div className={styles.writerFilters}>
        <Field className={styles.writerFilter}>
          <FieldLabel htmlFor={`${id}-genre`} className={styles.filterLabel}>
            Genre
          </FieldLabel>
          <NativeSelect
            id={`${id}-genre`}
            size="sm"
            className={styles.filterSelect}
            value={filter.form}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                form: event.target.value as WriterFilter["form"],
              }))
            }
          >
            <NativeSelectOption value="all">All genres</NativeSelectOption>
            {(Object.keys(FORM_LABELS) as WriterForm[]).map((form) => (
              <NativeSelectOption key={form} value={form}>
                {FORM_LABELS[form]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className={styles.writerFilter}>
          <FieldLabel htmlFor={`${id}-country`} className={styles.filterLabel}>
            Country
          </FieldLabel>
          <NativeSelect
            id={`${id}-country`}
            size="sm"
            className={styles.filterSelect}
            value={filter.country}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                country: event.target.value,
              }))
            }
          >
            <NativeSelectOption value="all">All countries</NativeSelectOption>
            {countries.map(({ country, count }) => (
              <NativeSelectOption key={country} value={country}>
                {country} ({count})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className={styles.writerFilterWide}>
          <FieldLabel htmlFor={`${id}-prize`} className={styles.filterLabel}>
            Prize
          </FieldLabel>
          <NativeSelect
            id={`${id}-prize`}
            size="sm"
            className={styles.filterSelect}
            value={filter.prize}
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                prize: event.target.value,
                country: "all",
              }))
            }
          >
            <NativeSelectOption value="all">Any writer</NativeSelectOption>
            <NativeSelectOption value="any">
              Prize winners ({PRIZE_WINNER_COUNT})
            </NativeSelectOption>
            {PRIZE_GROUPS.map((group) => (
              <NativeSelectOptGroup key={group.label} label={group.label}>
                {group.prizes
                  .filter((prize) => winners.get(prize))
                  .map((prize) => (
                    <NativeSelectOption key={prize} value={prize}>
                      {PRIZE_NAMES[prize]} ({winners.get(prize)})
                    </NativeSelectOption>
                  ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Combobox
        multiple
        autoHighlight
        items={groups}
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
                        : `Search ${shown} writers`
                  }
                  disabled={full}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>
            No writer matches. Type at least two letters to add a name.
          </ComboboxEmpty>
          <ComboboxList className={styles.writerList}>
            {(group: { value: string; items: string[] }) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel className={styles.writerGroup}>
                  {group.value}
                </ComboboxLabel>
                <ComboboxCollection>
                  {(name: string) => {
                    const detail = writerDetail(name);
                    return (
                      <ComboboxItem
                        key={name}
                        value={name}
                        className={styles.writerOption}
                      >
                        <span>{detail ? name : `Add “${name}”`}</span>
                        {detail ? (
                          <span className={styles.writerForms}>{detail}</span>
                        ) : null}
                      </ComboboxItem>
                    );
                  }}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {suggestions.length && !full ? (
        <div className={styles.suggestions}>
          <p className={styles.suggestionsLabel}>
            Often named for {formLabel}
            {filter.country !== "all" ? ` · ${filter.country}` : ""}
            {filter.prize !== "all"
              ? ` · ${filter.prize === "any" ? "prize winners" : PRIZE_NAMES[filter.prize]}`
              : ""}
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
