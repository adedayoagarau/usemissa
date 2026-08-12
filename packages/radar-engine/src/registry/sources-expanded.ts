import { directory, expandMany, feed, org, platform, type CompactSource } from './helpers.js';

/**
 * Curated discovery sources that widen the registry beyond the canonical org
 * pages. These are inputs, not opportunities: Radar must follow the outbound
 * link and verify the publisher before a call becomes public.
 */
const SOURCES: CompactSource[] = [
  // Literary: fiction, poetry, CNF, translation, kidlit and book prizes.
  directory('Poets & Writers Literary Magazines', 'https://www.pw.org/literary_magazines/a/all', 'literary-fiction', { disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'], opportunityTypes: ['magazine', 'contest'], geography: ['US', 'global'] }),
  feed('Poets & Writers Open Reading Periods', 'https://www.pw.org/open-reading-periods', 'literary-fiction', { disciplines: ['fiction', 'poetry', 'nonfiction'], opportunityTypes: ['magazine', 'contest', 'fellowship'], geography: ['US', 'global'] }),
  directory('Community of Literary Magazines and Presses', 'https://www.clmp.org/directory/', 'literary-fiction', { disciplines: ['fiction', 'poetry', 'nonfiction'], opportunityTypes: ['magazine', 'open-call'], geography: ['US'] }),
  directory('Reedsy Literary Magazines', 'https://reedsy.com/resources/literary-magazines/', 'literary-fiction', { disciplines: ['fiction', 'poetry', 'nonfiction'], opportunityTypes: ['magazine', 'contest'], geography: ['global'] }),
  directory('The Good Earth Publishers Literary Magazines', 'https://www.thegoodearthpublishers.com/literary-magazines', 'poetry', { disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'], opportunityTypes: ['magazine'], geography: ['global'] }),
  directory('Open Arts Forum Literary Opportunities', 'https://openartsforum.com/opportunities/', 'poetry', { disciplines: ['poetry', 'fiction', 'nonfiction', 'audio'], opportunityTypes: ['magazine', 'contest', 'open-call'], geography: ['global'] }),
  platform('Authors Publish', 'https://authorspublish.com/', 'novel-book', { disciplines: ['novel', 'manuscript', 'poetry'], opportunityTypes: ['magazine', 'contest', 'fellowship'], geography: ['global'] }),
  platform('Submittable Discover', 'https://discover.submittable.com/', 'platform-submittable', { disciplines: ['all-disciplines'], opportunityTypes: ['open-call', 'grant', 'contest', 'magazine'], geography: ['global'] }),
  directory('Literary Hub Opportunities', 'https://lithub.com/category/lit-magazines/', 'creative-nonfiction', { disciplines: ['fiction', 'poetry', 'nonfiction'], opportunityTypes: ['magazine', 'contest'], geography: ['global'] }),
  directory('The Poetry Society Opportunities', 'https://poetrysociety.org.uk/competitions/', 'poetry', { disciplines: ['poetry'], opportunityTypes: ['contest', 'award', 'fellowship'], geography: ['GB'] }),
  directory('NewPages Calls and Contests', 'https://www.newpages.com/classifieds-fee/all/', 'literary-fiction', { disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'], opportunityTypes: ['magazine', 'contest', 'open-call'], geography: ['US', 'global'], discoveryAdapterId: 'newpages-index' }),
  directory('Commonwealth Foundation Creative Opportunities', 'https://commonwealthfoundation.com/opportunities/', 'literary-fiction', { disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'], opportunityTypes: ['contest', 'fellowship', 'open-call'], geography: ['global'], discoveryAdapterId: 'commonwealth-index' }),

  // Grants, fellowships and public funding.
  directory('National Endowment for the Arts Grants', 'https://www.arts.gov/grants', 'grants-us-national', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship'], geography: ['US'] }),
  directory('Grants.gov Arts Funding', 'https://www.grants.gov/search-results.html?group=arts', 'grants-us-national', { disciplines: ['all-disciplines'], opportunityTypes: ['grant'], geography: ['US'], checkIntervalHours: 24, discoveryAdapterId: 'grants-gov-api' }),
  directory('Creative Capital Awards', 'https://creative-capital.org/opportunities/', 'grants-us-national', { disciplines: ['visual-arts', 'performing-arts', 'film', 'literature'], opportunityTypes: ['grant', 'fellowship'], geography: ['US'] }),
  directory('New York Foundation for the Arts', 'https://www.nyfa.org/awards-grants/', 'grants-us-national', { disciplines: ['visual-arts', 'literature', 'film', 'performing-arts'], opportunityTypes: ['grant', 'fellowship', 'award'], geography: ['US', 'global'] }),
  directory('Foundation for Contemporary Arts', 'https://www.foundationforcontemporaryarts.org/grants-awards/', 'grants-us-national', { disciplines: ['visual-arts', 'performing-arts', 'music'], opportunityTypes: ['grant', 'award'], geography: ['US'] }),
  directory('Pollock-Krasner Foundation', 'https://www.pkf.org/grants', 'visual-open-call', { disciplines: ['painting', 'sculpture', 'visual-arts'], opportunityTypes: ['grant'], geography: ['global'] }),
  directory('Harpo Foundation Grants', 'https://www.harpofoundation.org/grants/', 'visual-open-call', { disciplines: ['visual-arts', 'interdisciplinary'], opportunityTypes: ['grant'], geography: ['US'] }),
  directory('Artadia Awards', 'https://artadia.org/awards/', 'visual-open-call', { disciplines: ['visual-arts'], opportunityTypes: ['grant', 'award'], geography: ['US'] }),
  directory('The Awesome Foundation', 'https://www.awesomefoundation.org/en', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant'], geography: ['global'] }),
  directory('Grantmakers in the Arts', 'https://www.giarts.org/funding-opportunities', 'grants-international', { disciplines: ['arts-administration', 'all-disciplines'], opportunityTypes: ['grant', 'fellowship'], geography: ['US', 'global'] }),
  directory('Candid Grant Search', 'https://candid.org/find-us', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant'], geography: ['US', 'global'] }),
  directory('PEN America Literary Grants', 'https://pen.org/literary-grants/', 'fellowships', { disciplines: ['fiction', 'poetry', 'nonfiction', 'translation'], opportunityTypes: ['grant', 'fellowship', 'award'], geography: ['US', 'global'] }),
  directory('Literary Arts Fellowships', 'https://literary-arts.org/fellowships/', 'writing-residency', { disciplines: ['fiction', 'poetry', 'nonfiction', 'drama'], opportunityTypes: ['fellowship', 'grant'], geography: ['US'] }),
  directory('Whiting Foundation Awards', 'https://www.whiting.org/writers/awards', 'fellowships', { disciplines: ['fiction', 'poetry', 'nonfiction', 'drama'], opportunityTypes: ['fellowship', 'award'], geography: ['US'] }),
  directory('MacDowell Fellowships', 'https://www.macdowell.org/apply', 'writing-residency', { disciplines: ['all-disciplines'], opportunityTypes: ['fellowship', 'residency'], geography: ['US', 'global'] }),
  directory('Artist Communities Alliance', 'https://artistcommunities.org/directory', 'visual-residency', { disciplines: ['all-disciplines'], opportunityTypes: ['residency', 'fellowship'], geography: ['US', 'global'] }),
  directory('Res Artis Opportunities', 'https://resartis.org/en/residencies/', 'platform-resartis', { disciplines: ['all-disciplines'], opportunityTypes: ['residency', 'fellowship'], geography: ['global'] }),
  directory('TransArtists Residency Database', 'https://www.transartists.org/en/air', 'platform-transartists', { disciplines: ['all-disciplines'], opportunityTypes: ['residency', 'fellowship'], geography: ['global'] }),
  directory('On the Move Funding Guides', 'https://on-the-move.org/resources/funding', 'grants-international', { disciplines: ['performing-arts', 'visual-arts', 'music'], opportunityTypes: ['grant', 'fellowship', 'residency'], geography: ['global', 'EU'] }),
  directory('ArtConnect Opportunities', 'https://www.artconnect.com/opportunities', 'grants-international', { disciplines: ['visual-arts', 'film', 'photography', 'design'], opportunityTypes: ['grant', 'residency', 'open-call'], geography: ['global'] }),

  // Visual art, photography, public art, craft and curatorial calls.
  directory('Artinfoland Opportunities', 'https://artinfoland.com/', 'visual-open-call', { disciplines: ['visual-arts', 'photography', 'installation', 'sculpture'], opportunityTypes: ['grant', 'residency', 'open-call', 'exhibition'], geography: ['global'] }),
  directory('Open Call Radar', 'https://www.opencallradar.com/', 'visual-open-call', { disciplines: ['visual-arts', 'photography', 'film', 'sound', 'performance'], opportunityTypes: ['open-call', 'residency', 'grant', 'award'], geography: ['global'] }),
  directory('Opportuning Artist Opportunities', 'https://opportuning.art/', 'visual-open-call', { disciplines: ['visual-arts', 'performing-arts', 'writing', 'music', 'film'], opportunityTypes: ['grant', 'residency', 'open-call', 'fellowship'], geography: ['global'] }),
  directory('XHBT Open Calls', 'https://www.xhbt.org/open-calls', 'visual-open-call', { disciplines: ['painting', 'sculpture', 'photography', 'film', 'sound', 'performance'], opportunityTypes: ['open-call', 'contest', 'residency', 'commission'], geography: ['global'] }),
  directory('Open Arts Forum', 'https://openartsforum.com/opportunities/', 'visual-open-call', { disciplines: ['visual-arts', 'literature', 'film', 'performance'], opportunityTypes: ['open-call', 'exhibition', 'residency'], geography: ['global'] }),
  directory('CuratorSpace Open Calls', 'https://www.curatorspace.com/opportunities', 'curatorial', { disciplines: ['curatorial', 'visual-arts', 'craft'], opportunityTypes: ['open-call', 'exhibition', 'commission'], geography: ['GB', 'global'] }),
  directory('ArtDeadline Opportunities', 'https://www.artdeadline.com/', 'visual-open-call', { disciplines: ['visual-arts', 'photography', 'film', 'craft'], opportunityTypes: ['open-call', 'contest', 'residency'], geography: ['US', 'global'] }),
  directory('Women Photograph Grants', 'https://www.womenphotograph.com/grants', 'photography', { disciplines: ['photography', 'photojournalism'], opportunityTypes: ['grant', 'fellowship'], geography: ['global'] }),
  directory('LensCulture Photography Awards', 'https://www.lensculture.com/competitions', 'photography', { disciplines: ['photography'], opportunityTypes: ['award', 'contest'], geography: ['global'] }),
  directory('World Photography Organisation', 'https://www.worldphoto.org/competitions', 'photography', { disciplines: ['photography'], opportunityTypes: ['award', 'contest'], geography: ['global'] }),
  directory('Public Art Opportunities', 'https://www.publicartopportunities.com/', 'public-art', { disciplines: ['public-art', 'sculpture', 'installation'], opportunityTypes: ['commission', 'open-call', 'contest'], geography: ['US', 'global'] }),
  directory('AICAD Opportunities', 'https://www.aicad.org/opportunities/', 'craft-design', { disciplines: ['design', 'craft', 'visual-arts'], opportunityTypes: ['fellowship', 'residency', 'award'], geography: ['US'] }),

  // Film, media, animation and screenwriting.
  platform('Festhome', 'https://festhome.com/', 'platform-filmfreeway', { disciplines: ['film', 'documentary', 'animation'], opportunityTypes: ['festival', 'contest', 'award'], geography: ['global'] }),
  platform('Shortfilmdepot', 'https://www.shortfilmdepot.com/', 'film-festival', { disciplines: ['short-film', 'animation', 'documentary'], opportunityTypes: ['festival', 'contest'], geography: ['global'] }),
  directory('Film Festival Life', 'https://filmfestivallife.com/Film-Festival-Deadlines', 'film-festival', { disciplines: ['film', 'documentary', 'animation'], opportunityTypes: ['festival', 'award'], geography: ['global'] }),
  directory('FilmFestivals.com', 'https://filmfestivals.com/', 'film-festival', { disciplines: ['film', 'documentary', 'screenwriting'], opportunityTypes: ['festival', 'contest', 'pitch'], geography: ['global'] }),
  directory('Sundance Institute Labs and Grants', 'https://www.sundance.org/programs/', 'documentary', { disciplines: ['film', 'documentary', 'screenwriting'], opportunityTypes: ['grant', 'fellowship', 'residency'], geography: ['US', 'global'] }),
  directory('The Gotham Artists and Filmmakers', 'https://thegotham.org/programs/', 'film-festival', { disciplines: ['film', 'documentary', 'screenwriting'], opportunityTypes: ['grant', 'fellowship', 'award'], geography: ['US', 'global'] }),
  directory('International Documentary Association', 'https://www.documentary.org/grants', 'documentary', { disciplines: ['documentary', 'film'], opportunityTypes: ['grant', 'fellowship'], geography: ['US', 'global'] }),
  directory('Animation World Network Jobs and Calls', 'https://www.awn.com/animation-world-network', 'animation-new-media', { disciplines: ['animation', 'new-media'], opportunityTypes: ['open-call', 'award', 'fellowship'], geography: ['global'] }),
  org('Annecy MIFA Pitches', 'https://www.annecyfestival.com/le-mifa/mifa-business/pitchs-mifa/presentation-pitchs-mifa', 'animation-new-media', { disciplines: ['animation', 'film'], opportunityTypes: ['pitch', 'festival', 'open-call'], geography: ['global'] }),
  org('Women in Animation Programs', 'https://wearewia.org/mentorship/', 'animation-new-media', { disciplines: ['animation', 'film', 'new-media'], opportunityTypes: ['fellowship', 'open-call'], geography: ['global'] }),
  org('Durban FilmMart Pitch and Finance Forum', 'https://durbanfilmmart.co.za/dfm-pitch-and-finance-forum/', 'documentary', { disciplines: ['film', 'documentary', 'animation', 'screenwriting'], opportunityTypes: ['pitch', 'fellowship', 'open-call'], geography: ['Africa', 'global'] }),
  org('Realness Institute Programmes', 'https://www.realness.institute/', 'documentary', { disciplines: ['film', 'documentary', 'screenwriting', 'television'], opportunityTypes: ['fellowship', 'residency', 'open-call'], geography: ['Africa', 'global'] }),

  // Music and sound.
  platform('Sonicbids', 'https://www.sonicbids.com/find-gigs/', 'music-composition', { disciplines: ['music', 'bands', 'songwriting'], opportunityTypes: ['festival', 'open-call', 'contest'], geography: ['global'] }),
  platform('SubmitHub', 'https://www.submithub.com/opportunities', 'music-composition', { disciplines: ['music', 'songwriting', 'music-video'], opportunityTypes: ['open-call', 'contest', 'award'], geography: ['global'] }),
  platform('Groover Opportunities', 'https://groover.co/en/opportunities/', 'music-composition', { disciplines: ['music', 'songwriting'], opportunityTypes: ['open-call', 'contest', 'festival'], geography: ['global'] }),
  directory('New Music USA Grants', 'https://newmusicusa.org/programs/grants/', 'music-composition', { disciplines: ['music', 'composition', 'sound'], opportunityTypes: ['grant', 'fellowship'], geography: ['US'] }),
  directory('PRS Foundation Funding', 'https://prsfoundation.com/funding-support/', 'music-composition', { disciplines: ['music', 'composition', 'songwriting'], opportunityTypes: ['grant', 'fellowship'], geography: ['GB', 'global'] }),
  directory('Help Musicians Funding', 'https://www.helpmusicians.org.uk/get-support', 'music-composition', { disciplines: ['music', 'performance', 'composition'], opportunityTypes: ['grant', 'fellowship'], geography: ['GB'] }),
  directory('Music Finland Opportunities', 'https://musicfinland.com/en/funding', 'music-composition', { disciplines: ['music', 'composition'], opportunityTypes: ['grant', 'fellowship', 'festival'], geography: ['FI', 'global'] }),
  directory('Music In Africa Opportunities', 'https://www.musicinafrica.net/', 'music-composition', { disciplines: ['music', 'composition', 'performance'], opportunityTypes: ['grant', 'festival', 'open-call'], geography: ['Africa', 'global'], discoveryAdapterId: 'music-in-africa-index' }),

  // Dance, theatre, performance and live work.
  directory('Dance/NYC Opportunities', 'https://www.dance.nyc/for-artists/resource-pages/opportunities', 'dance-choreography', { disciplines: ['dance', 'choreography', 'performance'], opportunityTypes: ['grant', 'residency', 'open-call'], geography: ['US'] }),
  directory('Dance Informa Opportunities', 'https://danceinforma.us/opportunities/', 'dance-choreography', { disciplines: ['dance', 'choreography'], opportunityTypes: ['residency', 'fellowship', 'open-call'], geography: ['US', 'global'] }),
  directory('Theatre Communications Group', 'https://www.tcg.org/Default.aspx?TabID=1575', 'theater-playwriting', { disciplines: ['theatre', 'playwriting', 'dramaturgy'], opportunityTypes: ['grant', 'fellowship', 'award'], geography: ['US'] }),
  directory('HowlRound Theatre Commons', 'https://howlround.com/opportunities', 'theater-playwriting', { disciplines: ['theatre', 'playwriting', 'performance'], opportunityTypes: ['open-call', 'fellowship', 'festival'], geography: ['US', 'global'] }),
  directory('On the Boards Opportunities', 'https://www.ontheboards.org/about/opportunities', 'performance-art', { disciplines: ['performance', 'dance', 'theatre'], opportunityTypes: ['residency', 'commission', 'open-call'], geography: ['US', 'global'] }),
  directory('Playbill Jobs and Calls', 'https://www.playbill.com/jobs', 'theater-playwriting', { disciplines: ['theatre', 'musical-theatre', 'playwriting'], opportunityTypes: ['open-call', 'fellowship'], geography: ['US'] }),

  // Design, architecture, comics and built environment.
  directory('AIGA Design Opportunities', 'https://www.aiga.org/professional-development/opportunities', 'craft-design', { disciplines: ['graphic-design', 'illustration', 'ux-design'], opportunityTypes: ['award', 'contest', 'fellowship'], geography: ['US', 'global'] }),
  directory('Designboom Competitions', 'https://www.designboom.com/competitions/', 'craft-design', { disciplines: ['design', 'architecture', 'product-design'], opportunityTypes: ['contest', 'award', 'open-call'], geography: ['global'] }),
  directory('Dezeen Competitions', 'https://www.dezeen.com/competitions/', 'architecture-built', { disciplines: ['architecture', 'design', 'built-environment'], opportunityTypes: ['contest', 'award', 'open-call'], geography: ['global'] }),
  directory('ArchDaily Competitions', 'https://www.archdaily.com/competitions', 'architecture-built', { disciplines: ['architecture', 'urbanism', 'built-environment'], opportunityTypes: ['contest', 'award', 'open-call'], geography: ['global'] }),
  directory('World Architecture Community', 'https://worldarchitecture.org/architecture-competitions/', 'architecture-built', { disciplines: ['architecture', 'urbanism'], opportunityTypes: ['contest', 'award', 'fellowship'], geography: ['global'] }),
  directory('Society of Graphic Designers Canada', 'https://gdc.net/awards', 'craft-design', { disciplines: ['graphic-design', 'illustration'], opportunityTypes: ['award', 'contest'], geography: ['CA', 'global'] }),
  directory('Comics Beat Opportunities', 'https://www.comicsbeat.com/category/comics-industry/', 'comics-illustration', { disciplines: ['comics', 'illustration', 'graphic-novel'], opportunityTypes: ['contest', 'award', 'fellowship'], geography: ['global'] }),

  // Global and identity-led coverage.
  directory('Arts Council England Funding', 'https://www.artscouncil.org.uk/creative-people-and-artists/funding', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship'], geography: ['GB'] }),
  directory('Creative Scotland Funding', 'https://www.creativescotland.com/funding', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship'], geography: ['GB'] }),
  directory('Goethe-Institut Calls and Funding', 'https://www.goethe.de/en/kul/foe.html', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship', 'residency'], geography: ['global', 'EU'] }),
  directory('British Council Arts Opportunities', 'https://www.britishcouncil.org/arts/opportunities', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship', 'residency'], geography: ['global'] }),
  directory('African Artists Foundation', 'https://www.aaf-net.org/opportunities', 'bipoc-focused', { disciplines: ['visual-arts', 'photography', 'film'], opportunityTypes: ['grant', 'residency', 'award'], geography: ['NG', 'Africa', 'global'] }),
  directory('African Culture Fund Calls', 'https://www.africanculturefund.net/en/', 'bipoc-focused', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship', 'open-call'], geography: ['Africa'], discoveryAdapterId: 'african-culture-fund-index' }),
  directory('National Arts Council Nigeria', 'https://www.nac.gov.ng/', 'grants-international', { disciplines: ['all-disciplines'], opportunityTypes: ['grant', 'fellowship', 'award'], geography: ['NG'] }),
  directory('Queer|Art Opportunities', 'https://www.queer-art.org/opportunities', 'lgbtq-focused', { disciplines: ['visual-arts', 'film', 'performance', 'writing'], opportunityTypes: ['grant', 'fellowship', 'residency'], geography: ['US', 'global'] }),
  directory('Disability Arts Online Opportunities', 'https://disabilityarts.online/opportunities/', 'disability-arts', { disciplines: ['disability-arts', 'visual-arts', 'performance', 'writing'], opportunityTypes: ['grant', 'open-call', 'residency'], geography: ['GB', 'global'] }),
  directory('Native Arts and Cultures Foundation', 'https://www.nativeartsandcultures.org/grants', 'indigenous-arts', { disciplines: ['indigenous', 'visual-arts', 'literature', 'music'], opportunityTypes: ['grant', 'fellowship'], geography: ['US', 'global'] }),
];

export const EXPANDED_SOURCES = expandMany(SOURCES);
