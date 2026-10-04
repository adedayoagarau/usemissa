"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Check,
  Eye,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PortfolioHandleField } from "@/components/portfolio-handle-field";
import { PublicCreatorProfile } from "@/components/creator-profile/public-profile";
import { cn } from "@/lib/utils";
import {
  orderedModules,
  publicPortfolioProjection,
  withServerProvenance,
  type PortfolioData,
  type PortfolioModule,
} from "@/lib/creator-portfolio-schema";
import { importLocalPortfolio } from "@/lib/creator-portfolio-draft";
import { LENSES, MODULE_LABELS } from "@/lib/creator-profile";
import { sampleCreatorPortfolio } from "@/lib/creator-profile-sample";
import {
  profileSuggestions,
  type StudioPanel,
} from "@/lib/creator-profile-suggestions";
import {
  AppearanceEditor,
  BasicsEditor,
  ContactEditor,
  EventsEditor,
  PressEditor,
  RecordEditor,
  ShelfEditor,
  WorkEditor,
} from "./studio-editors";
import {
  PREVIEW_OWNER,
  useProfileDraft,
  type ProfileDraftController,
} from "./use-profile-draft";
import styles from "./profile-studio.module.css";

type Action = "publish" | "rename" | "unpublish" | "import" | null;

function moduleCount(draft: PortfolioData, id: PortfolioModule) {
  switch (id) {
    case "work":
      return draft.works.length;
    case "upcoming":
      return draft.events.length;
    case "shelf":
      return draft.shelf.length;
    case "record":
      return draft.record.length;
    case "press":
      return draft.press.length;
    case "about":
      return undefined;
  }
}

function saveCopy(controller: ProfileDraftController) {
  const { state, isAccount } = controller;
  switch (state.kind) {
    case "loading":
      return "Loading your draft…";
    case "load-failed":
    case "failed":
      return state.message;
    case "pending":
      return "Changes will save shortly…";
    case "saving":
      return "Saving…";
    case "saved":
      return isAccount
        ? "Saved · private draft in your account"
        : "Saved on this device · nothing is published";
  }
}

export function ProfileStudio({
  ownerId,
  initialName = "",
  seedWithSample = false,
}: {
  ownerId: string;
  initialName?: string;
  /** Design review only: start an empty device draft from the sample creator. */
  seedWithSample?: boolean;
}) {
  const controller = useProfileDraft(
    ownerId,
    initialName,
    seedWithSample ? sampleCreatorPortfolio : undefined,
  );
  const { draft, update, state, isAccount } = controller;
  const [panel, setPanel] = useState<StudioPanel>("basics");
  // Phones show the section list and one editor at a time.
  const [view, setView] = useState<"index" | "editor">("index");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [mobilePreview, setMobilePreview] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editorHeading = useRef<HTMLDivElement>(null);
  const ready = state.kind !== "loading" && state.kind !== "load-failed";
  const verified = useMemo(
    () =>
      new Map(
        controller.outcomes.map((item) => [
          item.outcomeId,
          { title: item.workTitle, venue: item.organizationName },
        ]),
      ),
    [controller.outcomes],
  );
  // The preview applies the same provenance rule the server applies on save.
  const projection = useMemo(
    () => publicPortfolioProjection(withServerProvenance(draft, verified)),
    [draft, verified],
  );
  const suggestions = useMemo(() => profileSuggestions(draft), [draft]);
  const blocking = suggestions.filter((item) => item.blocking);
  const modules = orderedModules(draft.modules);
  const address = controller.currentHandle || draft.handle;

  const open = (next: StudioPanel) => {
    setPanel(next);
    setView("editor");
    requestAnimationFrame(() =>
      editorHeading.current
        ?.querySelector("h2")
        ?.focus({ preventScroll: false }),
    );
  };
  const moveModule = (index: number, by: number) =>
    update((current) => {
      const next = orderedModules(current.modules);
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return { ...current, modules: next };
    });
  const toggleModule = (id: PortfolioModule, visible: boolean) =>
    update((current) => ({
      ...current,
      modules: orderedModules(current.modules).map((module) =>
        module.id === id ? { ...module, visible } : module,
      ),
    }));

  const startAction = (next: Action) => {
    setError("");
    setHandle(controller.currentHandle || draft.handle);
    setAction(next);
  };

  const finish = async () => {
    setError("");
    try {
      if (action === "publish") {
        const published = await controller.publish(handle);
        setNotice(`Published at usemissa.com/@${published}`);
      } else if (action === "rename") {
        const renamed = await controller.rename(handle);
        update((current) => ({ ...current, handle: renamed }));
        setNotice("Profile address updated.");
      } else if (action === "unpublish") {
        await controller.unpublish();
        setNotice("Unpublished. Your draft and handle are safe.");
      } else if (action === "import") {
        await importLocalPortfolio(ownerId);
        window.location.reload();
        return;
      }
      setAction(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    }
  };

  const editorProps = {
    draft,
    update,
    upload: controller.upload,
    onError: setError,
  };

  return (
    <div className={styles.studio}>
      <header className={styles.bar}>
        <div className={styles.barTitle}>
          <Link
            href={isAccount ? "/profile" : "/design-system/creator-profile-v2"}
            className={styles.back}
          >
            <ArrowLeft aria-hidden="true" />
            {isAccount ? "Your account" : "Public profile example"}
          </Link>
          <h1 className="font-heading">Your public profile</h1>
          <span
            className={cn(
              styles.pill,
              controller.publishedAt ? styles.pillLive : styles.pillDraft,
            )}
          >
            {controller.publishedAt
              ? controller.changedSincePublish
                ? "Published · changes not live"
                : "Published"
              : "Not published"}
          </span>
        </div>
        <p
          role="status"
          className={cn(
            styles.saveState,
            (state.kind === "failed" || state.kind === "load-failed") &&
              styles.saveError,
          )}
        >
          {saveCopy(controller)}
        </p>
        <div className={styles.barActions}>
          <Button
            variant="outline"
            className={styles.previewButton}
            disabled={!ready}
            onClick={() => setMobilePreview(true)}
          >
            <Eye aria-hidden="true" />
            Preview profile
          </Button>
          {isAccount && controller.publishedAt && address && (
            <a
              href={`/@${address}`}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                styles.viewLive,
              )}
            >
              View live
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
          {isAccount ? (
            <Button
              disabled={!ready || controller.uploading || controller.publishing}
              onClick={() => startAction("publish")}
            >
              {controller.publishedAt ? "Publish changes" : "Publish profile"}
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Publishing needs an account
            </Button>
          )}
        </div>
      </header>

      {state.kind === "load-failed" && (
        <div role="alert" className={styles.alert}>
          <AlertCircle aria-hidden="true" />
          <span>{state.message} Your draft is unchanged.</span>
          <Button variant="outline" onClick={() => void controller.reload()}>
            Retry loading draft
          </Button>
        </div>
      )}
      {state.kind === "failed" && (
        <div role="alert" className={styles.alert}>
          <AlertCircle aria-hidden="true" />
          <span>
            {state.conflict
              ? "This profile changed on another device. Reload to see the latest version before editing."
              : `${state.message} A copy is kept on this device.`}
          </span>
          {state.conflict ? (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void controller.save()}>
              Try again
            </Button>
          )}
        </div>
      )}
      {error && !action && (
        <div role="alert" className={styles.alert}>
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
          <Button variant="ghost" onClick={() => setError("")}>
            Dismiss
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          <Check aria-hidden="true" />
          {notice}
        </p>
      )}

      <div className={styles.body} data-view={view}>
        <nav aria-label="Profile editor" className={styles.rail}>
          <div className={styles.railGroup}>
            <p className={styles.railLabel}>Profile</p>
            {(["basics", "appearance"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={styles.railItem}
                aria-current={panel === id ? "true" : undefined}
                onClick={() => open(id)}
              >
                {id === "basics" ? "Basics" : "Appearance"}
                <span className={styles.railHint}>
                  {id === "appearance" ? LENSES[draft.lens].label : ""}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.railGroup}>
            <p className={styles.railLabel}>Sections, in page order</p>
            <ol className={styles.moduleList}>
              {modules.map((module, index) => {
                const count = moduleCount(draft, module.id);
                return (
                  <li
                    key={module.id}
                    className={cn(!module.visible && styles.moduleHidden)}
                  >
                    <button
                      type="button"
                      className={styles.railItem}
                      aria-current={panel === module.id ? "true" : undefined}
                      onClick={() => open(module.id)}
                    >
                      {MODULE_LABELS[module.id]}
                      {count !== undefined && (
                        <span className={cn(styles.railHint, "font-mono")}>
                          {count}
                        </span>
                      )}
                    </button>
                    <span className={styles.moduleTools}>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === 0}
                        aria-label={`Move ${MODULE_LABELS[module.id]} up`}
                        onClick={() => moveModule(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={index === modules.length - 1}
                        aria-label={`Move ${MODULE_LABELS[module.id]} down`}
                        onClick={() => moveModule(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Switch
                        size="sm"
                        checked={module.visible}
                        aria-label={`Show ${MODULE_LABELS[module.id]}`}
                        onCheckedChange={(visible) =>
                          toggleModule(module.id, visible)
                        }
                      />
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className={styles.railNote}>
              Empty sections are left out for visitors.
            </p>
          </div>
          <div className={styles.railGroup}>
            <button
              type="button"
              className={styles.railItem}
              aria-current={panel === "publish" ? "true" : undefined}
              onClick={() => open("publish")}
            >
              Address and publishing
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <p className={styles.railLabel}>Suggestions</p>
              <ul>
                {suggestions.slice(0, 4).map((item) => (
                  <li
                    key={item.id}
                    className={cn(item.blocking && styles.suggestionBlocking)}
                  >
                    <span>{item.text}</span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => open(item.panel)}
                    >
                      {item.action}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <section
          className={styles.editor}
          aria-label="Edit section"
          ref={editorHeading}
          inert={!ready || undefined}
        >
          <Button
            variant="ghost"
            className={styles.backToIndex}
            onClick={() => setView("index")}
          >
            <ArrowLeft aria-hidden="true" />
            All sections
          </Button>
          {panel === "basics" && <BasicsEditor {...editorProps} />}
          {panel === "appearance" && <AppearanceEditor {...editorProps} />}
          {panel === "work" && <WorkEditor {...editorProps} />}
          {panel === "upcoming" && <EventsEditor {...editorProps} />}
          {panel === "shelf" && <ShelfEditor {...editorProps} />}
          {panel === "record" && (
            <RecordEditor
              {...editorProps}
              outcomes={controller.outcomes}
              confirmedIds={verified}
              isAccount={isAccount}
            />
          )}
          {panel === "press" && <PressEditor {...editorProps} />}
          {panel === "about" && <ContactEditor {...editorProps} />}
          {panel === "publish" && (
            <PublishPanel
              controller={controller}
              draft={draft}
              blocking={blocking.map((item) => item.text)}
              onAction={startAction}
              onHandle={(value) =>
                update((current) => ({ ...current, handle: value }))
              }
            />
          )}
        </section>

        <section className={styles.preview} aria-label="Live preview">
          <div className={styles.previewBar}>
            <span>Preview · what visitors will see</span>
            <div
              role="group"
              aria-label="Preview size"
              className={styles.devices}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={device === "desktop"}
                aria-label="Desktop preview"
                onClick={() => setDevice("desktop")}
              >
                <Monitor aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-pressed={device === "phone"}
                aria-label="Phone preview"
                onClick={() => setDevice("phone")}
              >
                <Smartphone aria-hidden="true" />
              </Button>
            </div>
          </div>
          <ScaledFrame width={device === "desktop" ? 1280 : 390}>
            <PublicCreatorProfile
              portfolio={projection}
              handle={address}
              mode="preview"
            />
          </ScaledFrame>
        </section>
      </div>

      <Dialog open={mobilePreview} onOpenChange={setMobilePreview}>
        <DialogContent className={styles.previewDialog}>
          <DialogTitle className="sr-only">Profile preview</DialogTitle>
          <DialogDescription className="sr-only">
            What visitors will see once you publish.
          </DialogDescription>
          <PublicCreatorProfile
            portfolio={projection}
            handle={address}
            mode="preview"
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={action !== null}
        onOpenChange={(value) => {
          if (!value) setAction(null);
        }}
      >
        <DialogContent className={styles.actionDialog}>
          <DialogTitle className="font-heading">
            {action === "import"
              ? "Import your preview draft?"
              : action === "unpublish"
                ? "Unpublish your profile?"
                : action === "rename"
                  ? "Change profile address"
                  : "Publish your profile"}
          </DialogTitle>
          <DialogDescription>
            {action === "import"
              ? "This replaces your account draft with the preview saved in this browser. Your published profile stays unchanged."
              : action === "unpublish"
                ? "Visitors will no longer see your profile or its media. Your private draft and handle stay yours."
                : action === "rename"
                  ? "This changes your shareable link. Existing rename limits apply; old links redirect to your current address."
                  : "The profile you previewed, including its contact details and media, will be visible to anyone with this link."}
          </DialogDescription>
          {action === "publish" && blocking.length > 0 && (
            <ul className={styles.blockers}>
              {blocking.map((item) => (
                <li key={item.id}>
                  <AlertCircle aria-hidden="true" />
                  {item.text}
                </li>
              ))}
            </ul>
          )}
          {(action === "rename" ||
            (action === "publish" && !controller.currentHandle)) && (
            <PortfolioHandleField
              value={handle}
              onChange={setHandle}
              current={controller.currentHandle}
              name={draft.name}
            />
          )}
          {action === "publish" && controller.currentHandle && (
            <p className={cn(styles.address, "font-mono")}>
              usemissa.com/@{controller.currentHandle}
            </p>
          )}
          {error && (
            <p role="alert" className={styles.dialogError}>
              {error}
            </p>
          )}
          <div className={styles.dialogActions}>
            <Button variant="ghost" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant={action === "unpublish" ? "destructive" : "default"}
              disabled={
                controller.publishing ||
                (action === "publish" && blocking.length > 0)
              }
              onClick={finish}
            >
              {controller.publishing
                ? "Please wait…"
                : action === "import"
                  ? "Import draft"
                  : action === "unpublish"
                    ? "Unpublish"
                    : action === "rename"
                      ? "Save new address"
                      : "Confirm and publish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Renders the preview at real device width, zoomed down to fit the pane. */
function ScaledFrame({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  const pane = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = pane.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - 24;
      setScale(Math.min(1, Math.max(0.3, available / width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div ref={pane} className={styles.framePane}>
      <div
        className={cn(styles.frame, width < 600 && styles.framePhone)}
        style={{ width, zoom: scale }}
      >
        {children}
      </div>
    </div>
  );
}

function PublishPanel({
  controller,
  draft,
  blocking,
  onAction,
  onHandle,
}: {
  controller: ProfileDraftController;
  draft: PortfolioData;
  blocking: string[];
  onAction: (action: Action) => void;
  onHandle: (handle: string) => void;
}) {
  const { isAccount, currentHandle, publishedAt } = controller;
  const projection = publicPortfolioProjection(draft);
  const publicItems = [
    `Name${projection.photo ? ", portrait" : ""}${projection.statement ? " and statement" : ""}`,
    `${projection.works.length} ${projection.works.length === 1 ? "work" : "works"}`,
    projection.shelf.length ? `${projection.shelf.length} on your shelf` : "",
    projection.record.length
      ? `${projection.record.length} track record entries`
      : "",
    projection.events.length
      ? `${projection.events.length} upcoming dates`
      : "",
    projection.contact.email ? `Public email: ${projection.contact.email}` : "",
  ].filter(Boolean);
  return (
    <>
      <div className={styles.editorHead}>
        <h2 className="font-heading" tabIndex={-1}>
          Address and publishing
        </h2>
        <p>
          Edits stay private until you publish. Visitors see the last version
          you published.
        </p>
      </div>
      {isAccount ? (
        <>
          {currentHandle ? (
            <div className={styles.addressCard}>
              <span className={styles.label}>Profile address</span>
              {publishedAt ? (
                <Link href={`/@${currentHandle}`} className="font-mono">
                  usemissa.com/@{currentHandle}
                </Link>
              ) : (
                <span className="font-mono">
                  usemissa.com/@{currentHandle} · not published
                </span>
              )}
              <div className={styles.inlineActions}>
                <Button variant="outline" onClick={() => onAction("rename")}>
                  Change profile address
                </Button>
                {publishedAt && (
                  <Button variant="ghost" onClick={() => onAction("unpublish")}>
                    Unpublish profile
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <PortfolioHandleField
              value={draft.handle}
              onChange={onHandle}
              current={currentHandle}
              name={draft.name}
            />
          )}
          <div className={styles.group}>
            <span className={styles.label}>What becomes public</span>
            <ul className={styles.publicList}>
              {publicItems.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className={styles.hint}>
              Hidden sections, untitled items and your sign-in email stay
              private.
            </p>
          </div>
          {blocking.length > 0 && (
            <ul className={styles.blockers}>
              {blocking.map((text) => (
                <li key={text}>
                  <AlertCircle aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          )}
          <div className={styles.inlineActions}>
            <Button
              disabled={blocking.length > 0 || controller.publishing}
              onClick={() => onAction("publish")}
            >
              {publishedAt ? "Publish changes" : "Publish profile"}
            </Button>
            <Button variant="ghost" onClick={() => onAction("import")}>
              Import a preview draft from this device
            </Button>
          </div>
        </>
      ) : (
        <>
          <PortfolioHandleField
            value={draft.handle}
            onChange={onHandle}
            current=""
            name={draft.name}
            sample
          />
          <p className={styles.notice}>
            This is a device-only preview. Sign in to claim an address and
            publish.
          </p>
        </>
      )}
    </>
  );
}

export { PREVIEW_OWNER };
