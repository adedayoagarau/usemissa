# Literary database Phase 3 global ingestion

Started: September 5, 2026.

Phase 3 expands the literary database through regional, source-specific crawl
tranches. This handoff records source seeds and execution boundaries only. It
does not certify production ingestion, publication, translated summaries, or
live route counts.

## Phase 3 boundary

- Add curated first-party source seeds for regional literary magazines, journals
  and small presses.
- Preserve country metadata so `/countries` and profile pages can reconcile
  local publishers separately from worldwide eligibility.
- Keep every source as reviewable evidence until the existing Radar extractor,
  publication gate and human review approve individual opportunity records.
- Treat multilingual guideline summaries as review output, not original source
  text. Store the original source URL and raw extracted facts beside any
  translated summary.

## Tranche A: African literary ecosystems

Implemented registry bundle:
`packages/radar-engine/src/registry/bundles/global-literary-phase-3.ts`

Initial first-party seeds:

| Country | Source | URL | Registry vertical | Notes |
| --- | --- | --- | --- | --- |
| Nigeria | Naira Stories | `https://nairastories.com/print-submissions/` | `creative-nonfiction` | Print magazine submission guidelines. |
| Nigeria | LOGOS Magazine | `https://www.logosmagazine.com.ng/` | `literary-fiction` | Magazine and writing community entry point. |
| Nigeria | The Inkline | `https://www.tilmagazine.com.ng/p/be-contributor.html` | `literary-fiction` | Contributor guidelines. |
| Nigeria | Agbowo | `https://agbowo.org/submissions/` | `literary-fiction` | Literary and art magazine submissions page. |
| Pan-African / diaspora | African Writer Magazine | `https://www.africanwriter.com/submissions/` | `literary-fiction` | African and diaspora literary magazine guidelines. |
| Pan-African / diaspora | The Iroko Circle | `https://theirokocircle.org/submissions/` | `literary-fiction` | African literature submissions page. |
| Pan-African / diaspora | Brittle Paper | `https://brittlepaper.com/submissions/` | `creative-nonfiction` | African literary platform submissions page. |
| Pan-African / diaspora | Omenana | `https://omenana.com/omenana-submissions/` | `flash-hybrid` | African speculative fiction magazine submissions page. |
| Ghana | Nenta Literary Journal | `https://www.nentajournal.com/submissions` | `literary-fiction` | Ghanaian literary journal submission guidelines. |
| Ghana | Ta Adesa | `https://taadesa.org/about-us/` | `literary-fiction` | Magazine about page with submission handoff. |
| Ghana | Hummingbird Journal | `https://www.creativesprojectgh.com/` | `literary-fiction` | Creative journal open-call entry point. |
| Pan-African / multilingual | Lolwe | `https://lolwe.submittable.com/submit` | `literary-fiction` | Multilingual literary submission manager. |
| Kenya / pan-African | Jalada Africa | `https://jalada.submittable.com/` | `flash-hybrid` | Pan-African writers collective submission manager. |
| Kenya | Inkazi Africa | `https://www.inkaziafrica.com/submit-manuscript/` | `novel-book` | Publisher and manuscript submissions page. |
| South Africa | KUDU Journal | `https://kudujournal.wordpress.com/submissions/` | `literary-fiction` | Journal submission guidelines. |
| South Africa | Botsotso Publishing | `https://botsotso.org.za/contact-submissions/` | `poetry` | Journal and publisher submissions page. |
| South Africa | Coinage Africa | `https://coinage.africa/call-for-submissions-coinage-book-three-coinage-africa/` | `literary-fiction` | Literary journal call page. |
| Namibia | Doek | `https://doeklitmag.com/submissions/` | `literary-fiction` | Literary magazine submissions page. |
| Zimbabwe / African literature | Munyori Literary Journal | `https://munyoriliteraryjournal.submittable.com/` | `literary-fiction` | Literary journal submission manager. |
| Cameroon | Bakwa Magazine | `https://bakwamagazine.com/news-events/submissions/` | `creative-nonfiction` | Literary magazine submissions page. |
| Botswana / African literature | Kalahari Review | `https://kalaharireview.com/about` | `literary-fiction` | African writing magazine with submission contact details. |

This tranche is still not a comprehensive Africa index. It is an executable
seed set that broadens coverage beyond the first Nigeria/Ghana/South Africa
pass. Additional country-specific work should continue for Ethiopia, Uganda,
Tanzania, Senegal, Egypt, Morocco, Sudan, Angola, Mozambique, Zambia, Malawi,
Sierra Leone, Liberia, Mauritius and francophone/lusophone literary ecosystems.

## Next execution gate

1. Run the registry tests and source-registry export.
2. Review the generated source entries for duplicate URLs and inherited
   taxonomy.
3. Run a dry discovery crawl against only the Phase 3 source IDs.
4. Inspect extracted profile/opportunity candidates before any sync.
5. Publish nothing until the normal Missa evidence gate approves source,
   organizer identity, official destination, deadline/window, and public copy.

## Validation added

`packages/radar-engine/test/registry.test.ts` now asserts the Phase 3 tranche:

- remains tier-0 first-party source seeds;
- carries magazine opportunity typing;
- preserves `BW`, `CM`, `GH`, `KE`, `NA`, `NG`, `ZA`, `ZW` and `global`
  geography;
- keeps the tranche marked as Phase 3 source work.
