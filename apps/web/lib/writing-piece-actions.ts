import { TARGET_MAX } from "./writing-cards";
/** An empty target clears it; null means the entered value is invalid. */
export function pieceTarget(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isSafeInteger(number) && number >= 1 && number <= TARGET_MAX
    ? number
    : null;
}
