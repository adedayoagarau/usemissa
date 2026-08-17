"use client";

import type { FirstSaveReceipt } from "./firstSaveTypes";

const RECEIPT_KEY = "missa.first-save-receipt";

type StoredFirstSaveReceipt = {
  receipt: FirstSaveReceipt;
  dismissed: boolean;
};

export function rememberFirstSaveReceipt(receipt: FirstSaveReceipt): void {
  try {
    window.sessionStorage.setItem(
      RECEIPT_KEY,
      JSON.stringify({
        receipt,
        dismissed: false,
      } satisfies StoredFirstSaveReceipt),
    );
  } catch {
    // Tracker remains canonical when tab-scoped guidance storage is unavailable.
  }
}

export function readFirstSaveReceipt(
  accountId: string,
): StoredFirstSaveReceipt | undefined {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(RECEIPT_KEY) ?? "null",
    ) as StoredFirstSaveReceipt | null;
    const receipt = value?.receipt;
    if (
      !receipt ||
      receipt.accountId !== accountId ||
      !receipt.journeyId ||
      !receipt.opportunityId ||
      !receipt.title ||
      receipt.privateState !== true ||
      new Date(receipt.expiresAt).getTime() <= Date.now() ||
      !receipt.completionToken ||
      !receipt.nextAction?.href?.startsWith("/opportunities/")
    ) {
      forgetFirstSaveReceipt();
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

export function setFirstSaveGuidanceDismissed(dismissed: boolean): void {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(RECEIPT_KEY) ?? "null",
    ) as StoredFirstSaveReceipt | null;
    if (!value?.receipt) return;
    window.sessionStorage.setItem(
      RECEIPT_KEY,
      JSON.stringify({ ...value, dismissed }),
    );
  } catch {
    // Guidance state never changes canonical Tracker data.
  }
}

export function forgetFirstSaveReceipt(): void {
  try {
    window.sessionStorage.removeItem(RECEIPT_KEY);
  } catch {
    // Nothing else depends on tab-scoped guidance storage.
  }
}
