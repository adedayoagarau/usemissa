"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MobileActionDock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = dockRef.current;
    const page = dock?.closest("main") as HTMLElement | null;
    if (!dock || !page) return;

    const reserveDockSpace = () => {
      page.style.setProperty("--mobile-action-dock-height", `${dock.offsetHeight}px`);
    };
    reserveDockSpace();
    const observer = new ResizeObserver(reserveDockSpace);
    observer.observe(dock);
    return () => {
      observer.disconnect();
      page.style.removeProperty("--mobile-action-dock-height");
    };
  }, []);

  return (
    <div ref={dockRef} className={className} aria-label="Opportunity actions">
      {children}
    </div>
  );
}
