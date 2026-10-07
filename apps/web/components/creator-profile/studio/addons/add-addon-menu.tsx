"use client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADDON_MODULES,
  type PortfolioAddon,
} from "@/lib/creator-portfolio-schema";
import {
  ADDON_META,
  MODULE_GROUPS,
  MODULE_LABELS,
  type ModuleGroup,
} from "@/lib/creator-profile";
import styles from "../profile-studio.module.css";

const GROUP_ORDER: ModuleGroup[] = ["work", "record", "connect"];

/** Lists the add-ons not yet on the profile, grouped as in the library. */
export function AddAddonMenu({
  added,
  onAdd,
}: {
  added: ReadonlySet<PortfolioAddon>;
  onAdd: (id: PortfolioAddon) => void;
}) {
  const remaining = ADDON_MODULES.filter((id) => !added.has(id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={styles.addAddon}
            disabled={remaining.length === 0}
          />
        }
      >
        <Plus aria-hidden="true" />
        {remaining.length === 0 ? "Every add-on is on" : "Add an add-on"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={styles.addonMenu}>
        {GROUP_ORDER.map((group, index) => {
          const items = remaining.filter(
            (id) => ADDON_META[id].group === group,
          );
          if (!items.length) return null;
          return (
            <DropdownMenuGroup key={group}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{MODULE_GROUPS[group]}</DropdownMenuLabel>
              {items.map((id) => (
                <DropdownMenuItem
                  key={id}
                  className={styles.addonItem}
                  onClick={() => onAdd(id)}
                >
                  <span>{MODULE_LABELS[id]}</span>
                  <span className={styles.addonSummary}>
                    {ADDON_META[id].summary}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
