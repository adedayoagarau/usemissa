/**
 * Pieces chosen by annual prize anthologies and short-story awards, with the
 * magazine or journal each first appeared in, compiled on 2026-10-04 from
 * the pages in each selection's \`sources\`. Selections whose source did not
 * name a first venue are left out. \`coverage\` records the years each list
 * is complete for. Best Microfiction and Best Small Fictions are not here:
 * they live in the \`missa_literary_awards\` table, refreshed monthly.
 */
import type { PrizeCollection } from "./types.js";

export const PRIZE_COLLECTIONS: PrizeCollection[] = [
  {
    id: "o-henry",
    name: "The O. Henry Prize Stories (from 2021: The Best Short Stories: The O. Henry Prize Winners)",
    genres: ["fiction"],
    organiserUrl: "https://en.wikipedia.org/wiki/The_O._Henry_Prize_Stories",
    coverage:
      "2018, 2019, 2021-2025 complete (20 each). No 2020 volume was found; search summaries indicate a break in 2020 but this was not verified from a fetched page.",
    selections: [
      {
        year: 2025,
        writer: "Addie Citchens",
        work: "That Girl",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Alice Hoffman",
        work: "City Girl",
        venue: "Harvard Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Anthony Marra",
        work: "Countdown",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Chika Unigwe",
        work: "Miracle in Lagos Traffic",
        venue: "Michigan Quarterly Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Clyde Edgerton",
        work: "Hearing Aids",
        venue: "Oxford American",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Daniel Saldaña París",
        work: "Rosaura at Dawn",
        venue: "The Yale Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Dave Eggers",
        work: "Sanrevelle",
        venue: "The Georgia Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Ehsaneh Sadr",
        work: "Mornings at the Ministry",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Gina Chung",
        work: "The Arrow",
        venue: "One Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Indya Finch",
        work: "Shotgun Calypso",
        venue: "A Public Space",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Jane Kalu",
        work: "Sickled",
        venue: "American Short Fiction",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Lindsey Drager",
        work: "Blackbirds",
        venue: "Colorado Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Ling Ma",
        work: "Winner",
        venue: "The Yale Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Lori Ostlund",
        work: "Just Another Family",
        venue: "New England Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Madeline ffitch",
        work: "Stump of the World",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Michael Deagler",
        work: "The Pleasure of a Working Life",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Thomas Korsgaard",
        work: "The Spit of Him",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Wendell Berry",
        work: "The Stackpole Legend",
        venue: "The Threepenny Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Yah Yah Scholfield",
        work: "Strange Fruit",
        venue: "Southern Humanities Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2025,
        writer: "Zak Salih",
        work: "Three Niles",
        venue: "The Kenyon Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2025-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Allegra Goodman",
        work: "The Last Grownup",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Allegra Hyde",
        work: "Mobilization",
        venue: "Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Amber Caron",
        work: "Didi",
        venue: "Electric Literature",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Brad Felver",
        work: "Orphans",
        venue: "Subtropics",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Caroline Kim",
        work: "Hiding Spot",
        venue: "New England Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Colin Barrett",
        work: "Rain",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Dave Eggers",
        work: "The Honor of Your Presence",
        venue: "One Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "E. K. Ota",
        work: "The Paper Artist",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Emma Binder",
        work: "Roy",
        venue: "Gulf Coast",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Francisco González",
        work: "Serranos",
        venue: "McSweeney's",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Jai Chakrabarti",
        work: "The Import",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Jess Walter",
        work: "The Dark",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Juliana Leite",
        work: "My Good Friend",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Kate DiCamillo",
        work: "The Castle of Rose Tellin",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Katherine D. Stutzman",
        work: "Junior",
        venue: "Harvard Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Madeline ffitch",
        work: "Seeing Through Maps",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Michele Mari",
        work: "The Soccer Balls of Mr. Kurz",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Morris Collins",
        work: "The Home Visit",
        venue: "Subtropics",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Robin Romm",
        work: "Marital Problems",
        venue: "The Sewanee Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2024,
        writer: "Tom Crewe",
        work: "The Room-Service Waiter",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2024-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "'Pemi Aguda",
        work: "The Hollow",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Arinze Ifeakandu",
        work: "Happy Is a Doing Word",
        venue: "The Kenyon Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Catherine Lacey",
        work: "Man Mountain",
        venue: "Astra",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Cristina Rivera Garza",
        work: "Dream Man",
        venue: "Freeman's",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "David Ryan",
        work: "Elision",
        venue: "New England Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Eamon McGuinness",
        work: "The Blackhills",
        venue: "The Stinging Fly",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Gabriel Smith",
        work: "The Complete",
        venue: "The Drift",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Grey Wolfe LaJoie",
        work: "The Locksmith",
        venue: "The Threepenny Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Jacob M'hango",
        work: "The Mother",
        venue: "Short Story Day Africa",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Jamil Jan Kochai",
        work: "The Haunting of Hajji Hotak",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Jonas Eika",
        work: "Me, Rory and Aurora",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "K-Ming Chang",
        work: "Xífù",
        venue: "Electric Literature",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Kathleen Alcott",
        work: "Temporary Housing",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Kirstin Valdez Quade",
        work: "After Hours at the Acacia Park Pool",
        venue: "American Short Fiction",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Ling Ma",
        work: "Office Hours",
        venue: "The Atlantic",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Lisa Taddeo",
        work: "Wisconsin",
        venue: "The Sewanee Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Naomi Shuyama-Gómez",
        work: "The Commander's Teeth",
        venue: "Michigan Quarterly Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Rachel B. Glaser",
        work: "Ira & the Whale",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Rodrigo Blanco Calderón",
        work: "The Mad People of Paris",
        venue: "Southwest Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2023,
        writer: "Shelby Kinney-Lang",
        work: "Snake & Submarine",
        venue: "ZYZZYVA",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2023-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "'Pemi Aguda",
        work: "Breastmilk",
        venue: "One Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Alejandro Zambra",
        work: "Screen Time",
        venue: "The New York Times Magazine",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Amar Mitra",
        work: "The Old Man of Kusumpur",
        venue: "The Common",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Chimamanda Ngozi Adichie",
        work: "Zikora",
        venue: "Amazon Original Stories",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Christos Ikonomou",
        work: "Where They Always Meet",
        venue: "The Yale Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Daniel Mason",
        work: "The Wolves of Circassia",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "David Ryan",
        work: "Warp and Weft",
        venue: "Harvard Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Eshkol Nevo",
        work: "Lemonade",
        venue: "Guernica",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Francisco González",
        work: "Clean Teen",
        venue: "Gulf Coast",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Gunnhild Øyehaug",
        work: "Apples",
        venue: "Freeman's",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Janika Oza",
        work: "Fish Stories",
        venue: "The Kenyon Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Joseph O'Neill",
        work: "Rainbows",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Lorrie Moore",
        work: "Face Time",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Michel Nieva",
        work: "Dengue Boy",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Olga Tokarczuk",
        work: "Seams",
        venue: "Freeman's",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Samanta Schweblin",
        work: "An Unlucky Man",
        venue: "McSweeney's",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Shanteka Sigers",
        work: "A Way with Bea",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Tere Dávila",
        work: "Mercedes's Special Talent",
        venue: "The Offing",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Vladimir Sorokin",
        work: "Horse Soup",
        venue: "n+1",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2022,
        writer: "Yohanca Delgado",
        work: "The Little Widow from the Capital",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-winners-of-the-2022-o-henry-prize-for-short-fiction/",
        ],
      },
      {
        year: 2021,
        writer: "Adachioma Ezeano",
        work: "Becoming the Baby Girl",
        venue: "McSweeney's",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Alice Jolly",
        work: "From Far Around They Saw Us Burn",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Anthony Doerr",
        work: "The Master's Castle",
        venue: "Tin House",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Asali Solomon",
        work: "Delandria",
        venue: "McSweeney's",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Ben Hinshaw",
        work: "Antediluvian",
        venue: "Harvard Review",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Caroline Albertine Minor",
        work: "Grief's Garden",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Crystal Wilkinson",
        work: "Endangered Species: Case 47401",
        venue: "Story",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Daphne Palasi Andreades",
        work: "Brown Girls",
        venue: "The Kenyon Review",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "David Means",
        work: "Two Nurses, Smoking",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "David Rabe",
        work: "Things We Worried About When I Was Ten",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Emma Cline",
        work: "White Noise",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Jamel Brinkley",
        work: "Witness",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Jianan Qian",
        work: "To the Dogs",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Joan Silber",
        work: "Freedom from Want",
        venue: "Tin House",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Jowhor Ile",
        work: "Fisherman's Stew",
        venue: "The Sewanee Review",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Karina Sainz Borgo",
        work: "Scissors",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Sally Rooney",
        work: "Color and Light",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Sindya Bhanoo",
        work: "Malliga Homes",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Tessa Hadley",
        work: "The Other One",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2021,
        writer: "Tiphanie Yanique",
        work: "The Living Sea",
        venue: "Harvard Review",
        sources: [
          "https://lithub.com/announcing-the-the-best-short-stories-2021/",
        ],
      },
      {
        year: 2019,
        writer: "Alexander MacLeod",
        work: "Lagomorph",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Alexia Arthurs",
        work: "Mermaid River",
        venue: "The Sewanee Review",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Bryan Washington",
        work: "610 North, 610 West",
        venue: "Tin House",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Caoilinn Hughes",
        work: "Prime",
        venue: "Granta",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Doua Thao",
        work: "Flowers for America",
        venue: "Fiction",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Isabella Hammad",
        work: "Mr. Can'aan",
        venue: "The Paris Review",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "John Edgar Wideman",
        work: "Maps and Ledgers",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "John Keeble",
        work: "Synchronicity",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Kenan Orhan",
        work: "Soma",
        venue: "The Massachusetts Review",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Liza Ward",
        work: "The Shrew Tree",
        venue: "ZYZZYVA",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Moira McCavana",
        work: "No Spanish",
        venue: "Harvard Review",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Patricia Engel",
        work: "Aguacero",
        venue: "The Kenyon Review",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Rachel Kondo",
        work: "Girl of Few Seasons",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Sarah Hall",
        work: "Goodnight Nobody",
        venue: "One Story",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Sarah Shun-lien Bynum",
        work: "Julia and Sunny",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Souvankham Thammavongsa",
        work: "Slingshot",
        venue: "Harper's Magazine",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Stephanie Reents",
        work: "Unstuck",
        venue: "Witness",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Tessa Hadley",
        work: "Funny Little Snake",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Valerie O'Riordan",
        work: "Bad Girl",
        venue: "LitMag",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2019,
        writer: "Weike Wang",
        work: "Omakase",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-100th-annual-o-henry-prize/",
        ],
      },
      {
        year: 2018,
        writer: "Anne Enright",
        work: "Solstice",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Brad Felver",
        work: "Queen Elizabeth",
        venue: "One Story",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Brenda Walker",
        work: "The Houses that Are Left Behind",
        venue: "The Kenyon Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Dave King",
        work: "The Stamp Collector",
        venue: "Fence",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Dounia Choukri",
        work: "Past Perfect Continuous",
        venue: "Chicago Quarterly Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Jamil Kochai",
        work: "Nights in Logar",
        venue: "A Public Space",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Jenny Zhang",
        work: "Why Were They Throwing Bricks?",
        venue: "n+1",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Jo Ann Beard",
        work: "The Tomb of Wrestling",
        venue: "Tin House",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Jo Lloyd",
        work: "The Earth, Thy Great Exchequer, Ready Lies",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Lara Vapnyar",
        work: "Deaf and Blind",
        venue: "The New Yorker",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Lauren Alwan",
        work: "An Amount of Discretion",
        venue: "The Southern Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Marjorie Celona",
        work: "Counterblast",
        venue: "The Southern Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Mark Jude Poirier",
        work: "How We Eat",
        venue: "Epoch",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Michael Parker",
        work: "Stop 'n' Go",
        venue: "New England Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Michael Powers",
        work: "More or Less Like a Man",
        venue: "The Threepenny Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Stephanie A. Vega",
        work: "We Keep Them Anyway",
        venue: "The Threepenny Review",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Thomas Bolt",
        work: "Inversion of Marcia",
        venue: "n+1",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Tristan Hughes",
        work: "Up Here",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Viet Dinh",
        work: "Lucky Dragon",
        venue: "Ploughshares",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
      {
        year: 2018,
        writer: "Youmna Chlala",
        work: "Nayla",
        venue: "Prairie Schooner",
        sources: [
          "https://lithub.com/announcing-the-2018-o-henry-prize-stories/",
        ],
      },
    ],
  },
  {
    id: "best-american-short-stories",
    name: "The Best American Short Stories",
    genres: ["fiction"],
    organiserUrl:
      "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories",
    coverage:
      "2018-2024 complete (20 each) from Wikipedia per-year tables (cross-checked against raw wikitext). 2025: only 3 of 20 venues verified (Symphony Space Selected Shorts pages); no per-year Wikipedia page exists.",
    selections: [
      {
        year: 2025,
        writer: "Jessica Treadway",
        work: "An Early Departure",
        venue: "Five Points",
        sources: [
          "https://www.symphonyspace.org/selected-shorts/episodes/best-american-short-stories-2025",
          "https://www.symphonyspace.org/programs/selected-shorts-best-american-short-stories-2025",
        ],
      },
      {
        year: 2025,
        writer: "Julian Robles",
        work: "Third Room",
        venue: "The Drift",
        sources: [
          "https://www.symphonyspace.org/selected-shorts/episodes/best-american-short-stories-2025",
          "https://www.symphonyspace.org/programs/selected-shorts-best-american-short-stories-2025",
        ],
      },
      {
        year: 2025,
        writer: "Lauren Acampora",
        work: "Dominion",
        venue: "New England Review",
        sources: [
          "https://www.symphonyspace.org/programs/selected-shorts-best-american-short-stories-2025",
        ],
      },
      {
        year: 2024,
        writer: "Alexandra Chang",
        work: "Phenotype",
        venue: "Electric Literature",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Allegra Hyde",
        work: "Democracy in America",
        venue: "The Massachusetts Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Azareen Van der Vliet Oloomi",
        work: "Extinction",
        venue: "Electric Literature",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Daniel Mason",
        work: "A Case Study",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Jamel Brinkley",
        work: "Blessed Deliverance",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Jhumpa Lahiri",
        work: "P's Parties",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Jim Shepard",
        work: "Privilege",
        venue: "Ploughshares",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Katherine Damm",
        work: "The Happiest Day of Your Life",
        venue: "The Iowa Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Laurie Colwin",
        work: "Evensong",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Lori Ostlund",
        work: "Just Another Family",
        venue: "New England Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Madeline ffitch",
        work: "Seeing Through Maps",
        venue: "Harper's Magazine",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Marie-Helene Bertino",
        work: "Viola in Midwinter",
        venue: "Bennington Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Molly Dektar",
        work: "The Bed & Breakfast",
        venue: "Harvard Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Paul Yoon",
        work: "Valley of the Moon",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Selena Gambrell Anderson",
        work: "Jewel of the Gulf of Mexico",
        venue: "McSweeney's",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Shastri Akella",
        work: "The Magic Bangle",
        venue: "Fairy Tale Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Steven Duong",
        work: "Dorchester",
        venue: "The Drift",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Susan Shepherd",
        work: "Baboons",
        venue: "The Kenyon Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Suzanne Wang",
        work: "Mall of America",
        venue: "One Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2024,
        writer: "Taisia Kitaiskaia",
        work: "Engelond",
        venue: "Virginia Quarterly Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2024",
        ],
      },
      {
        year: 2023,
        writer: "Azareen Van der Vliet Oloomi",
        work: "It Is What It Is",
        venue: "Electric Literature",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Benjamin Ehrlich",
        work: "The Master Mourner",
        venue: "The Gettysburg Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Cherline Bazile",
        work: "Tender",
        venue: "The Sewanee Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Corinna Vallianatos",
        work: "This Isn't the Actual Sea",
        venue: "Idaho Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Da-Lin",
        work: "Treasure Island Alley",
        venue: "New England Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Danica Li",
        work: "My Brother William",
        venue: "The Iowa Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Esther Yi",
        work: "Moon",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Jared Jackson",
        work: "Bebo",
        venue: "The Kenyon Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Joanna Pearson",
        work: "Grand Mal",
        venue: "The Kenyon Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Kosiso Ugwueze",
        work: "Supernova",
        venue: "New England Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Lauren Groff",
        work: "Annunciation",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Ling Ma",
        work: "Peking Duck",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Manuel Muñoz",
        work: "Compromisos",
        venue: "Electric Literature",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Maya Binyam",
        work: "Do You Belong to Anybody?",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Nathan Harris",
        work: "The Mine",
        venue: "Electric Literature",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Sana Krasikov",
        work: "The Muddle",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Sara Freeman",
        work: "The Company of Others",
        venue: "The Sewanee Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Souvankham Thammavongsa",
        work: "Trash",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Taryn Bowe",
        work: "Camp Emeline",
        venue: "Indiana Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2023,
        writer: "Tom Bissell",
        work: "His Finest Moment",
        venue: "ZYZZYVA",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2023",
        ],
      },
      {
        year: 2022,
        writer: "Alice McDermott",
        work: "Post",
        venue: "One Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Alix Ohlin",
        work: "The Meeting",
        venue: "Virginia Quarterly Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Bryan Washington",
        work: "Foster",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Claire Luchette",
        work: "Sugar Island",
        venue: "Ploughshares",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Elizabeth McCracken",
        work: "The Souvenir Museum",
        venue: "Harper's Magazine",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Erin Somers",
        work: "Ten Year Affair",
        venue: "Joyland",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Gina Ochsner",
        work: "Soon the Light",
        venue: "Ploughshares",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Gish Jen",
        work: "Detective Dog",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Greg Jackson",
        work: "The Hollow",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Héctor Tobar",
        work: "The Sins of Others",
        venue: "ZYZZYVA",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Karen Russell",
        work: "The Ghost Birds",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Kenan Orhan",
        work: "The Beyoğlu Municipality Waste Management Orchestra",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Kevin Moffett",
        work: "Bears Among the Living",
        venue: "McSweeney's",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Kim Coleman Foote",
        work: "Man of the House",
        venue: "Ecotone",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Lauren Groff",
        work: "The Wind",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Leslie Blanco",
        work: "A Ravishing Sun",
        venue: "New Letters",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Louise Wagner",
        work: "Elephant Seals",
        venue: "AGNI",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Okwiri Oduor",
        work: "Mbiu Dash",
        venue: "Granta",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Sanjena Sathian",
        work: "Mr. Ashok's Monument",
        venue: "Conjunctions",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2022,
        writer: "Yohanca Delgado",
        work: "The Little Widow from the Capital",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2022",
        ],
      },
      {
        year: 2021,
        writer: "Brandon Hobson",
        work: "Escape from the Dysphesiac People",
        venue: "McSweeney's",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Bryan Washington",
        work: "Palaver",
        venue: "McSweeney's",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "C Pam Zhang",
        work: "Little Beast",
        venue: "BOMB",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Christa Romanosky",
        work: "In This Sort of World, the Asshole Wins",
        venue: "The Cincinnati Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "David Means",
        work: "Clementine, Carmelita, Dog",
        venue: "Granta",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Eloghosa Osunde",
        work: "Good Boy",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Gabriel Bump",
        work: "To Buffalo Eastward",
        venue: "McSweeney's",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "George Saunders",
        work: "Love Letter",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Jamil Jan Kochai",
        work: "Playing Metal Gear Solid V: The Phantom Pain",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Jane Pek",
        work: "Portrait of Two Young Ladies in White and Green Robes (Unidentified Artist, circa Sixteenth Century)",
        venue: "Conjunctions",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Jenzo DuQue",
        work: "The Rest of Us",
        venue: "One Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Kevin Wilson",
        work: "Biology",
        venue: "The Southern Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Madhuri Vijay",
        work: "You Are My Dear Friend",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Nicole Krauss",
        work: "Switzerland",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Rita Chang-Eppig",
        work: "The Miracle Girl",
        venue: "Virginia Quarterly Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Shanteka Sigers",
        work: "A Way with Bea",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Stephanie Soileau",
        work: "Haguillory",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Tracy Rose Peyton",
        work: "The Last Days of Rodney",
        venue: "American Short Fiction",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Vanessa Cuti",
        work: "Our Children",
        venue: "West Branch",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2021,
        writer: "Yxta Maya Murray",
        work: "Paradise",
        venue: "The Southern Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2021",
        ],
      },
      {
        year: 2020,
        writer: "Alejandro Puyana",
        work: "The Hands of Dirty Children",
        venue: "American Short Fiction",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Andrea Lee",
        work: "The Children",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Anna Reeser",
        work: "Octopus VII",
        venue: "The Threepenny Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Carolyn Ferrell",
        work: "Something Street",
        venue: "Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Elizabeth McCracken",
        work: "It's Not You",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Emma Cline",
        work: "The Nanny",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Jane Pek",
        work: "The Nine-Tailed Fox Explains",
        venue: "Witness",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Jason Brown",
        work: "A Faithful But Melancholy Account of Several Barbarities Lately Committed",
        venue: "The Sewanee Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Kevin Wilson",
        work: "Kennedy",
        venue: "Subtropics",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Leigh Newman",
        work: "Howl Palace",
        venue: "The Paris Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Marion Crotty",
        work: "Hallowween",
        venue: "Crazyhorse",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Mary Gaitskill",
        work: "This is Pleasure",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Meng Jin",
        work: "In the Event",
        venue: "The Threepenny Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Michael Byers",
        work: "Sibling Rivalry",
        venue: "Lady Churchill's Rosebud Wristlet",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Sarah Thankam Mathews",
        work: "Rubberdust",
        venue: "The Kenyon Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Scott Nadelson",
        work: "Liberté",
        venue: "Chicago Quarterly Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Selena Anderson",
        work: "Godmother Tea",
        venue: "Oxford American",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "T. C. Boyle",
        work: "The Apartment",
        venue: "McSweeney's",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "Tiphanie Yanique",
        work: "The Special World",
        venue: "The Georgia Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2020,
        writer: "William Pei Shih",
        work: "Enlightenment",
        venue: "Virginia Quarterly Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2020",
        ],
      },
      {
        year: 2019,
        writer: "Alexis Schaitkin",
        work: "Natural Disasters",
        venue: "Ecotone",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Deborah Eisenberg",
        work: "The Third Tower",
        venue: "Ploughshares",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Ella Martinsen Gorham",
        work: "Protozoa",
        venue: "New England Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Jamel Brinkley",
        work: "No More Than a Bubble",
        venue: "LitMag",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Jeffrey Eugenides",
        work: "Bronze",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Jenn Alandy Trahan",
        work: "They Told Us Not to Say This",
        venue: "Harper's Magazine",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Jim Shepard",
        work: "Our Day of Grace",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Julia Elliott",
        work: "Hellion",
        venue: "The Georgia Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Karen Russell",
        work: "Black Corfu",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Kathleen Alcott",
        work: "Natural Light",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Manuel Muñoz",
        work: "Anyone Can Do It",
        venue: "ZYZZYVA",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Maria Reva",
        work: "Letter of Apology",
        venue: "Granta",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Mona Simpson",
        work: "Wrong Object",
        venue: "Harper's Magazine",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Nana Kwame Adjei-Brenyah",
        work: "The Era",
        venue: "Guernica",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Nicole Krauss",
        work: "Seeing Ershadi",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Saïd Sayrafiezadeh",
        work: "Audition",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Sigrid Nunez",
        work: "The Plan",
        venue: "LitMag",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Ursula K. Le Guin",
        work: "Pity and Shame",
        venue: "Tin House",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Weike Wang",
        work: "Omakase",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2019,
        writer: "Wendell Berry",
        work: "The Great Interruption: A Story of a Famous Story of Old Port William and How It Ceased to Be Told (1935–1978)",
        venue: "The Threepenny Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2019",
        ],
      },
      {
        year: 2018,
        writer: "Alicia Elliott",
        work: "Unearth",
        venue: "Grain",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Amy Silverberg",
        work: "Suburbia!",
        venue: "The Southern Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Ann Glaviano",
        work: "Come on, Silver",
        venue: "Tin House",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Carolyn Ferrell",
        work: "A History of China",
        venue: "Ploughshares",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Cristina Henríquez",
        work: "Everything Is Far From Here",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Curtis Sittenfeld",
        work: "The Prairie Wife",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Danielle Evans",
        work: "Boys Go to Jupiter",
        venue: "The Sewanee Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Dina Nayeri",
        work: "A Big True",
        venue: "The Southern Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Emma Cline",
        work: "Los Angeles",
        venue: "Granta",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Esmé Weijun Wang",
        work: "What Terrible Thing It Was",
        venue: "Granta",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Jacob Guajardo",
        work: "What Got Into Us",
        venue: "Passages North",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Jamel Brinkley",
        work: "A Family",
        venue: "Gulf Coast",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Jocelyn Nicole Johnson",
        work: "Control Negro",
        venue: "Guernica",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Kristen Iskandrian",
        work: "Good with Boys",
        venue: "ZYZZYVA",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Maria Anderson",
        work: "Cougar",
        venue: "The Iowa Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Matthew Lyons",
        work: "The Brothers Brujo",
        venue: "Tough",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Rivers Solomon",
        work: "Whose Heart I Long to Stop with the Click of a Revolver",
        venue: "Emrys Journal",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Ron Rash",
        work: "The Baptism",
        venue: "The Southern Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Téa Obreht",
        work: "Items Awaiting Protective Enclosure",
        venue: "Zoetrope: All-Story",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
      {
        year: 2018,
        writer: "Yoon Choi",
        work: "The Art of Losing",
        venue: "New England Review",
        sources: [
          "https://en.wikipedia.org/wiki/The_Best_American_Short_Stories_2018",
        ],
      },
    ],
  },
  {
    id: "sunday-times-short-story-award",
    name: "The Sunday Times Audible Short Story Award (formerly Sunday Times EFG)",
    genres: ["fiction"],
    organiserUrl: "https://shortstoryaward.co.uk/",
    coverage:
      "Winners 2018-2021. Audible withdrew sponsorship after the 2021 award; The Bookseller (July 2022) reported the prize delayed and possibly discontinued. No 2022-2025 winners found. Award accepts published and unpublished stories.",
    selections: [
      {
        year: 2021,
        writer: "Susan Choi",
        work: "Flashlight",
        venue: "The New Yorker",
        sources: [
          "https://en.wikipedia.org/wiki/Sunday_Times_EFG_Short_Story_Award",
          "https://lithub.com/read-the-story-that-just-won-the-biggest-short-story-prize-in-the-world/",
        ],
      },
      {
        year: 2018,
        writer: "Courtney Zoffness",
        work: "Peanuts Aren't Nuts",
        venue: "American Literary Review",
        sources: [
          "https://en.wikipedia.org/wiki/Sunday_Times_EFG_Short_Story_Award",
          "https://americanliteraryreview.com/2018/05/21/crafting-an-award-winning-story-an-interview-with-courtney-zoffness/",
        ],
      },
    ],
  },
];
