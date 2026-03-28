# Contributing to Apeiron

Apeiron grows through community contributions. Every node is a Markdown file. Every connection is a link. If you have something worth exploring, we want it on the graph.

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
- **Make connections.** The real value of Apeiron is the web. Use `[[wiki links]]` throughout your text to connect to other nodes. Every link is a rabbit hole the reader can follow.
- **Be specific.** Names, dates, papers, events. Vague hand-waving is not interesting. Specific claims with specific evidence are.
- **Treat every topic seriously.** Whether it's the hard problem of consciousness or ancient astronaut theory, the tone is the same: genuine inquiry.

### What makes a bad node

- Bullet-point summaries with no depth
- Copy-pasted Wikipedia content
- One-sided advocacy or dismissal
- No connections to other nodes
- Sensationalist tone

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
- Run `npm run build` locally to verify the site builds without errors

## Improving existing nodes

Found a node that could be better? PRs to improve existing content are welcome. You can:

- Expand a section that's too thin
- Add connections that are missing
- Fix factual errors
- Improve the writing quality
- Add `[[wiki links]]` to newly created nodes

## Questions?

Open an issue or start a discussion. The graph is infinite — there's room for every question worth asking.
