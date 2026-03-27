import { buildGraphData } from "@/lib/content";
import PageClient from "@/components/PageClient";

export default async function Home() {
  const graphData = await buildGraphData();

  return <PageClient graphData={graphData} />;
}
