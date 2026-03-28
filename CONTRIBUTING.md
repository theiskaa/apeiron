# Contributing to Apeirron

Apeirron grows through community contributions. Every node is a Markdown file. Every connection is a link. If you have something worth exploring, we want it on the graph.

## Adding a new node

1. Fork the repository
2. Create a new `.md` file in `content/nodes/` — the filename becomes the URL slug (e.g., `dmt-entities.md`)
3. Add the required frontmatter (see below)
4. Write your content
5. Submit a Pull Request

## Frontmatter format

Every node file starts with YAML frontmatter:

```yaml
---
id: "dmt-entities"
title: "DMT Entities"
category: "mind"
connections:
  - target: "altered-states"
    reason: "DMT produces the most intense altered state known, with consistent entity contact reports"
  - target: "consciousness"
    reason: "The existence of seemingly autonomous entities challenges materialist models of consciousness"
---
```

**Fields:**

- `id` — unique identifier, lowercase with hyphens. Must match the filename (without `.md`).
- `title` — display name of the node.
- `category` — one of: `mind`, `origins`, `cosmos`, `power`, `reality`.
- `connections` — the 2-5 strongest links to other nodes. Each has a `target` (the other node's id) and a `reason` (one sentence explaining why they're connected). These define the graph edges.

## Writing content

### The only rule: make it worth reading.

There is no required structure. No forced sections. No template to follow. Some nodes will read like philosophical essays. Others like investigative journalism. Others like a scientist thinking out loud. The format should serve the topic, not the other way around.

### What makes a good node

- **Narrative, not encyclopedic.** Don't summarize — tell the story. Why does this idea exist? What makes it compelling? What makes it unsettling?
- **Present both sides.** The strongest case for, and the strongest case against. Don't mock believers or uncritically endorse claims. Map the intellectual landscape fairly.
- **Make connections.** The real value of Apeirron is the web. Use `[[wiki links]]` throughout your text to connect to other nodes. Every link is a rabbit hole the reader can follow.
- **Be specific.** Names, dates, papers, events. Vague hand-waving is not interesting. Specific claims with specific evidence are.
- **Treat every topic seriously.** Whether it's the hard problem of consciousness or ancient astronaut theory, the tone is the same: genuine inquiry.

### What makes a bad node

- Bullet-point summaries with no depth
- Copy-pasted Wikipedia content
- One-sided advocacy or dismissal
- No connections to other nodes
- Sensationalist tone
- No verifiable sources

## Sources

Every node **must** end with a `## Sources` section. This is not optional. A node without verifiable sources will not be merged.

The purpose is simple: Apeirron maps ideas that are contested, speculative, and often dismissed. The only way to maintain credibility is to show your work. Every claim should be traceable to something a reader can verify independently.

### Format

```markdown
## Sources

- Chalmers, David. "Facing Up to the Problem of Consciousness." *Journal of Consciousness Studies*, 2(3), 1995. [PDF](https://example.com/link)
- Strassman, Rick. *DMT: The Spirit Molecule*. Park Street Press, 2000.
- Hancock, Graham. Interview on Younger Dryas impact. *Joe Rogan Experience* #1284, 2019. [YouTube at 1:22:15](https://youtube.com/watch?v=xxx&t=4935)
- Bank of England. "Money Creation in the Modern Economy." Quarterly Bulletin, Q1 2014. [Link](https://example.com)
```

### Requirements

- **Minimum 1 source per node.** More is better.
- **Each source must be specific.** Not "some studies show" — the actual study, with author, title, and year.
- **Accepted source types:** academic papers, books (author + year), documentaries/videos (with timestamp), official documents, named interviews, investigative journalism (with publication name and date).
- **URLs are encouraged** but not required — books and papers don't always have free links.
- **Video sources must include timestamps** pointing to the relevant section, not just "watch this 3-hour documentary."

### Why this matters

Without sources, a node is just an opinion. With sources, it's a map. PRs that add new nodes without a Sources section will not be approved.

## Wiki links

Use `[[double brackets]]` to link to other nodes inline. You can reference by id or by title:

```markdown
This connects to [[consciousness]] and also to [[The Hard Problem]].
```

Both formats work. Links render as clickable inline references that open the target node. If the target doesn't exist yet, the link renders as a broken reference — which is fine, it signals a node that should be written.

## Categories

| ID | Label | Covers |
|----|-------|--------|
| `mind` | Mind | Consciousness, perception, altered states, the self, dreams, psychedelics |
| `origins` | Origins | Ancient civilizations, human evolution, lost history, megaliths, myths |
| `cosmos` | Cosmos | Aliens, Fermi paradox, UFOs, space, multiverse |
| `power` | Power | Control systems, banking, surveillance, secret societies, media |
| `reality` | Reality | Nature of existence, time, simulation theory, physics |

If you think a new category is needed, open an issue to discuss it before submitting a PR.

## Pull Request guidelines

- One node per PR (unless they're tightly related and should be reviewed together)
- Frontmatter must be valid YAML
- All `connections[].target` values should reference existing node ids (or nodes included in the same PR)
- Content should include at least 2-3 `[[wiki links]]` to other nodes
- **Must include a `## Sources` section with at least one verifiable source**
- Run `npm run build` locally to verify the site builds without errors

**PRs without sources will not be merged.** This is the single non-negotiable rule.

## Improving existing nodes

Found a node that could be better? PRs to improve existing content are welcome. You can:

- Expand a section that's too thin
- Add connections that are missing
- Fix factual errors
- Improve the writing quality
- Add `[[wiki links]]` to newly created nodes

## Questions?

Open an issue or start a discussion. The graph is infinite — there's room for every question worth asking.
