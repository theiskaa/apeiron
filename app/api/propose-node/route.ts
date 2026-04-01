import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCategories } from "@/lib/content";

const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY_RAW = process.env.GITHUB_APP_PRIVATE_KEY ?? "";
const GITHUB_REPO = "theiskaa/apeirron";
const RATE_LIMIT_MAX = 1;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour

const GITHUB_APP_PRIVATE_KEY = GITHUB_APP_PRIVATE_KEY_RAW.replace(/\\n/g, "\n");

function createAppJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: GITHUB_APP_ID, iat: now - 60, exp: now + 600 })
  ).toString("base64url");
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(GITHUB_APP_PRIVATE_KEY, "base64url");
  return `${header}.${payload}.${signature}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getInstallationToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const jwt = createAppJWT();

  const instRes = await fetch("https://api.github.com/app/installations", {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!instRes.ok) throw new Error("Failed to fetch app installations");

  const installations = await instRes.json();
  if (!installations.length) throw new Error("App is not installed on any account");

  const installationId = installations[0].id;

  const tokenRes = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!tokenRes.ok) throw new Error("Failed to create installation token");

  const { token, expires_at } = await tokenRes.json();
  cachedToken = {
    token,
    expiresAt: new Date(expires_at).getTime() - 60_000, // refresh 1 min early
  };
  return token;
}

const submissions = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = submissions.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  submissions.set(ip, recent);
  return true;
}

function deriveId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Connection {
  target: string;
  reason: string;
}

interface ProposalData {
  title: string;
  category: string;
  connections: Connection[];
  content: string;
  sources: string;
  _hp?: string;
}

function buildIssueBody(data: ProposalData, id: string): string {
  const categories = getCategories();
  const isCustomCat = data.category.startsWith("custom:");
  // Custom format: "custom:Name:#hexcolor"
  const customParts = isCustomCat ? data.category.slice(7).split(":") : [];
  const customName = customParts[0] ?? "";
  const customColor = customParts[1] ?? "";
  const catLabel = isCustomCat
    ? `${customName} (proposed new category${customColor ? `, color: ${customColor}` : ""})`
    : categories.find((c) => c.id === data.category)?.label ?? data.category;
  const catYaml = isCustomCat ? customName.toLowerCase().replace(/\s+/g, "-") : data.category;

  const validConnections = data.connections.filter(
    (c) => c.target.trim() && c.reason.trim()
  );

  const connectionsSummary = validConnections
    .map((c) => `- **${c.target.trim()}** — ${c.reason.trim()}`)
    .join("\n");

  const connectionsYaml = validConnections
    .map(
      (c) =>
        `  - target: "${c.target.trim()}"\n    reason: "${c.reason.trim().replace(/"/g, '\\"')}"`
    )
    .join("\n");

  const nodeFile = [
    "---",
    `id: "${id}"`,
    `title: "${data.title.trim()}"`,
    `category: "${catYaml}"`,
    "connections:",
    connectionsYaml || "  []",
    "---",
    "",
    data.content.trim(),
    "",
    "## Sources",
    "",
    data.sources.trim(),
  ].join("\n");

  return [
    "## New Node Proposal",
    "",
    `**Category:** ${catLabel}`,
    ...(isCustomCat && customColor
      ? [`**Proposed category entry:** \`{ "id": "${catYaml}", "label": "${customName}", "color": "${customColor}" }\``]
      : []),
    `**Proposed ID:** \`${id}\``,
    `**Proposed file:** \`content/nodes/${id}.md\``,
    "",
    "### Connections",
    connectionsSummary || "_None specified_",
    "",
    "### Full node content",
    "",
    "> Copy the content below into `content/nodes/" + id + ".md`",
    "",
    "```markdown",
    nodeFile,
    "```",
    "",
    "---",
    "*Submitted via the Apeirron contribution form*",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY.includes("PRIVATE KEY")) {
    return NextResponse.json(
      {
        error:
          "Contribution system is not configured yet. Please contribute directly on GitHub.",
      },
      { status: 503 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a while before trying again." },
      { status: 429 }
    );
  }

  let data: ProposalData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (data._hp) {
    return NextResponse.json({ success: true, issueUrl: "#" });
  }

  const title = data.title?.trim();
  if (!title || title.length < 3) {
    return NextResponse.json(
      { error: "Title must be at least 3 characters." },
      { status: 400 }
    );
  }

  // Accept existing categories or custom proposals (prefixed with "custom:")
  const isCustomCategory = data.category.startsWith("custom:");
  if (!isCustomCategory) {
    const validCategoryIds = getCategories().map((c) => c.id);
    if (!validCategoryIds.includes(data.category)) {
      return NextResponse.json(
        { error: "Please select a valid category." },
        { status: 400 }
      );
    }
  }

  const content = data.content?.trim();
  if (!content || content.length < 100) {
    return NextResponse.json(
      { error: "Content must be at least 100 characters." },
      { status: 400 }
    );
  }

  const validConnections = (data.connections ?? []).filter(
    (c) => c.target?.trim() && c.reason?.trim()
  );

  const id = deriveId(title);
  if (!id) {
    return NextResponse.json(
      { error: "Could not derive a valid ID from the title." },
      { status: 400 }
    );
  }

  const issueBody = buildIssueBody(
    { ...data, connections: validConnections },
    id
  );

  let token: string;
  try {
    token = await getInstallationToken();
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to authenticate with GitHub. Please try again later or contribute directly on GitHub.",
      },
      { status: 502 }
    );
  }

  const ghRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `[Node] ${title}`,
        body: issueBody,
        labels: ["community-proposal"],
      }),
    }
  );

  if (!ghRes.ok) {
    return NextResponse.json(
      {
        error:
          "Failed to create the proposal. Please try again later or contribute directly on GitHub.",
      },
      { status: 502 }
    );
  }

  const issue = await ghRes.json();
  return NextResponse.json({ success: true, issueUrl: issue.html_url });
}
