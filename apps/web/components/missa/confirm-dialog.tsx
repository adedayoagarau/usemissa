"use client";

import { useCallback, useRef, useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Asks before an action that removes, cancels or closes something, in place
 * of the browser's confirm box. `confirm()` resolves true only when the
 * person picks the confirming button; Escape, Cancel or the backdrop resolve
 * false. Render `dialog` once in the component that calls `confirm`.
 */
export interface ConfirmRequest {
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirm(): { confirm: (request: ConfirmRequest) => Promise<boolean>; dialog: React.ReactNode } {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);
  const confirm = useCallback((next: ConfirmRequest) => {
    resolver.current?.(false);
    setRequest(next);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);
  const dialog = (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => { if (!open) settle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description ? <AlertDialogDescription>{request.description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{request?.cancelLabel ?? "Cancel"}</AlertDialogCancel>
          <Button type="button" variant={request?.destructive ? "destructive" : "default"} onClick={() => settle(true)}>{request?.confirmLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, dialog };
}
