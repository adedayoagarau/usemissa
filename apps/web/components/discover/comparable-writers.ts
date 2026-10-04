/**
 * Writers people name when describing where their work sits. The matcher
 * compares these with the "author comps" Missa records for each magazine;
 * anyone not listed can still be typed in.
 *
 * `countries` lists the country most associated with the writer first, then
 * a second where they are also widely read as part of that literature (for
 * example a diaspora writer's country of residence). `forms` drives the
 * suggestions shown for the chosen form, in the order listed here.
 */
export type WriterForm = "fiction" | "poetry" | "nonfiction";

export interface ComparableWriter {
  name: string;
  forms: WriterForm[];
  countries: string[];
}

const F: WriterForm[] = ["fiction"];
const P: WriterForm[] = ["poetry"];
const N: WriterForm[] = ["nonfiction"];
const FN: WriterForm[] = ["fiction", "nonfiction"];
const PN: WriterForm[] = ["poetry", "nonfiction"];
const FP: WriterForm[] = ["fiction", "poetry"];
const FPN: WriterForm[] = ["fiction", "poetry", "nonfiction"];

export const COMPARABLE_WRITERS: ComparableWriter[] = [
  { name: "Carmen Maria Machado", forms: FN, countries: ["United States"] },
  { name: "George Saunders", forms: FN, countries: ["United States"] },
  { name: "Kelly Link", forms: F, countries: ["United States"] },
  { name: "Chimamanda Ngozi Adichie", forms: FN, countries: ["Nigeria"] },
  { name: "Lorrie Moore", forms: F, countries: ["United States"] },
  { name: "Lydia Davis", forms: F, countries: ["United States"] },
  { name: "Lesley Nneka Arimah", forms: F, countries: ["Nigeria"] },
  { name: "Sally Rooney", forms: F, countries: ["Ireland"] },
  { name: "Jhumpa Lahiri", forms: FN, countries: ["United States"] },
  { name: "Ted Chiang", forms: F, countries: ["United States"] },
  { name: "Ottessa Moshfegh", forms: F, countries: ["United States"] },
  { name: "Danielle Evans", forms: F, countries: ["United States"] },
  { name: "Toni Morrison", forms: FN, countries: ["United States"] },
  { name: "Alice Munro", forms: F, countries: ["Canada"] },
  { name: "Raymond Carver", forms: FP, countries: ["United States"] },
  { name: "Denis Johnson", forms: FP, countries: ["United States"] },
  { name: "Amy Hempel", forms: F, countries: ["United States"] },
  { name: "Grace Paley", forms: FP, countries: ["United States"] },
  { name: "Flannery O'Connor", forms: F, countries: ["United States"] },
  { name: "Mavis Gallant", forms: F, countries: ["Canada"] },
  { name: "Joy Williams", forms: F, countries: ["United States"] },
  { name: "Mary Gaitskill", forms: FN, countries: ["United States"] },
  { name: "Deborah Eisenberg", forms: F, countries: ["United States"] },
  { name: "Lauren Groff", forms: F, countries: ["United States"] },
  { name: "Karen Russell", forms: F, countries: ["United States"] },
  { name: "Aimee Bender", forms: F, countries: ["United States"] },
  { name: "Etgar Keret", forms: F, countries: ["Israel"] },
  { name: "Jenny Offill", forms: F, countries: ["United States"] },
  { name: "Rachel Cusk", forms: FN, countries: ["United Kingdom"] },
  { name: "Ben Lerner", forms: FPN, countries: ["United States"] },
  { name: "Teju Cole", forms: FN, countries: ["Nigeria", "United States"] },
  { name: "Ocean Vuong", forms: FP, countries: ["Vietnam", "United States"] },
  { name: "Colson Whitehead", forms: F, countries: ["United States"] },
  { name: "Jesmyn Ward", forms: FN, countries: ["United States"] },
  {
    name: "Edwidge Danticat",
    forms: FN,
    countries: ["Haiti", "United States"],
  },
  {
    name: "Junot Díaz",
    forms: F,
    countries: ["Dominican Republic", "United States"],
  },
  { name: "Yiyun Li", forms: FN, countries: ["China", "United States"] },
  { name: "Kazuo Ishiguro", forms: F, countries: ["Japan", "United Kingdom"] },
  { name: "Zadie Smith", forms: FN, countries: ["United Kingdom"] },
  { name: "Helen Oyeyemi", forms: F, countries: ["Nigeria", "United Kingdom"] },
  { name: "Ali Smith", forms: F, countries: ["United Kingdom"] },
  { name: "Sarah Hall", forms: F, countries: ["United Kingdom"] },
  { name: "Claire Keegan", forms: F, countries: ["Ireland"] },
  { name: "Kevin Barry", forms: F, countries: ["Ireland"] },
  { name: "Anne Enright", forms: F, countries: ["Ireland"] },
  { name: "Edna O'Brien", forms: F, countries: ["Ireland"] },
  { name: "Ling Ma", forms: F, countries: ["China", "United States"] },
  { name: "R. F. Kuang", forms: F, countries: ["China", "United States"] },
  { name: "N. K. Jemisin", forms: F, countries: ["United States"] },
  { name: "Octavia E. Butler", forms: F, countries: ["United States"] },
  { name: "Ursula K. Le Guin", forms: FPN, countries: ["United States"] },
  { name: "Samuel R. Delany", forms: FN, countries: ["United States"] },
  { name: "Shirley Jackson", forms: F, countries: ["United States"] },
  { name: "Angela Carter", forms: F, countries: ["United Kingdom"] },
  { name: "Jorge Luis Borges", forms: FP, countries: ["Argentina"] },
  { name: "Italo Calvino", forms: F, countries: ["Italy"] },
  { name: "Clarice Lispector", forms: F, countries: ["Brazil"] },
  { name: "Mariana Enríquez", forms: F, countries: ["Argentina"] },
  { name: "Samanta Schweblin", forms: F, countries: ["Argentina"] },
  { name: "Yoko Ogawa", forms: F, countries: ["Japan"] },
  { name: "Han Kang", forms: FP, countries: ["South Korea"] },
  { name: "Olga Tokarczuk", forms: F, countries: ["Poland"] },
  { name: "Elena Ferrante", forms: F, countries: ["Italy"] },
  { name: "Roberto Bolaño", forms: FP, countries: ["Chile"] },
  { name: "Haruki Murakami", forms: F, countries: ["Japan"] },
  { name: "Banana Yoshimoto", forms: F, countries: ["Japan"] },
  { name: "Sayaka Murata", forms: F, countries: ["Japan"] },
  { name: "Brandon Taylor", forms: F, countries: ["United States"] },
  { name: "Bryan Washington", forms: F, countries: ["United States"] },
  { name: "Nana Kwame Adjei-Brenyah", forms: F, countries: ["United States"] },
  { name: "Deesha Philyaw", forms: F, countries: ["United States"] },
  { name: "Kristen Arnett", forms: F, countries: ["United States"] },
  { name: "Lucia Berlin", forms: F, countries: ["United States"] },
  {
    name: "Leonora Carrington",
    forms: F,
    countries: ["United Kingdom", "Mexico"],
  },
  { name: "Sofia Samatar", forms: FPN, countries: ["United States"] },
  { name: "Kij Johnson", forms: F, countries: ["United States"] },
  { name: "Ken Liu", forms: F, countries: ["China", "United States"] },
  { name: "Rebecca Makkai", forms: F, countries: ["United States"] },
  { name: "Tommy Orange", forms: F, countries: ["United States"] },
  { name: "Louise Erdrich", forms: FPN, countries: ["United States"] },
  { name: "Sandra Cisneros", forms: FP, countries: ["United States"] },
  { name: "Ayşegül Savaş", forms: F, countries: ["Turkey"] },
  { name: "Weike Wang", forms: F, countries: ["China", "United States"] },
  { name: "Elizabeth McCracken", forms: FN, countries: ["United States"] },
  { name: "Joyce Carol Oates", forms: FPN, countries: ["United States"] },
  { name: "Margaret Atwood", forms: FPN, countries: ["Canada"] },
  { name: "Percival Everett", forms: F, countries: ["United States"] },
  {
    name: "Viet Thanh Nguyen",
    forms: FN,
    countries: ["Vietnam", "United States"],
  },
  { name: "Ruth Ozeki", forms: F, countries: ["United States"] },
  { name: "Max Porter", forms: F, countries: ["United Kingdom"] },
  { name: "Daisy Johnson", forms: F, countries: ["United Kingdom"] },
  { name: "Hilary Mantel", forms: FN, countries: ["United Kingdom"] },
  { name: "Ann Quin", forms: F, countries: ["United Kingdom"] },
  { name: "Diane Williams", forms: F, countries: ["United States"] },
  { name: "Gary Lutz", forms: F, countries: ["United States"] },
  { name: "Kathy Fish", forms: F, countries: ["United States"] },
  { name: "Sherrie Flick", forms: F, countries: ["United States"] },
  { name: "Robert Coover", forms: F, countries: ["United States"] },
  { name: "Donald Barthelme", forms: F, countries: ["United States"] },
  { name: "Chinua Achebe", forms: FPN, countries: ["Nigeria"] },
  { name: "Ngũgĩ wa Thiong'o", forms: FN, countries: ["Kenya"] },
  { name: "Ben Okri", forms: FP, countries: ["Nigeria", "United Kingdom"] },
  { name: "Chigozie Obioma", forms: F, countries: ["Nigeria"] },
  { name: "Akwaeke Emezi", forms: FP, countries: ["Nigeria"] },
  { name: "Ayọ̀bámi Adébáyọ̀", forms: F, countries: ["Nigeria"] },
  { name: "Oyinkan Braithwaite", forms: F, countries: ["Nigeria"] },
  { name: "Chibundu Onuzo", forms: F, countries: ["Nigeria"] },
  { name: "Sefi Atta", forms: F, countries: ["Nigeria"] },
  { name: "Chika Unigwe", forms: F, countries: ["Nigeria"] },
  { name: "Helon Habila", forms: FN, countries: ["Nigeria"] },
  { name: "A. Igoni Barrett", forms: F, countries: ["Nigeria"] },
  { name: "Jowhor Ile", forms: F, countries: ["Nigeria"] },
  { name: "Abi Daré", forms: F, countries: ["Nigeria"] },
  { name: "Nnedi Okorafor", forms: F, countries: ["Nigeria", "United States"] },
  { name: "Tomi Adeyemi", forms: F, countries: ["Nigeria", "United States"] },
  {
    name: "Buchi Emecheta",
    forms: F,
    countries: ["Nigeria", "United Kingdom"],
  },
  { name: "Flora Nwapa", forms: F, countries: ["Nigeria"] },
  { name: "Amos Tutuola", forms: F, countries: ["Nigeria"] },
  { name: "Wole Soyinka", forms: FPN, countries: ["Nigeria"] },
  { name: "Okey Ndibe", forms: FN, countries: ["Nigeria"] },
  { name: "Adaobi Tricia Nwaubani", forms: FN, countries: ["Nigeria"] },
  { name: "Elnathan John", forms: FN, countries: ["Nigeria"] },
  { name: "Abubakar Adam Ibrahim", forms: F, countries: ["Nigeria"] },
  { name: "Uwem Akpan", forms: F, countries: ["Nigeria"] },
  { name: "Chris Abani", forms: FP, countries: ["Nigeria"] },
  { name: "Tsitsi Dangarembga", forms: F, countries: ["Zimbabwe"] },
  { name: "NoViolet Bulawayo", forms: F, countries: ["Zimbabwe"] },
  { name: "Yaa Gyasi", forms: F, countries: ["Ghana", "United States"] },
  { name: "Ama Ata Aidoo", forms: FP, countries: ["Ghana"] },
  { name: "Ayi Kwei Armah", forms: F, countries: ["Ghana"] },
  { name: "Nadine Gordimer", forms: F, countries: ["South Africa"] },
  { name: "J. M. Coetzee", forms: FN, countries: ["South Africa"] },
  { name: "Zakes Mda", forms: F, countries: ["South Africa"] },
  { name: "Bessie Head", forms: F, countries: ["South Africa", "Botswana"] },
  { name: "Nuruddin Farah", forms: F, countries: ["Somalia"] },
  {
    name: "Abdulrazak Gurnah",
    forms: F,
    countries: ["Tanzania", "United Kingdom"],
  },
  { name: "Binyavanga Wainaina", forms: FN, countries: ["Kenya"] },
  { name: "Yvonne Adhiambo Owuor", forms: F, countries: ["Kenya"] },
  { name: "Maaza Mengiste", forms: F, countries: ["Ethiopia"] },
  {
    name: "Dinaw Mengestu",
    forms: F,
    countries: ["Ethiopia", "United States"],
  },
  { name: "Leila Aboulela", forms: F, countries: ["Sudan"] },
  {
    name: "Nadifa Mohamed",
    forms: F,
    countries: ["Somalia", "United Kingdom"],
  },
  { name: "Petina Gappah", forms: F, countries: ["Zimbabwe"] },
  { name: "Imbolo Mbue", forms: F, countries: ["Cameroon"] },
  { name: "Mohammed Naseehu Ali", forms: F, countries: ["Ghana"] },
  { name: "Damon Galgut", forms: F, countries: ["South Africa"] },
  { name: "Mia Couto", forms: FP, countries: ["Mozambique"] },
  { name: "Mariama Bâ", forms: F, countries: ["Senegal"] },
  { name: "Tade Thompson", forms: F, countries: ["Nigeria", "United Kingdom"] },
  { name: "Wole Talabi", forms: F, countries: ["Nigeria"] },
  { name: "Suyi Davies Okungbowa", forms: F, countries: ["Nigeria"] },
  {
    name: "Irenosen Okojie",
    forms: F,
    countries: ["Nigeria", "United Kingdom"],
  },
  { name: "Bernardine Evaristo", forms: FP, countries: ["United Kingdom"] },
  {
    name: "Caryl Phillips",
    forms: FN,
    countries: ["Saint Kitts and Nevis", "United Kingdom"],
  },
  {
    name: "Jamaica Kincaid",
    forms: FN,
    countries: ["Antigua and Barbuda", "United States"],
  },
  { name: "Marlon James", forms: F, countries: ["Jamaica"] },
  { name: "Kei Miller", forms: FP, countries: ["Jamaica"] },
  { name: "Earl Lovelace", forms: F, countries: ["Trinidad and Tobago"] },
  { name: "Arundhati Roy", forms: FN, countries: ["India"] },
  { name: "Salman Rushdie", forms: FN, countries: ["India", "United Kingdom"] },
  { name: "Mohsin Hamid", forms: F, countries: ["Pakistan"] },
  {
    name: "Kamila Shamsie",
    forms: F,
    countries: ["Pakistan", "United Kingdom"],
  },
  { name: "Anuk Arudpragasam", forms: F, countries: ["Sri Lanka"] },
  { name: "Ada Limón", forms: P, countries: ["United States"] },
  { name: "Kaveh Akbar", forms: FP, countries: ["Iran", "United States"] },
  { name: "Natalie Diaz", forms: P, countries: ["United States"] },
  { name: "Warsan Shire", forms: P, countries: ["Somalia", "United Kingdom"] },
  { name: "Ross Gay", forms: PN, countries: ["United States"] },
  { name: "Tracy K. Smith", forms: PN, countries: ["United States"] },
  { name: "Danez Smith", forms: P, countries: ["United States"] },
  { name: "Safia Elhillo", forms: P, countries: ["Sudan", "United States"] },
  { name: "Louise Glück", forms: PN, countries: ["United States"] },
  { name: "Mary Oliver", forms: PN, countries: ["United States"] },
  {
    name: "Claudia Rankine",
    forms: PN,
    countries: ["Jamaica", "United States"],
  },
  { name: "Terrance Hayes", forms: P, countries: ["United States"] },
  { name: "Hanif Abdurraqib", forms: PN, countries: ["United States"] },
  { name: "Jericho Brown", forms: P, countries: ["United States"] },
  { name: "Joy Harjo", forms: PN, countries: ["United States"] },
  { name: "Layli Long Soldier", forms: P, countries: ["United States"] },
  { name: "Franny Choi", forms: P, countries: ["United States"] },
  { name: "Chen Chen", forms: P, countries: ["China", "United States"] },
  { name: "Aimee Nezhukumatathil", forms: PN, countries: ["United States"] },
  { name: "Diane Seuss", forms: P, countries: ["United States"] },
  { name: "Carl Phillips", forms: PN, countries: ["United States"] },
  { name: "Morgan Parker", forms: PN, countries: ["United States"] },
  { name: "Eduardo C. Corral", forms: P, countries: ["United States"] },
  { name: "Fatimah Asghar", forms: FP, countries: ["United States"] },
  { name: "Solmaz Sharif", forms: P, countries: ["Iran", "United States"] },
  { name: "Mosab Abu Toha", forms: P, countries: ["Palestine"] },
  { name: "Victoria Chang", forms: PN, countries: ["United States"] },
  { name: "Sharon Olds", forms: P, countries: ["United States"] },
  { name: "Lucille Clifton", forms: P, countries: ["United States"] },
  { name: "Gwendolyn Brooks", forms: P, countries: ["United States"] },
  { name: "Elizabeth Bishop", forms: P, countries: ["United States"] },
  { name: "Sylvia Plath", forms: FP, countries: ["United States"] },
  { name: "Anne Carson", forms: PN, countries: ["Canada"] },
  { name: "Jorie Graham", forms: P, countries: ["United States"] },
  { name: "Brenda Shaughnessy", forms: P, countries: ["United States"] },
  { name: "Mary Ruefle", forms: PN, countries: ["United States"] },
  { name: "Maggie Smith", forms: PN, countries: ["United States"] },
  { name: "Ilya Kaminsky", forms: P, countries: ["Ukraine", "United States"] },
  { name: "Tishani Doshi", forms: FP, countries: ["India"] },
  { name: "Raymond Antrobus", forms: P, countries: ["United Kingdom"] },
  { name: "Roger Reeves", forms: P, countries: ["United States"] },
  { name: "Robin Coste Lewis", forms: P, countries: ["United States"] },
  { name: "Patricia Smith", forms: P, countries: ["United States"] },
  { name: "Yusef Komunyakaa", forms: P, countries: ["United States"] },
  { name: "Rita Dove", forms: FP, countries: ["United States"] },
  { name: "Seamus Heaney", forms: PN, countries: ["Ireland"] },
  { name: "Derek Walcott", forms: P, countries: ["Saint Lucia"] },
  { name: "Kamau Brathwaite", forms: P, countries: ["Barbados"] },
  {
    name: "Dionne Brand",
    forms: FPN,
    countries: ["Trinidad and Tobago", "Canada"],
  },
  { name: "Mahmoud Darwish", forms: P, countries: ["Palestine"] },
  { name: "Wisława Szymborska", forms: P, countries: ["Poland"] },
  { name: "Pablo Neruda", forms: P, countries: ["Chile"] },
  { name: "Agha Shahid Ali", forms: P, countries: ["India", "United States"] },
  {
    name: "Mary Jean Chan",
    forms: P,
    countries: ["Hong Kong", "United Kingdom"],
  },
  { name: "Hala Alyan", forms: FP, countries: ["Palestine", "United States"] },
  { name: "Marwa Helal", forms: P, countries: ["Egypt", "United States"] },
  { name: "Jos Charles", forms: P, countries: ["United States"] },
  { name: "CAConrad", forms: P, countries: ["United States"] },
  { name: "Cathy Park Hong", forms: PN, countries: ["United States"] },
  { name: "Natalie Shapero", forms: P, countries: ["United States"] },
  { name: "Tyehimba Jess", forms: P, countries: ["United States"] },
  { name: "Camille T. Dungy", forms: PN, countries: ["United States"] },
  { name: "Saeed Jones", forms: PN, countries: ["United States"] },
  { name: "Paisley Rekdal", forms: PN, countries: ["United States"] },
  { name: "Sarah Kay", forms: P, countries: ["United States"] },
  { name: "Kim Addonizio", forms: FP, countries: ["United States"] },
  { name: "Romeo Oriogun", forms: P, countries: ["Nigeria"] },
  { name: "Gbenga Adeoba", forms: P, countries: ["Nigeria"] },
  { name: "Logan February", forms: P, countries: ["Nigeria"] },
  { name: "Ladan Osman", forms: P, countries: ["Somalia", "United States"] },
  { name: "Kechi Nomu", forms: P, countries: ["Nigeria"] },
  { name: "Tolu Oloruntoba", forms: P, countries: ["Nigeria", "Canada"] },
  { name: "Ijeoma Umebinyuo", forms: P, countries: ["Nigeria"] },
  { name: "Inua Ellams", forms: P, countries: ["Nigeria", "United Kingdom"] },
  { name: "Tade Ipadeola", forms: P, countries: ["Nigeria"] },
  { name: "Gabriel Okara", forms: FP, countries: ["Nigeria"] },
  { name: "Christopher Okigbo", forms: P, countries: ["Nigeria"] },
  { name: "Niyi Osundare", forms: P, countries: ["Nigeria"] },
  { name: "Tanure Ojaide", forms: P, countries: ["Nigeria"] },
  { name: "Kwame Dawes", forms: PN, countries: ["Ghana", "Jamaica"] },
  { name: "Koleka Putuma", forms: P, countries: ["South Africa"] },
  { name: "Gabeba Baderoon", forms: P, countries: ["South Africa"] },
  { name: "Tjawangwa Dema", forms: P, countries: ["Botswana"] },
  { name: "Nick Makoha", forms: P, countries: ["Uganda", "United Kingdom"] },
  { name: "Dami Ajayi", forms: P, countries: ["Nigeria"] },
  { name: "Theresa Lola", forms: P, countries: ["Nigeria", "United Kingdom"] },
  { name: "Caleb Femi", forms: P, countries: ["Nigeria", "United Kingdom"] },
  { name: "Yomi Ṣode", forms: P, countries: ["Nigeria", "United Kingdom"] },
  { name: "Nikky Finney", forms: P, countries: ["United States"] },
  { name: "Aja Monet", forms: P, countries: ["United States"] },
  { name: "Maggie Nelson", forms: PN, countries: ["United States"] },
  { name: "Joan Didion", forms: FN, countries: ["United States"] },
  { name: "Rebecca Solnit", forms: N, countries: ["United States"] },
  { name: "Leslie Jamison", forms: FN, countries: ["United States"] },
  { name: "Jia Tolentino", forms: N, countries: ["United States"] },
  { name: "Hilton Als", forms: N, countries: ["United States"] },
  { name: "Annie Dillard", forms: FPN, countries: ["United States"] },
  { name: "James Baldwin", forms: FN, countries: ["United States"] },
  { name: "Kiese Laymon", forms: FN, countries: ["United States"] },
  { name: "Eula Biss", forms: N, countries: ["United States"] },
  { name: "Robin Wall Kimmerer", forms: N, countries: ["United States"] },
  { name: "Saidiya Hartman", forms: N, countries: ["United States"] },
  { name: "Elif Batuman", forms: FN, countries: ["United States"] },
  { name: "Alexander Chee", forms: FN, countries: ["United States"] },
  { name: "Melissa Febos", forms: N, countries: ["United States"] },
  { name: "Esmé Weijun Wang", forms: FN, countries: ["United States"] },
  { name: "Durga Chew-Bose", forms: N, countries: ["Canada"] },
  { name: "Brian Doyle", forms: FN, countries: ["United States"] },
  { name: "John Jeremiah Sullivan", forms: N, countries: ["United States"] },
  { name: "David Foster Wallace", forms: FN, countries: ["United States"] },
  { name: "Ta-Nehisi Coates", forms: FN, countries: ["United States"] },
  { name: "Audre Lorde", forms: PN, countries: ["United States"] },
  { name: "bell hooks", forms: N, countries: ["United States"] },
  { name: "Susan Sontag", forms: FN, countries: ["United States"] },
  { name: "Virginia Woolf", forms: FN, countries: ["United Kingdom"] },
  { name: "Olivia Laing", forms: FN, countries: ["United Kingdom"] },
  { name: "Helen Macdonald", forms: N, countries: ["United Kingdom"] },
  { name: "Robert Macfarlane", forms: N, countries: ["United Kingdom"] },
  { name: "Kathleen Jamie", forms: PN, countries: ["United Kingdom"] },
  { name: "Elizabeth Alexander", forms: PN, countries: ["United States"] },
  { name: "Natasha Trethewey", forms: PN, countries: ["United States"] },
  { name: "Brian Blanchfield", forms: PN, countries: ["United States"] },
  { name: "Wendy S. Walters", forms: N, countries: ["United States"] },
  { name: "Cheryl Strayed", forms: FN, countries: ["United States"] },
  { name: "Roxane Gay", forms: FN, countries: ["United States"] },
  {
    name: "Ingrid Rojas Contreras",
    forms: FN,
    countries: ["Colombia", "United States"],
  },
  { name: "Cristina Rivera Garza", forms: FN, countries: ["Mexico"] },
  { name: "Valeria Luiselli", forms: FN, countries: ["Mexico"] },
  { name: "Emmanuel Iduma", forms: N, countries: ["Nigeria"] },
  { name: "Pumla Dineo Gqola", forms: N, countries: ["South Africa"] },
  { name: "Sisonke Msimang", forms: N, countries: ["South Africa"] },
  {
    name: "Siddhartha Mukherjee",
    forms: N,
    countries: ["India", "United States"],
  },
  { name: "Atul Gawande", forms: N, countries: ["United States"] },
  { name: "Patrick Radden Keefe", forms: N, countries: ["United States"] },
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
    ],
  },
  { name: "North America", countries: ["United States", "Canada"] },
  {
    name: "Latin America",
    countries: ["Argentina", "Brazil", "Chile", "Mexico", "Colombia"],
  },
  { name: "UK and Ireland", countries: ["United Kingdom", "Ireland"] },
  { name: "Europe", countries: ["Italy", "Poland", "Turkey", "Ukraine"] },
  { name: "Middle East", countries: ["Israel", "Iran", "Palestine"] },
  { name: "South Asia", countries: ["India", "Pakistan", "Sri Lanka"] },
  {
    name: "East and Southeast Asia",
    countries: ["China", "Japan", "South Korea", "Vietnam", "Hong Kong"],
  },
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

/** "Nigeria · Fiction, Nonfiction" for a catalogue name, or null for a typed name. */
export function writerDetail(name: string): string | null {
  const writer = writersByName.get(name);
  if (!writer) return null;
  const forms = writer.forms.map((form) => FORM_LABELS[form]).join(", ");
  return `${writer.countries.join(" · ")} · ${forms}`;
}

export interface WriterFilter {
  form: WriterForm | "all";
  country: string | "all";
}

function matchesFilter(writer: ComparableWriter, filter: WriterFilter) {
  return (
    (filter.form === "all" || writer.forms.includes(filter.form)) &&
    (filter.country === "all" || writer.countries.includes(filter.country))
  );
}

/** Countries with how many writers each has, most first. */
export function writerCountries(
  form: WriterFilter["form"] = "all",
): Array<{ country: string; count: number }> {
  const counts = new Map<string, number>();
  for (const writer of writersByName.values()) {
    if (form !== "all" && !writer.forms.includes(form)) continue;
    for (const country of writer.countries) {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}

/**
 * Catalogue names that pass the filter, grouped by region in display order
 * and sorted by surname within each region.
 */
export function groupedWriters(
  filter: WriterFilter,
): Array<{ value: string; items: string[] }> {
  const groups = new Map<string, string[]>(
    WRITER_REGIONS.map((region) => [region.name, []]),
  );
  for (const writer of writersByName.values()) {
    if (!matchesFilter(writer, filter)) continue;
    const region = regionByCountry.get(writer.countries[0]);
    if (region) groups.get(region)?.push(writer.name);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([value, items]) => ({ value, items: items.sort(bySurname) }));
}

/** The first catalogue names for a manuscript form, optionally from one country. */
export function suggestedWriters(
  genre: "fiction" | "poetry" | "nonfiction" | "flash" | "hybrid",
  country: string | "all" = "all",
): string[] {
  const form: WriterForm =
    genre === "poetry"
      ? "poetry"
      : genre === "nonfiction"
        ? "nonfiction"
        : "fiction";
  return [...writersByName.values()]
    .filter((writer) => matchesFilter(writer, { form, country }))
    .slice(0, SUGGESTION_COUNT)
    .map((writer) => writer.name);
}
