import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Apeirron — Biggest questions humanity asks",
    template: "%s",
  },
  description:
    "An interactive knowledge graph mapping the biggest questions humanity asks — consciousness, ancient civilizations, the nature of reality, and many more",
  keywords: [
    "knowledge graph",
    "consciousness",
    "simulation theory",
    "ancient civilizations",
    "fermi paradox",
    "panpsychism",
    "philosophy",
    "deep dive",
    "interactive graph",
  ],
  metadataBase: new URL("https://apeirron.com"),
  openGraph: {
    title: "Apeirron — Biggest questions humanity asks",
    description:
      "An interactive knowledge graph exploring consciousness, reality, ancient civilizations, and the cosmos. Every idea is a node. Every connection has a reason.",
    siteName: "Apeirron",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Apeirron — Interactive Knowledge Graph" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apeirron — Biggest questions humanity asks",
    description:
      "An interactive knowledge graph exploring consciousness, reality, ancient civilizations, and the cosmos.",
    images: ["/og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
