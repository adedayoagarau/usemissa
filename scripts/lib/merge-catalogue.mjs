/**
 * component-catalogue.json holds two kinds of content: the Studio inventory that
 * `check-design-system.mjs --write-catalogue` generates (family and variant
 * counts, the families list), and sections people write by hand (primitive
 * contracts, notes on product compositions). Regenerating must replace only the
 * first kind, so the generated keys are the ones the script produced and
 * everything else in the existing file is carried over as it is.
 *
 * Key order is kept: a generated key stays where it was, a new generated key is
 * added at the end, and hand-written sections keep their place on either side.
 */
export function mergeCatalogue(existing, generated) {
  const merged = {};
  for (const [key, value] of Object.entries(existing ?? {}))
    merged[key] = Object.hasOwn(generated, key) ? generated[key] : value;
  for (const [key, value] of Object.entries(generated))
    if (!Object.hasOwn(merged, key)) merged[key] = value;
  return merged;
}

/**
 * Reads the catalogue already on disk. A missing file is a first run. A file
 * that is not valid JSON is an error: writing over it would destroy whatever
 * hand-written content it still holds.
 */
export async function readExistingCatalogue(fs, cataloguePath) {
  let text;
  try {
    text = await fs.readFile(cataloguePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `${cataloguePath} is not valid JSON, so it was left alone rather than overwritten: ${error.message}`,
    );
  }
}
