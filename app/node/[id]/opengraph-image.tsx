import { ImageResponse } from "next/og";
import { getAllNodes, getCategories, getPhantomNodeIds } from "@/lib/content";

export const alt = "Apeirron — Biggest questions humanity asks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nodes = getAllNodes();
  const node = nodes.find((n) => n.frontmatter.id === id);
  return [
    {
      id: "default",
      alt: node ? `${node.frontmatter.title} — Apeirron` : alt,
      contentType,
      size,
    },
  ];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OpenGraphImage({ params }: Props) {
  const { id } = await params;
  const nodes = getAllNodes();
  const categories = getCategories();
  const node = nodes.find((n) => n.frontmatter.id === id);

  let title: string;
  let categoryLabel: string;
  let categoryColor = "#888888";

  if (node) {
    title = node.frontmatter.title;
    const cat = categories.find((c) => c.id === node.frontmatter.category);
    categoryLabel = cat?.label ?? node.frontmatter.category;
    categoryColor = cat?.color ?? categoryColor;
  } else {
    const phantomIds = getPhantomNodeIds();
    if (phantomIds.includes(id)) {
      title = id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      categoryLabel = "Proposed";
    } else {
      title = "Apeirron";
      categoryLabel = "Knowledge Graph";
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(ellipse at top left, #1a1a1a 0%, #0a0a0a 100%)",
          padding: 80,
          fontFamily: "sans-serif",
          color: "#f5f5f5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: categoryColor,
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#aaaaaa",
              fontWeight: 500,
            }}
          >
            {categoryLabel}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 50 ? 72 : title.length > 30 ? 96 : 120,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#ffffff",
            maxWidth: "90%",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#ffffff",
            }}
          >
            Apeirron
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#888888",
              letterSpacing: "0.02em",
            }}
          >
            Biggest questions humanity asks
          </div>
        </div>
      </div>
    ),
    size
  );
}
