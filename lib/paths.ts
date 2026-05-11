export interface PathNode {
  id: string;
  hook: string;
  parents?: string[];
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
      { id: "lusitania", hook: "Start earlier than you think. 1915, a British liner torpedoed off Ireland — Churchill's Room 40 had the U-boat's position and pulled the escort anyway. The WWI template for allowing an incident to drag a reluctant public into a war already decided" },
      { id: "pearl-harbor-foreknowledge", hook: "Twenty-six years later, the McCollum Memo: an eight-step plan to provoke Japan into firing the first shot. Roosevelt's inner circle knew what they were doing — the back door to war was a doctrine, not an accident", parents: ["lusitania"] },
      { id: "bay-of-pigs", hook: "April 17, 1961: 1,400 CIA-trained Cuban exiles waded ashore at Playa Giron and were destroyed in three days. Kennedy fired Dulles, Bissell, and Cabell; the institutional grievance the firing produced ran for thirty years; and the Cuban exile commando network the operation created surfaced at Watergate, at Ilopango, and in every serious investigation of the assassination two and a half years later", parents: ["pearl-harbor-foreknowledge"] },
      { id: "operation-northwoods", hook: "A signed Pentagon plan to stage attacks on Americans — declassified, real, and rejected by one man. The proximate trigger was the Bay of Pigs: with the proxy invasion broken and Mongoose failing, a manufactured pretext was the remaining path", parents: ["pearl-harbor-foreknowledge", "bay-of-pigs"] },
      { id: "operation-ajax", hook: "Nine years before Northwoods, the CIA's first coup — 1953, Tehran. The methods Kermit Roosevelt used against Mossadegh became the template for every regime-change operation that followed", parents: ["operation-northwoods"] },
      { id: "operation-gladio", hook: "Northwoods was the proposal — and Kennedy rejected it. Gladio was the same doctrine, exported to Europe, executed for forty years, killing civilians in train stations until one Italian magistrate refused to close a 1972 case", parents: ["operation-northwoods"] },
      { id: "operation-condor", hook: "Gladio went south. Six South American dictatorships coordinating kidnappings and assassinations across borders through the 1970s — 60,000 dead, Kissinger's green light documented in declassified cables", parents: ["operation-gladio"] },
      { id: "operation-glasnost", hook: "And Gladio went east. The forty-year covert campaign against the USSR — Casey's 1985 Saudi oil-price collapse cutting Soviet hard-currency earnings in half, Brzezinski's admitted Afghan trap, the CIA Book Program's ten million smuggled volumes, $50 million channeled to Solidarity through Vatican networks — culminated in the fastest voluntary surrender of empire in modern history. The General Secretary who presided over it retired into Pizza Hut commercials and Louis Vuitton print ads", parents: ["operation-gladio"] },
      { id: "gulf-of-tonkin", hook: "Northwoods had been rejected — but the doctrine survived. 1964: a fabricated naval attack, a pre-drafted resolution, and 58,000 American dead in the war that followed. McNamara admitted it in 2003", parents: ["operation-northwoods"] },
      { id: "phoenix-program", hook: "And what the war became when the conventional war was failing. 1967: with Westmoreland's attrition strategy producing casualties without victory, William Colby's CIA built a provincial-level program to identify and 'neutralize' the political cadre of the National Liberation Front. 20,587 Vietnamese killed under Colby's direction alone — and the doctrine outlived the war by forty years, exported through the School of the Americas to Pinochet's DINA and recovered as Negroponte's 'Salvador option' in Iraq in 2005", parents: ["gulf-of-tonkin"] },
      { id: "uss-liberty", hook: "An NSA SIGINT vessel attacked in broad daylight during the Six-Day War — 34 American sailors killed, rescue aircraft recalled twice, the crew silenced for forty years", parents: ["operation-northwoods"] },
      { id: "mkultra", hook: "Now that you know they'd plan false flags, learn what they actually did — 20 years of mind control experiments on unwitting citizens" },
      { id: "operation-paperclip", hook: "MKUltra's methods came from somewhere — 1,600 Nazi scientists smuggled into America with sanitized records", parents: ["mkultra"] },
      { id: "tuskegee-experiment", hook: "Forty years of watching Black men die of syphilis while withholding penicillin — proven, admitted, and the reason every subsequent medical-conspiracy belief has a factual foundation", parents: ["mkultra"] },
      { id: "project-monarch", hook: "MKUltra's alleged successor — trauma-based programming, dissociative alters, and the documentary gap that makes the theory both persistent and unprovable", parents: ["mkultra"] },
      { id: "cointelpro", hook: "It wasn't just the CIA — the FBI ran its own war against civil rights leaders, antiwar activists, and American citizens", parents: ["mkultra"] },
      { id: "operation-chaos", hook: "The CIA's illegal mirror of COINTELPRO — 300,000 Americans indexed, anti-war groups infiltrated, the domestic operations the Agency's own charter forbade", parents: ["cointelpro"] },
      { id: "operation-mockingbird", hook: "They did all this in secret because they controlled the story — CIA assets embedded in every major newsroom", parents: ["operation-paperclip", "cointelpro"] },
      { id: "cia-drugs", hook: "The pattern complete: the same agency that controlled minds and media also ran cocaine through American cities" },
      { id: "iran-contra", hook: "The 1980s made it operational — Oliver North's off-books Enterprise funded the Contras by running their cocaine into America, and Gary Webb was destroyed for reporting it", parents: ["cia-drugs"] },
      { id: "gary-webb", hook: "And here is what 'destroyed for reporting it' actually looks like. August 1996: a Pulitzer-winning investigative reporter at a regional paper publishes a forensically documented series tracing the pipeline. Within weeks the three prestige papers — Pincus at the Post, Golden at the Times, seventeen reporters at the LA Times — coordinate not against the CIA but against him. The Agency's own Inspector General vindicates the reporting two years later; nobody covers it. He is found in his Carmichael apartment in 2004 with two .38 rounds in his head, officially a suicide. The journalist who told the truth about the pattern this path has been tracing is the case study in how the pattern persists", parents: ["iran-contra", "operation-mockingbird"] },
      { id: "operation-cyclone", hook: "And the operation that won the Cold War — Casey's other portfolio, run from the same desk in the same years. July 3, 1979: Carter signs Brzezinski's finding six months before any Soviet soldier crosses the Amu Darya, the largest covert action in CIA history routing $20 billion through ISI to camps the Agency never directly touched. The trap closed a decade later — USSR exhausted, war won. The same camps produced the men who boarded planes on a September morning twelve years after", parents: ["iran-contra", "operation-glasnost"] },
      { id: "rex-84", hook: "And the endgame: Oliver North's other project, the classified plan to suspend the Constitution and detain citizens in an emergency. Jack Brooks tried to ask about it and Inouye cut him off on live TV", parents: ["iran-contra"] },
    ],
  },
  {
    id: "the-architecture",
    title: "The Architecture",
    description: "You've seen what they did — now understand how the machine actually works",
    nodes: [
      { id: "control-systems", hook: "Before going deeper, learn the framework — how invisible systems shape what entire populations think and never question" },
      { id: "bernays", hook: "Now meet the founder. The nephew of Sigmund Freud who openly described his profession as the engineering of mass consent — and lived to see his books used by Joseph Goebbels, never quite disavowing the methodology" },
      { id: "color-revolutions", hook: "Bernays went geopolitical. Serbia 2000, Georgia 2003, Ukraine 2004 — NED and USAID funding 'spontaneous' democratic movements that kept producing US-aligned governments", parents: ["bernays"] },
      { id: "counterculture-psyop", hook: "Even rebellion can be manufactured — how the 1960s counterculture was steered by the same agencies you just read about", parents: ["bernays"] },
      { id: "celebrity-27-club", hook: "And how the manufactured counterculture ended — Jones, Hendrix, Joplin, Morrison dead within twenty-five months, each case with forensic anomalies nobody would investigate. The cleanup phase of the same operation", parents: ["counterculture-psyop"] },
      { id: "deep-state", hook: "These operations survived every election because the real government is permanent — the bureaucracy behind the elected faces", parents: ["bernays"] },
      { id: "shadow-elite", hook: "Someone runs the deep state — the network of families, funds, and foundations that sit above governments", parents: ["counterculture-psyop", "deep-state"] },
      { id: "federal-reserve", hook: "Follow the money — a private institution that controls the dollar, created in a secret meeting on Jekyll Island" },
      { id: "mass-surveillance", hook: "Money gives them power, surveillance gives them knowledge — PRISM, Five Eyes, and the end of privacy" },
      { id: "predictive-programming", hook: "They don't just control the news — they script the future through fiction. The Lone Gunmen aired a plane hitting the WTC six months before 9/11" },
      { id: "bilderberg", hook: "Where do they coordinate? Annual closed-door meetings of 130 of the world's most powerful people, no press allowed", parents: ["predictive-programming"] },
      { id: "bohemian-grove", hook: "Where do they socialize? A private campground where presidents and CEOs perform rituals before a 40-foot owl", parents: ["predictive-programming"] },
      { id: "denver-airport", hook: "Where do they build? A $4.8 billion airport with Masonic capstones, apocalyptic murals, and underground tunnels nobody can explain", parents: ["predictive-programming"] },
    ],
  },
  {
    id: "the-hidden-hand",
    title: "The Hidden Hand",
    description: "The networks behind the networks — secret societies from the Templars to today",
    nodes: [
      { id: "secret-societies", hook: "Power has always organized in the dark — from mystery schools in Egypt to boardrooms in Manhattan" },
      { id: "pythagoras", hook: "And the founding Greek prototype. A sixth-century BC philosopher who spent twenty-two years studying with the Egyptian priesthood, twelve more in Babylon, then returned west to found a sworn brotherhood at Croton — combining mathematics, music, dietary discipline, and the doctrine that all reality is number. Every Western secret society that followed is operating on a model the Pythagorean brotherhood originated" },
      { id: "knights-templar", hook: "The original Christian-era template: a military order that became the richest organization in Europe, then was destroyed in a single day" },
      { id: "holy-grail", hook: "What were the Templars really guarding? The Grail isn't a cup — it might be a bloodline, a secret, or a technology", parents: ["knights-templar"] },
      { id: "hermetic-tradition", hook: "The philosophy that runs beneath all secret societies — 'as above, so below' and the hidden structure of reality", parents: ["knights-templar"] },
      { id: "freemasonry", hook: "The network that survived the Templars — from cathedral builders to the men who designed Washington D.C.", parents: ["holy-grail", "hermetic-tradition"] },
      { id: "sacred-geometry", hook: "The hidden language encoded in temples, cathedrals, and corporate logos — mathematics as the signature of the initiated", parents: ["freemasonry"] },
      { id: "illuminati", hook: "Founded in 1776, suppressed in 1785, allegedly still operating — the conspiracy that spawned all other conspiracies", parents: ["freemasonry"] },
      { id: "skull-and-bones", hook: "Fifteen Yale seniors per year, three presidents, multiple CIA directors — the most powerful secret society in America, hiding in plain sight since 1832", parents: ["illuminati"] },
      { id: "saturn-black-cube", hook: "Saturn devoured his children. His symbol is the Black Cube. His hexagon is on the planet's pole. And his worship may never have stopped", parents: ["sacred-geometry", "skull-and-bones"] },
      { id: "thule-vril", hook: "The twentieth-century worked example of what every secret-society claim gestures toward. A small Munich occult order, 250 members in 1918, whose Ariosophical substrate incubated the DAP that became the NSDAP — and whose scientific-occult establishment's postwar fate, through Paperclip and the black budget, is still not fully accounted for", parents: ["illuminati"] },
      { id: "new-world-order", hook: "The alleged endgame of every secret society — a single world government, one currency, total control" },
      { id: "reptilian-elite", hook: "David Icke's claim that the global elite are inter-dimensional shapeshifters — the conspiracy theory the conspiracy theorists call too far, but which keeps surfacing in the strangest places", parents: ["new-world-order"] },
      { id: "great-reset", hook: "The NWO rebranded for the 21st century — the World Economic Forum's published plan for restructuring global civilization", parents: ["new-world-order"] },
    ],
  },
  {
    id: "the-dynasties",
    title: "The Dynasties",
    description: "The families and institutions that operate across centuries — multi-generational supranational power, documented in the historical record",
    nodes: [
      { id: "rothschild", hook: "Begin in the Frankfurt ghetto in 1744. Within two generations, five brothers coordinate Europe's government finance through a private courier system that moves information faster than any government — and become the prototype of every shadow-elite institution that followed" },
      { id: "rockefeller", hook: "Cross the Atlantic. The 1911 Supreme Court breakup of Standard Oil was supposed to be antitrust's great victory — it made Rockefeller substantially richer than he had been before. The lesson reshaped American institutional power for the next century" },
      { id: "vatican-jesuits", hook: "The oldest continuously operating institutional power in the Western world — two thousand years of unbroken existence, a diplomatic corps older than any nation-state, and a religious order so disciplined that no Jesuit was elected pope for 473 years until Francis broke the taboo in 2013", parents: ["rockefeller"] },
      { id: "cfr-trilateral", hook: "The Anglo-American foreign-policy establishment David Rockefeller built. Founded 1921, expanded by Trilateral in 1973, supplied the senior cabinet of every administration since Truman — and finally confessed by its principal architect in his 2002 memoirs: he stood guilty, and he was proud of it", parents: ["rockefeller"] },
      { id: "schwab-wef", hook: "And the contemporary continuation. Klaus Schwab founded the European Management Forum at Davos in 1971, two years before David Rockefeller founded Trilateral — and built it across fifty-three years into the World Economic Forum, whose Young Global Leaders program, in Schwab's own 2017 Harvard words, has penetrated the cabinets of national governments", parents: ["vatican-jesuits", "cfr-trilateral"] },
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
      { id: "twa-flight-800", hook: "July 1996: 258 eyewitnesses reported a streak of light rising toward the aircraft. The NTSB ruled a spontaneous fuel-tank explosion — the first time in history that finding was used for a 747" },
      { id: "waco", hook: "April 1993: 51 days, 76 dead including 25 children, pyrotechnic rounds denied for years, and the front door that would have shown who fired first — missing" },
      { id: "oklahoma-city", hook: "Two years later, to the day. McVeigh chose April 19 because it was the anniversary of Waco. The bombing that produced the 1996 Antiterrorism Act — the Patriot Act's direct precursor", parents: ["waco"] },
      { id: "nine-eleven", hook: "The day that rewrote every rule — the Patriot Act, endless war, and questions that still have no answers" },
      { id: "sandy-hook", hook: "The moment the crisis-actor theory became the dominant conspiracy framework — and the case that produced a $1.5 billion defamation verdict against Alex Jones", parents: ["nine-eleven"] },
      { id: "boston-marathon", hook: "The FBI had interviewed Tamerlan Tsarnaev two years before — at Russia's request — and cleared him. Then came the first warrantless lockdown of an entire American city", parents: ["nine-eleven"] },
      { id: "mh370", hook: "A Boeing 777 with 239 people vanishes without surveillance trace in the age of total surveillance. The most expensive search in aviation history found nothing conclusive", parents: ["nine-eleven"] },
      { id: "las-vegas-shooting", hook: "60 dead, 867 injured, and the FBI closed the largest mass shooting in modern US history with 'no motive determined' after a 20-month investigation", parents: ["nine-eleven"] },
      { id: "epstein", hook: "A convicted pedophile with ties to presidents, princes, and intelligence agencies — the blackmail operation hiding in plain sight", parents: ["nine-eleven"] },
      { id: "seth-rich", hook: "A DNC staffer murdered in DC at 4 AM, nothing stolen — and WikiLeaks offering $20,000 for information. The hack-vs-leak question the intelligence community had the metadata to answer but didn't", parents: ["epstein"] },
      { id: "covid-lab-leak", hook: "The question they called a conspiracy theory in 2020 and a legitimate hypothesis by 2023", parents: ["nine-eleven"] },
      { id: "dead-internet", hook: "What if most of what you read online isn't written by humans anymore?", parents: ["covid-lab-leak"] },
      { id: "pizzagate", hook: "The 2016 conspiracy that walked a man with an AR-15 into a DC pizzeria, looking for a basement that didn't exist — the precursor that taught the conspiracy theorist class how viral suspicion converts to physical action", parents: ["epstein"] },
      { id: "qanon", hook: "When conspiracy theories become a political movement — how 'trust the plan' captured millions", parents: ["epstein", "pizzagate"] },
      { id: "election-fraud", hook: "From Tammany Hall to Diebold to Dominion — a century of allegations that the infrastructure of democracy is itself the vulnerability", parents: ["qanon"] },
    ],
  },
  {
    id: "the-kill-list",
    title: "The Kill List",
    description: "The pattern of political assassinations — each a 'lone gunman,' each with a story the evidence refuses to confirm",
    nodes: [
      { id: "marilyn-monroe", hook: "Start 15 months before Dallas. The actress who knew too much about the Kennedys, found dead in her home — the template for deaths officially ruled self-inflicted despite the forensic questions" },
      { id: "jfk", hook: "November 22, 1963 — the assassination that every subsequent political killing would be measured against, and the Warren Commission that set the template for managed investigations" },
      { id: "malcolm-x", hook: "February 1965. FBI and NYPD informants were at the Audubon Ballroom when it happened — a fact buried for 56 years, until the 2021 DA exoneration forced a partial reckoning", parents: ["jfk"] },
      { id: "mlk-assassination", hook: "April 4, 1968. The 1999 King family civil trial produced a jury verdict finding government agencies guilty of conspiracy — a verdict the media never reported and the DOJ quickly dismissed", parents: ["malcolm-x"] },
      { id: "rfk-assassination", hook: "Two months later. Thomas Noguchi's autopsy showed the fatal shots came from behind at point-blank range — while Sirhan was in front. The case the LAPD destroyed its own evidence on", parents: ["mlk-assassination"] },
      { id: "john-lennon", hook: "1980. Mark David Chapman's YMCA/World Vision background, his unexplained funds, and his psychiatric profile fit the documented pattern of programmed assassins Fenton Bresler traced for a decade", parents: ["rfk-assassination"] },
      { id: "princess-diana", hook: "1997, Paris. Richard Tomlinson's affidavit describing an MI6 strobe-light assassination proposal matched the specifics of the Pont de l'Alma crash three years later", parents: ["john-lennon"] },
      { id: "tupac-biggie", hook: "1996-97. LAPD officers on Death Row Records' payroll, the Rampart scandal, Russell Poole's investigation shut down by his own department — the intersection of COINTELPRO's legacy with the crack economy", parents: ["princess-diana"] },
      { id: "celebrity-27-club", hook: "Zoom out. The pattern that links Brian Jones, Hendrix, Joplin, Morrison, and Cobain — counterculture voices dying at the same age, each case with the same forensic irregularities", parents: ["tupac-biggie"] },
      { id: "kurt-cobain", hook: "1994. 1.52 mg/L of morphine in his blood — three times lethal — making it physically impossible to pick up a shotgun. Tom Grant's investigation, ignored by the Seattle PD for thirty years", parents: ["celebrity-27-club"] },
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
      { id: "flat-earth", hook: "The hypothesis that NASA, every government, and every airline pilot are colluding to hide a flat Earth — the limit case for what 'they could be lying about anything' looks like at the extreme", parents: ["chemtrails"] },
      { id: "big-pharma", hook: "The industry that pays the largest criminal fines in history and still writes your doctor's prescriptions", parents: ["chemtrails"] },
      { id: "aids-bioweapon", hook: "Fort Detrick, the same lab that weaponized anthrax, was researching retroviruses when HIV appeared", parents: ["chemtrails"] },
      { id: "breakaway-civilization", hook: "What if 80 years of black-budget technology created a civilization so advanced it effectively left the rest of us behind?", parents: ["big-pharma", "aids-bioweapon"] },
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
      { id: "tartaria", hook: "A civilization that appears on maps for centuries, then vanishes from history overnight", parents: ["megaliths"] },
      { id: "plato", hook: "The original source for Atlantis. Plato wrote it as history, not myth — and named a destruction date that exactly matches the geological end of the Younger Dryas the path opened with", parents: ["megaliths"] },
      { id: "atlantis", hook: "Plato called it history, not myth — a civilization destroyed in a single day, on the date that exactly matches the end of the Younger Dryas", parents: ["megaliths", "plato"] },
      { id: "piri-reis-map", hook: "A 1513 Ottoman chart, rediscovered in Topkapı Palace in 1929, whose southern coastline Charles Hapgood identified as the subglacial topography of Queen Maud Land. If he's right, somebody surveyed Antarctica before the ice — and Einstein wrote the foreword endorsing the framework", parents: ["atlantis"] },
      { id: "bermuda-triangle", hook: "Ships vanish, compasses spin, pilots disappear mid-transmission — and the Navy says it's nothing", parents: ["tartaria", "atlantis"] },
      { id: "ancient-astronauts", hook: "Every ancient culture describes gods who came from the sky, taught them civilization, and left — what if they meant it literally?", parents: ["tartaria", "atlantis"] },
      { id: "book-of-enoch", hook: "The Hebrew partner to the Sumerian Anunnaki narrative — a 600-page apocalyptic text excluded from the Christian canon in 363, preserved in Ethiopia for fourteen centuries, recovered by a Scottish traveler in 1773. The Watchers descend, the giants are born, the Flood comes", parents: ["ancient-astronauts"] },
      { id: "nibiru", hook: "Zecharia Sitchin found a planet in Sumerian texts that modern astronomy can't account for", parents: ["book-of-enoch"] },
      { id: "hollow-earth", hook: "Admiral Byrd said he flew into the Earth and found a green world inside — his diary was classified", parents: ["bermuda-triangle"] },
      { id: "operation-high-jump", hook: "And his alleged Antarctic expedition of 1946-47 — 4,700 men, 13 ships, an operation that ended weeks early for reasons the Navy never adequately explained, and the El Mercurio interview where Byrd spoke of 'flying objects that could fly from pole to pole at tremendous speed'", parents: ["hollow-earth"] },
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
      { id: "skinwalker-ranch", hook: "Underneath AAWSAP, on 480 acres of Utah cattle ranch, sat the actual phenomenon Bigelow had been investigating for eleven years before Reid wrote the appropriations. The Pentagon's $22 million did not start with Tic Tac sightings off San Diego — it started with mutilated cattle, a wolf-thing that would not die, and a Northern Ute oral tradition about cursed land", parents: ["aatip-disclosure"] },
      { id: "project-blue-beam", hook: "And the alternative reading: what if the post-2017 disclosures are not the gradual approach to truth but the controlled rollout of a cover story for a staged event that hasn't happened yet?" },
      { id: "fermi-paradox", hook: "The universe is 13.8 billion years old with trillions of planets — so where is everybody?", parents: ["project-blue-beam"] },
      { id: "simulation-hypothesis", hook: "Physicists and philosophers are seriously asking: what if reality is computed?", parents: ["project-blue-beam"] },
      { id: "consciousness", hook: "Science can't explain why you experience anything at all — the hard problem that won't go away", parents: ["fermi-paradox", "simulation-hypothesis"] },
      { id: "hard-problem", hook: "Chalmers posed it in 1995: why is there something it is like to be you? Three decades later, no theory of consciousness has answered it", parents: ["consciousness"] },
      { id: "materialism", hook: "The default view of working scientists: consciousness is what the brain does, the hard problem is a confusion of language. The position that has to keep explaining itself", parents: ["hard-problem"] },
      { id: "dualism", hook: "Mind and matter are two different kinds of stuff — the position Descartes formalized and modern philosophy never quite buried", parents: ["hard-problem"] },
      { id: "idealism", hook: "Reverse the direction: matter is what consciousness perceives, not the other way. The view that has more serious defenders today than at any point in the last century", parents: ["hard-problem"] },
      { id: "panpsychism", hook: "The compromise that's gaining ground: consciousness is fundamental like mass or charge — present in every particle, complex where brains organize it", parents: ["hard-problem"] },
      { id: "dennett", hook: "The defender-in-chief of materialism for forty years. His position: the hard problem is an illusion produced by introspection looking the wrong way", parents: ["materialism"] },
      { id: "epicureanism", hook: "Materialism is older than you think — Epicurus on swerving atoms in 300 BC, the school that anticipated atomic theory and prescribed the death of fear as the goal of philosophy", parents: ["materialism"] },
      { id: "descartes", hook: "'I think therefore I am' is the line everyone remembers. The real legacy is the wedge driven between mind and matter that the West has been trying to remove for four centuries", parents: ["dualism"] },
      { id: "kant", hook: "Phenomena vs noumena: we never see reality directly, only the model our minds construct out of it. The architect of every modern argument that perception is structured before it reaches you", parents: ["idealism"] },
      { id: "jung", hook: "The trained psychiatrist who descended into his own unconscious for sixteen years and emerged with a private Gnostic gospel — and who, in 1958, published the first serious psychological investigation of the UFO phenomenon", parents: [] },
      { id: "altered-states", hook: "Meditation, psychedelics, near-death — what these states reveal about the nature of the mind", parents: ["jung"] },
      { id: "stoicism", hook: "Marcus Aurelius wrote his Meditations as a practice, not a book. The discipline of mind as the only freedom that can't be taken — and the cognitive technique that became modern CBT two thousand years later", parents: ["altered-states"] },
      { id: "mandela-effect", hook: "Millions of people share the same false memories — glitch in the matrix or something stranger?", parents: ["altered-states"] },
      { id: "cern", hook: "And if reality itself is breaking — if the timeline has shifted under us — the place to look is the world's largest particle physics facility, with a two-meter bronze statue of Shiva the destroyer at its main entrance", parents: ["mandela-effect"] },
      { id: "nature-of-time", hook: "Physics treats past, present, and future as equally real — the block universe. So why does only the present feel like anything? The deepest open question in fundamental physics", parents: ["cern"] },
    ],
  },
];

if (process.env.NODE_ENV !== "production") {
  for (const path of READING_PATHS) {
    const seen = new Set<string>();
    let hasRoot = false;
    for (const node of path.nodes) {
      if (seen.has(node.id)) {
        throw new Error(
          `[paths] duplicate node id "${node.id}" in path "${path.id}"`
        );
      }
      if (node.parents) {
        if (node.parents.includes(node.id)) {
          throw new Error(
            `[paths] node "${node.id}" in path "${path.id}" lists itself as a parent`
          );
        }
        for (const parent of node.parents) {
          if (!seen.has(parent)) {
            throw new Error(
              `[paths] node "${node.id}" in path "${path.id}" references unknown or out-of-order parent "${parent}"`
            );
          }
        }
        if (node.parents.length === 0) {
          hasRoot = true;
        }
      } else if (seen.size === 0) {
        hasRoot = true;
      }
      seen.add(node.id);
    }
    if (!hasRoot) {
      throw new Error(`[paths] path "${path.id}" has no root node`);
    }
  }
}
