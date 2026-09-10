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

## Country-by-country ledger

Status means source-seed status only. It does not mean the country catalogue is
complete, ingested, or published.

| Country | Status | Current source seeds |
| --- | --- | --- |
| Algeria | Research needed | - |
| Angola | Research needed | - |
| Benin | Research needed | - |
| Botswana | Seeded | Kalahari Review |
| Burkina Faso | Research needed | - |
| Burundi | Research needed | - |
| Cameroon | Seeded | Bakwa Magazine |
| Cape Verde | Research needed | - |
| Central African Republic | Research needed | - |
| Chad | Research needed | - |
| Comoros | Research needed | - |
| Republic of the Congo | Research needed | - |
| Democratic Republic of the Congo | Research needed | - |
| Cote d'Ivoire | Research needed | - |
| Djibouti | Research needed | - |
| Egypt | Research needed | - |
| Equatorial Guinea | Research needed | - |
| Eritrea | Research needed | - |
| Eswatini | Research needed | - |
| Ethiopia | Research needed | - |
| Gabon | Research needed | - |
| Gambia | Research needed | - |
| Ghana | Seeded | Nenta Literary Journal; Ta Adesa; Hummingbird Journal |
| Guinea | Research needed | - |
| Guinea-Bissau | Research needed | - |
| Kenya | Seeded | Jalada Africa; Inkazi Africa |
| Lesotho | Research needed | - |
| Liberia | Research needed | - |
| Libya | Research needed | - |
| Madagascar | Research needed | - |
| Malawi | Research needed | - |
| Mali | Research needed | - |
| Mauritania | Research needed | - |
| Mauritius | Research needed | - |
| Morocco | Research needed | - |
| Mozambique | Research needed | - |
| Namibia | Seeded | Doek |
| Niger | Research needed | - |
| Nigeria | Seeded | Naira Stories; LOGOS Magazine; The Inkline; Agbowo |
| Rwanda | Research needed | - |
| Sao Tome and Principe | Research needed | - |
| Seychelles | Research needed | - |
| Senegal | Research needed | - |
| Sierra Leone | Research needed | - |
| Somalia | Research needed | - |
| South Africa | Seeded | KUDU Journal; Botsotso Publishing; Coinage Africa |
| South Sudan | Research needed | - |
| Sudan | Research needed | - |
| Tanzania | Research needed | - |
| Togo | Research needed | - |
| Tunisia | Research needed | - |
| Uganda | Seeded | Writivism |
| Zambia | Seeded | Ubwali |
| Zimbabwe | Seeded | Munyori Literary Journal |

Initial first-party seeds:

| Country | Source | URL | Registry vertical | Notes |
| --- | --- | --- | --- | --- |
| Nigeria | Naira Stories | `https://nairastories.com/print-submissions/` | `creative-nonfiction` | Print magazine submission guidelines. |
| Nigeria | LOGOS Magazine | `https://www.logosmagazine.com.ng/` | `literary-fiction` | Magazine and writing community entry point. |
| Nigeria | The Inkline | `https://www.tilmagazine.com.ng/p/be-contributor.html` | `literary-fiction` | Contributor guidelines. |
| Nigeria | Agbowo | `https://agbowo.org/submissions/` | `literary-fiction` | Literary and art magazine submissions page. |
| Pan-African / diaspora | AFREADA | `https://www.afreada.com/submissions` | `literary-fiction` | African short fiction submission guidelines. |
| Pan-African / diaspora | Africa in Dialogue | `https://africaindialogue.com/submissions/` | `creative-nonfiction` | Interview and long-form dialogue submissions. |
| Pan-African / diaspora | Afritondo | `https://www.afritondo.com/submission` | `literary-fiction` | African and Black diaspora literary submission page. |
| Pan-African / diaspora | Akuko Magazine | `https://www.akukomagazine.com/submission` | `literary-fiction` | African and diaspora magazine submission guidelines. |
| Pan-African / diaspora | A Long House | `https://alonghouse.submittable.com/submit` | `flash-hybrid` | Experimental literary magazine submission manager. |
| Pan-African / diaspora | African Writer Magazine | `https://www.africanwriter.com/submissions/` | `literary-fiction` | African and diaspora literary magazine guidelines. |
| Pan-African / diaspora | The Iroko Circle | `https://theirokocircle.org/submissions/` | `literary-fiction` | African literature submissions page. |
| Pan-African / diaspora | Brittle Paper | `https://brittlepaper.com/submissions/` | `creative-nonfiction` | African literary platform submissions page. |
| Pan-African / diaspora | Omenana | `https://omenana.com/omenana-submissions/` | `flash-hybrid` | African speculative fiction magazine submissions page. |
| Pan-African / diaspora | Iskanchi | `https://www.iskanchi.com/blog/iskanchi-press-mag` | `flash-hybrid` | Magazine and press submission guidance. |
| Pan-African / diaspora | Isele Magazine | `https://iselemagazine.com/about/` | `literary-fiction` | Literary magazine with submission handoff. |
| Commonwealth / Africa-region | Adda Stories | `https://www.addastories.org/submissions/` | `creative-nonfiction` | Literary publication with Africa-region calls. |
| Uganda | Writivism | `https://writivism.org/submissions/` | `literary-fiction` | Literary initiative submissions page. |
| Ghana | Nenta Literary Journal | `https://www.nentajournal.com/submissions` | `literary-fiction` | Ghanaian literary journal submission guidelines. |
| Ghana | Ta Adesa | `https://taadesa.org/about-us/` | `literary-fiction` | Magazine about page with submission handoff. |
| Ghana | Hummingbird Journal | `https://www.creativesprojectgh.com/` | `literary-fiction` | Creative journal open-call entry point. |
| Pan-African / multilingual | Lolwe | `https://lolwe.submittable.com/submit` | `literary-fiction` | Multilingual literary submission manager. |
| Kenya / pan-African | Jalada Africa | `https://jaladaafrica.org/submissions/` | `flash-hybrid` | Pan-African writers collective submission page. |
| Kenya | Inkazi Africa | `https://www.inkaziafrica.com/submit-manuscript/` | `novel-book` | Publisher and manuscript submissions page. |
| South Africa | KUDU Journal | `https://kudujournal.wordpress.com/submissions/` | `literary-fiction` | Journal submission guidelines. |
| South Africa | Botsotso Publishing | `https://botsotso.org.za/contact-submissions/` | `poetry` | Journal and publisher submissions page. |
| South Africa | Coinage Africa | `https://coinage.africa/call-for-submissions-coinage-book-three-coinage-africa/` | `literary-fiction` | Literary journal call page. |
| Namibia | Doek | `https://doeklitmag.com/submissions/` | `literary-fiction` | Literary magazine submissions page. |
| Zimbabwe / African literature | Munyori Literary Journal | `https://munyoriliteraryjournal.submittable.com/` | `literary-fiction` | Literary journal submission manager. |
| Cameroon | Bakwa Magazine | `https://bakwamagazine.com/news-events/submissions/` | `creative-nonfiction` | Literary magazine submissions page. |
| Botswana / African literature | Kalahari Review | `https://kalaharireview.com/about` | `literary-fiction` | African writing magazine with submission contact details. |
| Zambia | Ubwali | `https://www.ubwali.com/submissions/` | `literary-fiction` | Literary magazine submissions page. |

## Database and directory multipliers

Implemented directory seeds:

| Source | URL | Why it matters | Ingestion boundary |
| --- | --- | --- | --- |
| Doek List | `https://doeklitmag.com/the-doek-list/` | Curated list of publications and organizations with a record of publishing or recognizing African writers and writers of African descent. | Tier-2 directory. Child links are review-needed source candidates. |
| African Literary Magazines Directory | `https://africanliterarymagazines.singlestory.org/business-directory/` | Dedicated African literary magazine database with directory records and category counts across fiction, poetry, essays, reviews and related genres. | Tier-2 directory. Child listings are review-needed candidates and must be checked against official publisher pages. |
| The Open Desk Writing Opportunities | `https://theopendesk.co/` | Current writing opportunities, including Africa and Black diaspora magazines, prizes, residencies and scholarships. | Tier-2 directory. Child links are review-needed source candidates. |
| PUBLISH'D AFRIKA African Writer List | `https://publishdafrika.com/2024/01/31/are-you-an-african-writer-or-a-writer-of-african-descent/` | Large African and African-diaspora publication list useful for recall, not source authority. | Tier-2 directory. Every child requires first-party verification. |

Research backstops not yet wired as Africa-specific ingestion seeds:

- Chill Subs: broad literary-magazine and indie-press database with current
  submission metadata; needs a clean Africa/Black-diaspora filter or API path
  before automated ingestion.
- Duotrope/Duosuma: broad market and submission-manager database; useful for
  manual reconciliation, but many details are subscription/listing mediated and
  must not replace publisher guidelines.
- CLMP: useful for membership/profile reconciliation, especially for diaspora
  and US-based African literary publishers, but not Africa-specific by default.

This tranche is still not a comprehensive Africa index. It is an executable
seed set that broadens coverage beyond the first Nigeria/Ghana/South Africa
pass. Additional country-specific work should proceed against the full
54-country ledger above, starting with the research-needed rows and using the
directory multipliers only as discovery evidence.

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
- includes tier-2 directory multipliers for Africa-specific source discovery;
- carries magazine opportunity typing;
- preserves `BW`, `CM`, `GH`, `KE`, `NA`, `NG`, `UG`, `ZA`, `ZM`, `ZW`
  and `global` geography;
- keeps a 54-country Africa ledger with every seeded country backed by a
  registry source name;
- keeps the tranche marked as Phase 3 source work.
