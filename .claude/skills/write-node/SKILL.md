---
name: write-node
description: Write or substantially expand a node file under content/nodes/ for the Apeirron graph. Invoke when the user asks to add, draft, write, or deepen an Apeirron node (e.g. "add a node on Operation Cyclone", "write the Havana Syndrome node", "flesh out ancient-astronauts"). Covers frontmatter, connection quality, reciprocal-link rule, reading-path placement, sourcing, and the editorial bar.
---

# Writing Apeirron nodes

Apeirron is a graph of contested ideas — conspiracy, philosophy, lost history, consciousness, power. Every node is a Markdown file under `content/nodes/<slug>.md`. The value of the project is not the individual nodes; it is the web they form. Each node must earn its place by being (1) a genuinely deep story-telling essay, (2) specifically sourced, and (3) connected through *causal* links — not thematic adjacency.

`CONTRIBUTING.md` is the user-facing baseline. This skill is the **editorial bar of the existing corpus** and supersedes CONTRIBUTING.md when the two disagree (notably on connection count, source count, and depth).

## Before writing anything

1. Confirm the slug is free: `test -f content/nodes/<slug>.md && echo EXISTS || echo OK`.
2. **Decide whether to write a new node or expand an existing one.** If the topic has partial coverage anywhere — `grep -liE "<keyword>" content/nodes/` — deepening the existing node is almost always the right move. New thin satellites fragment the graph.
3. Read 2–3 nodes from the same `category` in full to internalise tone and depth. Concrete anchors:
   - Investigative deep-dive: `content/nodes/epstein.md`, `content/nodes/covid-lab-leak.md`, `content/nodes/pizzagate.md`
   - Philosophical / theoretical: `content/nodes/consciousness.md`, `content/nodes/control-systems.md`
   - Mid-length narrative: `content/nodes/pharmacratic-inquisition.md`
   - Historical/operational: `content/nodes/operation-paperclip.md`, `content/nodes/operation-gladio.md`
4. Read `content/categories.json`. The current set is `mind, origins, cosmos, power, operations, modern, reality`. Don't invent a new category.
5. **Grep for every connection target you plan to declare** (`grep -l "^id: \"<target>\"" content/nodes/*.md`). Targets that don't resolve become *phantom nodes* (see below) — sometimes intentional, never accidental.

## Frontmatter

```yaml
---
id: "slug-with-hyphens"
title: "Display Title"
category: "mind" | "origins" | "cosmos" | "power" | "operations" | "modern" | "reality"
connections:
  - target: "other-node-slug"
    reason: "One to two sentences naming the causal or operational link."
---
```

- `id` must exactly match the filename without `.md`.
- `title` is display-cased and may differ from the slug (e.g., `saturn-black-cube` → `"Saturn & The Black Cube"`).
- `category` must match an entry in `content/categories.json`.
- **Connections: 4–8 entries.** Fewer than 4 leaves the node a graph dead-end; more than ~10 dilutes. Pick the strongest links, not every plausible one. (CONTRIBUTING.md says 2–5; the existing corpus runs higher and the editorial bar follows the corpus.)

## Connection quality — the hardest part

A connection is **not** "these two topics share a theme." A connection is a **causal or operational link**: one node *caused, enabled, reveals, suppresses, inverts, implements,* or *serves as evidence for* the other. If you cannot name the mechanism, cut it.

**Bad** (thematic):
- `"Both involve the CIA"` — half the graph involves the CIA.
- `"Related to consciousness"` — true of every mind node.
- `"Similar themes of control"` — vague category-matching.

**Good** (causal/operational):
- `pharmacratic-inquisition → mkultra`: *"MKUltra is the inquisition's hidden half: the same agencies that criminalized LSD for the public stockpiled it, dosed soldiers and civilians with it, and researched it as a weapon."*
- `control-systems → operation-gladio`: *"Italy's strategia della tensione is the clearest historical articulation of fear manufactured to produce political consent. Gladio operative Vincenzo Vinciguerra confessed the doctrine directly."*

Each names a specific mechanism — the *how*, the *who*, or the receipt. Reasons must be **1–2 sentences, present tense, declarative.** No hedging language ("may suggest", "could be interpreted"). No paragraph-length reasons — they render in tooltips.

## Reciprocal connections — always update both sides

**Creating the new node's file is half the work.** Every connection must exist in *both* nodes' frontmatter. The graph builds edges from each node's declared `connections` list, so a one-way connection only renders in one direction.

Process:
1. List every `target` declared in the new node.
2. For each target, open `content/nodes/<target>.md` and add a reciprocal entry pointing back.
3. **Write the reciprocal reason from the *other* node's point of view.** Direction of causality, emphasis, or framing almost always differs — do not copy-paste. Example: if `new-node → mkultra` reads *"MKUltra is the inquisition's hidden half, stockpiling the compounds the public was prosecuted for,"* then `mkultra → new-node` should read from MKUltra's side: *"The pharmacratic inquisition is the public-facing prohibition regime that ran in parallel with — and was institutionally enabled by — MKUltra's classified psychedelic program."*
4. If adding the reciprocal pushes a target node past ~10 connections, drop one of *its* weaker links or reconsider whether the new connection is essential.
5. Sanity check: `grep -l "<new-slug>" content/nodes/` should list one file per declared target plus the new node itself. Mismatched count = missing reciprocal.

## Phantom nodes (forward references)

The build pipeline (`scripts/generate-content.mjs`) treats unresolved connection targets as **phantom nodes** — placeholders that render as styled wiki links and get a stub page. Phantoms are a feature, not a bug: they let you commit a node that names a sibling concept which deserves its own deep-dive but you're not writing today.

Use a phantom intentionally when:
- The target deserves its own node but writing it now would balloon the PR.
- You want the graph to show the gap exists, recruiting a future contributor.

Don't use phantoms to dodge the work of a real connection — and never declare one you don't intend to ever fill. If you create a phantom, mention it in the handoff so the user can track it.

## Reading-path placement (`lib/paths.ts`)

A node not on a reading path is invisible to the guided-reading UI even though it sits on the graph. After writing the node and reciprocals:

1. Open `lib/paths.ts`. Each `ReadingPath` is a DAG of node ids with a tagline (`hook`) and optional `parents` referring to earlier nodes in the same path.
2. Decide which path the node belongs on. Usually one. Two only if genuinely pivotal (e.g., `marilyn-monroe` is on both `Shattered History` and `The Kill List`). Three is too many.
3. Insert in the right position — `parents` must be defined **earlier** in the same `nodes:` array.
4. Shape:
   ```ts
   { id: "new-node-slug", hook: "One- to three-sentence tagline in the path's voice — specific, evocative, the argument for following this link next", parents: ["preceding-node-id"] }
   ```
5. `hook` style is **not a summary**. It's the path's sales pitch for the next node. Specific dates, names, mechanisms earn their place. Match the rhythm of neighbors.
6. `parents` rules:
   - All parent ids must appear earlier in the same `nodes:` array.
   - Omit `parents` (or pass `[]`) only for path roots. Each path needs at least one root.
   - Multiple parents allowed when the node synthesizes prior threads (see `operation-mockingbird` with `parents: ["operation-paperclip", "cointelpro"]`).
7. **No existing path fits?** Two options: (a) reconsider whether the node belongs at all — orphan-in-theme is a real signal; (b) propose a new `ReadingPath` to the user with `id`, `title`, `description`, and at least one root node. Don't silently add a new path.

The validator block at the bottom of `lib/paths.ts` runs **only when `NODE_ENV !== "production"`** — it catches duplicate ids, forward/self parent refs, and rootless paths. A normal `npm run build` does **not** trigger it. To validate, run with `NODE_ENV=development`.

## Content depth, structure, tone

**Depth — read this twice.** Apeirron nodes are **long-form story-telling essays**. They unfold an argument, walk through a history, present rival readings, and pull the reader through evidence. They are *never* short. They are *never* bullet-point summaries. They are *never* encyclopedia-style overviews. Typical nodes run 100–200 lines of dense prose; investigative nodes run 350–500. If a topic cannot support that scale of essay, it is not yet a node — it is a paragraph inside another node.

A node should usually contain:
- An opening narrative hook — not a definition. Drop the reader into the specific moment, document, person, or scene that makes the topic matter. The opening earns the rest.
- 3–6 H2 (`##`) subsections walking through, in some order: historical origin, the key text or incident, the strongest case, the strongest counter, institutional continuity, what it reveals if true, deeper reading. No template — let the topic dictate.
- Concrete anchors throughout: named individuals, specific years, document titles with page numbers, dollar amounts, exact quotes.
- 3+ inline `[[wiki-link]]` references woven into the prose. Links go where the argument naturally reaches for another node, not pasted into a "See also" block.

**Tone.**
- *Genuine inquiry.* Same posture for flat earth and the hard problem of consciousness: take the idea seriously, map it fairly, show your work. No mocking, no uncritical endorsement.
- *Both sides at their strongest.* Mainstream counter at its most persuasive AND the alternative case at its most persuasive. One-sided = editorial, not cartographic.
- *Narrative voice.* Long-form essay (McKenna, Szasz, Chomsky, Hancock in his serious mode), not Wikipedia. Sentences breathe; paragraphs argue. Specificity does the work, not purple prose.
- *No sensationalism.* The material is interesting enough without "shocking truth they don't want you to know."

**Wiki links.** Syntax `[[slug]]` or `[[Title Case]]`. Prefer slugs. Drop links where the prose already reaches for the other topic — never retrofit.

## Sources — the single hard rule

Every node ends with `## Sources`. No sources = PR rejected.

```markdown
## Sources

- Kinzer, Stephen. *Poisoner in Chief: Sidney Gottlieb and the CIA Search for Mind Control*. New York: Henry Holt and Company, 2019.
- Chalmers, David. "Facing Up to the Problem of Consciousness." *Journal of Consciousness Studies*, 2(3), 1995. [PDF](https://example.com/link)
- Rogan, Joe, and Hancock, Graham. *Joe Rogan Experience* #1284, 2019. [YouTube at 1:22:15](https://youtube.com/watch?v=xxx&t=4935)
- U.S. National Commission on Marihuana and Drug Abuse. *Marihuana: A Signal of Misunderstanding*. U.S. Government Printing Office, 1972.
```

- **Aim for 5–12 sources.** (CONTRIBUTING.md says 1; the corpus runs much higher.) Long investigative nodes carry 15+.
- Every non-obvious factual claim must be traceable to a listed source. If you cannot cite it, cut it or soften it.
- Accepted: academic papers (author/title/journal/year), books (author/title/publisher/year), official documents, named interviews/documentaries **with timestamps**, investigative journalism (author/title/publication/date).
- Not accepted: "some researchers say," anonymous blogs, generic Wikipedia, "various sources."
- URLs are a bonus, not a requirement.
- Video sources **must include a timestamp**.

## Final steps

1. Run `npm run build`. Catches YAML errors and Markdown compilation failures. Does **not** catch missing connection targets (those become phantoms) or `paths.ts` DAG errors (validator is dev-only).
2. To validate `paths.ts`, run `NODE_ENV=development npm run build` (or import the module in a dev context).
3. **Regenerate the README graph SVG**: `node scripts/export-graph.mjs`. The image at `public/apeirron-graph.svg` only updates when this runs — without it, the new node won't appear in the README graph.
4. `git diff content/nodes/` should show one new file plus N edited files (one per reciprocal target). `git diff lib/paths.ts` should show the new entry.

## Self-check before finishing

- [ ] Long-form story-telling essay — opening narrative hook, 3–6 subsections, real argument, dense prose. Not a summary, not a listicle, not encyclopedic.
- [ ] Every non-obvious claim traces to a source in the list (≥5 sources, ideally more).
- [ ] 3+ inline `[[wiki-links]]` woven into prose, not clustered in one section.
- [ ] Each connection reason names a *mechanism* in 1–2 sentences, present tense, declarative.
- [ ] 4–8 connections; every target either resolves to an existing file or is a deliberate phantom.
- [ ] **Reciprocal entry added in every target node**, with a reason written from that node's POV (not copy-pasted).
- [ ] Added to one (rarely two) reading paths in `lib/paths.ts` with a `hook` in the path's voice and valid `parents`.
- [ ] `npm run build` passes; `NODE_ENV=development npm run build` passes (validates paths.ts).
- [ ] `node scripts/export-graph.mjs` ran — README graph reflects the new node.
- [ ] Both sides presented at their strongest.
- [ ] No `## Summary` / `## TL;DR` / "See also" blocks. No bullet-list nodes. No Wikipedia paraphrase.

## Handoff

When finished, summarize for the user:
- New file path and line count
- Category and connection count
- Which existing nodes you edited for reciprocals (and the reason you wrote in each)
- Which reading path(s) you added the node to, and `parents`
- Source count, and any claim that's under-sourced
- Any phantom nodes you introduced (target slug + why you left it as a forward reference)
- `npm run build` and `NODE_ENV=development npm run build` results
- SVG regenerated: yes/no
- Anything you wanted to include but couldn't verify — so the user can push back or accept the gap
