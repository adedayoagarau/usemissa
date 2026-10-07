"use client";
import { useId, useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { CollaborationBadge } from "@/components/missa/collaboration-badge";
import {
  createItemId,
  type PortfolioCollaborator,
} from "@/lib/creator-portfolio-schema";
import {
  MAX_COLLABORATOR_LOOKUPS,
  SELF_CREDIT_MESSAGE,
  collaboratorHandleKey,
  duplicateCreditMessage,
} from "@/lib/portfolio-collaborators";
import { ItemList, TextField, set } from "../studio-editors";
import studio from "../profile-studio.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";
import styles from "./collaborators-editor.module.css";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** The handle field: checks as you type and never lets a bad value into the draft. */
function HandleField({
  value,
  ownKeys,
  takenKeys,
  onCommit,
}: {
  value: string;
  ownKeys: readonly string[];
  takenKeys: ReadonlySet<string>;
  onCommit: (handle: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [touched, setTouched] = useState(false);
  const key = collaboratorHandleKey(text);
  const message = !text.trim()
    ? undefined
    : !key
      ? touched
        ? "Use their Missa handle, like @tonioliver."
        : undefined
      : ownKeys.includes(key)
        ? SELF_CREDIT_MESSAGE
        : takenKeys.has(key)
          ? duplicateCreditMessage(key)
          : undefined;
  const change = (next: string) => {
    setText(next);
    const nextKey = collaboratorHandleKey(next);
    const accepted =
      nextKey && !ownKeys.includes(nextKey) && !takenKeys.has(nextKey)
        ? nextKey
        : "";
    // Only a handle that can be saved reaches the draft.
    if (accepted !== value) onCommit(accepted);
  };
  return (
    <div className={studio.field}>
      <label htmlFor={id}>Missa handle</label>
      <InputGroup className="h-11">
        <InputGroupAddon>
          <InputGroupText>@</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={text}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tonioliver"
          aria-invalid={message ? true : undefined}
          aria-describedby={`${id}-note`}
          onChange={(event) => change(event.target.value)}
          onBlur={() => {
            setTouched(true);
            if (key && !message) setText(key);
          }}
        />
      </InputGroup>
      {message ? (
        <FieldError id={`${id}-note`}>{message}</FieldError>
      ) : (
        <p id={`${id}-note`} className={studio.hint}>
          {key
            ? `Their profile is usemissa.com/@${key}.`
            : "The end of their profile address, usemissa.com/@handle."}
        </p>
      )}
    </div>
  );
}

type Standing =
  | { kind: "empty" }
  | { kind: "device"; confirmed: boolean }
  | { kind: "checking" }
  | { kind: "error"; message: string }
  | {
      kind: "confirmed" | "waiting" | "not-published";
      name?: string;
    };

/** Where one credit stands, in words, with the mark a visitor would see. */
function CreditStatus({
  item,
  standing,
  creator,
  onRetry,
}: {
  item: PortfolioCollaborator;
  standing: Standing;
  creator: string;
  onRetry: () => void;
}) {
  const person = item.name.trim() || `@${item.handle}`;
  const handle = `@${item.handle}`;
  if (standing.kind === "empty") return null;
  if (standing.kind === "checking")
    return (
      <p className={styles.status} role="status">
        <Spinner aria-hidden="true" />
        Checking whether {handle} credits you back…
      </p>
    );
  if (standing.kind === "error")
    return (
      <div className={styles.status}>
        <AlertCircle aria-hidden="true" className={styles.statusIcon} />
        <p role="alert">{standing.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  const confirmed =
    standing.kind === "confirmed" ||
    (standing.kind === "device" && standing.confirmed);
  const text =
    standing.kind === "device"
      ? confirmed
        ? "Shown on this example profile."
        : "Confirmation needs an account. Once you publish, ask them to credit you back."
      : standing.kind === "confirmed"
        ? `${standing.name ?? handle} credits you back, so this shows on your profile.`
        : standing.kind === "waiting"
          ? `Waiting for ${handle} to credit you back. It shows on your profile once they do.`
          : `${handle} has no published profile yet. It shows once they publish and credit you back.`;
  return (
    <div className={styles.status}>
      <CollaborationBadge
        state={confirmed ? "confirmed" : "awaiting"}
        person={person}
        creator={creator}
      />
      <p>{text}</p>
    </div>
  );
}

function CollaboratorsEditor({
  draft,
  update,
  isAccount,
  facts,
  creditHandle,
}: AddonEditorProps) {
  const field = set(update);
  const check = facts?.collaborators;
  const creator = firstName(draft.name) || "You";
  const ownKeys = [check?.yourHandle, draft.handle]
    .map((handle) => (handle ? collaboratorHandleKey(handle) : null))
    .filter((key): key is string => Boolean(key));

  const standingOf = (item: PortfolioCollaborator): Standing => {
    const key = collaboratorHandleKey(item.handle);
    if (!key) return { kind: "empty" };
    if (!isAccount) return { kind: "device", confirmed: item.confirmed };
    const lookup = check?.lookups.get(key);
    if (lookup)
      return {
        kind: lookup.status,
        ...(lookup.name ? { name: lookup.name } : {}),
      };
    if (check?.state === "error")
      return {
        kind: "error",
        message: `${check.message || "Couldn’t check right now."} Nothing was lost.`,
      };
    return { kind: "checking" };
  };
  const metaOf = (item: PortfolioCollaborator) => {
    const standing = standingOf(item);
    if (standing.kind === "empty") return "No handle yet";
    const label =
      standing.kind === "confirmed" ||
      (standing.kind === "device" && standing.confirmed)
        ? " · Confirmed"
        : standing.kind === "waiting" || standing.kind === "not-published"
          ? " · Waiting"
          : "";
    return `@${item.handle}${label}`;
  };

  const withHandle = draft.collaborators.some((item) => item.handle);
  return (
    <>
      <p className={studio.hint}>
        Both of you add each other, then publish. A credit shows on your profile
        once the other person credits you back, and stops showing if either of
        you removes it.
      </p>
      {isAccount && check?.yourHandle === null && withHandle && (
        <Alert role="note">
          <Info aria-hidden="true" />
          <AlertTitle>Choose your profile address first</AlertTitle>
          <AlertDescription>
            People can only credit you back once your profile has an address.
            Choose one under Address and publishing.
          </AlertDescription>
        </Alert>
      )}
      <ItemList<PortfolioCollaborator>
        items={draft.collaborators}
        onChange={field("collaborators")}
        noun="person"
        max={MAX_COLLABORATOR_LOOKUPS}
        initialOpen={
          creditHandle
            ? draft.collaborators.find(
                (item) => collaboratorHandleKey(item.handle) === creditHandle,
              )?.id
            : undefined
        }
        addLabel="Add a collaborator"
        empty="Nobody credited yet. Add the people you made work with."
        titleOf={(item) => item.name}
        metaOf={metaOf}
        create={() => ({
          id: createItemId("c"),
          handle: "",
          name: "",
          role: "",
          confirmed: false,
        })}
      >
        {(item, change) => (
          <>
            <TextField
              label="Name"
              required
              value={item.name}
              maxLength={100}
              hint="As it should appear on your profile."
              onChange={(name) => change({ name })}
            />
            <HandleField
              value={item.handle}
              ownKeys={ownKeys}
              takenKeys={
                new Set(
                  draft.collaborators
                    .filter((other) => other.id !== item.id)
                    .map((other) => collaboratorHandleKey(other.handle))
                    .filter((key): key is string => Boolean(key)),
                )
              }
              onCommit={(handle) => change({ handle })}
            />
            <TextField
              label="What they did"
              maxLength={120}
              placeholder="Composed the score for Cloth Choir"
              onChange={(role) => change({ role })}
              value={item.role}
            />
            <CreditStatus
              item={item}
              standing={standingOf(item)}
              creator={creator}
              onRetry={() => check?.refresh()}
            />
          </>
        )}
      </ItemList>
    </>
  );
}

export const collaboratorsEditor: AddonEditorDefinition = {
  Editor: CollaboratorsEditor,
  count: (draft) => draft.collaborators.length,
};
