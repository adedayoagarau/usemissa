# Missa practice taxonomy

Status: working draft

This document defines the vocabulary Missa uses to describe a person's practice and the work an
opportunity accepts. It is intentionally separate from opportunity type, source type, eligibility,
and geography.

The taxonomy is a growing, versioned graph. It is not one fixed category tree and it should never
be reduced to one `genre` field.

## 1. Classification model

| Axis                    | Question it answers                                        | Examples                                               |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| **Practice family**     | What broad world does this work belong to?                 | Writing & literature, visual arts, film & moving image |
| **Discipline**          | What recognised field does the person practise?            | Poetry, painting, directing, choreography              |
| **Form**                | What kind of work or object is being made?                 | Sonnet, novel, short film, mural, album                |
| **Genre**               | What creative tradition or content convention does it use? | Horror, documentary, portraiture, jazz                 |
| **Subgenre**            | What narrower tradition does it use?                       | Folk horror, observational documentary, bebop          |
| **Medium**              | What material or carrier is the work made in?              | Oil paint, 16mm film, text, clay, audio                |
| **Technique / process** | How is it made?                                            | Etching, stop motion, improvisation, hand weaving      |
| **Mode / approach**     | How does the work operate?                                 | Experimental, participatory, site-specific, hybrid     |
| **Role**                | What does the person do in the work?                       | Writer, editor, director, producer, curator            |
| **Theme / subject**     | What is the work about?                                    | Climate, migration, memory, technology                 |
| **Audience**            | Who is it for?                                             | Children, young adult, general, scholarly              |
| **Language**            | What language is used?                                     | English, Yoruba, multilingual, non-verbal              |

These are independent facets. A work might be:

```text
Practice family: Film & moving image
Discipline: Documentary filmmaking
Form: Short film
Genre: Documentary
Subgenre: Observational documentary
Medium: Digital video
Approach: Participatory
Role: Director
Theme: Migration
Language: Yoruba + English
```

The following must stay outside the practice taxonomy:

- **Opportunity type:** grant, residency, fellowship, award, contest, festival, magazine call,
  exhibition, commission, RFP, pitch, conference, scholarship, job or training programme.
- **Eligibility:** career stage, age, identity, disability, location, nationality, education,
  membership, organisation type, income, or first/debut status.
- **Commercial terms:** fee, prize, stipend, commission value, expenses, royalties, or rights.
- **Source kind:** official organisation page, application platform, funder portal, directory,
  newsletter, feed, social account, or user suggestion.
- **Application material:** portfolio, manuscript, screener, treatment, CV, budget, proposal,
  statement, references, or work sample.

## 2. Canonical practice families and disciplines

This is the seed vocabulary. A person or opportunity can belong to more than one family and more
than one discipline.

### 2.1 Writing & literature

- **Poetry**
  - Forms: individual poem, sequence, chapbook, pamphlet, collection, book-length manuscript,
    spoken-word text, visual poem.
  - Genres and modes: lyric, narrative, dramatic, epic, elegy, pastoral, devotional, political,
    eco-poetry, speculative, confessional, documentary, experimental, concrete, prose poetry.
  - Form-level subgenres: sonnet, ghazal, haiku, tanka, villanelle, sestina, ode, ballad, pantoum,
    erasure, found poem.
- **Fiction**
  - Forms: microfiction, flash fiction, short story, novelette, novella, novel, serial, linked
    collection.
  - Genres: literary fiction, romance, science fiction, fantasy, horror, mystery, crime, thriller,
    historical fiction, adventure, western, satire, humour, speculative fiction, magical realism.
  - Common subgenres: climate fiction, Afrofuturism, cyberpunk, solarpunk, space opera, epic
    fantasy, urban fantasy, paranormal romance, romantic comedy, cosy mystery, noir, folk horror,
    gothic, psychological thriller, alternate history.
- **Creative nonfiction**
  - Forms: personal essay, lyric essay, memoir, autobiography, biography, profile, travel writing,
    nature writing, food writing, cultural writing, narrative journalism, book-length nonfiction.
  - Genres and modes: literary journalism, documentary, criticism, humour, true crime, history,
    science writing, environmental writing, spiritual writing.
- **Dramatic writing**
  - Disciplines: playwriting, screenwriting, television writing, audio drama, radio drama,
    libretti, musical-theatre book writing, interactive narrative.
  - Forms: monologue, one-act, full-length play, short screenplay, feature screenplay, pilot,
    episode, series bible, treatment, stage musical, opera libretto.
- **Children's and young people's writing**
  - Forms: board book, picture book, early reader, chapter book, middle-grade, young adult,
    educational writing.
  - Genres inherit from fiction, nonfiction, poetry, comics, and drama rather than forming a
    separate genre universe.
- **Translation and multilingual writing**
  - Disciplines: literary translation, poetry translation, dramatic translation, subtitling,
    adaptation, bilingual and multilingual writing.
- **Journalism**
  - Disciplines: reporting, investigative journalism, longform, features, commentary, criticism,
    photojournalism, data journalism, broadcast journalism, audio journalism.
- **Criticism and arts writing**
  - Disciplines: literary criticism, art criticism, film criticism, music criticism, theatre and
    dance criticism, cultural criticism, reviewing, scholarly criticism.
- **Editing and publishing**
  - Disciplines: developmental editing, copy editing, commissioning, literary editing,
    publishing, small press, zine publishing, book design, literary programming.
- **Comics writing and graphic narrative**
  - Forms: comic strip, single issue, serial, graphic novel, webcomic, manga, memoir comic,
    editorial comic.

### 2.2 Visual arts

- **Painting**
  - Genres and modes: portraiture, landscape, still life, figurative, abstraction, history
    painting, genre scenes, botanical, miniature, mural, iconography, plein-air, conceptual.
  - Media: oil, acrylic, watercolour, gouache, tempera, encaustic, ink, fresco, spray paint,
    mixed media.
- **Drawing**
  - Genres and modes: observational, figure, architectural, botanical, comic, technical,
    automatic, conceptual.
  - Media: graphite, charcoal, pastel, chalk, ink, silverpoint, coloured pencil, digital drawing.
- **Sculpture**
  - Forms and modes: freestanding, relief, assemblage, kinetic, monumental, figurative, abstract,
    land art, soft sculpture, sound sculpture.
  - Media: stone, wood, metal, clay, plaster, resin, glass, fibre, found objects, digital
    fabrication.
- **Printmaking**
  - Techniques: relief, woodcut, linocut, intaglio, etching, engraving, drypoint, aquatint,
    lithography, screenprint, monotype, risograph, letterpress.
- **Installation art**
  - Modes: site-specific, immersive, interactive, room-scale, light, sound, environmental,
    temporary, public.
- **Conceptual art**
  - Forms: instruction, text work, archive, intervention, institutional critique, research-led
    work, dematerialised practice.
- **Collage and assemblage**
  - Forms: analogue collage, photomontage, decollage, digital collage, object assemblage.
- **Book, paper and artist publications**
  - Forms: artist's book, altered book, zine, edition, paper art, pop-up, print portfolio.
- **Public art**
  - Forms: monument, memorial, mural, temporary intervention, light work, civic installation,
    socially engaged commission, percent-for-art work.
- **Land and environmental art**
  - Modes: earthwork, ecological art, garden work, environmental installation, restoration-led
    practice.
- **Digital and computational visual art**
  - Forms: digital image, generative image, data visualisation as art, algorithmic art, AI-assisted
    art, browser art, screen-based work.

### 2.3 Photography

- **Fine-art photography**
- **Documentary photography**
  - Subgenres: social documentary, long-term documentary, conservation, humanitarian.
- **Photojournalism**
  - Subgenres: news, conflict, sports, feature, reportage.
- **Portrait photography**
  - Subgenres: environmental, editorial, studio, self-portraiture.
- **Street and vernacular photography**
- **Landscape, nature and wildlife photography**
- **Architectural and interior photography**
- **Fashion and beauty photography**
- **Still-life, food and product photography**
- **Scientific, medical and forensic photography**
- **Experimental and alternative-process photography**
  - Techniques: cyanotype, tintype, wet plate, photogram, pinhole, infrared, instant, cameraless,
    manipulated image.
- Media: analogue film, digital, large format, medium format, mobile, instant, archival process.

### 2.4 Film & moving image

- **Narrative filmmaking**
  - Forms: micro-short, short, medium-length, feature, episodic, serial, web series.
  - Genres: drama, comedy, romance, science fiction, fantasy, horror, thriller, mystery, crime,
    action, adventure, historical, western, musical, war, family.
  - Subgenres reuse the writing vocabulary where appropriate: romantic comedy, psychological
    horror, folk horror, neo-noir, political thriller, Afrofuturism, social realism.
- **Documentary filmmaking**
  - Forms: short, feature, series, essay film, news documentary.
  - Subgenres and modes: observational, participatory, expository, poetic, reflexive,
    performative, investigative, archival, biographical, ethnographic, nature, music, sports.
- **Experimental film and artist moving image**
  - Forms: structural film, abstract film, found-footage film, expanded cinema, gallery film,
    video essay, diary film.
- **Animation**
  - Techniques: 2D drawn, 3D/CG, stop motion, clay animation, cut-out, puppet, rotoscope, motion
    graphics, paint-on-glass, sand, experimental animation.
- **Television and episodic media**
  - Forms: pilot, episode, limited series, ongoing series, factual entertainment, unscripted,
    documentary series.
- **Commercial and commissioned moving image**
  - Forms: music video, fashion film, branded film, advertisement, trailer, campaign film.
- **Immersive and interactive film**
  - Forms: VR film, AR narrative, 360 film, interactive documentary, branching narrative.
- **Film crafts and roles**
  - Directing, producing, cinematography, editing, production design, costume, sound, composing,
    colour, visual effects, casting, acting, distribution, programming.

### 2.5 Music & sound

- **Composition**
  - Concert, chamber, orchestral, choral, opera, electroacoustic, experimental, site-specific,
    film/game/media scoring.
- **Songwriting**
  - Lyrics, topline, popular song, art song, musical theatre, collaborative songwriting.
- **Performance**
  - Solo, ensemble, band, orchestra, choir, improvisation, live electronics, conducting.
- **Music production and recording**
  - Producing, engineering, mixing, mastering, beat-making, sampling, remixing.
- **Sound art**
  - Installation, sound sculpture, field recording, soundwalk, radio art, spatial audio,
    acousmatic work.
- **DJ and electronic practice**
  - DJing, live coding, synthesis, electronic performance, turntablism.
- **Genre families**
  - Classical and contemporary classical: medieval, baroque, classical, romantic, modern,
    minimalist, spectral, new complexity.
  - Jazz: traditional, swing, bebop, hard bop, cool, modal, free, fusion, spiritual jazz.
  - Blues, gospel and spiritual music.
  - Folk, traditional, roots, country and bluegrass.
  - Rock: alternative, indie, punk, post-punk, metal, psychedelic, progressive.
  - Pop: art pop, indie pop, synth-pop, dance-pop, singer-songwriter.
  - R&B and soul: soul, funk, contemporary R&B, neo-soul.
  - Hip-hop: conscious, alternative, trap, drill, grime, instrumental hip-hop.
  - Electronic: ambient, house, techno, jungle, drum and bass, garage, dubstep, trance,
    experimental electronic.
  - African and diasporic: highlife, Afrobeats, Afrobeat, amapiano, juju, fuji, soukous, makossa,
    mbalax, gqom, palm-wine, Afro-jazz.
  - Latin and Caribbean: salsa, son, reggaeton, bachata, merengue, samba, bossa nova, reggae,
    dancehall, dub, soca, calypso.
  - Global traditional and Indigenous music should use community-preferred names and provenance,
    not a single catch-all “world music” label.

### 2.6 Theatre & dramatic arts

- Playwriting, directing, acting, dramaturgy, producing, stage management.
- Musical theatre, opera, physical theatre, devised theatre, documentary theatre, verbatim
  theatre, immersive theatre, site-specific theatre, theatre for young audiences.
- Comedy: stand-up, sketch, improv, character comedy.
- Puppetry, object theatre, mask, mime, clowning, circus and aerial performance.
- Design disciplines: set, costume, lighting, sound, projection, props, hair and makeup.
- Forms: monologue, one-act, full-length, staged reading, workshop production, promenade,
  participatory performance.

### 2.7 Dance & choreography

- Ballet and classical dance.
- Modern, postmodern and contemporary dance.
- Jazz, tap and musical-theatre dance.
- Street and club forms: breaking, hip-hop, popping, locking, house, waacking, krump, vogue.
- African and diasporic forms, including community- and region-specific traditions.
- South Asian classical and contemporary forms.
- Folk, traditional and Indigenous dance, using community-preferred names.
- Ballroom, Latin and social dance.
- Dance theatre, screendance, site-specific dance, aerial dance, integrated and disability-led
  dance.
- Roles: choreographer, dancer, rehearsal director, movement director, dance filmmaker,
  dramaturg, producer.

### 2.8 Performance & live art

- Performance art, body art, durational work, action, happening, intervention.
- Live art, participatory performance, relational work, one-to-one performance.
- Spoken word, storytelling, live literature, poetry performance.
- Drag, cabaret, burlesque, variety, live art comedy.
- Site-specific, public-space, socially engaged and digital-live performance.

### 2.9 Illustration, comics & sequential art

- Editorial, book, children's, scientific, medical, fashion, architectural, advertising and
  concept illustration.
- Comics, graphic novels, manga, webcomics, newspaper strips, minicomics, zines, editorial
  cartoons, political cartoons.
- Animation concept art, storyboarding, character design and visual development.
- Media and techniques: ink, paint, print, collage, vector, raster, 3D, sequential mixed media.

### 2.10 Craft & material arts

- Ceramics and pottery.
- Glass: blown, cast, kiln-formed, stained, lampworked.
- Fibre and textile: weaving, knitting, crochet, embroidery, quilting, felting, dyeing, tapestry,
  surface design.
- Jewellery, metalsmithing and enamel.
- Woodwork, carving, turning and furniture making.
- Leatherwork, shoemaking and saddlery.
- Basketry, cane, reed and natural-fibre work.
- Paper craft, bookbinding, marbling and papermaking.
- Mosaic, tile, lacquer, miniature and decorative arts.
- Traditional, folk and Indigenous craft should retain culture-, place-, and community-specific
  names as first-class terms.

### 2.11 Design

- Graphic design, visual communication, branding and identity.
- Typography, type design, lettering and calligraphy.
- Editorial, publication and information design.
- Illustration and motion design.
- Product and industrial design.
- Furniture, lighting and object design.
- Digital product, UX, UI, interaction and service design.
- Web, app, interface and experience design.
- Social, civic, systems and transition design.
- Exhibition, wayfinding and environmental graphic design.
- Design research, speculative design, critical design and design futures.

### 2.12 Architecture, spatial practice & public realm

- Architecture, landscape architecture, interior architecture and interior design.
- Urban design, urbanism, planning and placemaking.
- Spatial practice, installation architecture, temporary structures and pavilions.
- Exhibition, museum, retail, event and set design.
- Heritage conservation, adaptive reuse and restoration.
- Sustainable, ecological, humanitarian and community architecture.
- Public realm, civic design and participatory planning.
- Digital architecture, computational design and fabrication.

### 2.13 Fashion, costume & wearable practice

- Fashion design, knitwear, textile design, surface design and print.
- Costume design for stage, film, dance and live performance.
- Footwear, accessories, millinery, jewellery and wearable objects.
- Fashion photography, film, styling, direction and illustration.
- Wearable technology, smart textiles, adaptive fashion and sustainable fashion.
- Couture, ready-to-wear, streetwear and experimental fashion are modes or market contexts, not
  separate practice families.

### 2.14 Digital, interactive & immersive arts

- Creative coding, generative art, algorithmic art and software art.
- Net art, browser art, digital publishing and online performance.
- Interactive installation, physical computing, electronics and robotics.
- Data art, data storytelling and creative visualisation.
- Virtual reality, augmented reality, mixed reality, spatial computing and 360 work.
- Projection mapping, immersive environments and responsive media.
- AI-assisted and machine-learning art, with process and authorship provenance.
- Blockchain-based work may be tagged as a technology or distribution method; it is not a
  practice family by itself.

### 2.15 Games & playful media

- Digital games, mobile games, browser games and interactive fiction.
- Tabletop, card, board, role-playing and live-action role-playing games.
- Game design, systems design, level design, narrative design and game writing.
- Game art, animation, audio, composition and technical art.
- Serious games, educational games, games for change, experimental games and art games.
- Immersive theatre and interactive narrative can be cross-tagged with performance or film.

### 2.16 Curatorial, cultural & publishing practice

- Curating, exhibition making, public programming and festival programming.
- Arts criticism, cultural journalism and research-led criticism.
- Museum, gallery, library and cultural-centre practice.
- Archiving, oral history, collections, cataloguing and digital humanities.
- Conservation and restoration of objects, paper, paintings, textiles, time-based media and built
  heritage.
- Publishing, editing, commissioning, art books, catalogues, journals and independent presses.
- Producing, arts administration, artist management and cultural policy.

### 2.17 Social, community & participatory practice

- Socially engaged art, community arts, participatory arts and co-creation.
- Civic practice, public practice, creative placemaking and cultural organising.
- Arts and health, wellbeing, disability arts and care-based practice.
- Arts education, teaching artistry, youth arts and intergenerational practice.
- Environmental, ecological, food, land and climate practice.
- Conflict transformation, justice, human rights and peacebuilding practice.

These describe methods and contexts. Identity eligibility such as Black, Indigenous, queer,
disabled, women-led, migrant, refugee, or region-specific belongs in the eligibility facet, while
identity-led artistic traditions may also be represented with community-approved practice terms.

### 2.18 Research & knowledge production

- Artistic research, practice-based research and research-creation.
- Humanities, arts and cultural research.
- Social science, policy, science and technology research where Missa carries calls for papers,
  fellowships, residencies, commissions or public-engagement work.
- Forms: paper, abstract, poster, panel, workshop, lecture-performance, research proposal,
  publication, prototype, dataset, public output.

Research subjects should not be treated as creative genres. The discipline, method, output form,
and opportunity type remain separate.

### 2.19 Interdisciplinary, hybrid & emerging practice

- Interdisciplinary, multidisciplinary, transdisciplinary and cross-disciplinary practice.
- Hybrid writing, expanded publishing and text-image work.
- Moving-image installation, sound-performance, dance-film, performance lecture and artist film.
- Art-science, bio art, eco art, speculative practice and research-creation.
- Emerging practices should combine existing facets first. A new canonical discipline is added
  only when real opportunities and practitioners use it consistently.

## 3. Shared controlled vocabularies

### Forms

Forms name the unit being submitted or produced. Initial cross-practice forms include:

- single work, series, sequence, collection, portfolio, manuscript, book, chapbook, zine;
- short, feature, episode, series, installation, exhibition, performance, production;
- proposal, concept, prototype, commission design, public artwork;
- album, EP, single, score, composition, live set;
- paper, abstract, panel, workshop, poster, lecture, lecture-performance;
- digital experience, game, interactive work, website, application, dataset.

Each form should have a discipline context. `Short` alone is invalid; `short story`, `short film`,
and `short play` are distinct forms.

### Media

Initial medium families:

- text, print, paper, book, PDF;
- drawing media, paint, ink, pigment;
- photography, analogue film, digital image;
- video, celluloid film, animation, projection;
- audio, recorded music, live sound, radio;
- clay, ceramic, glass, stone, metal, wood, fibre, textile, leather, found material;
- body, movement, voice, live performance;
- software, code, data, web, game engine, electronics, robotics;
- VR, AR, mixed reality, spatial media;
- built space, landscape, public space;
- mixed media and unspecified.

File format (`PDF`, `JPG`, `MP4`, `WAV`) is a technical requirement and should not replace the
creative medium (`manuscript`, `photography`, `film`, `audio work`).

### Modes and approaches

- analogue, digital, hybrid;
- traditional, contemporary, experimental;
- narrative, abstract, figurative, conceptual;
- documentary, fictional, speculative;
- solo, collaborative, collective;
- site-specific, place-based, public-space, online;
- participatory, co-created, community-led, socially engaged;
- immersive, interactive, durational, live;
- research-led, process-led, material-led;
- ecological, sustainable, repair, reuse;
- interdisciplinary, multidisciplinary, transdisciplinary.

### Roles

- writer, poet, novelist, essayist, playwright, screenwriter, translator, journalist, editor;
- artist, painter, sculptor, printmaker, photographer, illustrator, comic artist;
- director, producer, filmmaker, cinematographer, editor, animator, production designer;
- composer, songwriter, musician, performer, vocalist, conductor, producer, sound artist;
- choreographer, dancer, actor, dramaturg, theatre-maker, performance artist;
- designer, architect, craftsperson, maker, developer, game designer;
- curator, critic, researcher, archivist, conservator, educator, facilitator, programmer;
- collective, duo, ensemble, band, company, organisation.

Role labels can be more specific than discipline labels and a person may hold several roles.

## 4. Taxonomy operating rules

1. **Use stable IDs and editable labels.** Renaming a label must not break saved searches or old
   opportunity records.
2. **Allow many parents.** `Screenwriting` can sit under writing and film; `sound installation`
   can sit under sound art and installation.
3. **Store aliases.** Examples: `creative non-fiction` → `creative-nonfiction`; `movies` → `film`;
   `theater` → `theatre`; `fine art` → `visual-arts` only when the source is genuinely broad.
4. **Retain the source phrase.** Canonical classification must sit beside the exact term used by
   the publisher for audit and correction.
5. **Never infer eligibility from practice.** `Indigenous arts` does not prove that only Indigenous
   applicants are eligible; the source's rule must be captured separately.
6. **Never infer genre from file format.** An MP4 can be film, animation, documentation of a
   performance, or a video portfolio.
7. **Support unknown and other.** Unknown means the source did not say. Other means it said
   something the current vocabulary does not yet represent.
8. **Version additions and deprecations.** Do not delete a used term. Deprecate it, point to its
   replacement, and migrate references deliberately.
9. **Promote terms from evidence.** Add a term when multiple authoritative sources or a recognised
   practitioner community use it, not because an extractor invented it once.
10. **Do not make the UI expose the whole graph.** Search, aliases, suggested facets and
    discipline-specific drill-down should reveal only useful choices.

## 5. Relationship to the source engine

Source coverage should be measured against combinations of facets, not against a flat list of
verticals:

```text
practice family × discipline × opportunity type × geography × source tier
```

For example:

```text
Film & moving image × Documentary filmmaking × Grant × Africa × Official funder
Visual arts × Painting × Residency × Global × Official programme page
Writing & literature × Poetry × Magazine call × Nigeria × Official publisher page
```

Platforms and directories are discovery channels, not disciplines. Identity-led sources are a
coverage and eligibility lens, not a creative genre. Residencies and grants are opportunity types,
not practice families.

The source inventory built from this taxonomy should record, for every cell:

- authoritative organisations and their official call pages;
- application platforms used in that practice;
- trusted directories, newsletters, feeds and professional bodies used for discovery;
- geographic and language coverage;
- source freshness, last successful check and evidence quality;
- known gaps and the next discovery query or partner needed to fill them.

## 6. Immediate migration notes

The current Radar registry is a useful source seed, but its `verticalId` and `disciplines` values
mix several axes. Migration should preserve every source and map it onto the new facets.

- `writing-residency` → practice `writing-literature`; opportunity type `residency`.
- `film-festival` → practice `film-moving-image`; opportunity type `festival`.
- `public-art` → discipline `public-art`; opportunity types may include `commission`, `open-call`
  or `rfp`.
- `bipoc-focused`, `lgbtq-focused`, `disability-arts`, `indigenous-arts` → coverage/eligibility
  facets, plus real practice disciplines taken from each source.
- `platform-filmfreeway`, `platform-submittable`, and similar values → source channel/platform,
  with disciplines and opportunity types taken from each listing.
- `grants-us-state` and `grants-international` → geography and funder/source collections, not
  disciplines.

This migration can be additive: introduce canonical facets and aliases first, backfill the 1,000+
source records, compare coverage, and retire overloaded vertical labels only after all consumers
read the new model.
