/**
 * Writers people name when describing where their work sits. The matcher
 * compares these with the writers each magazine has published (prize
 * anthologies and Missa's records); anyone not listed can still be typed in.
 *
 * Generated on 2026-10-04 from the verified research behind
 * `@missa/radar-adapters` literary data: each writer's countries, forms and
 * prizes come from a fetched source (Wikipedia biographies, prize winner
 * lists and prize sites). `countries` lists the country most associated
 * with the writer first, then a second where they are equally read as part
 * of that literature. `prizes` are [prize id, year] pairs, newest first.
 * The order below drives the suggestions shown for each form.
 */
export type WriterForm = "fiction" | "poetry" | "nonfiction";

export interface ComparableWriter {
  name: string;
  forms: WriterForm[];
  countries: string[];
  prizes: Array<[prizeId: string, year: number]>;
}

const F: WriterForm[] = ["fiction"];
const P: WriterForm[] = ["poetry"];
const N: WriterForm[] = ["nonfiction"];
const FN: WriterForm[] = ["fiction", "nonfiction"];
const PN: WriterForm[] = ["poetry", "nonfiction"];
const FP: WriterForm[] = ["fiction", "poetry"];
const FPN: WriterForm[] = ["fiction", "poetry", "nonfiction"];

function w(
  name: string,
  forms: WriterForm[],
  countries: string[],
  prizes: ComparableWriter["prizes"] = [],
): ComparableWriter {
  return { name, forms, countries, prizes };
}

export const COMPARABLE_WRITERS: ComparableWriter[] = [
  w("Carmen Maria Machado", FN, ["United States"]),
  w(
    "George Saunders",
    FN,
    ["United States"],
    [
      ["booker", 2017],
      ["story-prize", 2013],
    ],
  ),
  w("Kelly Link", F, ["United States"]),
  w(
    "Chimamanda Ngozi Adichie",
    FN,
    ["Nigeria"],
    [
      ["nbcc-fiction", 2013],
      ["womens-prize-fiction", 2007],
    ],
  ),
  w("Lorrie Moore", F, ["United States"], [["nbcc-fiction", 2023]]),
  w("Lydia Davis", F, ["United States"]),
  w(
    "Lesley Nneka Arimah",
    F,
    ["Nigeria"],
    [
      ["caine", 2019],
      ["commonwealth-short-story", 2015],
    ],
  ),
  w("Sally Rooney", F, ["Ireland"]),
  w("Jhumpa Lahiri", FN, ["United States"], [["pulitzer-fiction", 2000]]),
  w("Ted Chiang", F, ["United States"]),
  w("Ottessa Moshfegh", F, ["United States"]),
  w("Danielle Evans", F, ["United States"]),
  w("Toni Morrison", FN, ["United States"], [["nobel-literature", 1993]]),
  w("Alice Munro", F, ["Canada"], [["nobel-literature", 2013]]),
  w("Raymond Carver", FP, ["United States"]),
  w("Denis Johnson", FP, ["United States"], [["nba-fiction", 2007]]),
  w("Amy Hempel", F, ["United States"]),
  w("Grace Paley", FP, ["United States"]),
  w("Flannery O'Connor", F, ["United States"]),
  w("Mavis Gallant", F, ["Canada"]),
  w("Joy Williams", F, ["United States"]),
  w("Mary Gaitskill", FN, ["United States"]),
  w("Deborah Eisenberg", F, ["United States"], [["pen-faulkner", 2011]]),
  w("Lauren Groff", F, ["United States"], [["story-prize", 2018]]),
  w("Karen Russell", F, ["United States"]),
  w("Aimee Bender", F, ["United States"]),
  w("Etgar Keret", F, ["Israel"]),
  w("Jenny Offill", F, ["United States"]),
  w("Rachel Cusk", FN, ["United Kingdom"]),
  w("Ben Lerner", FPN, ["United States"]),
  w(
    "Teju Cole",
    FN,
    ["Nigeria", "United States"],
    [["windham-campbell", 2015]],
  ),
  w("Ocean Vuong", FP, ["Vietnam", "United States"], [["ts-eliot", 2017]]),
  w(
    "Colson Whitehead",
    F,
    ["United States"],
    [
      ["pulitzer-fiction", 2020],
      ["pulitzer-fiction", 2017],
      ["nba-fiction", 2016],
    ],
  ),
  w(
    "Jesmyn Ward",
    FN,
    ["United States"],
    [
      ["nba-fiction", 2017],
      ["nba-fiction", 2011],
    ],
  ),
  w(
    "Edwidge Danticat",
    FN,
    ["Haiti", "United States"],
    [
      ["nbcc-fiction", 2019],
      ["story-prize", 2019],
    ],
  ),
  w(
    "Junot Díaz",
    F,
    ["Dominican Republic", "United States"],
    [["pulitzer-fiction", 2008]],
  ),
  w("Yiyun Li", FN, ["China", "United States"], [["pen-faulkner", 2023]]),
  w(
    "Kazuo Ishiguro",
    F,
    ["Japan", "United Kingdom"],
    [["nobel-literature", 2017]],
  ),
  w("Zadie Smith", FN, ["United Kingdom"], [["womens-prize-fiction", 2006]]),
  w("Helen Oyeyemi", F, ["Nigeria", "United Kingdom"]),
  w("Ali Smith", F, ["United Kingdom"], [["womens-prize-fiction", 2015]]),
  w("Sarah Hall", F, ["United Kingdom"]),
  w("Claire Keegan", F, ["Ireland"]),
  w("Kevin Barry", F, ["Ireland"]),
  w("Anne Enright", F, ["Ireland"], [["booker", 2007]]),
  w("Edna O'Brien", F, ["Ireland"]),
  w(
    "Ling Ma",
    F,
    ["China", "United States"],
    [
      ["nbcc-fiction", 2022],
      ["story-prize", 2022],
    ],
  ),
  w("R. F. Kuang", F, ["China", "United States"]),
  w("N. K. Jemisin", F, ["United States"]),
  w("Octavia E. Butler", F, ["United States"]),
  w("Ursula K. Le Guin", FPN, ["United States"]),
  w("Samuel R. Delany", FN, ["United States"]),
  w("Shirley Jackson", F, ["United States"]),
  w("Angela Carter", F, ["United Kingdom"]),
  w("Jorge Luis Borges", FP, ["Argentina"]),
  w("Italo Calvino", F, ["Italy"]),
  w("Clarice Lispector", F, ["Brazil"]),
  w("Mariana Enríquez", F, ["Argentina"]),
  w("Samanta Schweblin", F, ["Argentina"]),
  w("Yoko Ogawa", F, ["Japan"]),
  w(
    "Han Kang",
    FP,
    ["South Korea"],
    [
      ["nbcc-fiction", 2025],
      ["nobel-literature", 2024],
      ["international-booker", 2016],
    ],
  ),
  w(
    "Olga Tokarczuk",
    F,
    ["Poland"],
    [
      ["nobel-literature", 2018],
      ["international-booker", 2018],
    ],
  ),
  w("Elena Ferrante", F, ["Italy"]),
  w("Roberto Bolaño", FP, ["Chile"]),
  w("Haruki Murakami", F, ["Japan"]),
  w("Banana Yoshimoto", F, ["Japan"]),
  w("Sayaka Murata", F, ["Japan"]),
  w("Brandon Taylor", F, ["United States"], [["story-prize", 2021]]),
  w("Bryan Washington", F, ["United States"], [["dylan-thomas", 2020]]),
  w("Nana Kwame Adjei-Brenyah", F, ["United States"]),
  w(
    "Deesha Philyaw",
    F,
    ["United States"],
    [
      ["pen-faulkner", 2021],
      ["story-prize", 2020],
    ],
  ),
  w("Kristen Arnett", F, ["United States"]),
  w("Lucia Berlin", F, ["United States"]),
  w("Leonora Carrington", F, ["United Kingdom", "Mexico"]),
  w("Sofia Samatar", FPN, ["United States"]),
  w("Kij Johnson", F, ["United States"]),
  w("Ken Liu", F, ["China", "United States"]),
  w("Rebecca Makkai", F, ["United States"]),
  w("Tommy Orange", F, ["United States"]),
  w(
    "Louise Erdrich",
    FPN,
    ["United States"],
    [
      ["pulitzer-fiction", 2021],
      ["nbcc-fiction", 2016],
      ["nba-fiction", 2012],
    ],
  ),
  w("Sandra Cisneros", FP, ["United States"]),
  w("Ayşegül Savaş", F, ["Turkey"]),
  w("Weike Wang", F, ["China", "United States"]),
  w("Elizabeth McCracken", FN, ["United States"], [["story-prize", 2014]]),
  w("Joyce Carol Oates", FPN, ["United States"]),
  w(
    "Margaret Atwood",
    FPN,
    ["Canada"],
    [
      ["booker", 2019],
      ["booker", 2000],
    ],
  ),
  w(
    "Percival Everett",
    F,
    ["United States"],
    [
      ["pulitzer-fiction", 2025],
      ["nba-fiction", 2024],
    ],
  ),
  w(
    "Viet Thanh Nguyen",
    FN,
    ["Vietnam", "United States"],
    [["pulitzer-fiction", 2016]],
  ),
  w("Ruth Ozeki", F, ["United States"], [["womens-prize-fiction", 2022]]),
  w("Max Porter", F, ["United Kingdom"], [["dylan-thomas", 2016]]),
  w("Daisy Johnson", F, ["United Kingdom"]),
  w(
    "Hilary Mantel",
    FN,
    ["United Kingdom"],
    [
      ["booker", 2012],
      ["booker", 2009],
    ],
  ),
  w("Ann Quin", F, ["United Kingdom"]),
  w("Diane Williams", F, ["United States"]),
  w("Gary Lutz", F, ["United States"]),
  w("Kathy Fish", F, ["United States"]),
  w("Sherrie Flick", F, ["United States"]),
  w("Robert Coover", F, ["United States"]),
  w("Donald Barthelme", F, ["United States"]),
  w("Chinua Achebe", FPN, ["Nigeria"]),
  w("Ngũgĩ wa Thiong'o", FN, ["Kenya"]),
  w("Ben Okri", FP, ["Nigeria", "United Kingdom"], [["booker", 1991]]),
  w("Chigozie Obioma", F, ["Nigeria"]),
  w("Akwaeke Emezi", FP, ["Nigeria"], [["commonwealth-short-story", 2017]]),
  w("Ayọ̀bámi Adébáyọ̀", F, ["Nigeria"]),
  w("Oyinkan Braithwaite", F, ["Nigeria"]),
  w("Chibundu Onuzo", F, ["Nigeria"]),
  w("Sefi Atta", F, ["Nigeria"], [["wole-soyinka-prize", 2006]]),
  w("Chika Unigwe", F, ["Nigeria"], [["nigeria-prize-for-literature", 2012]]),
  w(
    "Helon Habila",
    FN,
    ["Nigeria"],
    [
      ["windham-campbell", 2015],
      ["caine", 2001],
    ],
  ),
  w("A. Igoni Barrett", F, ["Nigeria"]),
  w("Jowhor Ile", F, ["Nigeria"]),
  w("Abi Daré", F, ["Nigeria"]),
  w(
    "Nnedi Okorafor",
    F,
    ["Nigeria", "United States"],
    [["wole-soyinka-prize", 2008]],
  ),
  w("Tomi Adeyemi", F, ["Nigeria", "United States"]),
  w("Buchi Emecheta", F, ["Nigeria", "United Kingdom"]),
  w("Flora Nwapa", F, ["Nigeria"]),
  w("Amos Tutuola", F, ["Nigeria"]),
  w("Wole Soyinka", FPN, ["Nigeria"]),
  w("Okey Ndibe", FN, ["Nigeria"]),
  w("Adaobi Tricia Nwaubani", FN, ["Nigeria"]),
  w("Elnathan John", FN, ["Nigeria"]),
  w(
    "Abubakar Adam Ibrahim",
    F,
    ["Nigeria"],
    [["nigeria-prize-for-literature", 2016]],
  ),
  w("Uwem Akpan", F, ["Nigeria"]),
  w("Chris Abani", FP, ["Nigeria"]),
  w("Tsitsi Dangarembga", F, ["Zimbabwe"], [["windham-campbell", 2022]]),
  w(
    "NoViolet Bulawayo",
    F,
    ["Zimbabwe"],
    [
      ["caine", 2025],
      ["caine", 2011],
    ],
  ),
  w("Yaa Gyasi", F, ["Ghana", "United States"]),
  w("Ama Ata Aidoo", FP, ["Ghana"]),
  w("Ayi Kwei Armah", F, ["Ghana"]),
  w("Nadine Gordimer", F, ["South Africa"], [["nobel-literature", 1991]]),
  w(
    "J. M. Coetzee",
    FN,
    ["South Africa"],
    [
      ["nobel-literature", 2003],
      ["booker", 1999],
    ],
  ),
  w("Zakes Mda", F, ["South Africa"]),
  w("Bessie Head", F, ["South Africa", "Botswana"]),
  w("Nuruddin Farah", F, ["Somalia"]),
  w(
    "Abdulrazak Gurnah",
    F,
    ["Tanzania", "United Kingdom"],
    [["nobel-literature", 2021]],
  ),
  w("Binyavanga Wainaina", FN, ["Kenya"], [["caine", 2002]]),
  w("Yvonne Adhiambo Owuor", F, ["Kenya"], [["caine", 2003]]),
  w("Maaza Mengiste", F, ["Ethiopia"]),
  w("Dinaw Mengestu", F, ["Ethiopia", "United States"]),
  w("Leila Aboulela", F, ["Sudan"], [["caine", 2000]]),
  w("Nadifa Mohamed", F, ["Somalia", "United Kingdom"]),
  w("Petina Gappah", F, ["Zimbabwe"]),
  w("Imbolo Mbue", F, ["Cameroon"], [["pen-faulkner", 2017]]),
  w("Mohammed Naseehu Ali", F, ["Ghana"]),
  w("Damon Galgut", F, ["South Africa"], [["booker", 2021]]),
  w("Mia Couto", FP, ["Mozambique"]),
  w("Mariama Bâ", F, ["Senegal"]),
  w("Tade Thompson", F, ["Nigeria", "United Kingdom"]),
  w("Wole Talabi", F, ["Nigeria"]),
  w("Suyi Davies Okungbowa", F, ["Nigeria"]),
  w("Irenosen Okojie", F, ["Nigeria", "United Kingdom"], [["caine", 2020]]),
  w("Bernardine Evaristo", FP, ["United Kingdom"], [["booker", 2019]]),
  w("Caryl Phillips", FN, ["Saint Kitts and Nevis", "United Kingdom"]),
  w("Jamaica Kincaid", FN, ["Antigua and Barbuda", "United States"]),
  w("Marlon James", F, ["Jamaica"], [["booker", 2015]]),
  w("Kei Miller", FP, ["Jamaica"]),
  w("Earl Lovelace", F, ["Trinidad and Tobago"]),
  w("Arundhati Roy", FN, ["India"], [["booker", 1997]]),
  w("Salman Rushdie", FN, ["India", "United Kingdom"]),
  w("Mohsin Hamid", F, ["Pakistan"]),
  w(
    "Kamila Shamsie",
    F,
    ["Pakistan", "United Kingdom"],
    [["womens-prize-fiction", 2018]],
  ),
  w("Anuk Arudpragasam", F, ["Sri Lanka"]),
  w("Ada Limón", P, ["United States"], [["nbcc-poetry", 2018]]),
  w("Kaveh Akbar", FP, ["Iran", "United States"]),
  w("Natalie Diaz", P, ["United States"], [["pulitzer-poetry", 2021]]),
  w(
    "Warsan Shire",
    P,
    ["Somalia", "United Kingdom"],
    [["brunel-evaristo-african-poetry", 2013]],
  ),
  w("Ross Gay", PN, ["United States"], [["nbcc-poetry", 2015]]),
  w("Tracy K. Smith", PN, ["United States"], [["pulitzer-poetry", 2012]]),
  w("Danez Smith", P, ["United States"]),
  w(
    "Safia Elhillo",
    P,
    ["Sudan", "United States"],
    [["brunel-evaristo-african-poetry", 2015]],
  ),
  w(
    "Louise Glück",
    PN,
    ["United States"],
    [
      ["nobel-literature", 2020],
      ["nba-poetry", 2014],
    ],
  ),
  w("Mary Oliver", PN, ["United States"]),
  w(
    "Claudia Rankine",
    PN,
    ["Jamaica", "United States"],
    [["nbcc-poetry", 2014]],
  ),
  w("Terrance Hayes", P, ["United States"], [["nba-poetry", 2010]]),
  w("Hanif Abdurraqib", PN, ["United States"]),
  w("Jericho Brown", P, ["United States"], [["pulitzer-poetry", 2020]]),
  w("Joy Harjo", PN, ["United States"]),
  w("Layli Long Soldier", P, ["United States"], [["nbcc-poetry", 2017]]),
  w("Franny Choi", P, ["United States"]),
  w("Chen Chen", P, ["China", "United States"]),
  w("Aimee Nezhukumatathil", PN, ["United States"]),
  w(
    "Diane Seuss",
    P,
    ["United States"],
    [
      ["pulitzer-poetry", 2022],
      ["nbcc-poetry", 2021],
    ],
  ),
  w("Carl Phillips", PN, ["United States"], [["pulitzer-poetry", 2023]]),
  w("Morgan Parker", PN, ["United States"], [["nbcc-poetry", 2019]]),
  w("Eduardo C. Corral", P, ["United States"]),
  w("Fatimah Asghar", FP, ["United States"]),
  w("Solmaz Sharif", P, ["Iran", "United States"]),
  w("Mosab Abu Toha", P, ["Palestine"]),
  w("Victoria Chang", PN, ["United States"]),
  w(
    "Sharon Olds",
    P,
    ["United States"],
    [
      ["pulitzer-poetry", 2013],
      ["ts-eliot", 2012],
    ],
  ),
  w("Lucille Clifton", P, ["United States"]),
  w("Gwendolyn Brooks", P, ["United States"]),
  w("Elizabeth Bishop", P, ["United States"]),
  w("Sylvia Plath", FP, ["United States"]),
  w(
    "Anne Carson",
    PN,
    ["Canada"],
    [
      ["nbcc-poetry", 2024],
      ["griffin-poetry", 2014],
    ],
  ),
  w("Jorie Graham", P, ["United States"]),
  w("Brenda Shaughnessy", P, ["United States"]),
  w("Mary Ruefle", PN, ["United States"]),
  w("Maggie Smith", PN, ["United States"]),
  w("Ilya Kaminsky", P, ["Ukraine", "United States"]),
  w("Tishani Doshi", FP, ["India"]),
  w("Raymond Antrobus", P, ["United Kingdom"]),
  w("Roger Reeves", P, ["United States"], [["griffin-poetry", 2023]]),
  w("Robin Coste Lewis", P, ["United States"], [["nba-poetry", 2015]]),
  w("Patricia Smith", P, ["United States"], [["nba-poetry", 2025]]),
  w("Yusef Komunyakaa", P, ["United States"]),
  w("Rita Dove", FP, ["United States"]),
  w(
    "Seamus Heaney",
    PN,
    ["Ireland"],
    [
      ["ts-eliot", 2006],
      ["nobel-literature", 1995],
    ],
  ),
  w(
    "Derek Walcott",
    P,
    ["Saint Lucia"],
    [
      ["ts-eliot", 2010],
      ["nobel-literature", 1992],
    ],
  ),
  w("Kamau Brathwaite", P, ["Barbados"]),
  w(
    "Dionne Brand",
    FPN,
    ["Trinidad and Tobago", "Canada"],
    [["griffin-poetry", 2011]],
  ),
  w("Mahmoud Darwish", P, ["Palestine"]),
  w("Wisława Szymborska", P, ["Poland"], [["nobel-literature", 1996]]),
  w("Pablo Neruda", P, ["Chile"]),
  w("Agha Shahid Ali", P, ["India", "United States"]),
  w("Mary Jean Chan", P, ["Hong Kong", "United Kingdom"]),
  w("Hala Alyan", FP, ["Palestine", "United States"]),
  w("Marwa Helal", P, ["Egypt", "United States"]),
  w("Jos Charles", P, ["United States"]),
  w("CAConrad", P, ["United States"]),
  w("Cathy Park Hong", PN, ["United States"]),
  w("Natalie Shapero", P, ["United States"]),
  w("Tyehimba Jess", P, ["United States"], [["pulitzer-poetry", 2017]]),
  w("Camille T. Dungy", PN, ["United States"]),
  w("Saeed Jones", PN, ["United States"]),
  w("Paisley Rekdal", PN, ["United States"]),
  w("Sarah Kay", P, ["United States"]),
  w("Kim Addonizio", FP, ["United States"]),
  w(
    "Romeo Oriogun",
    P,
    ["Nigeria"],
    [
      ["nigeria-prize-for-literature", 2022],
      ["brunel-evaristo-african-poetry", 2017],
    ],
  ),
  w("Gbenga Adeoba", P, ["Nigeria"]),
  w("Logan February", P, ["Nigeria"]),
  w("Ladan Osman", P, ["Somalia", "United States"]),
  w("Kechi Nomu", P, ["Nigeria"]),
  w("Tolu Oloruntoba", P, ["Nigeria", "Canada"], [["griffin-poetry", 2022]]),
  w("Ijeoma Umebinyuo", P, ["Nigeria"]),
  w("Inua Ellams", P, ["Nigeria", "United Kingdom"]),
  w("Tade Ipadeola", P, ["Nigeria"], [["nigeria-prize-for-literature", 2013]]),
  w("Gabriel Okara", FP, ["Nigeria"], [["nigeria-prize-for-literature", 2005]]),
  w("Christopher Okigbo", P, ["Nigeria"]),
  w("Niyi Osundare", P, ["Nigeria"]),
  w("Tanure Ojaide", P, ["Nigeria"], [["wole-soyinka-prize", 2018]]),
  w("Kwame Dawes", PN, ["Ghana", "Jamaica"], [["windham-campbell", 2019]]),
  w("Koleka Putuma", P, ["South Africa"]),
  w("Gabeba Baderoon", P, ["South Africa"]),
  w("Tjawangwa Dema", P, ["Botswana"]),
  w(
    "Nick Makoha",
    P,
    ["Uganda", "United Kingdom"],
    [["brunel-evaristo-african-poetry", 2015]],
  ),
  w("Dami Ajayi", P, ["Nigeria"]),
  w(
    "Theresa Lola",
    P,
    ["Nigeria", "United Kingdom"],
    [["brunel-evaristo-african-poetry", 2018]],
  ),
  w("Caleb Femi", P, ["Nigeria", "United Kingdom"]),
  w("Yomi Ṣode", P, ["Nigeria", "United Kingdom"]),
  w("Nikky Finney", P, ["United States"], [["nba-poetry", 2011]]),
  w("Aja Monet", P, ["United States"]),
  w("Maggie Nelson", PN, ["United States"]),
  w("Joan Didion", FN, ["United States"]),
  w("Rebecca Solnit", N, ["United States"]),
  w("Leslie Jamison", FN, ["United States"]),
  w("Jia Tolentino", N, ["United States"]),
  w("Hilton Als", N, ["United States"]),
  w("Annie Dillard", FPN, ["United States"]),
  w("James Baldwin", FN, ["United States"]),
  w("Kiese Laymon", FN, ["United States"]),
  w("Eula Biss", N, ["United States"]),
  w("Robin Wall Kimmerer", N, ["United States"]),
  w("Saidiya Hartman", N, ["United States"]),
  w("Elif Batuman", FN, ["United States"]),
  w("Alexander Chee", FN, ["United States"]),
  w("Melissa Febos", N, ["United States"]),
  w("Esmé Weijun Wang", FN, ["United States"]),
  w("Durga Chew-Bose", N, ["Canada"]),
  w("Brian Doyle", FN, ["United States"]),
  w("John Jeremiah Sullivan", N, ["United States"]),
  w("David Foster Wallace", FN, ["United States"]),
  w("Ta-Nehisi Coates", FN, ["United States"], [["nba-nonfiction", 2015]]),
  w("Audre Lorde", PN, ["United States"]),
  w("bell hooks", N, ["United States"]),
  w("Susan Sontag", FN, ["United States"]),
  w("Virginia Woolf", FN, ["United Kingdom"]),
  w("Olivia Laing", FN, ["United Kingdom"]),
  w("Helen Macdonald", N, ["United Kingdom"]),
  w("Robert Macfarlane", N, ["United Kingdom"]),
  w("Kathleen Jamie", PN, ["United Kingdom"]),
  w("Elizabeth Alexander", PN, ["United States"]),
  w("Natasha Trethewey", PN, ["United States"], [["pulitzer-poetry", 2007]]),
  w("Brian Blanchfield", PN, ["United States"]),
  w("Wendy S. Walters", N, ["United States"]),
  w("Cheryl Strayed", FN, ["United States"]),
  w("Roxane Gay", FN, ["United States"]),
  w("Ingrid Rojas Contreras", FN, ["Colombia", "United States"]),
  w("Cristina Rivera Garza", FN, ["Mexico"]),
  w("Valeria Luiselli", FN, ["Mexico"]),
  w("Emmanuel Iduma", N, ["Nigeria"], [["windham-campbell", 2022]]),
  w("Pumla Dineo Gqola", N, ["South Africa"]),
  w("Sisonke Msimang", N, ["South Africa"]),
  w(
    "Siddhartha Mukherjee",
    N,
    ["India", "United States"],
    [["pulitzer-general-nonfiction", 2011]],
  ),
  w("Atul Gawande", N, ["United States"]),
  w("Patrick Radden Keefe", N, ["United States"]),
  w("Eloghosa Osunde", F, ["Nigeria"]),
  w("Arinze Ifeakandu", F, ["Nigeria"], [["dylan-thomas", 2023]]),
  w("Chinelo Okparanta", F, ["Nigeria", "United States"]),
  w("Tope Folarin", F, ["Nigeria", "United States"], [["caine", 2013]]),
  w("Saddiq Dzukogi", P, ["Nigeria"]),
  w("Jumoke Verissimo", FP, ["Nigeria"]),
  w("Rotimi Babatunde", F, ["Nigeria"], [["caine", 2012]]),
  w("Sarah Ladipo Manyika", F, ["Nigeria", "United Kingdom"]),
  w("Ukamaka Olisakwe", F, ["Nigeria"]),
  w("Uzodinma Iweala", FN, ["Nigeria", "United States"]),
  w("Noo Saro-Wiwa", N, ["Nigeria", "United Kingdom"]),
  w("E. C. Osondu", F, ["Nigeria"], [["caine", 2009]]),
  w("Pemi Aguda", F, ["Nigeria"]),
  w("Ani Kayode Somtochukwu", F, ["Nigeria"]),
  w("Yewande Omotoso", F, ["South Africa", "Nigeria"]),
  w("Lola Shoneyin", FP, ["Nigeria"]),
  w("Biyi Bandele", F, ["Nigeria"]),
  w("Jude Dibia", F, ["Nigeria"]),
  w("Titilope Sonuga", P, ["Nigeria", "Canada"]),
  w("Toni Kan", F, ["Nigeria"]),
  w("Odafe Atogun", F, ["Nigeria"]),
  w("Eghosa Imasuen", F, ["Nigeria"]),
  w("Lola Akinmade Åkerström", F, ["Nigeria", "Sweden"]),
  w("Chukwuebuka Ibeh", F, ["Nigeria"]),
  w("Tolu Ogunlesi", FP, ["Nigeria"]),
  w("Molara Wood", F, ["Nigeria"]),
  w("Okwiri Oduor", F, ["Kenya"], [["caine", 2014]]),
  w("Mũkoma wa Ngũgĩ", FP, ["Kenya", "United States"]),
  w("Billy Kahora", N, ["Kenya"]),
  w("Makena Onjerika", F, ["Kenya"], [["caine", 2018]]),
  w("Shailja Patel", P, ["Kenya"]),
  w("Idza Luhumyo", F, ["Kenya"], [["caine", 2022]]),
  w(
    "Jennifer Nansubuga Makumbi",
    F,
    ["Uganda", "United Kingdom"],
    [
      ["windham-campbell", 2018],
      ["commonwealth-short-story", 2014],
    ],
  ),
  w("Monica Arac de Nyeko", FP, ["Uganda"], [["caine", 2007]]),
  w("Doreen Baingana", F, ["Uganda"]),
  w("Harriet Anena", P, ["Uganda"], [["wole-soyinka-prize", 2018]]),
  w("Beatrice Lamwaka", F, ["Uganda"]),
  w("Meron Hadero", F, ["Ethiopia", "United States"], [["caine", 2021]]),
  w("Diriye Osman", F, ["Somalia", "United Kingdom"]),
  w("Abdelaziz Baraka Sakin", F, ["Sudan"]),
  w("Hammour Ziada", F, ["Sudan"]),
  w("Rania Mamoun", F, ["Sudan"]),
  w("Bushra al-Fadil", F, ["Sudan"], [["caine", 2017]]),
  w("Stella Gaitano", F, ["South Sudan"]),
  w("Brian Chikwava", F, ["Zimbabwe"], [["caine", 2004]]),
  w("Tendai Huchu", F, ["Zimbabwe"]),
  w("Irene Sabatini", F, ["Zimbabwe"]),
  w("Novuyo Rosa Tshuma", F, ["Zimbabwe"]),
  w("Panashe Chigumadzi", FN, ["Zimbabwe", "South Africa"]),
  w(
    "Namwali Serpell",
    F,
    ["Zambia", "United States"],
    [
      ["windham-campbell", 2020],
      ["caine", 2015],
    ],
  ),
  w("Ellen Banda-Aaku", F, ["Zambia"]),
  w("Mbozi Haimbe", F, ["Zambia"], [["commonwealth-short-story", 2019]]),
  w("Lauren Beukes", F, ["South Africa"]),
  w("Zukiswa Wanner", F, ["South Africa"]),
  w("Niq Mhlongo", F, ["South Africa"]),
  w("Kopano Matlwa", F, ["South Africa"], [["wole-soyinka-prize", 2010]]),
  w("Masande Ntshanga", FP, ["South Africa"]),
  w("Mohale Mashigo", F, ["South Africa"]),
  w("Henrietta Rose-Innes", F, ["South Africa"], [["caine", 2008]]),
  w("Imraan Coovadia", FN, ["South Africa"]),
  w("Ivan Vladislavić", FN, ["South Africa"], [["windham-campbell", 2015]]),
  w("Nadia Davids", F, ["South Africa"], [["caine", 2024]]),
  w("Thando Mgqolozana", F, ["South Africa"]),
  w("Lidudumalingani Mqombothi", F, ["South Africa"], [["caine", 2016]]),
  w("Sindiwe Magona", FPN, ["South Africa"]),
  w("Kagiso Lesego Molope", F, ["South Africa", "Canada"]),
  w("Ayesha Harruna Attah", F, ["Ghana"]),
  w("Nii Ayikwei Parkes", P, ["Ghana", "United Kingdom"]),
  w("Peace Adzo Medie", F, ["Ghana", "Liberia"]),
  w("Kwei Quartey", F, ["Ghana", "United States"]),
  w("Amma Darko", F, ["Ghana"]),
  w("Ama Asantewa Diaka", FP, ["Ghana"]),
  w("Wayétu Moore", FN, ["Liberia", "United States"]),
  w("Hawa Jande Golakai", F, ["Liberia"]),
  w(
    "Aminatta Forna",
    FN,
    ["Sierra Leone", "United Kingdom"],
    [["windham-campbell", 2014]],
  ),
  w("Olufemi Terry", F, ["Sierra Leone"], [["caine", 2010]]),
  w("Shadreck Chikoti", F, ["Malawi"]),
  w("Stanley Onjezani Kenani", FP, ["Malawi"]),
  w("Unity Dow", F, ["Botswana"]),
  w("Nana Nkweti", F, ["Cameroon", "United States"]),
  w("Patrice Nganang", FP, ["Cameroon"]),
  w("Djaïli Amadou Amal", F, ["Cameroon"]),
  w("Léonora Miano", F, ["Cameroon", "France"]),
  w("Mohamed Mbougar Sarr", F, ["Senegal"]),
  w("David Diop", F, ["France", "Senegal"], [["international-booker", 2021]]),
  w("Fatou Diome", F, ["Senegal", "France"]),
  w("Boubacar Boris Diop", F, ["Senegal"]),
  w("Alain Mabanckou", FP, ["Republic of the Congo", "France"]),
  w("Emmanuel Dongala", F, ["Republic of the Congo"]),
  w("In Koli Jean Bofane", F, ["Democratic Republic of the Congo"]),
  w("Fiston Mwanza Mujila", F, ["Democratic Republic of the Congo"]),
  w("Abdourahman Waberi", FPN, ["Djibouti"]),
  w("Scholastique Mukasonga", F, ["Rwanda", "France"]),
  w("Gaël Faye", F, ["Rwanda", "France"]),
  w("Véronique Tadjo", FP, ["Côte d'Ivoire"]),
  w("Tierno Monénembo", F, ["Guinea"]),
  w("Mbarek Ould Beyrouk", F, ["Mauritania"]),
  w("Ananda Devi", FP, ["Mauritius"]),
  w("Nathacha Appanah", F, ["Mauritius", "France"]),
  w("Paulina Chiziane", F, ["Mozambique"]),
  w("Leïla Slimani", F, ["Morocco", "France"]),
  w("Abdellah Taïa", F, ["Morocco"]),
  w("Laila Lalami", FN, ["Morocco", "United States"]),
  w("Tahar Ben Jelloun", F, ["Morocco"]),
  w("Kamel Daoud", F, ["Algeria"]),
  w("Boualem Sansal", F, ["Algeria", "France"]),
  w("Yasmina Khadra", F, ["Algeria"]),
  w("Kaouther Adimi", F, ["Algeria"]),
  w("Shukri Mabkhout", F, ["Tunisia"]),
  w("Ahdaf Soueif", FN, ["Egypt"]),
  w("Alaa Al Aswany", F, ["Egypt"]),
  w("Mansoura Ez-Eldin", F, ["Egypt"]),
  w("Basma Abdel Aziz", F, ["Egypt"]),
  w("Iman Mersal", PN, ["Egypt"]),
  w("Youssef Rakha", FPN, ["Egypt"]),
  w("Ahmed Naji", F, ["Egypt"]),
  w("Hisham Matar", FN, ["Libya", "United Kingdom"], [["nbcc-fiction", 2024]]),
  w("Najwa Binshatwan", F, ["Libya"]),
  w(
    "Douglas Stuart",
    F,
    ["United Kingdom", "United States"],
    [["booker", 2020]],
  ),
  w("Paul Lynch", F, ["Ireland"], [["booker", 2023]]),
  w("Samantha Harvey", F, ["United Kingdom"], [["booker", 2024]]),
  w("Shehan Karunatilaka", F, ["Sri Lanka"], [["booker", 2022]]),
  w("Tayari Jones", F, ["United States"], [["womens-prize-fiction", 2019]]),
  w("Raven Leilani", F, ["United States"], [["dylan-thomas", 2021]]),
  w("Kiley Reid", F, ["United States"]),
  w("Celeste Ng", F, ["United States"]),
  w("Min Jin Lee", F, ["United States", "South Korea"]),
  w("Hanya Yanagihara", F, ["United States"]),
  w("Emily St. John Mandel", F, ["Canada"]),
  w("Madeline Miller", F, ["United States"], [["womens-prize-fiction", 2012]]),
  w(
    "Anthony Doerr",
    F,
    ["United States"],
    [
      ["pulitzer-fiction", 2015],
      ["story-prize", 2010],
    ],
  ),
  w(
    "Richard Powers",
    F,
    ["United States"],
    [
      ["pulitzer-fiction", 2019],
      ["nba-fiction", 2006],
    ],
  ),
  w(
    "Hernan Diaz",
    F,
    ["Argentina", "United States"],
    [["pulitzer-fiction", 2023]],
  ),
  w("Justin Torres", F, ["United States"], [["nba-fiction", 2023]]),
  w(
    "Barbara Kingsolver",
    FPN,
    ["United States"],
    [
      ["pulitzer-fiction", 2023],
      ["womens-prize-fiction", 2023],
      ["womens-prize-fiction", 2010],
    ],
  ),
  w("Mieko Kawakami", FP, ["Japan"]),
  w("Fernanda Melchor", F, ["Mexico"]),
  w("Benjamín Labatut", F, ["Chile"]),
  w("Rupi Kaur", P, ["Canada", "India"]),
  w("Amanda Gorman", P, ["United States"]),
  w("Brandon Som", P, ["United States"], [["pulitzer-poetry", 2024]]),
  w("Justin Phillip Reed", FP, ["United States"], [["nba-poetry", 2018]]),
  w("Elif Shafak", FN, ["Turkey", "United Kingdom"]),
  w("Karl Ove Knausgård", F, ["Norway"]),
  w("Jon Fosse", FP, ["Norway"], [["nobel-literature", 2023]]),
  w("Annie Ernaux", F, ["France"], [["nobel-literature", 2022]]),
  w(
    "Elizabeth Strout",
    F,
    ["United States"],
    [
      ["story-prize", 2017],
      ["pulitzer-fiction", 2009],
    ],
  ),
  w("Ann Patchett", F, ["United States"], [["womens-prize-fiction", 2002]]),
  w("Jenny Erpenbeck", F, ["Germany"], [["international-booker", 2024]]),
  w(
    "Jennifer Egan",
    F,
    ["United States"],
    [
      ["pulitzer-fiction", 2011],
      ["nbcc-fiction", 2010],
    ],
  ),
  w("S. A. Afolabi", F, ["Nigeria"], [["caine", 2005]]),
  w("Mary Watson", F, ["South Africa"], [["caine", 2006]]),
  w("Mame Bougouma Diene", F, ["Senegal"], [["caine", 2023]]),
  w("Woppa Diallo", F, ["Senegal"], [["caine", 2023]]),
  w("Ezenwa Ohaeto", P, ["Nigeria"], [["nigeria-prize-for-literature", 2005]]),
  w("Kaine Agary", F, ["Nigeria"], [["nigeria-prize-for-literature", 2008]]),
  w("Ikeogu Oke", P, ["Nigeria"], [["nigeria-prize-for-literature", 2017]]),
  w(
    "Cheluchi Onyemelukwe",
    F,
    ["Nigeria"],
    [["nigeria-prize-for-literature", 2021]],
  ),
  w("Oyin Olugbile", F, ["Nigeria"], [["nigeria-prize-for-literature", 2025]]),
  w("Emma Martin", F, ["New Zealand"], [["commonwealth-short-story", 2012]]),
  w("Jekwu Anyaegbuna", F, ["Nigeria"], [["commonwealth-short-story", 2012]]),
  w("Eliza Robertson", F, ["Canada"], [["commonwealth-short-story", 2013]]),
  w(
    "Julian Jackson",
    F,
    ["South Africa"],
    [["commonwealth-short-story", 2013]],
  ),
  w(
    "Jonathan Tel",
    F,
    ["United Kingdom"],
    [["commonwealth-short-story", 2015]],
  ),
  w("Parashar Kulkarni", F, ["India"], [["commonwealth-short-story", 2016]]),
  w(
    "Faraaz Mahomed",
    F,
    ["South Africa"],
    [["commonwealth-short-story", 2016]],
  ),
  w(
    "Ingrid Persaud",
    F,
    ["Trinidad and Tobago"],
    [["commonwealth-short-story", 2017]],
  ),
  w(
    "Kevin Jared Hosein",
    F,
    ["Trinidad and Tobago"],
    [["commonwealth-short-story", 2018]],
  ),
  w("Efua Traoré", F, ["Nigeria"], [["commonwealth-short-story", 2018]]),
  w("Constantia Soteriou", F, ["Cyprus"], [["commonwealth-short-story", 2019]]),
  w("Kritika Pandey", F, ["India"], [["commonwealth-short-story", 2020]]),
  w(
    "Innocent Chizaram Ilo",
    F,
    ["Nigeria"],
    [["commonwealth-short-story", 2020]],
  ),
  w("Kanya D'Almeida", F, ["Sri Lanka"], [["commonwealth-short-story", 2021]]),
  w("Rémy Ngamije", F, ["Namibia"], [["commonwealth-short-story", 2021]]),
  w("Ntsika Kota", F, ["Eswatini"], [["commonwealth-short-story", 2022]]),
  w("Kwame McPherson", F, ["Jamaica"], [["commonwealth-short-story", 2023]]),
  w("Hana Gammon", F, ["South Africa"], [["commonwealth-short-story", 2023]]),
  w("Sanjana Thakur", F, ["India"], [["commonwealth-short-story", 2024]]),
  w(
    "Reena Usha Rungoo",
    F,
    ["Mauritius"],
    [["commonwealth-short-story", 2024]],
  ),
  w(
    "Chanel Sutherland",
    F,
    ["Canada", "Saint Vincent and the Grenadines"],
    [["commonwealth-short-story", 2025]],
  ),
  w("Joshua Lubwama", F, ["Uganda"], [["commonwealth-short-story", 2025]]),
  w(
    "Liyou Libsekal",
    P,
    ["Ethiopia"],
    [["brunel-evaristo-african-poetry", 2014]],
  ),
  w(
    "Gbenga Adesina",
    P,
    ["Nigeria"],
    [["brunel-evaristo-african-poetry", 2016]],
  ),
  w(
    "Chekwube O. Danladi",
    P,
    ["Nigeria"],
    [["brunel-evaristo-african-poetry", 2016]],
  ),
  w(
    "Hiwot Adilow",
    P,
    ["Ethiopia"],
    [["brunel-evaristo-african-poetry", 2018]],
  ),
  w(
    "Momtaza Mehri",
    P,
    ["Somalia"],
    [["brunel-evaristo-african-poetry", 2018]],
  ),
  w("Nadra Mabrouk", P, ["Egypt"], [["brunel-evaristo-african-poetry", 2019]]),
  w("Jamila Osman", P, ["Somalia"], [["brunel-evaristo-african-poetry", 2019]]),
  w("Rabha Ashry", P, ["Egypt"], [["brunel-evaristo-african-poetry", 2020]]),
  w(
    "Othuke Umukoro",
    P,
    ["Nigeria"],
    [["brunel-evaristo-african-poetry", 2021]],
  ),
  w(
    "Zibusiso Mpofu",
    P,
    ["Zimbabwe"],
    [["brunel-evaristo-african-poetry", 2022]],
  ),
  w(
    "Feranmi Ariyo",
    P,
    ["Nigeria"],
    [["brunel-evaristo-african-poetry", 2023]],
  ),
  w(
    "Gracia 'Cianga' Mwamba",
    P,
    ["Congo"],
    [["brunel-evaristo-african-poetry", 2023]],
  ),
  w("A. S. Byatt", F, ["United Kingdom"], [["booker", 1990]]),
  w("Michael Ondaatje", F, ["Canada", "Sri Lanka"], [["booker", 1992]]),
  w("Barry Unsworth", F, ["United Kingdom"], [["booker", 1992]]),
  w("Roddy Doyle", F, ["Ireland"], [["booker", 1993]]),
  w("James Kelman", F, ["United Kingdom"], [["booker", 1994]]),
  w("Pat Barker", F, ["United Kingdom"], [["booker", 1995]]),
  w("Graham Swift", F, ["United Kingdom"], [["booker", 1996]]),
  w("Ian McEwan", F, ["United Kingdom"], [["booker", 1998]]),
  w("Peter Carey", F, ["Australia"], [["booker", 2001]]),
  w("Yann Martel", F, ["Canada"], [["booker", 2002]]),
  w("DBC Pierre", F, ["Australia"], [["booker", 2003]]),
  w("Alan Hollinghurst", F, ["United Kingdom"], [["booker", 2004]]),
  w("John Banville", F, ["Ireland"], [["booker", 2005]]),
  w("Kiran Desai", F, ["India"], [["booker", 2006]]),
  w("Aravind Adiga", F, ["India"], [["booker", 2008]]),
  w("Howard Jacobson", F, ["United Kingdom"], [["booker", 2010]]),
  w("Julian Barnes", F, ["United Kingdom"], [["booker", 2011]]),
  w("Eleanor Catton", F, ["New Zealand"], [["booker", 2013]]),
  w("Richard Flanagan", F, ["Australia"], [["booker", 2014]]),
  w(
    "Paul Beatty",
    F,
    ["United States"],
    [
      ["booker", 2016],
      ["nbcc-fiction", 2015],
    ],
  ),
  w(
    "Anna Burns",
    F,
    ["United Kingdom"],
    [
      ["booker", 2018],
      ["nbcc-fiction", 2018],
    ],
  ),
  w("David Szalay", F, ["United Kingdom", "Hungary"], [["booker", 2025]]),
  w("David Grossman", F, ["Israel"], [["international-booker", 2017]]),
  w("Jokha al-Harthi", F, ["Oman"], [["international-booker", 2019]]),
  w(
    "Marieke Lucas Rijneveld",
    F,
    ["Netherlands"],
    [["international-booker", 2020]],
  ),
  w("Geetanjali Shree", F, ["India"], [["international-booker", 2022]]),
  w("Georgi Gospodinov", F, ["Bulgaria"], [["international-booker", 2023]]),
  w("Banu Mushtaq", F, ["India"], [["international-booker", 2025]]),
];

/** Regions in display order; each writer belongs to their first country's region. */
export const WRITER_REGIONS: Array<{ name: string; countries: string[] }> = [
  {
    name: "Africa",
    countries: [
      "Nigeria",
      "Ghana",
      "Kenya",
      "Zimbabwe",
      "South Africa",
      "Botswana",
      "Somalia",
      "Tanzania",
      "Ethiopia",
      "Sudan",
      "Cameroon",
      "Mozambique",
      "Senegal",
      "Uganda",
      "Egypt",
      "Congo",
      "Democratic Republic of the Congo",
      "Republic of the Congo",
      "Eswatini",
      "Namibia",
      "Mauritius",
      "Sierra Leone",
      "Zambia",
      "Morocco",
      "Algeria",
      "Libya",
      "Tunisia",
      "Rwanda",
      "Malawi",
      "Liberia",
      "The Gambia",
      "Gambia",
      "Ivory Coast",
      "Côte d'Ivoire",
      "Benin",
      "Togo",
      "Mali",
      "Burkina Faso",
      "Guinea",
      "Lesotho",
      "Angola",
      "Eritrea",
      "South Sudan",
      "Madagascar",
      "Burundi",
      "Djibouti",
      "Cape Verde",
      "Niger",
      "Chad",
      "Gabon",
      "Equatorial Guinea",
      "Seychelles",
      "Comoros",
      "Guinea-Bissau",
      "Mauritania",
      "Central African Republic",
      "São Tomé and Príncipe",
    ],
  },
  {
    name: "Caribbean",
    countries: [
      "Haiti",
      "Dominican Republic",
      "Jamaica",
      "Trinidad and Tobago",
      "Saint Kitts and Nevis",
      "Antigua and Barbuda",
      "Saint Lucia",
      "Barbados",
      "Saint Vincent and the Grenadines",
      "Guyana",
      "Bahamas",
      "Grenada",
      "Cuba",
      "Puerto Rico",
      "Martinique",
      "Guadeloupe",
      "Dominica",
      "Bermuda",
    ],
  },
  { name: "North America", countries: ["United States", "Canada"] },
  {
    name: "Latin America",
    countries: [
      "Argentina",
      "Brazil",
      "Chile",
      "Mexico",
      "Colombia",
      "Peru",
      "Uruguay",
      "Venezuela",
      "Ecuador",
      "Bolivia",
      "Paraguay",
      "Guatemala",
      "El Salvador",
      "Honduras",
      "Nicaragua",
      "Costa Rica",
      "Panama",
    ],
  },
  { name: "UK and Ireland", countries: ["United Kingdom", "Ireland"] },
  {
    name: "Europe",
    countries: [
      "Italy",
      "Poland",
      "Turkey",
      "Ukraine",
      "Austria",
      "Belarus",
      "Bulgaria",
      "Cyprus",
      "France",
      "Germany",
      "Hungary",
      "Netherlands",
      "Portugal",
      "Romania",
      "Sweden",
      "Spain",
      "Norway",
      "Denmark",
      "Finland",
      "Iceland",
      "Belgium",
      "Switzerland",
      "Czech Republic",
      "Czechia",
      "Slovakia",
      "Slovenia",
      "Croatia",
      "Serbia",
      "Bosnia and Herzegovina",
      "Albania",
      "Greece",
      "Russia",
      "Lithuania",
      "Latvia",
      "Estonia",
      "Georgia",
      "Armenia",
      "North Macedonia",
      "Montenegro",
      "Luxembourg",
      "Moldova",
      "Kosovo",
    ],
  },
  {
    name: "Middle East",
    countries: [
      "Israel",
      "Iran",
      "Palestine",
      "Oman",
      "Lebanon",
      "Syria",
      "Iraq",
      "Saudi Arabia",
      "Jordan",
      "Kuwait",
      "Yemen",
      "United Arab Emirates",
      "Qatar",
      "Bahrain",
    ],
  },
  {
    name: "South Asia",
    countries: [
      "India",
      "Pakistan",
      "Sri Lanka",
      "Bangladesh",
      "Nepal",
      "Afghanistan",
      "Bhutan",
      "Maldives",
    ],
  },
  {
    name: "East and Southeast Asia",
    countries: [
      "China",
      "Japan",
      "South Korea",
      "Vietnam",
      "Hong Kong",
      "Taiwan",
      "Philippines",
      "Indonesia",
      "Malaysia",
      "Singapore",
      "Thailand",
      "Myanmar",
      "Cambodia",
      "Laos",
      "Mongolia",
      "North Korea",
    ],
  },
  {
    name: "Oceania",
    countries: [
      "Australia",
      "New Zealand",
      "Fiji",
      "Papua New Guinea",
      "Samoa",
      "Tonga",
    ],
  },
];

/** Short prize names for labels; the full records live in `@missa/radar-adapters`. */
export const PRIZE_NAMES: Record<string, string> = {
  caine: "Caine Prize",
  "nigeria-prize-for-literature": "Nigeria Prize for Literature",
  "commonwealth-short-story": "Commonwealth Short Story Prize",
  "brunel-evaristo-african-poetry": "Brunel African Poetry Prize",
  "wole-soyinka-prize": "Wole Soyinka Prize",
  "windham-campbell": "Windham-Campbell Prize",
  "nobel-literature": "Nobel Prize in Literature",
  booker: "Booker Prize",
  "international-booker": "International Booker Prize",
  "pulitzer-fiction": "Pulitzer Prize for Fiction",
  "pulitzer-poetry": "Pulitzer Prize for Poetry",
  "pulitzer-general-nonfiction": "Pulitzer Prize for Nonfiction",
  "nba-fiction": "National Book Award for Fiction",
  "nba-poetry": "National Book Award for Poetry",
  "nba-nonfiction": "National Book Award for Nonfiction",
  "womens-prize-fiction": "Women's Prize for Fiction",
  "pen-faulkner": "PEN/Faulkner Award",
  "nbcc-fiction": "NBCC Award for Fiction",
  "nbcc-poetry": "NBCC Award for Poetry",
  "story-prize": "The Story Prize",
  "griffin-poetry": "Griffin Poetry Prize",
  "ts-eliot": "T. S. Eliot Prize",
  "dylan-thomas": "Dylan Thomas Prize",
};

/** Prize filter options, grouped as the prizes page groups them. */
export const PRIZE_GROUPS: Array<{ label: string; prizes: string[] }> = [
  {
    label: "Africa",
    prizes: [
      "caine",
      "nigeria-prize-for-literature",
      "commonwealth-short-story",
      "brunel-evaristo-african-poetry",
      "wole-soyinka-prize",
    ],
  },
  {
    label: "International",
    prizes: ["nobel-literature", "international-booker", "windham-campbell"],
  },
  {
    label: "UK and Ireland",
    prizes: ["booker", "womens-prize-fiction", "ts-eliot", "dylan-thomas"],
  },
  {
    label: "United States",
    prizes: [
      "pulitzer-fiction",
      "pulitzer-poetry",
      "pulitzer-general-nonfiction",
      "nba-fiction",
      "nba-poetry",
      "nba-nonfiction",
      "pen-faulkner",
      "nbcc-fiction",
      "nbcc-poetry",
      "story-prize",
    ],
  },
  { label: "Canada", prizes: ["griffin-poetry"] },
];

export const FORM_LABELS: Record<WriterForm, string> = {
  fiction: "Fiction",
  poetry: "Poetry",
  nonfiction: "Nonfiction",
};

const SUGGESTION_COUNT = 8;

const writersByName = new Map(
  COMPARABLE_WRITERS.map((writer) => [writer.name, writer]),
);

export const WRITER_COUNT = writersByName.size;

export const PRIZE_WINNER_COUNT = COMPARABLE_WRITERS.filter(
  (writer) => writer.prizes.length > 0,
).length;

const regionByCountry = new Map(
  WRITER_REGIONS.flatMap((region) =>
    region.countries.map((country) => [country, region.name] as const),
  ),
);

/** Surname-first sort key: "Ngũgĩ wa Thiong'o" sorts under T, "Ursula K. Le Guin" under L. */
const PARTICLES = new Set(["wa", "le", "de", "del", "van", "von", "abu"]);
function surnameKey(name: string): string {
  const parts = name.split(" ");
  let start = parts.length - 1;
  if (start > 0 && PARTICLES.has(parts[start - 1].toLocaleLowerCase())) {
    start -= 1;
  }
  return [...parts.slice(start), ...parts.slice(0, start)].join(" ");
}

function bySurname(a: string, b: string) {
  return surnameKey(a).localeCompare(surnameKey(b), "en", {
    sensitivity: "base",
  });
}

export function findWriter(name: string): ComparableWriter | undefined {
  return writersByName.get(name);
}

/** "Caine Prize 2019" for a writer's most recent prize, or null. */
export function latestPrizeLabel(name: string): string | null {
  const prize = writersByName.get(name)?.prizes[0];
  return prize ? `${PRIZE_NAMES[prize[0]] ?? prize[0]} ${prize[1]}` : null;
}

/**
 * "Nigeria · Fiction, Nonfiction · Caine Prize 2019" for a catalogue name,
 * or null for a typed name.
 */
export function writerDetail(name: string): string | null {
  const writer = writersByName.get(name);
  if (!writer) return null;
  const forms = writer.forms.map((form) => FORM_LABELS[form]).join(", ");
  const prize = latestPrizeLabel(name);
  return [writer.countries.join(" · "), forms, prize]
    .filter(Boolean)
    .join(" · ");
}

export interface WriterFilter {
  form: WriterForm | "all";
  country: string | "all";
  /** "all" writers, "any" prize winner, or one prize id. */
  prize: string;
}

function matchesFilter(writer: ComparableWriter, filter: WriterFilter) {
  return (
    (filter.form === "all" || writer.forms.includes(filter.form)) &&
    (filter.country === "all" || writer.countries.includes(filter.country)) &&
    (filter.prize === "all" ||
      (filter.prize === "any"
        ? writer.prizes.length > 0
        : writer.prizes.some(([prize]) => prize === filter.prize)))
  );
}

/** Countries with how many writers each has, most first. */
export function writerCountries(
  filter: Pick<WriterFilter, "form" | "prize"> = { form: "all", prize: "all" },
): Array<{ country: string; count: number }> {
  const counts = new Map<string, number>();
  for (const writer of writersByName.values()) {
    if (!matchesFilter(writer, { ...filter, country: "all" })) continue;
    for (const country of writer.countries) {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}

/** How many catalogue writers have won each prize. */
export function prizeCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const writer of writersByName.values()) {
    for (const prize of new Set(writer.prizes.map(([id]) => id))) {
      counts.set(prize, (counts.get(prize) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Catalogue names that pass the filter. With one prize chosen they form a
 * single group, most recent winner first; otherwise they are grouped by
 * region in display order and sorted by surname.
 */
export function groupedWriters(
  filter: WriterFilter,
): Array<{ value: string; items: string[] }> {
  const matching = [...writersByName.values()].filter((writer) =>
    matchesFilter(writer, filter),
  );
  if (filter.prize !== "all" && filter.prize !== "any") {
    const year = (writer: ComparableWriter) =>
      Math.max(
        ...writer.prizes
          .filter(([prize]) => prize === filter.prize)
          .map(([, won]) => won),
      );
    return matching.length
      ? [
          {
            value: PRIZE_NAMES[filter.prize] ?? filter.prize,
            items: matching
              .sort((a, b) => year(b) - year(a) || bySurname(a.name, b.name))
              .map((writer) => writer.name),
          },
        ]
      : [];
  }
  const groups = new Map<string, string[]>(
    WRITER_REGIONS.map((region) => [region.name, []]),
  );
  for (const writer of matching) {
    const region = regionByCountry.get(writer.countries[0]);
    if (region) groups.get(region)?.push(writer.name);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([value, items]) => ({ value, items: items.sort(bySurname) }));
}

/** The first catalogue names for a manuscript form, optionally narrowed. */
export function suggestedWriters(
  genre: "fiction" | "poetry" | "nonfiction" | "flash" | "hybrid",
  filter: Pick<WriterFilter, "country" | "prize"> = {
    country: "all",
    prize: "all",
  },
): string[] {
  const form: WriterForm =
    genre === "poetry"
      ? "poetry"
      : genre === "nonfiction"
        ? "nonfiction"
        : "fiction";
  return [...writersByName.values()]
    .filter((writer) => matchesFilter(writer, { form, ...filter }))
    .slice(0, SUGGESTION_COUNT)
    .map((writer) => writer.name);
}
