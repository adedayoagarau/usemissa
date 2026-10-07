"use client";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSp } from "@/components/missa/spelling";
import { cn } from "@/lib/utils";
import {
  createItemId,
  type PortfolioBookingFile,
} from "@/lib/creator-portfolio-schema";
import {
  BOOKING_FILE_LIMIT,
  fileFacts,
  uploadedDocument,
} from "@/lib/portfolio-booking-files";
import {
  AreaField,
  ItemList,
  MediaField,
  TextField,
  set,
} from "../studio-editors";
import studio from "../profile-studio.module.css";
import type { AddonEditorDefinition, AddonEditorProps } from "./types";
import styles from "./booking-editor.module.css";

/** What the studio can say about a file: the server's reading, or nothing yet. */
function FileDetail({ file }: { file: PortfolioBookingFile }) {
  if (!file.file) return null;
  const facts = fileFacts(file);
  return facts ? (
    <span>
      <span className={cn(styles.facts, "font-mono")}>{facts}</span> · read from
      the file you uploaded
    </span>
  ) : (
    "Type and size are read from the file when it is saved."
  );
}

function BookingEditor({ draft, update, upload, onError }: AddonEditorProps) {
  const field = set(update);
  const sp = useSp();
  const { booking } = draft;
  const change = (patch: Partial<typeof booking>) =>
    field("booking")({ ...booking, ...patch });
  return (
    <>
      <Alert role="note">
        <Info aria-hidden="true" />
        <AlertTitle>Files become public when you publish</AlertTitle>
        <AlertDescription>
          Anyone with your profile link can download them. Leave out anything
          you want to keep private.
        </AlertDescription>
      </Alert>
      <AreaField
        label="Short bio"
        rows={3}
        maxLength={400}
        hint="Two or three sentences, the way you’d say it before a reading."
        value={booking.shortBio}
        onChange={(shortBio) => change({ shortBio })}
      />
      <AreaField
        label="Long bio"
        rows={8}
        maxLength={2000}
        hint={sp(
          "For a program or a press page. Plain text; a blank line starts a new paragraph.",
        )}
        value={booking.longBio}
        onChange={(longBio) => change({ longBio })}
      />
      <fieldset className={studio.group}>
        <legend>Files</legend>
        <p className={studio.hint}>
          Tech rider, press kit, stage plot. PDF or ZIP, up to{" "}
          {BOOKING_FILE_LIMIT} files, 20 MB each. Visitors see each file’s type
          and size before they download it.
        </p>
        <ItemList<PortfolioBookingFile>
          items={booking.files}
          onChange={(files) => change({ files })}
          noun="file"
          max={BOOKING_FILE_LIMIT}
          addLabel="Add a file"
          empty="No files yet. Add a tech rider or a press kit."
          titleOf={(file) => file.label}
          metaOf={(file) =>
            fileFacts(file) || (file.file ? "File added" : "No file yet")
          }
          create={() => ({
            id: createItemId("bf"),
            label: "",
            file: "",
          })}
        >
          {(file, patch) => (
            <>
              <TextField
                label="Label"
                required
                value={file.label}
                maxLength={80}
                placeholder="Tech rider"
                hint="What a programmer sees in the list."
                onChange={(label) => patch({ label })}
              />
              <MediaField
                label="File"
                kind="document"
                required
                value={file.file}
                detail={<FileDetail file={file} />}
                upload={upload}
                onError={onError}
                onChange={(url) => {
                  const found = url ? uploadedDocument(url) : undefined;
                  patch({
                    file: url,
                    type: found?.type,
                    bytes: found?.bytes,
                  });
                }}
              />
            </>
          )}
        </ItemList>
      </fieldset>
    </>
  );
}

export const bookingEditor: AddonEditorDefinition = {
  Editor: BookingEditor,
  count: (draft) => draft.booking.files.length,
};
