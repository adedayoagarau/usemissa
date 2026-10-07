"use client";
import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PART_KINDS,
  createItemId,
  type PortfolioCredit,
  type PortfolioPart,
  type PortfolioWork,
} from "@/lib/creator-portfolio-schema";
import {
  addressFromInput,
  workAddress,
  workAddressText,
} from "@/lib/creator-work-page";
import {
  AreaField,
  ItemList,
  MediaField,
  SelectField,
  TextField,
} from "./studio-editors";
import type { WorkFieldsProps } from "./work-fields";
import studio from "./profile-studio.module.css";
import styles from "./work-page-fields.module.css";

const KIND_LABEL: Record<PortfolioPart["kind"], string> = {
  text: "Text",
  image: "Image",
  audio: "Recording",
};

/** Whether the work already has anything on its page, so its group opens by itself. */
function hasPageContent(work: PortfolioWork) {
  return Boolean(
    work.slug ||
    work.about ||
    work.madeDuring ||
    work.supportedBy ||
    work.rights ||
    work.credits.length ||
    work.parts.length,
  );
}

function quoted(value: string) {
  return `“${value}”`;
}

/** Why the address is not the one asked for, in a sentence a person would say. */
function addressNote(
  address: ReturnType<typeof workAddress>,
  handle: string,
): string | undefined {
  const at = workAddressText(handle, address.slug);
  const other = address.otherTitle?.trim()
    ? quoted(address.otherTitle.trim())
    : "another work";
  if (address.note === "reserved")
    return `${quoted(address.requested)} is used by Missa, so this page is at ${at}. Choose another word to change it.`;
  if (address.note === "taken")
    return `${quoted(address.requested)} is already the address of ${other}, so this page is at ${at}. Choose another word to change it.`;
  if (address.note === "numbered")
    return `${other} already has this address, so this page is at ${at}. Choose your own to change it.`;
  return undefined;
}

function AddressField({
  work,
  works,
  handle,
  change,
}: Pick<WorkFieldsProps, "work" | "works" | "handle" | "change">) {
  // The field keeps what was typed ("my-"); the draft keeps the tidy address.
  const [text, setText] = useState(work.slug);
  const address = workAddress(work, works);
  const note = addressNote(address, handle);
  return (
    <div className={studio.field}>
      <TextField
        label="Page address"
        value={text}
        maxLength={60}
        placeholder={addressFromInput(work.title) || "your-title"}
        hint="Lower-case words and hyphens. Leave it blank to use the title."
        onChange={(value) => {
          setText(value);
          change({ slug: addressFromInput(value) });
        }}
      />
      {work.title.trim() ? (
        <p className={styles.address}>
          Page: <strong>{workAddressText(handle, address.slug)}</strong>
          {handle ? "" : " · your handle is set when you publish"}
        </p>
      ) : (
        <p className={styles.address}>
          Add a title to give this work a page. Untitled work stays private.
        </p>
      )}
      <div role="status">
        {note && (
          <p className={styles.note}>
            <Info aria-hidden="true" />
            <span>{note}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function CreditsEditor({
  work,
  change,
}: Pick<WorkFieldsProps, "work" | "change">) {
  return (
    <fieldset className={studio.group}>
      <legend>Credits</legend>
      <p className={studio.hint}>
        Who helped make it, and what they did. Shown on the work’s page.
      </p>
      <ItemList<PortfolioCredit>
        items={work.credits}
        onChange={(credits) => change({ credits })}
        noun="credit"
        max={12}
        addLabel="Add a credit"
        empty="No credits yet."
        titleOf={(credit) => credit.name}
        metaOf={(credit) => credit.role}
        create={() => ({
          id: createItemId("cr"),
          role: "",
          name: "",
          url: "",
        })}
      >
        {(credit, edit) => (
          <>
            <TextField
              label="Role"
              value={credit.role}
              maxLength={60}
              placeholder="Editor"
              onChange={(role) => edit({ role })}
            />
            <TextField
              label="Name"
              required
              value={credit.name}
              maxLength={100}
              placeholder="Mara Lind, The Quiet Review"
              onChange={(name) => edit({ name })}
            />
            <TextField
              label="Link"
              type="url"
              value={credit.url}
              placeholder="https://"
              hint="Where to read more about them, if there is a page."
              onChange={(url) => edit({ url })}
            />
          </>
        )}
      </ItemList>
    </fieldset>
  );
}

function PartsEditor({
  work,
  change,
  upload,
  onError,
}: Pick<WorkFieldsProps, "work" | "change" | "upload" | "onError">) {
  return (
    <fieldset className={studio.group}>
      <legend>Parts</legend>
      <p className={studio.hint}>
        Break a longer work into poems, plates and recordings. The page shows
        them in this order, with a contents list. Without parts, it shows the
        text, image and audio above.
      </p>
      <ItemList<PortfolioPart>
        items={work.parts}
        onChange={(parts) => change({ parts })}
        noun="part"
        max={60}
        addLabel="Add a part"
        empty="No parts yet."
        titleOf={(part) => part.title}
        metaOf={(part) => KIND_LABEL[part.kind]}
        create={() => ({
          id: createItemId("pt"),
          kind: "text",
          title: "",
          text: "",
          image: "",
          audio: "",
          caption: "",
        })}
      >
        {(part, edit) => (
          <>
            <SelectField
              label="What kind of part"
              value={part.kind}
              options={PART_KINDS.map((value) => ({
                value,
                label: KIND_LABEL[value],
              }))}
              onChange={(kind) => edit({ kind })}
            />
            <TextField
              label="Title"
              value={part.title}
              maxLength={200}
              hint="Shown above the part and in the contents list."
              onChange={(title) => edit({ title })}
            />
            {part.kind === "text" && (
              <>
                <AreaField
                  label="Text"
                  reading
                  rows={8}
                  value={part.text}
                  maxLength={20000}
                  hint="Line breaks are kept. A blank line starts a new stanza or paragraph."
                  onChange={(text) => edit({ text })}
                />
                <TextField
                  label="Note"
                  value={part.caption}
                  maxLength={300}
                  hint="A line under the text, such as where it was written."
                  onChange={(caption) => edit({ caption })}
                />
              </>
            )}
            {part.kind === "image" && (
              <>
                <MediaField
                  label="Image"
                  kind="image"
                  value={part.image}
                  upload={upload}
                  onError={onError}
                  onChange={(image) => edit({ image })}
                />
                {part.image && (
                  <TextField
                    label="Image description"
                    required
                    value={part.caption}
                    maxLength={300}
                    hint="Read by screen readers. Say what the picture shows."
                    onChange={(caption) => edit({ caption })}
                  />
                )}
              </>
            )}
            {part.kind === "audio" && (
              <>
                <MediaField
                  label="Recording"
                  kind="audio"
                  value={part.audio}
                  upload={upload}
                  onError={onError}
                  onChange={(audio) => edit({ audio })}
                />
                <TextField
                  label="Note"
                  value={part.caption}
                  maxLength={300}
                  hint="A line under the title, such as how it was made."
                  onChange={(caption) => edit({ caption })}
                />
              </>
            )}
          </>
        )}
      </ItemList>
    </fieldset>
  );
}

/**
 * What a work's own page says, in the work's row in the studio: its address,
 * the context and credits under the work, the rights line, and the parts a
 * longer work is made of. It sits in one disclosure so a poem's row stays short.
 */
export function WorkPageFields(props: WorkFieldsProps) {
  const { work, works, handle, change } = props;
  const address = workAddress(work, works);
  return (
    <Collapsible defaultOpen={hasPageContent(work)} className={styles.root}>
      <CollapsibleTrigger
        render={
          <Button
            type="button"
            variant="disclosure"
            className={cn(styles.trigger, "h-auto")}
          />
        }
      >
        <span className={styles.triggerText}>
          <span>Page for this work</span>
          <span className={styles.triggerHint}>
            {work.title.trim()
              ? workAddressText(handle, address.slug)
              : "Add a title to give it a page"}
          </span>
        </span>
        <ChevronDown aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className={styles.panel}>
        <AddressField
          work={work}
          works={works}
          handle={handle}
          change={change}
        />
        <AreaField
          label="About this work"
          rows={5}
          value={work.about}
          maxLength={2000}
          hint="How it was made and what it is about. A blank line starts a new paragraph."
          onChange={(about) => change({ about })}
        />
        <div className={styles.stack}>
          <TextField
            label="Made during"
            value={work.madeDuring}
            maxLength={120}
            placeholder="Saltmarsh Writers’ House residency"
            onChange={(madeDuring) => change({ madeDuring })}
          />
          <TextField
            label="Supported by"
            value={work.supportedBy}
            maxLength={120}
            placeholder="Coastline Arts Fund"
            onChange={(supportedBy) => change({ supportedBy })}
          />
        </div>
        <TextField
          label="Rights line"
          value={work.rights}
          maxLength={200}
          placeholder="© Your name 2026. Shared here for reading."
          hint="Shown at the foot of the page. Leave it blank to show “© your name, the year. Shared here for reading. For permissions, get in touch.”"
          onChange={(rights) => change({ rights })}
        />
        <CreditsEditor work={work} change={change} />
        <PartsEditor
          work={work}
          change={change}
          upload={props.upload}
          onError={props.onError}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
