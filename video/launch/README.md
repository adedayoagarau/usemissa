# Missa launch video

A 33-second launch film for Missa, built with [Remotion](https://www.remotion.dev/). It also comes in 15-second and 6-second cutdowns, each in three formats.

It is a standalone package. It is not an npm workspace, and the web app does not depend on it.

```bash
cd video/launch
npm install
npm run studio          # live preview in the browser
npm run render          # full film in three formats, then the cutdowns, into out/
npm run render:square   # 1080×1080 · also :vertical (1080×1920) and :wide (1920×1080)
npm run render:cuts     # Cut15 and Cut6 in every format
npm run stills -- LaunchSquare out/stills 30,300,600   # review frames
```

`npm run sync` copies the fonts and photography shared with the product from
`landing/fonts` and `apps/web/public/media/home` into `public/`. Every render
and studio command runs it first, so the film always uses the same assets as
the site. Those copies are git-ignored.

## Script

> Some people will tell you the art world runs on talent.
> Talent helps.
> But mostly, it runs on deadlines.
> Grant deadlines. Residency deadlines. That magazine that only reads submissions in March.
> Miss one, and you wait a year.
> Missa finds the opportunities that fit what you make, and reminds you before every one of them closes.
> Talent's your department. Deadlines are ours.
> Missa. Find the call. Make the deadline.

Voiceover: ElevenLabs **eleven_v4**, voice **Lyan** ("Contrarian yet friendly"),
take 2 of 4. The closing line was re-recorded on its own in the same voice and
model (take 2 of 4 again) and spliced in at "Missa.", matched to the original
level. The file is `public/audio/voiceover-lyan-find-the-call.mp3`. The other
takes and the earlier Storyteller, Belle and Daniel auditions are not in the repo. To use a different take, replace the
file and re-measure the cues (see Sync below).

## Storyboard

| Voice line | Scene | What happens |
| --- | --- | --- |
| "…the art world runs on *talent.*" | **Talent** | A slow push across a working studio. "talent." lands in big citron italic, then shrinks to a footnote on "Talent helps." while the photo dims. |
| "But mostly, it runs on deadlines… wait a year." | **Deadlines** | "deadlines." slams in, then a calendar fills the frame and the days cross off. Grant and residency cards arrive, and their dates get ochre circles. The calendar flips to March for the magazine. A *Closed* stamp hits on "Miss one", then twelve months flip past in grey. |
| "Missa finds… before every one of them closes." | **Missa** | A forest wipe brings in the wordmark and an opportunity card with "Why this may fit" chips. Three reminders drop in: two weeks before, a week before, the day before. |
| "Talent's your department. Deadlines are ours." | **Handled** | A grid of six disciplines: writing, visual art, film, music, performance and design. It wipes to sky, and the real Missa calendar appears with each deadline and reminder ringed in ochre. |
| "Missa. Find the call. Make the deadline." | **End card** | Wordmark, the line word by word, then *Browse open calls* and usemissa.com. |

## Sound

- **Sound effects** (`public/sfx`, ElevenLabs text-to-sound): studio room tone
  under the opening, an impact on "deadlines", marker strikes as the days
  cross off, paper slides for the deadline cards, marker circles round the
  grant and residency dates, a clock tick under the calendar, page flips for
  March and the lost year, a rubber stamp on "Closed", whooshes on scene
  changes, a swell under each wordmark, pops for the "why this may fit" chips,
  the discipline tiles and the call to action, a chime per reminder, and a
  marker circle per ringed date on the real calendar. Each effect is placed so
  its peak lands on the moment, not its first sample (`PEAK` in the file). The timeline is in `src/components/SoundDesign.tsx`.
- **Score** (`public/audio/score.mp3`): ElevenLabs video-to-music, generated
  from the picture-locked cut so that hits land on the scene changes. It plays
  at 0.32 volume under the voice. If you re-cut the picture, generate the
  score again; set `MUSIC` in `src/Root.tsx` to `null` to render without it.
- **Captions** are burned in (`src/components/Captions.tsx`). They skip any
  line that is already on screen as big type. Pass `captions: false` to turn
  them off.

## Cutdowns

`src/Cutdown.tsx` plays windows of the full film back to back, with the score
running continuously underneath. Windows are in `CUTS`:

- **15s**: "But mostly, it runs on deadlines." → Missa finds and reminds →
  "Talent's your department. Deadlines are ours." → end card.
- **6s**: "But mostly, it runs on deadlines." → end card.

## Sync

`src/timing.ts` holds the start of every spoken cue. They were measured from
the voiceover waveform with `node scripts/measure-vo.mjs <file> 0.1 0.05`.
Scenes, word reveals, captions and sound effects all read from that map. If
you replace the voiceover, re-measure the cues and the whole film re-times
itself.

## Brand

- Colours: Missa primitives from `DESIGN.md` (forest-600/700, lichen, ochre and
  the neutrals) plus the approved homepage marketing extension (citron
  `#DDF45B` and sky `#C6E8F4`). See `src/tokens.ts`.
- Type: Newsreader for statements and titles, Instrument Sans for interface
  text, and Fragment Mono for dates.
- Easing: the DESIGN.md `enter` and `standard` curves.
- Wordmark: the paths of `apps/web/public/brand/missa-wordmark-240.svg`.

## Before publishing

- **The opportunity content is illustrative.** "Emerging Artists Fund",
  "Coastal studio residency", "Spring poetry issue" and Harbour Arts are made
  up. To use real listings, swap in catalogue records in
  `src/scenes/Deadlines.tsx` and `src/scenes/MissaFinds.tsx`.
- **The calendar is a real Missa screen** (`public/ui/calendar-october.webp`).
  It was captured from the web app's month view, but the entries on it are
  the app's built-in sample opportunities and made-up reminder data. They are
  not anyone's real account.
- **Reminders** are shown in the Missa Inbox, which matches what ships today.
  The film does not show SMS or WhatsApp.
- **Image sources:**
  - Discipline and residency photos: original fictional Missa campaign images
    (see the `.json` sidecars in `apps/web/public/media/home/generated`).
  - `hero-artist-studio.webp`: Sandro Lopes Art, Pexels License.
  - `creator-filmmaker.webp` and `creator-musician.webp`: generated for this
    film with ElevenLabs (Seedream 5 Pro), in the same art direction.
