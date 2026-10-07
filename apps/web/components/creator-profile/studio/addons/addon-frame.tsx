"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { PortfolioAddon } from "@/lib/creator-portfolio-schema";
import { ADDON_META, MODULE_LABELS } from "@/lib/creator-profile";
import { EditorHead } from "../studio-editors";
import styles from "../profile-studio.module.css";

/**
 * The heading, summary and switch-off that every add-on editor shares, so a
 * new add-on only has to supply its form.
 */
export function AddonFrame({
  id,
  onSwitchOff,
  children,
}: {
  id: PortfolioAddon;
  onSwitchOff: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <EditorHead title={MODULE_LABELS[id]} lead={ADDON_META[id].summary} />
      {children}
      <div className={styles.addonFoot}>
        <p>
          Switching {MODULE_LABELS[id].toLowerCase()} off removes it from your
          profile and this list. What you entered is kept if you add it again.
        </p>
        <Button type="button" variant="outline" onClick={onSwitchOff}>
          Switch off {MODULE_LABELS[id].toLowerCase()}
        </Button>
      </div>
    </>
  );
}
