"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WritingEntry } from "@/lib/writing";
import type { WritingProject } from "@/lib/writing-projects";
import { activateOfflineAccount, downloadOfflineProject, offlineProjectUrl, readOfflineProject, removeOfflineProject } from "@/lib/writing-offline";

/** Disclosure content for the existing project Tools surface. */
export function WritingOfflineProject({ accountKey, project, loadEntries }: {
  accountKey: string;
  project: WritingProject;
  loadEntries: () => Promise<WritingEntry[]>;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    activateOfflineAccount(accountKey);
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setDownloaded(Boolean(readOfflineProject(accountKey, project.id)));
        setMessage("");
      }
    });
    return () => { active = false; };
  }, [accountKey, project.id]);
  async function download() {
    setBusy(true);
    try {
      const entries = await loadEntries();
      const result = await downloadOfflineProject(accountKey, project, entries);
      setDownloaded(true);
      setMessage(result.persistent ? "Project kept on this device. Open the offline reader to check it." : "Project downloaded. This browser may clear device storage; keep a backup too.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The project could not be downloaded."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Offline project" className="space-y-3">
    <p className="text-sm text-muted-foreground">Download a project to read, search and write after closing the browser offline. Offline writing creates a separate rich-text copy. Originals keep their formatting. Anyone using this browser can access device copies.</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void download()}><Download />{busy ? "Downloading…" : downloaded ? "Refresh offline copy" : "Download for offline"}</Button>
      {downloaded ? <>
        <Button variant="outline" size="sm" onClick={() => window.location.assign(offlineProjectUrl(accountKey, project.id))}><ExternalLink />Open offline reader</Button>
        <Button variant="ghost" size="sm" onClick={() => {
          if (removeOfflineProject(accountKey, project.id)) { setDownloaded(false); setMessage("Downloaded project removed. Unsaved offline copies remain until they sync."); }
          else setMessage("This device could not remove the downloaded project.");
        }}><Trash2 />Remove download</Button>
      </> : null}
    </div>
    {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
  </section>;
}
