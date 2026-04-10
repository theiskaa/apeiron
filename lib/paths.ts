export interface PathNode {
  id: string;
  hook: string;
}

export interface ReadingPath {
  id: string;
  title: string;
  description: string;
  nodes: PathNode[];
}

export const READING_PATHS: ReadingPath[] = [
  {
    id: "genesis",
    title: "Genesis",
    description: "Start with the proven — declassified operations that show the pattern",
    nodes: [
      { id: "operation-northwoods", hook: "A signed Pentagon plan to stage attacks on Americans — declassified, real, and rejected by one man" },
      { id: "operation-gladio", hook: "Northwoods was the proposal — and Kennedy rejected it. Gladio was the same doctrine, exported to Europe, executed for forty years, killing civilians in train stations until one Italian magistrate refused to close a 1972 case" },
      { id: "mkultra", hook: "Now that you know they'd plan false flags, learn what they actually did — 20 years of mind control experiments on unwitting citizens" },
      { id: "operation-paperclip", hook: "MKUltra's methods came from somewhere — 1,600 Nazi scientists smuggled into America with sanitized records" },
      { id: "cointelpro", hook: "It wasn't just the CIA — the FBI ran its own war against civil rights leaders, antiwar activists, and American citizens" },
      { id: "operation-mockingbird", hook: "They did all this in secret because they controlled the story — CIA assets embedded in every major newsroom" },
      { id: "cia-drugs", hook: "The pattern complete: the same agency that controlled minds and media also ran cocaine through American cities" },
    ],
  },
  {
    id: "the-architecture",
    title: "The Architecture",
    description: "You've seen what they did — now understand how the machine actually works",
    nodes: [
      { id: "control-systems", hook: "Before going deeper, learn the framework — how invisible systems shape what entire populations think and never question" },
      { id: "bernays", hook: "Now meet the founder. The nephew of Sigmund Freud who openly described his profession as the engineering of mass consent — and lived to see his books used by Joseph Goebbels, never quite disavowing the methodology" },
      { id: "counterculture-psyop", hook: "Even rebellion can be manufactured — how the 1960s counterculture was steered by the same agencies you just read about" },
      { id: "deep-state", hook: "These operations survived every election because the real government is permanent — the bureaucracy behind the elected faces" },
      { id: "shadow-elite", hook: "Someone runs the deep state — the network of families, funds, and foundations that sit above governments" },
      { id: "federal-reserve", hook: "Follow the money — a private institution that controls the dollar, created in a secret meeting on Jekyll Island" },
      { id: "mass-surveillance", hook: "Money gives them power, surveillance gives them knowledge — PRISM, Five Eyes, and the end of privacy" },
      { id: "predictive-programming", hook: "They don't just control the news — they script the future through fiction. The Lone Gunmen aired a plane hitting the WTC six months before 9/11" },
      { id: "bilderberg", hook: "Where do they coordinate? Annual closed-door meetings of 130 of the world's most powerful people, no press allowed" },
      { id: "bohemian-grove", hook: "Where do they socialize? A private campground where presidents and CEOs perform rituals before a 40-foot owl" },
      { id: "denver-airport", hook: "Where do they build? A $4.8 billion airport with Masonic capstones, apocalyptic murals, and underground tunnels nobody can explain" },
    ],
  },
  {
    id: "the-hidden-hand",
    title: "The Hidden Hand",
    description: "The networks behind the networks — secret societies from the Templars to today",
    nodes: [
      { id: "secret-societies", hook: "Power has always organized in the dark — from mystery schools in Egypt to boardrooms in Manhattan" },
      { id: "knights-templar", hook: "The original template: a military order that became the richest organization in Europe, then was destroyed in a single day" },
      { id: "holy-grail", hook: "What were the Templars really guarding? The Grail isn't a cup — it might be a bloodline, a secret, or a technology" },
      { id: "hermetic-tradition", hook: "The philosophy that runs beneath all secret societies — 'as above, so below' and the hidden structure of reality" },
      { id: "freemasonry", hook: "The network that survived the Templars — from cathedral builders to the men who designed Washington D.C." },
      { id: "sacred-geometry", hook: "The hidden language encoded in temples, cathedrals, and corporate logos — mathematics as the signature of the initiated" },
      { id: "illuminati", hook: "Founded in 1776, suppressed in 1785, allegedly still operating — the conspiracy that spawned all other conspiracies" },
      { id: "skull-and-bones", hook: "Fifteen Yale seniors per year, three presidents, multiple CIA directors — the most powerful secret society in America, hiding in plain sight since 1832" },
      { id: "saturn-black-cube", hook: "Saturn devoured his children. His symbol is the Black Cube. His hexagon is on the planet's pole. And his worship may never have stopped" },
      { id: "new-world-order", hook: "The alleged endgame of every secret society — a single world government, one currency, total control" },
      { id: "great-reset", hook: "The NWO rebranded for the 21st century — the World Economic Forum's published plan for restructuring global civilization" },
    ],
  },
  {
    id: "the-dynasties",
    title: "The Dynasties",
    description: "The families and institutions that operate across centuries — multi-generational supranational power, documented in the historical record",
    nodes: [
      { id: "rothschild", hook: "Begin in the Frankfurt ghetto in 1744. Within two generations, five brothers coordinate Europe's government finance through a private courier system that moves information faster than any government — and become the prototype of every shadow-elite institution that followed" },
      { id: "rockefeller", hook: "Cross the Atlantic. The 1911 Supreme Court breakup of Standard Oil was supposed to be antitrust's great victory — it made Rockefeller substantially richer than he had been before. The lesson reshaped American institutional power for the next century" },
      { id: "vatican-jesuits", hook: "The oldest continuously operating institutional power in the Western world — two thousand years of unbroken existence, a diplomatic corps older than any nation-state, and a religious order so disciplined that no Jesuit was elected pope for 473 years until Francis broke the taboo in 2013" },
      { id: "cfr-trilateral", hook: "The Anglo-American foreign-policy establishment David Rockefeller built. Founded 1921, expanded by Trilateral in 1973, supplied the senior cabinet of every administration since Truman — and finally confessed by its principal architect in his 2002 memoirs: he stood guilty, and he was proud of it" },
    ],
  },
  {
    id: "shattered-history",
    title: "Shattered History",
    description: "The events that broke public trust — each one changed the rules",
    nodes: [
      { id: "jfk", hook: "The assassination that broke America's trust in its government — and the investigation that made it worse" },
      { id: "marilyn-monroe", hook: "She knew the Kennedys, she knew too much, and she died the way inconvenient people die around power" },
      { id: "moon-landing", hook: "Von Braun's Nazi rocket reached the Moon — but did the cameras? The hoax theory and why millions still doubt" },
      { id: "nine-eleven", hook: "The day that rewrote every rule — the Patriot Act, endless war, and questions that still have no answers" },
      { id: "epstein", hook: "A convicted pedophile with ties to presidents, princes, and intelligence agencies — the blackmail operation hiding in plain sight" },
      { id: "covid-lab-leak", hook: "The question they called a conspiracy theory in 2020 and a legitimate hypothesis by 2023" },
      { id: "dead-internet", hook: "What if most of what you read online isn't written by humans anymore?" },
      { id: "qanon", hook: "When conspiracy theories become a political movement — how 'trust the plan' captured millions" },
    ],
  },
  {
    id: "forbidden-science",
    title: "Forbidden Science",
    description: "Suppressed technology, secret weapons, and the science they don't teach",
    nodes: [
      { id: "tesla-suppressed-tech", hook: "The genius who lit the world — then the FBI seized his papers and his name was erased from textbooks" },
      { id: "philadelphia-experiment", hook: "The Navy allegedly made a ship invisible in 1943 — the sailors who survived were never the same" },
      { id: "haarp", hook: "180 antennas in Alaska that can heat the ionosphere — weather research or weather weapon?" },
      { id: "chemtrails", hook: "The government has confirmed it sprayed cities with chemicals in secret — the question is whether they stopped" },
      { id: "big-pharma", hook: "The industry that pays the largest criminal fines in history and still writes your doctor's prescriptions" },
      { id: "aids-bioweapon", hook: "Fort Detrick, the same lab that weaponized anthrax, was researching retroviruses when HIV appeared" },
      { id: "breakaway-civilization", hook: "What if 80 years of black-budget technology created a civilization so advanced it effectively left the rest of us behind?" },
    ],
  },
  {
    id: "lost-worlds",
    title: "Lost Worlds",
    description: "Before recorded history — the evidence that humanity is far older than we're told",
    nodes: [
      { id: "younger-dryas", hook: "Before any of this means anything, you need the geological frame: a comet impact at 12,800 BC, a 1,300-year cold reversal, the Pleistocene megafauna extinct in a single generation, and the destruction of a civilization the conventional account refuses to acknowledge" },
      { id: "ancient-civilizations", hook: "The textbook says civilization began 5,000 years ago — the evidence says the textbook is wrong" },
      { id: "gobekli-tepe", hook: "A 12,000-year-old temple complex built by people who supposedly couldn't farm yet — and built within decades of the Younger Dryas catastrophe ending" },
      { id: "megaliths", hook: "Stones weighing 1,000 tons, cut with laser precision, moved across continents — with no explanation of how" },
      { id: "tartaria", hook: "A civilization that appears on maps for centuries, then vanishes from history overnight" },
      { id: "atlantis", hook: "Plato called it history, not myth — a civilization destroyed in a single day, on the date that exactly matches the end of the Younger Dryas" },
      { id: "bermuda-triangle", hook: "Ships vanish, compasses spin, pilots disappear mid-transmission — and the Navy says it's nothing" },
      { id: "ancient-astronauts", hook: "Every ancient culture describes gods who came from the sky, taught them civilization, and left — what if they meant it literally?" },
      { id: "book-of-enoch", hook: "The Hebrew partner to the Sumerian Anunnaki narrative — a 600-page apocalyptic text excluded from the Christian canon in 363, preserved in Ethiopia for fourteen centuries, recovered by a Scottish traveler in 1773. The Watchers descend, the giants are born, the Flood comes" },
      { id: "nibiru", hook: "Zecharia Sitchin found a planet in Sumerian texts that modern astronomy can't account for" },
      { id: "hollow-earth", hook: "Admiral Byrd said he flew into the Earth and found a green world inside — his diary was classified" },
    ],
  },
  {
    id: "the-cosmic-question",
    title: "The Cosmic Question",
    description: "UFOs, consciousness, and the deepest question — what is reality?",
    nodes: [
      { id: "roswell", hook: "Something crashed in New Mexico in 1947 — the military said it was a weather balloon, then changed the story three times" },
      { id: "area-51", hook: "The base the government denied existed until 2013 — what else are they testing in the Nevada desert?" },
      { id: "ufos", hook: "The Pentagon admitted UAPs are real in 2017 — after 70 years of saying they weren't" },
      { id: "aatip-disclosure", hook: "December 16, 2017. The New York Times publishes the article that ends seventy years of formal institutional denial. AATIP existed. The Tic Tac videos are real. The Pentagon had been investigating UFOs the entire time it was publicly denying it" },
      { id: "project-blue-beam", hook: "And the alternative reading: what if the post-2017 disclosures are not the gradual approach to truth but the controlled rollout of a cover story for a staged event that hasn't happened yet?" },
      { id: "fermi-paradox", hook: "The universe is 13.8 billion years old with trillions of planets — so where is everybody?" },
      { id: "simulation-hypothesis", hook: "Physicists and philosophers are seriously asking: what if reality is computed?" },
      { id: "consciousness", hook: "Science can't explain why you experience anything at all — the hard problem that won't go away" },
      { id: "jung", hook: "The trained psychiatrist who descended into his own unconscious for sixteen years and emerged with a private Gnostic gospel — and who, in 1958, published the first serious psychological investigation of the UFO phenomenon" },
      { id: "altered-states", hook: "Meditation, psychedelics, near-death — what these states reveal about the nature of the mind" },
      { id: "mandela-effect", hook: "Millions of people share the same false memories — glitch in the matrix or something stranger?" },
      { id: "cern", hook: "And if reality itself is breaking — if the timeline has shifted under us — the place to look is the world's largest particle physics facility, with a two-meter bronze statue of Shiva the destroyer at its main entrance" },
    ],
  },
];
