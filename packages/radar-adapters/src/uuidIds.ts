import { randomUUID } from "node:crypto";
import type { IdGenerator } from "@missa/radar-engine";

export function uuidIds(): IdGenerator {
  return {
    next(prefix: string): string {
      return `${prefix}_${randomUUID()}`;
    },
  };
}
