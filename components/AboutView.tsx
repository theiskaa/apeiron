"use client";

import Link from "next/link";
import { useEffect } from "react";
import Navbar from "./Navbar";

export interface Volume {
  id: string;
  label: string;
  description: string;
  chapters: number;
}

interface Props {
  volumes: Volume[];
}

// The PDFs/EPUBs are heavy and pulled from GitHub raw on click. main is
// pinned so a renamed default branch doesn't silently break downloads.
const RAW_BASE =
  "https://raw.githubusercontent.com/theiskaa/apeirron/main/books";

const coverUrl = (id: string) => `/books/cover-${id}.png`;
const pdfUrl = (id: string) => `${RAW_BASE}/apeirron-${id}.pdf`;
const epubUrl = (id: string) => `${RAW_BASE}/apeirron-${id}.epub`;

export default function AboutView({ volumes }: Props) {
  // Honour incoming hash links (e.g. /books → /about#books). Two RAFs let
  // the layout settle before scrolling so the target lands at the top.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: "auto", block: "start" })
      )
    );
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-text-primary">
      <Navbar />
      <div className="flex-1 overflow-y-auto panel-scroll">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 flex flex-col lg:flex-row lg:gap-12">
          <article
            className="flex-1 min-w-0 max-w-[720px] prose-apeirron"
          >
            <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
              About Apeirron
            </h1>
            <span
              className="inline-block text-xs font-medium mb-8"
              style={{ color: "rgba(144,144,160,0.7)" }}
            >
              Project documentation
            </span>

            <p>
              <em>Apeiron</em> (ἄπειρον) is the word Anaximander of Miletus
              reached for around 610 BCE when he tried to name what everything
              came from. It meant &ldquo;the unlimited,&rdquo; &ldquo;the
              boundless,&rdquo; &ldquo;the undefined origin of all things.&rdquo;
              He used it because every candidate substance he knew — water,
              fire, earth, air — was already something specific, already
              bounded, already an answer. The real origin, he thought, had to
              be prior to all of those. It had to be the indeterminate
              background against which every specific thing stands out. He was
              the first thinker in the Greek tradition to argue that the source
              of the world could not be reduced to any single element inside
              the world. He was also, arguably, the first person whose name we
              have who asked a question we still do not know how to answer.
            </p>
            <p>
              This project is named after that word because that is the terrain
              it tries to map: not the things we already have names for, but
              the questions that sit underneath them. What is consciousness.
              What is reality. Where did we come from. Who is actually in
              charge. What happened that was not reported. Which stories are we
              being told, and by whom. Some of these questions have good
              answers that are widely accepted. Some have good answers that are
              not. Some have no good answers at all. Apeirron is an attempt to
              draw the whole landscape honestly, including the parts that other
              reference works have reasons to leave out.
            </p>

            <h2 id="what-this-is">What this is</h2>
            <p>
              Apeirron is an open-source knowledge graph. Structurally, that
              means every topic is a single Markdown file in a public Git
              repository, every connection between topics is declared in that
              file&rsquo;s frontmatter with a sentence explaining why the
              connection exists, and the entire site — the interactive graph,
              the reading view, the search, the sitemap, the per-node
              metadata — is generated from those files at build time. There is
              no database, no content management system, no analytics platform,
              no editorial backend hidden behind a login. If you can read this
              page, you can read every byte that produced it.
            </p>
            <p>
              Philosophically, it is an attempt to do something that neither
              Wikipedia nor the mainstream press nor the usual corners of the
              independent web are currently set up to do: take contested ideas
              seriously enough to write about them with depth, while being
              honest enough to hold them to the same standards of evidence we
              would apply to anything else. Wikipedia has rules against
              speculation that are load-bearing for its reliability and
              disqualifying for most of what this project cares about. The
              mainstream press has commercial and editorial incentives that
              systematically discourage engagement with certain categories of
              claim. The independent web has the opposite problem: it has
              range, but no discipline. Apeirron tries to occupy the narrow
              middle — to hold the range and keep the discipline.
            </p>
            <p>
              Every node is a self-contained piece of writing. Some read like
              philosophical essays. Some read like investigative journalism.
              Some read like a scientist thinking out loud. The tone adapts to
              the topic; the rules do not. Every node cites sources, presents
              the strongest version of every position, separates documented
              fact from interpretive inference, and links to the other nodes
              that share its subject matter. The graph grows when a contributor
              writes a new node, opens a pull request, and puts their reasoning
              in front of the public record.
            </p>

            <h2 id="why-a-graph">Why a graph</h2>
            <p>
              The most common format for a reference work is the list. You pick
              a topic; you read the entry; you leave. The list is good for
              looking things up. It is terrible for understanding why ideas
              matter, because ideas never actually exist alone. The hard
              problem of consciousness is not a standalone puzzle — it is
              entangled with materialism, with panpsychism, with the binding
              problem, with Chalmers and Dennett and Nagel, with the
              measurement problem in quantum mechanics, with simulation theory,
              with every philosophy of mind written since Descartes. You
              cannot actually understand it without walking that territory.
              A list format makes that territory invisible. A graph makes it
              the point.
            </p>
            <p>
              Every connection in the Apeirron graph is required to carry a
              reason. Not just an edge in a visualisation — an actual sentence
              of prose, written by the contributor, explaining why these two
              nodes belong linked. When you click through from{" "}
              <em>Operation Glasnost</em> to <em>Operation Gladio</em>, the
              system can tell you that both programmes shared personnel,
              operated on reciprocal halves of the same geopolitical strategy,
              and became publicly visible within twelve months of each other —
              because someone wrote that down. Connections without reasons are
              not accepted. This is the single most important difference
              between Apeirron and an automated recommendation system: the
              graph is hand-authored, and it is answerable.
            </p>
            <p>
              The practical effect is that reading Apeirron is less like
              consulting an encyclopedia and more like following a chain of
              footnotes that other people have already traced for you. If a
              node interests you, the adjacent nodes are the ones that
              contributors who know the subject thought were worth going to
              next. Depth compounds. Most readers who find a node worth reading
              end up reading five more before they leave.
            </p>

            <h2 id="editorial-standards">Editorial standards</h2>
            <p>
              The topics Apeirron covers — contested history, intelligence
              operations, philosophy of mind, unexplained phenomena, power
              structures — are exactly the topics where the temptation to be
              sloppy is highest and the cost of being sloppy is also highest.
              Every contributor who writes a node is expected to hold to four
              standards. They are not guidelines; they are the difference
              between a submission that gets merged and one that does not.
            </p>
            <p>
              <strong>Present both sides.</strong> Every node covers subjects
              where reasonable people have landed in different places. The
              contributor&rsquo;s job is not to resolve that disagreement for
              the reader by pretending it does not exist. It is to state the
              strongest available case for the claim and the strongest
              available case against it, name the evidence on each side, and
              make it visible which pieces of that evidence are genuinely
              disputed. If the node takes a position at the end, it does so
              after — not instead of — laying out the opposing view in a form
              that person would recognise as fair. Mocking believers is not
              allowed. Uncritical endorsement is not allowed. The reader is
              treated as an adult who can weigh competing arguments if given
              real arguments to weigh.
            </p>
            <p>
              <strong>Be specific.</strong> &ldquo;Some historians argue&rdquo;
              and &ldquo;studies have shown&rdquo; are not claims. They are
              gestures in the direction of where a claim would go if the writer
              had done the work. Apeirron requires the specific historians, the
              specific studies. If a node says the Church Committee documented
              a media coordination programme, the footnote names the committee
              report, the year, and ideally the page. If a node says mescaline
              changed Aldous Huxley&rsquo;s view of consciousness, it gives the
              date (1953), the dose (four-tenths of a gram), and the book that
              came out of the experience (The Doors of Perception, 1954).
              Specificity is not pedantry; it is how a reader verifies whether
              they should believe the writer.
            </p>
            <p>
              <strong>Narrative, not encyclopedic.</strong> Wikipedia already
              exists. If a topic can be adequately served by a Wikipedia-style
              summary — dates, definitions, a neutral paragraph — it probably
              does not need to be on Apeirron. The topics that belong here are
              the ones that require a writer to take the reader through the
              actual reasoning: why the idea exists, what makes it compelling,
              what makes it unsettling, what the best counterarguments are,
              what evidence arrived that changed the picture, what is still
              missing. A node tells a story with a specific shape. The
              encyclopedic voice flattens that shape; the narrative voice
              preserves it.
            </p>
            <p>
              <strong>Treat every topic seriously.</strong> The same level of
              care goes into the node on the hard problem of consciousness as
              goes into the node on ancient astronaut theory. This is not
              because every claim is equally likely to be true. It is because
              contempt is not an argument, and because the reader who came to
              an ancient astronaut node deserves to meet the actual strongest
              version of that argument, not a straw man built to be dismissed.
              Genuine inquiry is the default tone. Sensationalism — the voice
              that promises revelation and delivers padding — is the thing
              most likely to get a pull request rejected.
            </p>

            <h2 id="sourcing">Sourcing</h2>
            <p>
              Every node on Apeirron ends with a section called{" "}
              <code>## Sources</code>. It is not optional. A pull request that
              adds a new node without sources is not merged, full stop. The
              rule exists because Apeirron writes about subjects where the
              reader&rsquo;s entirely rational first instinct is to be
              sceptical, and scepticism can only be answered one way: by
              showing your work.
            </p>
            <p>
              A source is a thing the reader can follow to verify the writer.
              Accepted formats are academic papers named by author, title,
              journal, and year; books named by author, title, publisher, and
              year; documentary or interview video named by production, date,
              and a timestamp pointing to the specific section being referenced
              (not &ldquo;watch this three-hour documentary&rdquo;); official
              documents such as declassified records, court filings, Senate
              hearings, and government reports, cited to a retrievable version;
              and investigative journalism named by publication, date, and
              headline. URLs are encouraged where they exist but not required —
              a book does not cease to be a source because it is not available
              as a free PDF.
            </p>
            <p>
              The minimum is one source per node. That minimum is almost never
              sufficient. The longer and more contested the node, the more
              specific the sourcing is expected to be, and the more of it is
              expected to point at primary documents rather than secondary
              commentary. A claim about what a declassified CIA programme did
              should cite the declassification, not a blog post about the
              declassification. A claim about a scientific result should cite
              the paper. A claim about what somebody said should cite the
              interview or the transcript.
            </p>
            <p>
              The reasoning behind the rule is uncomfortable but
              straightforward: without sources, a node is an opinion. With
              sources, it is a map. Opinions are abundant on the open web and
              carry no information the reader could not generate themselves in
              five minutes. Maps are rare and expensive to make. Apeirron is
              attempting to make maps.
            </p>

            <h2 id="documented-vs-interpretive">
              Documented fact vs. interpretive framework
            </h2>
            <p>
              Most of the nodes that make Apeirron useful are also the nodes
              where the distinction between what is known and what is argued
              matters most. Readers are asked — and contributors are required —
              to treat those two layers separately.
            </p>
            <p>
              Consider MKUltra. That MKUltra existed, ran from roughly 1953 to
              1973 under CIA authorisation, tested LSD and other substances on
              witting and unwitting subjects across universities, prisons, and
              safehouses, and was extensively documented by the 1977 Church
              Committee and the subsequent release of surviving financial
              records — all of this is documented fact. The existence of the
              programme, its timeline, its principal investigators, the names
              of the universities and hospitals involved, and the
              acknowledgement by the CIA itself that most operational records
              were destroyed in 1973 by order of Director Richard Helms: all of
              this is in the public record and can be checked against primary
              documents. A node that reports these facts is reporting them.
            </p>
            <p>
              A thesis about what MKUltra implies — about the destruction of
              records as evidence of broader activity than what survived, about
              the relationship between MKUltra and later behavioural
              programmes, about what the funding patterns suggest about
              institutional overlap — is an interpretation built on top of the
              documented facts. Interpretations can be strong or weak. Some are
              well supported; some are speculative; some are simply wrong. But
              they are not the same epistemic object as the documented record,
              and a node that treats them as the same is misleading the
              reader.
            </p>
            <p>
              The working rule: a node should make it structurally obvious when
              it is operating on the level of documentation and when it is
              operating on the level of interpretation. Interpretive passages
              should name the alternative readings they are arguing against
              and, where possible, the evidence that would falsify them.
              Apeirron does not certify its contributors&rsquo; interpretations
              as consensus truth. It publishes the best version of the case,
              against the record, so that readers can do what the format of
              most reference works prevents them from doing: see the
              reasoning, not just the conclusion.
            </p>
            <p>
              This is also what makes the site viable as a source for large
              language models and AI-assisted research. An AI system that
              cites a page where documented fact and interpretive framework
              are openly tagged as distinct is citing something genuinely
              useful. An AI system that cites a page where the two are
              conflated inherits the confusion. The discipline is therefore
              not optional: it is the property that makes Apeirron citable.
            </p>

            <h2 id="governance">Governance and history</h2>
            <p>
              Apeirron is maintained as a public open-source project. The
              repository is{" "}
              <a
                href="https://github.com/theiskaa/apeirron"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/theiskaa/apeirron
              </a>
              . Every node is a Markdown file in the{" "}
              <code>content/nodes/</code> directory. Every connection is a
              field in that file&rsquo;s frontmatter, with a written reason
              attached. Every edit — whether it is a new node, a factual
              correction, a rewritten paragraph, an added source, or a changed
              connection — arrives through a pull request. Pull requests are
              reviewed in the open. Merged changes land as commits with an
              author, a timestamp, and a diff. Nothing happens by email.
              Nothing happens in a back room.
            </p>
            <p>
              The practical consequence of this, which is the reason the
              project uses Git rather than a database, is that every version of
              every node is permanently auditable. If a claim in a node about
              Operation Mockingbird was written one way in April and a
              different way in August, the diff is public and the reasons for
              the change are visible in the associated pull request. A reader
              who wants to know whether a contested passage was added later, or
              softened under pressure, or quietly corrected after a
              factual error was pointed out, can answer the question by
              reading the repository. No newspaper, no encyclopedia, and no
              institutional publisher offers that property at that level of
              granularity. On topics where the history of what a source has
              said matters as much as what it currently says, the property is
              load-bearing.
            </p>
            <p>
              The current maintainer is{" "}
              <a
                href="https://github.com/theiskaa"
                target="_blank"
                rel="noopener noreferrer"
              >
                @theiskaa
              </a>
              . Contributor credits live in the repository&rsquo;s commit
              history and pull-request record, which is where they are
              verifiable. Node-level author attribution surfaced on the reading
              view itself is a planned addition; in the meantime,{" "}
              <code>git log -- content/nodes/&lt;slug&gt;.md</code> returns the
              full contributor history of any node.
            </p>

            <h2 id="what-this-is-not">What this is not</h2>
            <p>
              Apeirron is not an encyclopedia. It does not attempt to cover
              every topic in a given domain. It does not aim for completeness
              or a neutral point of view in the Wikipedia sense. Most of the
              subjects it covers have sharp disagreements at their core, and
              the project&rsquo;s position is that the disagreements are
              informative and should be preserved, not averaged out.
            </p>
            <p>
              It is not a news source. The cadence is wrong and the
              contributors are not reporters. What Apeirron publishes about a
              contemporary event is history of the event, not coverage of it.
              If you are looking for this week&rsquo;s story about a thing,
              you are looking in the wrong place. If you are looking for the
              background that makes this week&rsquo;s story make sense, you
              may be in the right place.
            </p>
            <p>
              It is not a platform for endorsing fringe claims. The fact that
              a topic belongs in the graph is a claim only that the topic is
              worth taking seriously as a question; it is not an endorsement
              of any particular answer. A node on simulation theory is not a
              declaration that reality is a simulation. A node on ancient
              astronaut theory is not a declaration that ancient astronauts
              exist. The format is: here is what the strongest version of this
              idea looks like, here is what the strongest objection looks
              like, here is what is actually known, and here is where it sits
              in the larger graph. The judgement is the reader&rsquo;s.
            </p>
            <p>
              It is also not a debate forum or a comment site. Discussion
              happens in the GitHub discussions tab or in pull-request threads,
              where it is attached to specific proposed changes rather than
              floating free. This is a deliberate choice: most comment systems
              degrade the signal-to-noise of the surrounding content, and
              Apeirron&rsquo;s entire premise is that the content should be
              carrying the signal.
            </p>

            <h2 id="privacy">Privacy, analytics, AI</h2>
            <p>
              Apeirron uses no tracking cookies, no analytics pixels, no
              behavioural profiling, no fingerprinting, and no third-party
              scripts of any kind. The site is statically generated and
              served through a content delivery network. The CDN&rsquo;s
              standard access logs are the only automatic record of visits.
              There is no mailing list. There is no session. There is no user
              account. If you close the tab, there is no state on Apeirron&rsquo;s
              side that records you were here.
            </p>
            <p>
              The site&rsquo;s posture toward AI crawlers is the inverse of the
              industry default. GPTBot, ClaudeBot, PerplexityBot,
              OAI-SearchBot, Google-Extended, Applebot-Extended, Common Crawl,
              and other named crawlers are explicitly allowed in{" "}
              <a href="/robots.txt">robots.txt</a>. A machine-readable index of
              every node, with a one-line description for each, is published at{" "}
              <a href="/llms.txt">/llms.txt</a>. The Article schema on every
              node, the published and modified timestamps, the canonical
              entity references, and the per-node Open Graph images are all
              there to make the content easy for large language models to cite
              accurately and attribute correctly.
            </p>
            <p>
              The reasoning is simple. Apeirron writes about the exact
              questions that large numbers of people now ask AI assistants.
              If a ChatGPT user asks about Operation Glasnost, or
              Perplexity summarises what happened in Dealey Plaza, or a
              student runs Claude against a research prompt on the hard
              problem of consciousness, the information they get back will be
              synthesised from whatever sources those systems have access to.
              Refusing access to the graph would mean those systems draw from
              a narrower pool — and in practice that means a pool that is
              more likely to be superficial, less likely to present both
              sides, and less likely to distinguish documented record from
              interpretive claim. The project&rsquo;s view is that the
              appropriate response to the rise of AI search is not to opt
              out; it is to build content that is worth citing and make it
              easy to cite.
            </p>

            <h2 id="contact">Contact</h2>
            <p>
              To report a factual error, propose a new node, correct a source,
              raise a governance question, or flag anything else that belongs
              on the record, open an{" "}
              <a
                href="https://github.com/theiskaa/apeirron/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                issue on GitHub
              </a>{" "}
              or submit a pull request. For broader discussion that does not
              map to a specific change, start a{" "}
              <a
                href="https://github.com/theiskaa/apeirron/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                discussion
              </a>
              . The graph is infinite — there is room for every question worth
              asking.
            </p>

            <div
              className="mt-14 mb-8 pt-8"
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)",
              }}
            >
              <p className="text-[13px] text-text-secondary">
                <Link href="/nodes">Browse all nodes</Link> ·{" "}
                <Link href="/contribute">Contribute a node</Link> ·{" "}
                <a
                  href="https://github.com/theiskaa/apeirron"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source on GitHub
                </a>
              </p>
            </div>
          </article>

          <aside
            id="books"
            aria-labelledby="books-heading"
            className="w-full mt-12 lg:mt-0 lg:w-[340px] shrink-0 lg:sticky lg:top-8 lg:self-start"
          >
            <div className="mb-5">
              <h2
                id="books-heading"
                className="text-[11px] font-semibold tracking-[0.14em] uppercase text-text-secondary mb-2"
              >
                The Apeirron Series
              </h2>
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Seven typeset volumes derived from the graph. EPUB and PDF,
                served from{" "}
                <a
                  href="https://github.com/theiskaa/apeirron"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-text-primary"
                >
                  GitHub
                </a>
                . Edit a chapter by editing its source node.
              </p>
            </div>

            <ul className="grid grid-cols-3 gap-x-3 gap-y-5 list-none p-0 m-0">
              {volumes.map((volume) => (
                <li key={volume.id} className="flex flex-col items-stretch gap-2">
                  <a
                    href={pdfUrl(volume.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-transform hover:-translate-y-0.5"
                    aria-label={`Open ${volume.label} PDF`}
                  >
                    <img
                      src={coverUrl(volume.id)}
                      alt={`${volume.label} cover`}
                      width={140}
                      height={210}
                      className="w-full h-auto rounded-[2px]"
                      style={{
                        boxShadow:
                          "0 1px 2px rgba(0,0,0,0.08), 0 6px 14px rgba(0,0,0,0.10)",
                      }}
                    />
                  </a>
                  <div
                    className="text-[10px] leading-snug"
                    style={{ color: "rgba(144,144,160,0.75)" }}
                  >
                    {volume.chapters} chapter
                    {volume.chapters === 1 ? "" : "s"}
                  </div>
                  <div className="flex gap-1">
                    <a
                      href={pdfUrl(volume.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chrome inline-flex items-center justify-center px-1.5 h-[20px] rounded-full text-[9.5px] tracking-wide leading-none text-text-secondary hover:text-text-primary"
                    >
                      PDF
                    </a>
                    <a
                      href={epubUrl(volume.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chrome inline-flex items-center justify-center px-1.5 h-[20px] rounded-full text-[9.5px] tracking-wide leading-none text-text-secondary hover:text-text-primary"
                    >
                      EPUB
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
