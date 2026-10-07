# Writing room typefaces

Faces a writer can choose for their own text in the writing room (`/write`).
They are used only by `components/missa/writing-pages.tsx`, never for
Missa's interface. Each is licensed under the SIL Open Font License 1.1; its
licence sits beside it as `<name>-OFL.txt`.

| File | Family | Version | Source | Changes |
| --- | --- | --- | --- | --- |
| `courier-prime.woff2` | Courier Prime | 3.018 | google/fonts `ofl/courierprime` | Re-encoded as WOFF2 |
| `ia-writer-duo.woff2` | iA Writer Duo S | 2.000 | iaolo/iA-Fonts `iA Writer Duo/Static` | Re-encoded as WOFF2 only (Reserved Font Name “iA Writer”) |
| `anonymous-pro.woff2` | Anonymous Pro | 1.003 | google/fonts `ofl/anonymouspro` | Re-encoded as WOFF2 only (Reserved Font Name “Anonymous Pro”) |
| `literata.woff2` | Literata | 3.103 | google/fonts `ofl/literata` | Weight fixed at 400; optical size axis kept |
| `eb-garamond.woff2` | EB Garamond | 1.003 | google/fonts `ofl/ebgaramond` | Weight fixed at 400 |
| `libre-baskerville.woff2` | Libre Baskerville | 2.005 | google/fonts `ofl/librebaskerville` | Re-encoded as WOFF2 only (Reserved Font Name “Libre Baskerville”) |
| `cormorant-garamond.woff2` | Cormorant Garamond | 4.001 | google/fonts `ofl/cormorantgaramond` | Weight fixed at 500, used as regular: the regular is drawn for display sizes and is too thin on screen |
| `atkinson-hyperlegible-next.woff2` | Atkinson Hyperlegible Next | 2.001 | google/fonts `ofl/atkinsonhyperlegiblenext` | Weight fixed at 400 |

No face is subset, so every script its designers drew is kept. Faces with a
Reserved Font Name are not modified beyond WOFF2 packaging, so they keep their
names. Fixing a weight is done with `fontTools.varLib.instancer`.

Letters a face does not draw are filled from the fallback font. In October 2026
EB Garamond drew every Yoruba, Igbo and Hausa letter checked (ẹ ọ ṣ ị ụ ɓ ɗ ƙ);
Libre Baskerville drew them too. Courier Prime, Anonymous Pro, Atkinson
Hyperlegible Next, and Missa's own Newsreader and Instrument Sans did not draw
the dot-below letters.
