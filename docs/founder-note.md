# The founder note on About

About has a section for a short note from the founder. It stays hidden until
the note is written, so no placeholder ever ships. To publish it, fill in
`founderNote` in `apps/web/lib/founder-note.ts`:

```ts
export const founderNote: FounderNote | null = {
  paragraphs: ['First paragraph.', 'Second paragraph.', 'Third paragraph.'],
  name: 'Your name',
  role: 'Founder, Missa',
};
```

The section renders under the About hero, headed "A note from the founder" and
"Why Missa exists".

## Write it yourself

This is the one piece of Missa copy that has to be in your own words. An
artist can tell when a founder's note was drafted by someone else. Aim for
120 to 200 words, in three short paragraphs.

## Prompts

Answer each in a sentence or two. Then cut whatever you'd skip if you were
saying it out loud.

1. **Where it started.** Think of a deadline you missed, a call you found the day
   after it closed, or the spreadsheet you kept. Tell one moment, with a real
   detail: the month, the magazine type, the number of tabs.
2. **What you make.** Say what you make and how long you've been sending it out.
   Readers trust a founder who has had the rejections too.
3. **What Missa does about it.** One sentence, no feature list. "Find the call.
   Make the deadline." is the short version, so say it your way.
4. **What it won't do.** Pick the promise that matters most to you, for example:
   - never charging to see a deadline;
   - never writing or judging the work;
   - never selling what people save.
5. **Who it's for.** Name a few of the people you picture using it, in your words.
6. **The sign-off.** Say how you'd like people to reach you, if at all.

## Rules from the guide

- Write in the first person, to one reader.
- Leave out "journey", "empower", "ecosystem", "creators", "unlock" and "seamless".
- Every claim has to be true today. If something is coming, say "soon", or
  leave it out.
- Keep any joke about the admin, never about the work. One joke at most.
- Use US spelling. UK readers see UK spelling automatically only for words
  `sp()` knows, so avoid spellings that differ if you can.
- Run `npm run check:language` after you add it.
