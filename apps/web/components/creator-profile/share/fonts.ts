import type { ImageResponse } from "next/og";

type ImageResponseOptions = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>;

/**
 * Missa's three families for the generated share images. `next/og` can't read
 * CSS variables or the faces the page loads, so each image fetches the TTF it
 * needs from Google Fonts, once per server process. When a face can't be
 * fetched the image still renders, in the renderer's default face.
 */
export type ShareFonts = {
  editorial?: ArrayBuffer;
  editorialItalic?: ArrayBuffer;
  interface?: ArrayBuffer;
  interfaceMedium?: ArrayBuffer;
  data?: ArrayBuffer;
};

/** Family names as registered with the renderer. */
export const SHARE_FAMILY = {
  editorial: "Newsreader",
  interface: "Instrument Sans",
  data: "Fragment Mono",
} as const;

const loaded = new Map<string, Promise<ArrayBuffer | undefined>>();

function loadGoogleFont(query: string) {
  const known = loaded.get(query);
  if (known) return known;
  const pending = (async () => {
    try {
      const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${query}`,
        { signal: AbortSignal.timeout(4000) },
      ).then((res) => res.text());
      const url = css.match(
        /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
      )?.[1];
      return url
        ? await fetch(url, { signal: AbortSignal.timeout(6000) }).then((res) =>
            res.arrayBuffer(),
          )
        : undefined;
    } catch {
      return undefined;
    }
  })().then((font) => {
    // A failed fetch is retried on the next request instead of being kept.
    if (!font) loaded.delete(query);
    return font;
  });
  loaded.set(query, pending);
  return pending;
}

/** Newsreader as TTF; the share images fall back to the default face offline. */
export function loadEditorialFont() {
  return loadGoogleFont("Newsreader:opsz,wght@72,400");
}

export async function loadShareFonts(): Promise<ShareFonts> {
  const [editorial, editorialItalic, interfaceRegular, interfaceMedium, data] =
    await Promise.all([
      loadEditorialFont(),
      loadGoogleFont("Newsreader:ital,opsz,wght@1,72,400"),
      loadGoogleFont("Instrument+Sans:wght@400"),
      loadGoogleFont("Instrument+Sans:wght@500"),
      loadGoogleFont("Fragment+Mono"),
    ]);
  return {
    editorial,
    editorialItalic,
    interface: interfaceRegular,
    interfaceMedium,
    data,
  };
}

/** The font list `ImageResponse` takes, for whichever faces were fetched. */
export function shareFontList(fonts: ShareFonts) {
  const list: NonNullable<ImageResponseOptions["fonts"]> = [];
  // The first face is the default for text that names no family.
  if (fonts.interface)
    list.push({
      name: SHARE_FAMILY.interface,
      data: fonts.interface,
      weight: 400,
      style: "normal",
    });
  if (fonts.interfaceMedium)
    list.push({
      name: SHARE_FAMILY.interface,
      data: fonts.interfaceMedium,
      weight: 500,
      style: "normal",
    });
  if (fonts.editorial)
    list.push({
      name: SHARE_FAMILY.editorial,
      data: fonts.editorial,
      weight: 400,
      style: "normal",
    });
  if (fonts.editorialItalic)
    list.push({
      name: SHARE_FAMILY.editorial,
      data: fonts.editorialItalic,
      weight: 400,
      style: "italic",
    });
  if (fonts.data)
    list.push({
      name: SHARE_FAMILY.data,
      data: fonts.data,
      weight: 400,
      style: "normal",
    });
  return list.length ? list : undefined;
}

/** A `fontFamily` value for a face, or undefined when it wasn't fetched. */
export function shareFamily(
  fonts: ShareFonts,
  face: "editorial" | "interface" | "data",
) {
  return fonts[face] ? SHARE_FAMILY[face] : undefined;
}
