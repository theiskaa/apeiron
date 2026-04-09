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
    description: "Start with the proven — six declassified operations that show the pattern",
    nodes: [
      { id: "operation-northwoods", hook: "A signed Pentagon plan to stage attacks on Americans — declassified, real, and rejected by one man" },
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
      { id: "ancient-civilizations", hook: "The textbook says civilization began 5,000 years ago — the evidence says the textbook is wrong" },
      { id: "gobekli-tepe", hook: "A 12,000-year-old temple complex built by people who supposedly couldn't farm yet" },
      { id: "megaliths", hook: "Stones weighing 1,000 tons, cut with laser precision, moved across continents — with no explanation of how" },
      { id: "tartaria", hook: "A civilization that appears on maps for centuries, then vanishes from history overnight" },
      { id: "atlantis", hook: "Plato called it history, not myth — a civilization that preceded all others and was destroyed in a single day" },
      { id: "bermuda-triangle", hook: "Ships vanish, compasses spin, pilots disappear mid-transmission — and the Navy says it's nothing" },
      { id: "ancient-astronauts", hook: "Every ancient culture describes gods who came from the sky, taught them civilization, and left — what if they meant it literally?" },
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
      { id: "fermi-paradox", hook: "The universe is 13.8 billion years old with trillions of planets — so where is everybody?" },
      { id: "simulation-hypothesis", hook: "Physicists and philosophers are seriously asking: what if reality is computed?" },
      { id: "consciousness", hook: "Science can't explain why you experience anything at all — the hard problem that won't go away" },
      { id: "altered-states", hook: "Meditation, psychedelics, near-death — what these states reveal about the nature of the mind" },
      { id: "mandela-effect", hook: "Millions of people share the same false memories — glitch in the matrix or something stranger?" },
    ],
  },
];
