import { z } from "zod";

export const resourceIdSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(
    /^[a-z][a-z0-9-]*(?:_[a-z0-9-]+)*_[A-Za-z0-9-]+$/,
    "Expected a prefixed Missa resource ID",
  );
