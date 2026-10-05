/**
 * Major literary prizes and their winners, compiled on 2026-10-04 from the
 * pages listed in each entry's \`sources\` (Wikipedia winner lists and the
 * prizes' own sites). Every winner was read from a fetched source; fields a
 * source did not state are omitted rather than guessed. Re-verify before
 * extending, and add the page you read to \`sources\`.
 */
import type { LiteraryPrize } from "./types.js";

export const LITERARY_PRIZES: LiteraryPrize[] = [
  {
    id: "caine",
    name: "AKO Caine Prize for African Writing",
    region: "africa",
    genres: ["fiction"],
    organiserUrl: "https://www.caineprize.com/",
    picksFrom:
      "a short story written by an African and published in English (per caineprize.com/the-prize)",
    winners: [
      {
        year: 2025,
        writer: "NoViolet Bulawayo",
        country: "Zimbabwe",
        work: "Hitting Budapest",
        firstPublishedIn: "Boston Review",
        firstPublishedYear: 2010,
        note: "No standard 2025 competition: 25th-anniversary 'Best of Caine' honorary prize chosen from past winners by a panel chaired by Abdulrazak Gurnah (per caineprize.com/the-prize). Same story as the 2011 win.",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.caineprize.com/the-prize",
          "https://en.wikipedia.org/wiki/Hitting_Budapest",
        ],
      },
      {
        year: 2024,
        writer: "Nadia Davids",
        country: "South Africa",
        work: "Bridling",
        firstPublishedIn: "The Georgia Review",
        firstPublishedYear: 2023,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.caineprize.com/the-prize",
          "https://www.ascleiden.nl/content/library-highlights/caine-prize-african-writing-2024",
        ],
      },
      {
        year: 2023,
        writer: "Mame Bougouma Diene",
        country: "Senegal",
        work: "A Soul of Small Places",
        firstPublishedIn: "Africa Risen (Tordotcom)",
        note: "Co-winner with Woppa Diallo (co-authored story).",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://johannesburgreviewofbooks.com/2023/10/03/the-jrb-daily-mame-bougouma-diene-and-woppa-diallo-become-first-senegalese-writers-to-win-caine-prize-for-african-writing/",
        ],
      },
      {
        year: 2023,
        writer: "Woppa Diallo",
        country: "Senegal",
        work: "A Soul of Small Places",
        firstPublishedIn: "Africa Risen (Tordotcom)",
        note: "Co-winner with Mame Bougouma Diene (co-authored story).",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://johannesburgreviewofbooks.com/2023/10/03/the-jrb-daily-mame-bougouma-diene-and-woppa-diallo-become-first-senegalese-writers-to-win-caine-prize-for-african-writing/",
        ],
      },
      {
        year: 2022,
        writer: "Idza Luhumyo",
        country: "Kenya",
        work: "Five Years Next Sunday",
        firstPublishedIn:
          "Disruption: New Short Fiction from Africa (Short Story Day Africa & Catalyst Press)",
        firstPublishedYear: 2021,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://nation.africa/kenya/news/kenyan-writer-idza-luhumyo-wins-caine-prize-3887768",
          "https://africainwords.com/2022/07/08/the-illusion-of-choice-a-review-of-five-years-next-sunday-by-idza-luhumyo-ako-caine-prize-shortlist-2022-reviews/",
        ],
      },
      {
        year: 2021,
        writer: "Meron Hadero",
        country: "Ethiopia",
        work: "The Street Sweep",
        firstPublishedIn: "ZYZZYVA",
        firstPublishedYear: 2018,
        note: "The African Courier describes her as 'Ethiopian-American'.",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.theafricancourier.de/meron-hadero-wins-2021-caine-prize-for-african-writing/",
        ],
      },
      {
        year: 2020,
        writer: "Irenosen Okojie",
        country: "Nigeria",
        work: "Grace Jones",
        firstPublishedIn: "Nudibranch (author's own story collection)",
        firstPublishedYear: 2019,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://africainwords.com/2021/08/24/aiw-long-read-caine-2021-a-prize-coming-of-age/",
        ],
      },
      {
        year: 2019,
        writer: "Lesley Nneka Arimah",
        country: "Nigeria",
        work: "Skinned",
        firstPublishedIn: "McSweeney's Quarterly Concern",
        firstPublishedYear: 2018,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://lithub.com/lesley-nneka-arimah-has-won-the-2019-caine-prize-read-her-prizewinning-story-skinned/",
        ],
      },
      {
        year: 2018,
        writer: "Makena Onjerika",
        country: "Kenya",
        work: "Fanta Blackcurrant",
        firstPublishedIn: "Wasafiri",
        firstPublishedYear: 2017,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://johannesburgreviewofbooks.com/2018/07/03/the-jrb-daily-kenyan-writer-makena-onjerika-wins-the-2018-caine-prize-for-african-writing/",
        ],
      },
      {
        year: 2017,
        writer: "Bushra al-Fadil",
        country: "Sudan",
        work: "The Story of the Girl Whose Birds Flew Away",
        firstPublishedIn: "The Book of Khartoum - A City in Short Fiction",
        note: "Translated from Arabic by Max Shmookler (per Wikipedia). Wikipedia article title spells the name 'Bushra Elfadil'.",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://en.wikipedia.org/wiki/Bushra_Elfadil",
        ],
      },
      {
        year: 2016,
        writer: "Lidudumalingani Mqombothi",
        country: "South Africa",
        work: "Memories We Lost",
        firstPublishedIn:
          "Incredible Journey: Stories That Move You (Burnet Media, South Africa)",
        firstPublishedYear: 2015,
        note: "Press coverage names him 'Lidudumalingani' (single name).",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.okayafrica.com/south-african-writer-lidudumalingani-wins-2016-caine-prize-for-african-writing/302603",
        ],
      },
      {
        year: 2015,
        writer: "Namwali Serpell",
        country: "Zambia",
        work: "The Sack",
        firstPublishedIn: "Africa39 (Bloomsbury, London)",
        firstPublishedYear: 2014,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.writingafrica.com/caine-prize-for-african-writing-2015-shortlist-announced/",
        ],
      },
      {
        year: 2014,
        writer: "Okwiri Oduor",
        country: "Kenya",
        work: "My Father's Head",
        firstPublishedIn:
          "Feast, Famine and Potluck (Short Story Day Africa, South Africa)",
        firstPublishedYear: 2013,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.writingafrica.com/caine-prize-2014-shortlist-announced/",
        ],
      },
      {
        year: 2013,
        writer: "Tope Folarin",
        country: "Nigeria",
        work: "Miracle",
        firstPublishedIn: "Transition, Issue 109 (Bloomington)",
        firstPublishedYear: 2012,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.writingafrica.com/caine-prize-2013-short-list-named-nope-no-kenyans/",
        ],
      },
      {
        year: 2012,
        writer: "Rotimi Babatunde",
        country: "Nigeria",
        work: "Bombay's Republic",
        firstPublishedIn: "Mirabilia Review",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.africanliberty.org/2012/07/03/africa-caine-prize-2012-awarded-to-rotimi-babatunde/",
        ],
      },
      {
        year: 2011,
        writer: "NoViolet Bulawayo",
        country: "Zimbabwe",
        work: "Hitting Budapest",
        firstPublishedIn: "Boston Review",
        firstPublishedYear: 2010,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.caineprize.com/the-prize",
          "https://en.wikipedia.org/wiki/Hitting_Budapest",
        ],
      },
      {
        year: 2010,
        writer: "Olufemi Terry",
        country: "Sierra Leone",
        work: "Stickfighting Days",
        firstPublishedIn: "Chimurenga (vol. 12/13)",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://en.wikipedia.org/wiki/Stickfighting_Days",
        ],
      },
      {
        year: 2009,
        writer: "E. C. Osondu",
        country: "Nigeria",
        work: "Waiting",
        firstPublishedIn: "Guernica",
        firstPublishedYear: 2008,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://en.wikipedia.org/wiki/E._C._Osondu",
        ],
      },
      {
        year: 2008,
        writer: "Henrietta Rose-Innes",
        country: "South Africa",
        work: "Poison",
        sources: ["https://en.wikipedia.org/wiki/Caine_Prize"],
      },
      {
        year: 2007,
        writer: "Monica Arac de Nyeko",
        country: "Uganda",
        work: "Jambula Tree",
        sources: ["https://en.wikipedia.org/wiki/Caine_Prize"],
      },
      {
        year: 2006,
        writer: "Mary Watson",
        country: "South Africa",
        work: "Jungfrau",
        note: "Venue not verified: Wikipedia author page names her 2004 collection Moss (Kwela) but does not say Jungfrau appeared in it.",
        sources: ["https://en.wikipedia.org/wiki/Caine_Prize"],
      },
      {
        year: 2005,
        writer: "S. A. Afolabi",
        country: "Nigeria",
        work: "Monday Morning",
        sources: ["https://en.wikipedia.org/wiki/Caine_Prize"],
      },
      {
        year: 2004,
        writer: "Brian Chikwava",
        country: "Zimbabwe",
        work: "Seventh Street Alchemy",
        firstPublishedIn: "Writing Still (Weaver Press, Harare)",
        firstPublishedYear: 2003,
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://en.wikipedia.org/wiki/Brian_Chikwava",
        ],
      },
      {
        year: 2003,
        writer: "Yvonne Adhiambo Owuor",
        country: "Kenya",
        work: "Weight of Whispers",
        firstPublishedIn: "Kwani?",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://en.wikipedia.org/wiki/Yvonne_Adhiambo_Owuor",
        ],
      },
      {
        year: 2002,
        writer: "Binyavanga Wainaina",
        country: "Kenya",
        work: "Discovering Home",
        firstPublishedIn: "g21.net (Rod Amis' US-based e-zine)",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://africainwords.com/2021/08/24/aiw-long-read-caine-2021-a-prize-coming-of-age/",
        ],
      },
      {
        year: 2001,
        writer: "Helon Habila",
        country: "Nigeria",
        work: "Love Poems",
        sources: ["https://en.wikipedia.org/wiki/Caine_Prize"],
      },
      {
        year: 2000,
        writer: "Leila Aboulela",
        country: "Sudan",
        work: "The Museum",
        sources: [
          "https://en.wikipedia.org/wiki/Caine_Prize",
          "https://www.caineprize.com/the-prize",
        ],
      },
    ],
  },
  {
    id: "nigeria-prize-for-literature",
    name: "The Nigeria Prize for Literature (NLNG)",
    region: "africa",
    genres: ["fiction", "poetry", "drama", "children"],
    organiserUrl: "http://www.nlng.com/Our-CSR/Pages/The-Nigeria-Prizes.aspx",
    picksFrom:
      "published books by Nigerian authors; genre rotates among fiction, poetry, drama and children's literature (2025 edition: 'the best English-language novel published by a Nigerian author')",
    winners: [
      {
        year: 2025,
        writer: "Oyin Olugbile",
        country: "Nigeria",
        work: "Sanya",
        genre: "fiction",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
          "https://en.wikipedia.org/wiki/2025_Nigeria_Prize_for_Literature",
        ],
      },
      {
        year: 2024,
        writer: "Olubunmi Familoni",
        country: "Nigeria",
        work: "The Road Does Not End",
        genre: "children",
        note: "The list page labels 2024 'Prose', but the dedicated 2024 page says the edition 'focused on children's literature'; genre taken from the dedicated page.",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
          "https://en.wikipedia.org/wiki/2024_Nigeria_Prize_for_Literature",
        ],
      },
      {
        year: 2023,
        writer: "Obari Gomba",
        country: "Nigeria",
        work: "Grit",
        genre: "drama",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2022,
        writer: "Romeo Oriogun",
        country: "Nigeria",
        work: "Nomad",
        genre: "poetry",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2021,
        writer: "Cheluchi Onyemelukwe",
        country: "Nigeria",
        work: "The Son of the House",
        genre: "fiction",
        note: "Listed as the 2020/2021 edition.",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2019,
        writer: "Jude Idada",
        country: "Nigeria",
        work: "Boom Boom",
        genre: "children",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2018,
        writer: "Soji Cole",
        country: "Nigeria",
        work: "Embers",
        genre: "drama",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2017,
        writer: "Ikeogu Oke",
        country: "Nigeria",
        work: "The Heresiad",
        genre: "poetry",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2016,
        writer: "Abubakar Adam Ibrahim",
        country: "Nigeria",
        work: "Season of Crimson Blossoms",
        genre: "fiction",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2014,
        writer: "Sam Ukala",
        country: "Nigeria",
        work: "Iredi War",
        genre: "drama",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2013,
        writer: "Tade Ipadeola",
        country: "Nigeria",
        work: "The Sahara Testaments",
        genre: "poetry",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2012,
        writer: "Chika Unigwe",
        country: "Nigeria",
        work: "On Black Sisters Street",
        genre: "fiction",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2011,
        writer: "Adeleke Adeyemi",
        country: "Nigeria",
        work: "The Missing Clock",
        genre: "children",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2010,
        writer: "Esiaba Irobi",
        country: "Nigeria",
        work: "Cemetery Road",
        genre: "drama",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2008,
        writer: "Kaine Agary",
        country: "Nigeria",
        work: "Yellow Yellow",
        genre: "fiction",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2007,
        writer: "Akachi Adimora-Ezeigbo",
        country: "Nigeria",
        work: "My Cousin Sammy",
        genre: "children",
        note: "Shared prize.",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2007,
        writer: "Mabel Segun",
        country: "Nigeria",
        work: "Readers' Theatre: Twelve Plays for Young People",
        genre: "children",
        note: "Shared prize.",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2006,
        writer: "Ahmed Yerima",
        country: "Nigeria",
        work: "Hard Ground",
        genre: "drama",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2005,
        writer: "Ezenwa Ohaeto",
        country: "Nigeria",
        work: "Chants of Minstrel",
        genre: "poetry",
        note: "Shared prize. Main Wikipedia prize page spells the name 'Ezenwa-Ohaeto'.",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
      {
        year: 2005,
        writer: "Gabriel Okara",
        country: "Nigeria",
        work: "The Dreamer: His Vision",
        genre: "poetry",
        note: "Shared prize.",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_winners_and_nominated_authors_of_the_Nigerian_Prize_for_Literature",
        ],
      },
    ],
  },
  {
    id: "commonwealth-short-story",
    name: "Commonwealth Short Story Prize",
    region: "commonwealth",
    genres: ["fiction"],
    organiserUrl: "https://commonwealthfoundation.com/short-story-prize/",
    picksFrom:
      "unpublished short fiction, 2,000-5,000 words, by Commonwealth citizens aged 18+; regional winners then published in Granta (stated for 2025), shortlist in adda",
    winners: [
      {
        year: 2025,
        writer: "Chanel Sutherland",
        country: "Canada / Saint Vincent and the Grenadines",
        work: "Descend",
        firstPublishedIn: "Granta",
        note: "Commonwealth Foundation: 'Granta has published all the regional winning stories of the 2025 Commonwealth Short Story Prize'; also in a Paper + Ink print collection. Wikipedia lists country as Canada.",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
          "https://commonwealthfoundation.com/commonwealth-short-story-prize-archives/short-story-prize-2025/",
        ],
      },
      {
        year: 2025,
        writer: "Joshua Lubwama",
        country: "Uganda",
        work: "Mothers Not Appearing In Search",
        firstPublishedIn: "Granta",
        note: "Title capitalisation from Commonwealth Foundation ('In'); Wikipedia has 'in'.",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
          "https://commonwealthfoundation.com/commonwealth-short-story-prize-archives/short-story-prize-2025/",
        ],
      },
      {
        year: 2024,
        writer: "Reena Usha Rungoo",
        country: "Mauritius",
        work: "Dite",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2024,
        writer: "Sanjana Thakur",
        country: "India",
        work: "Aishwarya Rai",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2023,
        writer: "Hana Gammon",
        country: "South Africa",
        work: "The Undertaker's Apprentice",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2023,
        writer: "Kwame McPherson",
        country: "Jamaica",
        work: "Ocoee",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2022,
        writer: "Ntsika Kota",
        country: "Eswatini",
        work: "and the earth drank deep",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2021,
        writer: "Kanya D'Almeida",
        country: "Sri Lanka",
        work: "I Cleaned The",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2021,
        writer: "Rémy Ngamije",
        country: "Namibia",
        work: "Granddaughter of the Octopus",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2020,
        writer: "Innocent Chizaram Ilo",
        country: "Nigeria",
        work: "When a Woman Renounces Motherhood",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2020,
        writer: "Kritika Pandey",
        country: "India",
        work: "The Great Indian Tee and Snakes",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2019,
        writer: "Constantia Soteriou",
        country: "Cyprus",
        work: "Death Customs",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2019,
        writer: "Mbozi Haimbe",
        country: "Zambia",
        work: "Madam's Sister",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2018,
        writer: "Efua Traoré",
        country: "Nigeria",
        work: "True Happiness",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2018,
        writer: "Kevin Jared Hosein",
        country: "Trinidad and Tobago",
        work: "Passage",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2017,
        writer: "Akwaeke Emezi",
        country: "Nigeria",
        work: "Who Is Like God",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2017,
        writer: "Ingrid Persaud",
        country: "Trinidad and Tobago",
        work: "The Sweet Sop",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2016,
        writer: "Faraaz Mahomed",
        country: "South Africa",
        work: "The Pigeon",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2016,
        writer: "Parashar Kulkarni",
        country: "India",
        work: "Cow and Company",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2015,
        writer: "Jonathan Tel",
        country: "United Kingdom",
        work: "The Human Phonograph",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2015,
        writer: "Lesley Nneka Arimah",
        country: "Nigeria",
        work: "Light",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2014,
        writer: "Jennifer Nansubuga Makumbi",
        country: "Uganda",
        work: "Let's Tell This Story Properly",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2013,
        writer: "Eliza Robertson",
        country: "Canada",
        work: "We Walked on Water",
        note: "Wikipedia marks this as a joint win; the other joint overall winner was not captured from the source.",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2013,
        writer: "Julian Jackson",
        country: "South Africa",
        work: "The New Customers",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2012,
        writer: "Emma Martin",
        country: "New Zealand",
        work: "Two Girls in a Boat",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
      {
        year: 2012,
        writer: "Jekwu Anyaegbuna",
        country: "Nigeria",
        work: "Morrison Okoli (1955–2010)",
        sources: [
          "https://en.wikipedia.org/wiki/Commonwealth_Short_Story_Prize",
        ],
      },
    ],
  },
  {
    id: "brunel-evaristo-african-poetry",
    name: "Brunel International African Poetry Prize (Evaristo Prize for African Poetry from 2023)",
    region: "africa",
    genres: ["poetry"],
    organiserUrl: "https://africanpoetrybf.brown.edu/evaristo-winners/",
    picksFrom:
      "a group of 10 poems by an African poet who has not published a full-length collection",
    winners: [
      {
        year: 2025,
        writer: "Ameen Animashaun",
        country: null,
        work: '"Song" and other poems',
        note: "Poets & Writers describes him as 'of Lagos'; country not stated explicitly.",
        sources: [
          "https://africanpoetrybf.brown.edu/evaristo-winners/",
          "https://www.pw.org/content/septemberoctober_2025_recent_winners",
        ],
      },
      {
        year: 2024,
        writer: "Ehiorobo Osazuwa Derek",
        country: null,
        work: "And God Said",
        note: "Name per APBF; Writing Africa: 'Ehiorobo Derek'. Country not stated in fetched sources.",
        sources: [
          "https://africanpoetrybf.brown.edu/evaristo-winners/",
          "https://www.writingafrica.com/ehiorobo-derek-kyle-okeke-are-evaristo-prize-for-african-poetry-2024-joint-winners/",
        ],
      },
      {
        year: 2024,
        writer: "Kyle Okeke",
        country: null,
        work: "Butterflies",
        note: "Country not stated in fetched sources.",
        sources: [
          "https://africanpoetrybf.brown.edu/evaristo-winners/",
          "https://www.writingafrica.com/ehiorobo-derek-kyle-okeke-are-evaristo-prize-for-african-poetry-2024-joint-winners/",
        ],
      },
      {
        year: 2023,
        writer: "Feranmi Ariyo",
        country: "Nigeria",
        work: null,
        note: "First year as the Evaristo Prize for African Poetry.",
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://africanpoetrybf.brown.edu/evaristo-winners/",
        ],
      },
      {
        year: 2023,
        writer: "Gracia 'Cianga' Mwamba",
        country: "Congo",
        work: null,
        note: "Name per APBF; Wikipedia: 'Gracia Mwamba (Congo)'.",
        sources: [
          "https://africanpoetrybf.brown.edu/evaristo-winners/",
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
        ],
      },
      {
        year: 2022,
        writer: "Zibusiso Mpofu",
        country: "Zimbabwe",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2021,
        writer: "Othuke Umukoro",
        country: "Nigeria",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2020,
        writer: "Rabha Ashry",
        country: "Egypt",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2019,
        writer: "Jamila Osman",
        country: "Somalia",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2019,
        writer: "Nadra Mabrouk",
        country: "Egypt",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2018,
        writer: "Hiwot Adilow",
        country: "Ethiopia",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2018,
        writer: "Momtaza Mehri",
        country: "Somalia",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2018,
        writer: "Theresa Lola",
        country: "Nigeria",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2017,
        writer: "Romeo Oriogun",
        country: "Nigeria",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2016,
        writer: "Chekwube O. Danladi",
        country: "Nigeria",
        work: null,
        note: "Official site spells 'Chekwube'; Wikipedia spells 'Chekwubi'.",
        sources: [
          "https://www.africanpoetryprize.org/",
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
        ],
      },
      {
        year: 2016,
        writer: "Gbenga Adesina",
        country: "Nigeria",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2015,
        writer: "Nick Makoha",
        country: "Uganda",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2015,
        writer: "Safia Elhillo",
        country: "Sudan",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2014,
        writer: "Liyou Libsekal",
        country: "Ethiopia",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
      {
        year: 2013,
        writer: "Warsan Shire",
        country: "Somalia",
        work: null,
        sources: [
          "https://en.wikipedia.org/wiki/Brunel_International_African_Poetry_Prize",
          "https://www.africanpoetryprize.org/",
        ],
      },
    ],
  },
  {
    id: "wole-soyinka-prize",
    name: "Wole Soyinka Prize for Literature in Africa",
    region: "africa",
    genres: ["fiction", "poetry", "drama"],
    organiserUrl: "https://theluminafoundation.org",
    picksFrom:
      "best literary work produced by an African (English or French); any genre initially, single genre per edition from 2014",
    winners: [
      {
        year: 2018,
        writer: "Harriet Anena",
        country: "Uganda",
        work: "A Nation in Labour",
        genre: "poetry",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2018,
        writer: "Tanure Ojaide",
        country: "Nigeria",
        work: "Songs of Myself",
        genre: "poetry",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2014,
        writer: "Akin Bello",
        country: "Nigeria",
        work: "The Egbon of Lagos",
        genre: "drama",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2012,
        writer: "Sifiso Mzobe",
        country: "South Africa",
        work: "Young Blood",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2010,
        writer: "Kopano Matlwa",
        country: "South Africa",
        work: "Coconut",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2010,
        writer: "Wale Okediran",
        country: "Nigeria",
        work: "Tenants of the House",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2008,
        writer: "Nnedi Okorafor",
        country: "Nigeria / US",
        work: "Zahrah the Windseeker",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
      {
        year: 2006,
        writer: "Sefi Atta",
        country: "Nigeria",
        work: "Everything Good Will Come",
        sources: [
          "https://en.wikipedia.org/wiki/Wole_Soyinka_Prize_for_Literature_in_Africa",
        ],
      },
    ],
  },
  {
    id: "windham-campbell",
    name: "Windham-Campbell Literature Prizes",
    region: "international",
    genres: ["fiction", "nonfiction", "poetry", "drama"],
    organiserUrl: "https://windhamcampbell.org",
    picksFrom: null,
    winners: [
      {
        year: 2022,
        writer: "Emmanuel Iduma",
        country: "Nigeria",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2022,
        writer: "Siphiwe Gloria Ndlovu",
        country: "Zimbabwe",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2022,
        writer: "Tsitsi Dangarembga",
        country: "Zimbabwe",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2020,
        writer: "Namwali Serpell",
        country: "United States / Zambia",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2019,
        writer: "Kwame Dawes",
        country: "Ghana / Jamaica / United States",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2018,
        writer: "Jennifer Nansubuga Makumbi",
        country: "Uganda / United Kingdom",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2015,
        writer: "Helon Habila",
        country: "Nigeria",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2015,
        writer: "Ivan Vladislavic",
        country: "South Africa",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2015,
        writer: "Teju Cole",
        country: "United States / Nigeria",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2014,
        writer: "Aminatta Forna",
        country: "Sierra Leone / United Kingdom",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2013,
        writer: "Jonny Steinberg",
        country: "South Africa",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
      {
        year: 2013,
        writer: "Zoë Wicomb",
        country: "South Africa",
        work: null,
        note: "Included because Wikipedia's nationality column lists an African country; birthplace NOT verified.",
        sources: [
          "https://en.wikipedia.org/wiki/Windham%E2%80%93Campbell_Literature_Prizes",
        ],
      },
    ],
  },
  {
    id: "nobel-literature",
    name: "Nobel Prize in Literature",
    region: "international",
    genres: [],
    organiserUrl: "https://www.nobelprize.org",
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "László Krasznahorkai",
        country: "Hungary",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2024,
        writer: "Han Kang",
        country: "South Korea",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2023,
        writer: "Jon Fosse",
        country: "Norway",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2022,
        writer: "Annie Ernaux",
        country: "France",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2021,
        writer: "Abdulrazak Gurnah",
        country: "Tanzania / United Kingdom",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2020,
        writer: "Louise Glück",
        country: "United States",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2019,
        writer: "Peter Handke",
        country: "Austria",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2018,
        writer: "Olga Tokarczuk",
        country: "Poland",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2017,
        writer: "Kazuo Ishiguro",
        country: "United Kingdom",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2016,
        writer: "Bob Dylan",
        country: "United States",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2015,
        writer: "Svetlana Alexievich",
        country: "Belarus",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2014,
        writer: "Patrick Modiano",
        country: "France",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2013,
        writer: "Alice Munro",
        country: "Canada",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2012,
        writer: "Mo Yan",
        country: "China",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2011,
        writer: "Tomas Tranströmer",
        country: "Sweden",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2010,
        writer: "Mario Vargas Llosa",
        country: "Peru / Spain",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2009,
        writer: "Herta Müller",
        country: "Germany / Romania",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2008,
        writer: "J. M. G. Le Clézio",
        country: "France / Mauritius",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2007,
        writer: "Doris Lessing",
        country: "United Kingdom",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2006,
        writer: "Orhan Pamuk",
        country: "Turkey",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2005,
        writer: "Harold Pinter",
        country: "United Kingdom",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2004,
        writer: "Elfriede Jelinek",
        country: "Austria",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2003,
        writer: "J. M. Coetzee",
        country: "South Africa",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2002,
        writer: "Imre Kertész",
        country: "Hungary",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2001,
        writer: "V. S. Naipaul",
        country: "United Kingdom / Trinidad and Tobago",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 2000,
        writer: "Gao Xingjian",
        country: "France / China",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1999,
        writer: "Günter Grass",
        country: "Germany",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1998,
        writer: "José Saramago",
        country: "Portugal",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1997,
        writer: "Dario Fo",
        country: "Italy",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1996,
        writer: "Wisława Szymborska",
        country: "Poland",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1995,
        writer: "Seamus Heaney",
        country: "Ireland",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1994,
        writer: "Kenzaburō Ōe",
        country: "Japan",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1993,
        writer: "Toni Morrison",
        country: "United States",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1992,
        writer: "Derek Walcott",
        country: "Saint Lucia",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1991,
        writer: "Nadine Gordimer",
        country: "South Africa",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
      {
        year: 1990,
        writer: "Octavio Paz",
        country: "Mexico",
        work: null,
        sources: [
          "https://en.wikipedia.org/w/index.php?title=List_of_Nobel_laureates_in_Literature&action=raw&section=1",
        ],
      },
    ],
  },
  {
    id: "booker",
    name: "Booker Prize",
    region: "uk-ireland",
    genres: ["fiction"],
    organiserUrl: "https://thebookerprizes.com",
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "David Szalay",
        country: "England / Hungary",
        work: "Flesh",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2024,
        writer: "Samantha Harvey",
        country: "England",
        work: "Orbital",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2023,
        writer: "Paul Lynch",
        country: "Ireland",
        work: "Prophet Song",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Shehan Karunatilaka",
        country: "Sri Lanka",
        work: "The Seven Moons of Maali Almeida",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "Damon Galgut",
        country: "South Africa",
        work: "The Promise",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Douglas Stuart",
        country: "Scotland / United States",
        work: "Shuggie Bain",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Bernardine Evaristo",
        country: "England",
        work: "Girl, Woman, Other",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Margaret Atwood",
        country: "Canada",
        work: "The Testaments",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Anna Burns",
        country: "United Kingdom",
        work: "Milkman",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "George Saunders",
        country: "United States",
        work: "Lincoln in the Bardo",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Paul Beatty",
        country: "United States",
        work: "The Sellout",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2015,
        writer: "Marlon James",
        country: "Jamaica",
        work: "A Brief History of Seven Killings",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2014,
        writer: "Richard Flanagan",
        country: "Australia",
        work: "The Narrow Road to the Deep North",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2013,
        writer: "Eleanor Catton",
        country: "New Zealand",
        work: "The Luminaries",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2012,
        writer: "Hilary Mantel",
        country: "England",
        work: "Bring Up the Bodies",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2011,
        writer: "Julian Barnes",
        country: "England",
        work: "The Sense of an Ending",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2010,
        writer: "Howard Jacobson",
        country: "England",
        work: "The Finkler Question",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2009,
        writer: "Hilary Mantel",
        country: "England",
        work: "Wolf Hall",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2008,
        writer: "Aravind Adiga",
        country: "India",
        work: "The White Tiger",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2007,
        writer: "Anne Enright",
        country: "Ireland",
        work: "The Gathering",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2006,
        writer: "Kiran Desai",
        country: "India",
        work: "The Inheritance of Loss",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2005,
        writer: "John Banville",
        country: "Ireland",
        work: "The Sea",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2004,
        writer: "Alan Hollinghurst",
        country: "England",
        work: "The Line of Beauty",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2003,
        writer: "DBC Pierre",
        country: "Australia",
        work: "Vernon God Little",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2002,
        writer: "Yann Martel",
        country: "Canada",
        work: "Life of Pi",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2001,
        writer: "Peter Carey",
        country: "Australia",
        work: "True History of the Kelly Gang",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 2000,
        writer: "Margaret Atwood",
        country: "Canada",
        work: "The Blind Assassin",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1999,
        writer: "J. M. Coetzee",
        country: "South Africa",
        work: "Disgrace",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1998,
        writer: "Ian McEwan",
        country: "England",
        work: "Amsterdam",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1997,
        writer: "Arundhati Roy",
        country: "India",
        work: "The God of Small Things",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1996,
        writer: "Graham Swift",
        country: "England",
        work: "Last Orders",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1995,
        writer: "Pat Barker",
        country: "England",
        work: "The Ghost Road",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1994,
        writer: "James Kelman",
        country: "Scotland",
        work: "How Late It Was, How Late",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1993,
        writer: "Roddy Doyle",
        country: "Ireland",
        work: "Paddy Clarke Ha Ha Ha",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1992,
        writer: "Barry Unsworth",
        country: "England",
        work: "Sacred Hunger",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1992,
        writer: "Michael Ondaatje",
        country: "Canada / Sri Lanka",
        work: "The English Patient",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1991,
        writer: "Ben Okri",
        country: "Nigeria",
        work: "The Famished Road",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
      {
        year: 1990,
        writer: "A. S. Byatt",
        country: "England",
        work: "Possession",
        sources: [
          "https://en.wikipedia.org/wiki/Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=Booker_Prize&action=raw",
        ],
      },
    ],
  },
  {
    id: "international-booker",
    name: "International Booker Prize",
    region: "international",
    genres: [],
    organiserUrl: "https://thebookerprizes.com",
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Banu Mushtaq",
        country: "India",
        work: "Heart Lamp: Selected Stories",
        translator: "Deepa Bhasthi",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2024,
        writer: "Jenny Erpenbeck",
        country: "Germany",
        work: "Kairos",
        translator: "Michael Hofmann",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2023,
        writer: "Georgi Gospodinov",
        country: "Bulgaria",
        work: "Time Shelter",
        translator: "Angela Rodel",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Geetanjali Shree",
        country: "India",
        work: "Tomb of Sand",
        translator: "Daisy Rockwell",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "David Diop",
        country: "France",
        work: "At Night All Blood Is Black",
        translator: "Anna Moschovakis",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Marieke Lucas Rijneveld",
        country: "Netherlands",
        work: "The Discomfort of Evening",
        translator: "Michele Hutchison",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Jokha al-Harthi",
        country: "Oman",
        work: "Celestial Bodies",
        translator: "Marilyn Booth",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Olga Tokarczuk",
        country: "Poland",
        work: "Flights",
        translator: "Jennifer Croft",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "David Grossman",
        country: "Israel",
        work: "A Horse Walks into a Bar",
        translator: "Jessica Cohen",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Han Kang",
        country: "South Korea",
        work: "The Vegetarian",
        translator: "Deborah Smith",
        sources: [
          "https://en.wikipedia.org/wiki/International_Booker_Prize",
          "https://en.wikipedia.org/w/index.php?title=International_Booker_Prize&action=raw",
        ],
      },
    ],
  },
  {
    id: "pulitzer-fiction",
    name: "Pulitzer Prize for Fiction",
    region: "united-states",
    genres: ["fiction"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Percival Everett",
        country: null,
        work: "James",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2024,
        writer: "Jayne Anne Phillips",
        country: null,
        work: "Night Watch",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2023,
        writer: "Barbara Kingsolver",
        country: null,
        work: "Demon Copperhead",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2023,
        writer: "Hernan Diaz",
        country: null,
        work: "Trust",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2022,
        writer: "Joshua Cohen",
        country: null,
        work: "The Netanyahus: An Account of a Minor and Ultimately Even Negligible Episode in the History of a Very Famous Family",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2021,
        writer: "Louise Erdrich",
        country: null,
        work: "The Night Watchman",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2020,
        writer: "Colson Whitehead",
        country: null,
        work: "The Nickel Boys",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2019,
        writer: "Richard Powers",
        country: null,
        work: "The Overstory",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2018,
        writer: "Andrew Sean Greer",
        country: null,
        work: "Less",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2017,
        writer: "Colson Whitehead",
        country: null,
        work: "The Underground Railroad",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2016,
        writer: "Viet Thanh Nguyen",
        country: null,
        work: "The Sympathizer",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2015,
        writer: "Anthony Doerr",
        country: null,
        work: "All the Light We Cannot See",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2014,
        writer: "Donna Tartt",
        country: null,
        work: "The Goldfinch",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2013,
        writer: "Adam Johnson",
        country: null,
        work: "The Orphan Master's Son",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2011,
        writer: "Jennifer Egan",
        country: null,
        work: "A Visit from the Goon Squad",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2010,
        writer: "Paul Harding",
        country: null,
        work: "Tinkers",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2009,
        writer: "Elizabeth Strout",
        country: null,
        work: "Olive Kitteridge",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2008,
        writer: "Junot Díaz",
        country: null,
        work: "The Brief Wondrous Life of Oscar Wao",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2007,
        writer: "Cormac McCarthy",
        country: null,
        work: "The Road",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2006,
        writer: "Geraldine Brooks",
        country: null,
        work: "March",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2005,
        writer: "Marilynne Robinson",
        country: null,
        work: "Gilead",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2004,
        writer: "Edward P. Jones",
        country: null,
        work: "The Known World",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2003,
        writer: "Jeffrey Eugenides",
        country: null,
        work: "Middlesex",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2002,
        writer: "Richard Russo",
        country: null,
        work: "Empire Falls",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2001,
        writer: "Michael Chabon",
        country: null,
        work: "The Amazing Adventures of Kavalier and Clay",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
      {
        year: 2000,
        writer: "Jhumpa Lahiri",
        country: null,
        work: "Interpreter of Maladies",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Fiction"],
      },
    ],
  },
  {
    id: "pulitzer-poetry",
    name: "Pulitzer Prize for Poetry",
    region: "united-states",
    genres: ["poetry"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Marie Howe",
        country: null,
        work: "New and Selected Poems",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2024,
        writer: "Brandon Som",
        country: null,
        work: "Tripas: Poems",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2023,
        writer: "Carl Phillips",
        country: null,
        work: "Then the War: and Selected Poems, 2007–2020",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2022,
        writer: "Diane Seuss",
        country: null,
        work: "frank: sonnets",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2021,
        writer: "Natalie Diaz",
        country: null,
        work: "Postcolonial Love Poem",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2020,
        writer: "Jericho Brown",
        country: null,
        work: "The Tradition",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2019,
        writer: "Forrest Gander",
        country: null,
        work: "Be With",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2018,
        writer: "Frank Bidart",
        country: null,
        work: "Half-light: Collected Poems 1965–2016",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2017,
        writer: "Tyehimba Jess",
        country: null,
        work: "Olio",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2016,
        writer: "Peter Balakian",
        country: null,
        work: "Ozone Journal",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2015,
        writer: "Gregory Pardlo",
        country: null,
        work: "Digest",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2014,
        writer: "Vijay Seshadri",
        country: null,
        work: "3 Sections",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2013,
        writer: "Sharon Olds",
        country: null,
        work: "Stag's Leap",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2012,
        writer: "Tracy K. Smith",
        country: null,
        work: "Life on Mars",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2011,
        writer: "Kay Ryan",
        country: null,
        work: "The Best of It: New and Selected Poems",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2010,
        writer: "Rae Armantrout",
        country: null,
        work: "Versed",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2009,
        writer: "W. S. Merwin",
        country: null,
        work: "The Shadow of Sirius",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2008,
        writer: "Philip Schultz",
        country: null,
        work: "Failure",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2008,
        writer: "Robert Hass",
        country: null,
        work: "Time and Materials",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2007,
        writer: "Natasha Trethewey",
        country: null,
        work: "Native Guard",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2006,
        writer: "Claudia Emerson",
        country: null,
        work: "Late Wife",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2005,
        writer: "Ted Kooser",
        country: null,
        work: "Delights & Shadows",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2004,
        writer: "Franz Wright",
        country: null,
        work: "Walking to Martha's Vineyard",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2003,
        writer: "Paul Muldoon",
        country: null,
        work: "Moy Sand and Gravel",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2002,
        writer: "Carl Dennis",
        country: null,
        work: "Practical Gods",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2001,
        writer: "Stephen Dunn",
        country: null,
        work: "Different Hours",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
      {
        year: 2000,
        writer: "C. K. Williams",
        country: null,
        work: "Repair",
        sources: ["https://en.wikipedia.org/wiki/Pulitzer_Prize_for_Poetry"],
      },
    ],
  },
  {
    id: "pulitzer-general-nonfiction",
    name: "Pulitzer Prize for General Nonfiction",
    region: "united-states",
    genres: ["nonfiction"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Benjamin Nathans",
        country: null,
        work: "To the Success of Our Hopeless Cause: The Many Lives of the Soviet Dissident Movement",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2024,
        writer: "Nathan Thrall",
        country: null,
        work: "A Day in the Life of Abed Salama: Anatomy of a Jerusalem Tragedy",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2023,
        writer: "Toluse Olorunnipa and Robert Samuels",
        country: null,
        work: "His Name Is George Floyd: One Man's Life and the Struggle for Racial Justice",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2022,
        writer: "Andrea Elliott",
        country: null,
        work: "Invisible Child: Poverty, Survival and Hope in an American City",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2021,
        writer: "David Zucchino",
        country: null,
        work: "Wilmington's Lie: The Murderous Coup of 1898 and the Rise of White Supremacy",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2020,
        writer: "Anne Boyer",
        country: null,
        work: "The Undying: Pain, Vulnerability, Mortality, Medicine, Art, Time, Dreams, Data, Exhaustion, Cancer, and Care",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2020,
        writer: "Greg Grandin",
        country: null,
        work: "The End of the Myth: From the Frontier to the Border Wall in the Mind of America",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2019,
        writer: "Eliza Griswold",
        country: null,
        work: "Amity and Prosperity: One Family and the Fracturing of America",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2018,
        writer: "James Forman Jr.",
        country: null,
        work: "Locking Up Our Own: Crime and Punishment in Black America",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2017,
        writer: "Matthew Desmond",
        country: null,
        work: "Evicted: Poverty and Profit in the American City",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2016,
        writer: "Joby Warrick",
        country: null,
        work: "Black Flags: The Rise of ISIS",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2015,
        writer: "Elizabeth Kolbert",
        country: null,
        work: "The Sixth Extinction: An Unnatural History",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2014,
        writer: "Dan Fagin",
        country: null,
        work: "Toms River: A Story of Science and Salvation",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2013,
        writer: "Gilbert King",
        country: null,
        work: "Devil in the Grove: Thurgood Marshall, the Groveland Boys, and the Dawn of a New America",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2012,
        writer: "Stephen Greenblatt",
        country: null,
        work: "The Swerve: How the World Became Modern",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2011,
        writer: "Siddhartha Mukherjee",
        country: null,
        work: "The Emperor of All Maladies: A Biography of Cancer",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
      {
        year: 2010,
        writer: "David E. Hoffman",
        country: null,
        work: "The Dead Hand: The Untold Story of the Cold War Arms Race and Its Dangerous Legacy",
        sources: [
          "https://en.wikipedia.org/wiki/Pulitzer_Prize_for_General_Nonfiction",
        ],
      },
    ],
  },
  {
    id: "nba-fiction",
    name: "National Book Award for Fiction",
    region: "united-states",
    genres: ["fiction"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Rabih Alameddine",
        country: null,
        work: "The True True Story of Raja the Gullible (and His Mother)",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2024,
        writer: "Percival Everett",
        country: null,
        work: "James",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2023,
        writer: "Justin Torres",
        country: null,
        work: "Blackouts",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2022,
        writer: "Tess Gunty",
        country: null,
        work: "The Rabbit Hutch",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2021,
        writer: "Jason Mott",
        country: null,
        work: "Hell of a Book",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2020,
        writer: "Charles Yu",
        country: null,
        work: "Interior Chinatown",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2019,
        writer: "Susan Choi",
        country: null,
        work: "Trust Exercise",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2018,
        writer: "Sigrid Nunez",
        country: null,
        work: "The Friend",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2017,
        writer: "Jesmyn Ward",
        country: null,
        work: "Sing, Unburied, Sing",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2016,
        writer: "Colson Whitehead",
        country: null,
        work: "The Underground Railroad",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2015,
        writer: "Adam Johnson",
        country: null,
        work: "Fortune Smiles",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2014,
        writer: "Phil Klay",
        country: null,
        work: "Redeployment",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2013,
        writer: "James McBride",
        country: null,
        work: "The Good Lord Bird",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2012,
        writer: "Louise Erdrich",
        country: null,
        work: "The Round House",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2011,
        writer: "Jesmyn Ward",
        country: null,
        work: "Salvage the Bones",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2010,
        writer: "Jaimy Gordon",
        country: null,
        work: "Lord of Misrule",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2009,
        writer: "Colum McCann",
        country: null,
        work: "Let the Great World Spin",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2008,
        writer: "Peter Matthiessen",
        country: null,
        work: "Shadow Country",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2007,
        writer: "Denis Johnson",
        country: null,
        work: "Tree of Smoke",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2006,
        writer: "Richard Powers",
        country: null,
        work: "The Echo Maker",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
      {
        year: 2005,
        writer: "William T. Vollmann",
        country: null,
        work: "Europe Central",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Fiction",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Fiction&action=raw&section=12",
        ],
      },
    ],
  },
  {
    id: "nba-poetry",
    name: "National Book Award for Poetry",
    region: "united-states",
    genres: ["poetry"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Patricia Smith",
        country: null,
        work: "The Intentions of Thunder: New and Selected Poems",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2024,
        writer: "Lena Khalaf Tuffaha",
        country: null,
        work: "Something About Living",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2023,
        writer: "Craig Santos Perez",
        country: null,
        work: "from unincorporated territory [åmot]",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2022,
        writer: "John Keene",
        country: null,
        work: "Punks: New & Selected Poems",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2021,
        writer: "Martín Espada",
        country: null,
        work: "Floaters",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2020,
        writer: "Don Mee Choi",
        country: null,
        work: "DMZ Colony",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2019,
        writer: "Arthur Sze",
        country: null,
        work: "Sight Lines",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2018,
        writer: "Justin Phillip Reed",
        country: null,
        work: "Indecency",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2017,
        writer: "Frank Bidart",
        country: null,
        work: "Half-light: Collected Poems 1965–2016",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2016,
        writer: "Daniel Borzutzky",
        country: null,
        work: "The Performance of Becoming Human",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2015,
        writer: "Robin Coste Lewis",
        country: null,
        work: "Voyage of the Sable Venus",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2014,
        writer: "Louise Glück",
        country: null,
        work: "Faithful and Virtuous Night",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2013,
        writer: "Mary Szybist",
        country: null,
        work: "Incarnadine",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2012,
        writer: "David Ferry",
        country: null,
        work: "Bewilderment: New Poems and Translations",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2011,
        writer: "Nikky Finney",
        country: null,
        work: "Head Off & Split: Poems",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2010,
        writer: "Terrance Hayes",
        country: null,
        work: "Lighthead",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2009,
        writer: "Keith Waldrop",
        country: null,
        work: "Transcendental Studies: A Trilogy",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2008,
        writer: "Mark Doty",
        country: null,
        work: "Fire to Fire: New and Selected Poems",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2007,
        writer: "Robert Hass",
        country: null,
        work: "Time and Materials: Poems, 1997–2005",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2006,
        writer: "Nathaniel Mackey",
        country: null,
        work: "Splay Anthem",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
      {
        year: 2005,
        writer: "W. S. Merwin",
        country: null,
        work: "Migration: New and Selected Poems",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Award_for_Poetry",
        ],
      },
    ],
  },
  {
    id: "nba-nonfiction",
    name: "National Book Award for Nonfiction",
    region: "united-states",
    genres: ["nonfiction"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Omar El Akkad",
        country: null,
        work: "One Day, Everyone Will Have Always Been Against This",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=31",
        ],
      },
      {
        year: 2024,
        writer: "Jason De León",
        country: null,
        work: "Soldiers and Kings: Survival and Hope in the World of Human Smuggling",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=31",
        ],
      },
      {
        year: 2023,
        writer: "Ned Blackhawk",
        country: null,
        work: "The Rediscovery of America: Native Peoples and the Unmaking of US History",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=31",
        ],
      },
      {
        year: 2022,
        writer: "Imani Perry",
        country: null,
        work: "South to America: A Journey Below the Mason-Dixon To Understand the Soul of a Nation",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=31",
        ],
      },
      {
        year: 2021,
        writer: "Tiya Miles",
        country: null,
        work: "All That She Carried: The Journey of Ashley's Sack, a Black Family Keepsake",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=31",
        ],
      },
      {
        year: 2020,
        writer: "Les Payne and Tamara Payne",
        country: null,
        work: "The Dead Are Arising: The Life of Malcolm X",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=31",
        ],
      },
      {
        year: 2019,
        writer: "Sarah M. Broom",
        country: null,
        work: "The Yellow House",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2018,
        writer: "Jeffrey C. Stewart",
        country: null,
        work: "The New Negro: The Life of Alain Locke",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2017,
        writer: "Masha Gessen",
        country: null,
        work: "The Future Is History: How Totalitarianism Reclaimed Russia",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2016,
        writer: "Ibram X. Kendi",
        country: null,
        work: "Stamped from the Beginning: The Definitive History of Racist Ideas in America",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2015,
        writer: "Ta-Nehisi Coates",
        country: null,
        work: "Between the World and Me",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2014,
        writer: "Evan Osnos",
        country: null,
        work: "Age of Ambition: Chasing Fortune, Truth, and Faith in the New China",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2013,
        writer: "George Packer",
        country: null,
        work: "The Unwinding: An Inner History of the New America",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2012,
        writer: "Katherine Boo",
        country: null,
        work: "Behind the Beautiful Forevers: Life, Death, and Hope in a Mumbai Undercity",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2011,
        writer: "Stephen Greenblatt",
        country: null,
        work: "The Swerve: How the World Became Modern",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
      {
        year: 2010,
        writer: "Patti Smith",
        country: null,
        work: "Just Kids",
        sources: [
          "https://en.wikipedia.org/w/index.php?title=National_Book_Award_for_Nonfiction&action=raw&section=30",
        ],
      },
    ],
  },
  {
    id: "womens-prize-fiction",
    name: "Women's Prize for Fiction (formerly Orange Prize / Baileys Women's Prize)",
    region: "uk-ireland",
    genres: ["fiction"],
    organiserUrl: "https://womensprize.com",
    picksFrom:
      "Any full-length novel written in English by a woman of any nationality, first published as a print or e-book edition in the United Kingdom in the eligibility window (1 April 2025 – 31 March 2026 for the 2026 prize); short story collections, novellas and translations are not eligible.",
    winners: [
      {
        year: 2025,
        writer: "Yael van der Wouden",
        country: null,
        work: "The Safekeep",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2024,
        writer: "V. V. Ganeshananthan",
        country: null,
        work: "Brotherless Night",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2023,
        writer: "Barbara Kingsolver",
        country: null,
        work: "Demon Copperhead",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Ruth Ozeki",
        country: null,
        work: "The Book of Form and Emptiness",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "Susanna Clarke",
        country: null,
        work: "Piranesi",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Maggie O'Farrell",
        country: null,
        work: "Hamnet",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Tayari Jones",
        country: null,
        work: "An American Marriage",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Kamila Shamsie",
        country: null,
        work: "Home Fire",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "Naomi Alderman",
        country: null,
        work: "The Power",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Lisa McInerney",
        country: null,
        work: "The Glorious Heresies",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2015,
        writer: "Ali Smith",
        country: null,
        work: "How to Be Both",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2014,
        writer: "Eimear McBride",
        country: null,
        work: "A Girl Is a Half-formed Thing",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2013,
        writer: "A. M. Homes",
        country: null,
        work: "May We Be Forgiven",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2012,
        writer: "Madeline Miller",
        country: null,
        work: "The Song of Achilles",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2011,
        writer: "Téa Obreht",
        country: null,
        work: "The Tiger's Wife",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2010,
        writer: "Barbara Kingsolver",
        country: null,
        work: "The Lacuna",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2009,
        writer: "Marilynne Robinson",
        country: null,
        work: "Home",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2008,
        writer: "Rose Tremain",
        country: null,
        work: "The Road Home",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2007,
        writer: "Chimamanda Ngozi Adichie",
        country: null,
        work: "Half of a Yellow Sun",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2006,
        writer: "Zadie Smith",
        country: null,
        work: "On Beauty",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2005,
        writer: "Lionel Shriver",
        country: null,
        work: "We Need to Talk About Kevin",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2004,
        writer: "Andrea Levy",
        country: null,
        work: "Small Island",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2003,
        writer: "Valerie Martin",
        country: null,
        work: "Property",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2002,
        writer: "Ann Patchett",
        country: null,
        work: "Bel Canto",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2001,
        writer: "Kate Grenville",
        country: null,
        work: "The Idea of Perfection",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 2000,
        writer: "Linda Grant",
        country: null,
        work: "When I Lived in Modern Times",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 1999,
        writer: "Suzanne Berne",
        country: null,
        work: "A Crime in the Neighborhood",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 1998,
        writer: "Carol Shields",
        country: null,
        work: "Larry's Party",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 1997,
        writer: "Anne Michaels",
        country: null,
        work: "Fugitive Pieces",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
      {
        year: 1996,
        writer: "Helen Dunmore",
        country: null,
        work: "A Spell of Winter",
        sources: [
          "https://en.wikipedia.org/wiki/List_of_Women%27s_Prize_for_Fiction_winners",
          "https://en.wikipedia.org/w/index.php?title=List_of_Women%27s_Prize_for_Fiction_winners&action=raw",
        ],
      },
    ],
  },
  {
    id: "pen-faulkner",
    name: "PEN/Faulkner Award for Fiction",
    region: "united-states",
    genres: ["fiction"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Garth Greenwell",
        country: null,
        work: "Small Rain",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2024,
        writer: "Claire Jiménez",
        country: null,
        work: "What Happened to Ruthy Ramirez",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2023,
        writer: "Yiyun Li",
        country: null,
        work: "The Book of Goose",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2022,
        writer: "Rabih Alameddine",
        country: null,
        work: "The Wrong End of the Telescope",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2021,
        writer: "Deesha Philyaw",
        country: null,
        work: "The Secret Lives of Church Ladies",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2020,
        writer: "Chloe Aridjis",
        country: null,
        work: "Sea Monsters",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2019,
        writer: "Azareen Van der Vliet Oloomi",
        country: null,
        work: "Call Me Zebra",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2018,
        writer: "Joan Silber",
        country: null,
        work: "Improvement",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2017,
        writer: "Imbolo Mbue",
        country: null,
        work: "Behold the Dreamers",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2016,
        writer: "James Hannaham",
        country: null,
        work: "Delicious Foods",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2015,
        writer: "Atticus Lish",
        country: null,
        work: "Preparation for the Next Life",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2014,
        writer: "Karen Joy Fowler",
        country: null,
        work: "We Are All Completely Beside Ourselves",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2013,
        writer: "Benjamin Alire Sáenz",
        country: null,
        work: "Everything Begins and Ends at the Kentucky Club",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2012,
        writer: "Julie Otsuka",
        country: null,
        work: "The Buddha in the Attic",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2011,
        writer: "Deborah Eisenberg",
        country: null,
        work: "The Collected Stories of Deborah Eisenberg",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
      {
        year: 2010,
        writer: "Sherman Alexie",
        country: null,
        work: "War Dances",
        sources: [
          "https://en.wikipedia.org/wiki/PEN/Faulkner_Award_for_Fiction",
        ],
      },
    ],
  },
  {
    id: "nbcc-fiction",
    name: "National Book Critics Circle Award for Fiction",
    region: "united-states",
    genres: ["fiction"],
    organiserUrl: "https://www.bookcritics.org",
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Han Kang",
        country: null,
        work: "We Do Not Part",
        translator: "e. yaewon and Paige Aniyah Morris",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
          "https://www.bookcritics.org/awards/",
        ],
      },
      {
        year: 2024,
        writer: "Hisham Matar",
        country: null,
        work: "My Friends",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2023,
        writer: "Lorrie Moore",
        country: null,
        work: "I Am Homeless if This Is Not My Home",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2022,
        writer: "Ling Ma",
        country: null,
        work: "Bliss Montage",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2021,
        writer: "Honorée Fanonne Jeffers",
        country: null,
        work: "The Love Songs of W.E.B. Du Bois",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2020,
        writer: "Maggie O'Farrell",
        country: null,
        work: "Hamnet",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2019,
        writer: "Edwidge Danticat",
        country: null,
        work: "Everything Inside",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2018,
        writer: "Anna Burns",
        country: null,
        work: "Milkman",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2017,
        writer: "Joan Silber",
        country: null,
        work: "Improvement",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2016,
        writer: "Louise Erdrich",
        country: null,
        work: "LaRose",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2015,
        writer: "Paul Beatty",
        country: null,
        work: "The Sellout",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2014,
        writer: "Marilynne Robinson",
        country: null,
        work: "Lila",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2013,
        writer: "Chimamanda Ngozi Adichie",
        country: null,
        work: "Americanah",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2012,
        writer: "Ben Fountain",
        country: null,
        work: "Billy Lynn's Long Halftime Walk",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2011,
        writer: "Edith Pearlman",
        country: null,
        work: "Binocular Vision: New and Selected Stories",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
      {
        year: 2010,
        writer: "Jennifer Egan",
        country: null,
        work: "A Visit from the Goon Squad",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Fiction",
        ],
      },
    ],
  },
  {
    id: "nbcc-poetry",
    name: "National Book Critics Circle Award for Poetry",
    region: "united-states",
    genres: ["poetry"],
    organiserUrl: "https://www.bookcritics.org",
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Kevin Young",
        country: null,
        work: "Night Watch",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
          "https://www.bookcritics.org/awards/",
        ],
      },
      {
        year: 2024,
        writer: "Anne Carson",
        country: null,
        work: "Wrong Norma",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2023,
        writer: "Kim Hyesoon",
        country: null,
        work: "Phantom Pain Wings",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Cynthia Cruz",
        country: null,
        work: "Hotel Oblivion",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "Diane Seuss",
        country: null,
        work: "Frank: Sonnets",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Francine J. Harris",
        country: null,
        work: "Here Is the Sweet Hand",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Morgan Parker",
        country: null,
        work: "Magical Negro",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Ada Limón",
        country: null,
        work: "The Carrying",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "Layli Long Soldier",
        country: null,
        work: "Whereas",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Ishion Hutchinson",
        country: null,
        work: "House of Lords and Commons",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2015,
        writer: "Ross Gay",
        country: null,
        work: "Catalogue of Unabashed Gratitude",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2014,
        writer: "Claudia Rankine",
        country: null,
        work: "Citizen: An American Lyric",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2013,
        writer: "Frank Bidart",
        country: null,
        work: "Metaphysical Dog",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2012,
        writer: "D. A. Powell",
        country: null,
        work: "Useless Landscape, or A Guide for Boys",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2011,
        writer: "Laura Kasischke",
        country: null,
        work: "Space, In Chains",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
      {
        year: 2010,
        writer: "C.D. Wright",
        country: null,
        work: "One With Others",
        sources: [
          "https://en.wikipedia.org/wiki/National_Book_Critics_Circle_Award_for_Poetry",
          "https://en.wikipedia.org/w/index.php?title=National_Book_Critics_Circle_Award_for_Poetry&action=raw",
        ],
      },
    ],
  },
  {
    id: "story-prize",
    name: "The Story Prize",
    region: "united-states",
    genres: [],
    organiserUrl: "https://www.thestoryprize.org",
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Fiona McFarlane",
        country: null,
        work: "Highway 13",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2024,
        writer: "Paul Yoon",
        country: null,
        work: "The Hive and the Honey",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Ling Ma",
        country: null,
        work: "Bliss Montage",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "Brandon Taylor",
        country: null,
        work: "Filthy Animals",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Deesha Philyaw",
        country: null,
        work: "The Secret Lives of Church Ladies",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Edwidge Danticat",
        country: null,
        work: "Everything Inside",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Lauren Groff",
        country: null,
        work: "Florida",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "Elizabeth Strout",
        country: null,
        work: "Anything Is Possible",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Rick Bass",
        country: null,
        work: "For a Little While",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2015,
        writer: "Adam Johnson",
        country: null,
        work: "Fortune Smiles",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2014,
        writer: "Elizabeth McCracken",
        country: null,
        work: "Thunderstruck",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2013,
        writer: "George Saunders",
        country: null,
        work: "Tenth of December",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2012,
        writer: "Claire Vaye Watkins",
        country: null,
        work: "Battleborn",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2011,
        writer: "Steven Millhauser",
        country: null,
        work: "We Others",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2010,
        writer: "Anthony Doerr",
        country: null,
        work: "Memory Wall",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2009,
        writer: "Daniyal Mueenuddin",
        country: null,
        work: "In Other Rooms, Other Wonders",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2008,
        writer: "Tobias Wolff",
        country: null,
        work: "Our Story Begins",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2007,
        writer: "Jim Shepard",
        country: null,
        work: "Like You'd Understand, Anyway",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2006,
        writer: "Mary Gordon",
        country: null,
        work: "The Stories of Mary Gordon",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
      {
        year: 2005,
        writer: "Patrick O'Keeffe",
        country: null,
        work: "The Hill Road",
        sources: [
          "https://en.wikipedia.org/wiki/The_Story_Prize",
          "https://en.wikipedia.org/w/index.php?title=The_Story_Prize&action=raw",
        ],
      },
    ],
  },
  {
    id: "griffin-poetry",
    name: "Griffin Poetry Prize",
    region: "canada",
    genres: ["poetry"],
    organiserUrl: null,
    picksFrom: null,
    winners: [
      {
        year: 2025,
        writer: "Durs Grünbein",
        country: null,
        work: "Psyche Running",
        translator: "Karen Leeder",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2024,
        writer: "George McWhirter",
        country: null,
        work: "Self-Portrait in the Zone of Silence",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2023,
        writer: "Roger Reeves",
        country: null,
        work: "Best Barbarian",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Douglas Kearney",
        country: null,
        work: "Sho",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2022,
        writer: "Tolu Oloruntoba",
        country: null,
        work: "The Junta of Happenstance",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "Canisia Lubrin",
        country: null,
        work: "The Dyzgraphxst",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2021,
        writer: "Valzhyna Mort",
        country: null,
        work: "Music for the Dead and Resurrected",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Etel Adnan",
        country: null,
        work: "Time",
        translator: "Sarah Riggs",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2020,
        writer: "Kaie Kellough",
        country: null,
        work: "Magnetic Equator",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Eve Joseph",
        country: null,
        work: "Quarrels",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2019,
        writer: "Kim Hyesoon",
        country: null,
        work: "Autobiography of Death",
        translator: "Don Mee Choi",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Billy-Ray Belcourt",
        country: null,
        work: "This Wound is a World",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2018,
        writer: "Susan Howe",
        country: null,
        work: "Debths",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "Alice Oswald",
        country: null,
        work: "Falling Awake",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2017,
        writer: "Jordan Abel",
        country: null,
        work: "Injun",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Liz Howard",
        country: null,
        work: "Infinite Citizen of the Shaking Tent",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2016,
        writer: "Norman Dubie",
        country: null,
        work: "The Quotations of Bone",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2015,
        writer: "Jane Munro",
        country: null,
        work: "Blue Sonoma",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2015,
        writer: "Michael Longley",
        country: null,
        work: "The Stairwell",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2014,
        writer: "Anne Carson",
        country: null,
        work: "Red Doc>",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2014,
        writer: "Brenda Hillman",
        country: null,
        work: "Seasonal Works with Letters on Fire",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2013,
        writer: "David McFadden",
        country: null,
        work: "What's the Score?",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2013,
        writer: "Ghassan Zaqtan",
        country: null,
        work: "The Straw Bird It Follows Me, and Other Poems",
        translator: "Fady Joudah",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2012,
        writer: "David Harsent",
        country: null,
        work: "Night",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2012,
        writer: "Ken Babstock",
        country: null,
        work: "Methodist Hatchet",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2011,
        writer: "Dionne Brand",
        country: null,
        work: "Ossuaries",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2011,
        writer: "Gjertrud Schnackenberg",
        country: null,
        work: "Heavenly Questions",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2010,
        writer: "Eilean Ni Chuilleanain",
        country: null,
        work: "The Sun-fish",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
      {
        year: 2010,
        writer: "Karen Solie",
        country: null,
        work: "Pigeon",
        sources: [
          "https://en.wikipedia.org/wiki/Griffin_Poetry_Prize",
          "https://en.wikipedia.org/w/index.php?title=Griffin_Poetry_Prize&action=raw",
        ],
      },
    ],
  },
  {
    id: "ts-eliot",
    name: "T. S. Eliot Prize",
    region: "uk-ireland",
    genres: ["poetry"],
    organiserUrl: "https://tseliot.com/prize",
    picksFrom:
      "Single-author poetry collections published in the UK or Ireland in the prize year; publisher entries only, self-published work not eligible.",
    winners: [
      {
        year: 2025,
        writer: "Karen Solie",
        country: null,
        work: "Wellwater",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2024,
        writer: "Peter Gizzi",
        country: null,
        work: "Fierce Elegy",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2023,
        writer: "Jason Allen-Paisant",
        country: null,
        work: "Self-Portrait as Othello",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2022,
        writer: "Anthony Joseph",
        country: null,
        work: "Sonnets for Albert",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2021,
        writer: "Joelle Taylor",
        country: null,
        work: "C+nto & Othered Poems",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2020,
        writer: "Bhanu Kapil",
        country: null,
        work: "How to Wash a Heart",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2019,
        writer: "Roger Robinson",
        country: null,
        work: "A Portable Paradise",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2018,
        writer: "Hannah Sullivan",
        country: null,
        work: "Three Poems",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2017,
        writer: "Ocean Vuong",
        country: null,
        work: "Night Sky with Exit Wounds",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2016,
        writer: "Jacob Polley",
        country: null,
        work: "Jackself",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2015,
        writer: "Sarah Howe",
        country: null,
        work: "Loop of Jade",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2014,
        writer: "David Harsent",
        country: null,
        work: "Fire Songs",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2013,
        writer: "Sinéad Morrissey",
        country: null,
        work: "Parallax",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2012,
        writer: "Sharon Olds",
        country: null,
        work: "Stag's Leap",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2011,
        writer: "John Burnside",
        country: null,
        work: "Black Cat Bone",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2010,
        writer: "Derek Walcott",
        country: null,
        work: "White Egrets",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2009,
        writer: "Philip Gross",
        country: null,
        work: "The Water Table",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2008,
        writer: "Jen Hadfield",
        country: null,
        work: "Nigh-No-Place",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2007,
        writer: "Sean O'Brien",
        country: null,
        work: "The Drowned Book",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2006,
        writer: "Seamus Heaney",
        country: null,
        work: "District and Circle",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
      {
        year: 2005,
        writer: "Carol Ann Duffy",
        country: null,
        work: "Rapture",
        sources: ["https://en.wikipedia.org/wiki/T._S._Eliot_Prize"],
      },
    ],
  },
  {
    id: "dylan-thomas",
    name: "Swansea University Dylan Thomas Prize",
    region: "uk-ireland",
    genres: ["fiction", "poetry", "drama"],
    organiserUrl: "https://www.swansea.ac.uk/dylan-thomas-prize/",
    picksFrom:
      "The best published literary work in the English language, written by an author aged 39 or under, in all forms including poetry, novels, short stories and drama.",
    winners: [
      {
        year: 2025,
        writer: "Yasmin Zaher",
        country: null,
        work: "The Coin",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2024,
        writer: "Caleb Azumah Nelson",
        country: null,
        work: "Small Worlds",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2023,
        writer: "Arinze Ifeakandu",
        country: null,
        work: "God's Children Are Little Broken Things",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2022,
        writer: "Patricia Lockwood",
        country: null,
        work: "No One Is Talking About This",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2021,
        writer: "Raven Leilani",
        country: null,
        work: "Luster",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2020,
        writer: "Bryan Washington",
        country: null,
        work: "Lot",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2019,
        writer: "Guy Gunaratne",
        country: null,
        work: "In Our Mad and Furious City",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2018,
        writer: "Kayo Chingonyi",
        country: null,
        work: "Kumukanda",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2017,
        writer: "Fiona McFarlane",
        country: null,
        work: "The High Places",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2016,
        writer: "Max Porter",
        country: null,
        work: "Grief Is the Thing with Feathers",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2014,
        writer: "Joshua Ferris",
        country: null,
        work: "To Rise Again at a Decent Hour",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2013,
        writer: "Claire Vaye Watkins",
        country: null,
        work: "Battleborn",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2012,
        writer: "Maggie Shipstead",
        country: null,
        work: "Seating Arrangements",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2011,
        writer: "Lucy Caldwell",
        country: null,
        work: "The Meeting Point",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
      {
        year: 2010,
        writer: "Elyse Fenton",
        country: null,
        work: "Clamor",
        sources: [
          "https://en.wikipedia.org/wiki/Dylan_Thomas_Prize",
          "https://en.wikipedia.org/w/index.php?title=Dylan_Thomas_Prize&action=raw&section=1",
        ],
      },
    ],
  },
];
