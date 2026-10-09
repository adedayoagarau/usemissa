import type { WritingEntry } from "./writing.ts";
import type { WritingProject } from "./writing-projects.ts";

/** Explicit device copies. No authenticated HTML or API response is cached. */
export type OfflineWritingProject = {
  version: 1;
  accountKey: string;
  project: WritingProject;
  entries: WritingEntry[];
  downloadedAt: string;
};
export const OFFLINE_ACTIVE_ACCOUNT = "missa.write.offline.active.v1";
export function offlineProjectKey(accountKey: string, projectId: string) {
  return `missa.write.offline.v1:${encodeURIComponent(accountKey)}:${encodeURIComponent(projectId)}`;
}
export function offlineProjectUrl(accountKey: string, projectId: string) {
  return `/writing-offline/index.html#${new URLSearchParams({ account: accountKey, project: projectId })}`;
}
export function activateOfflineAccount(accountKey: string) {
  try { localStorage.setItem(OFFLINE_ACTIVE_ACCOUNT, accountKey); return true; }
  catch { return false; }
}
export function readOfflineProject(accountKey: string, projectId: string): OfflineWritingProject | null {
  try {
    const value = JSON.parse(localStorage.getItem(offlineProjectKey(accountKey, projectId)) ?? "null");
    return value?.version === 1 && value.accountKey === accountKey && value.project?.id === projectId && Array.isArray(value.entries) ? value : null;
  } catch { return null; }
}
export function removeOfflineProject(accountKey: string, projectId: string): boolean {
  try { localStorage.removeItem(offlineProjectKey(accountKey, projectId)); return true; }
  catch { return false; }
}
export async function downloadOfflineProject(accountKey: string, project: WritingProject, entries: WritingEntry[]) {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) throw new Error("This browser cannot prepare an offline copy. Download a project backup instead.");
  if (entries.some(entry => entry.projectId !== project.id)) throw new Error("The project copy contains a piece from another project.");
  const registration = await navigator.serviceWorker.register("/writing-offline/sw.js", { scope: "/writing-offline/" });
  // A first install must finish caching before the download is reported ready.
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (worker && worker.state !== "activated") await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { worker.removeEventListener("statechange", change); reject(new Error("The offline reader could not be prepared. Try again online.")); }, 20_000);
    const change = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        clearTimeout(timeout); worker.removeEventListener("statechange", change);
        if (worker.state === "activated") resolve(); else reject(new Error("The offline reader could not be prepared."));
      }
    };
    worker.addEventListener("statechange", change); change();
  });
  const snapshot: OfflineWritingProject = { version: 1, accountKey, project, entries, downloadedAt: new Date().toISOString() };
  try {
    localStorage.setItem(offlineProjectKey(accountKey, project.id), JSON.stringify(snapshot));
    localStorage.setItem(OFFLINE_ACTIVE_ACCOUNT, accountKey);
  } catch { throw new Error("This device could not keep the project. Download a backup before closing the page."); }
  let persistent = false;
  try { persistent = await navigator.storage?.persist?.() ?? false; } catch { /* The browser may decline persistence. */ }
  return { snapshot, persistent, url: offlineProjectUrl(accountKey, project.id) };
}
