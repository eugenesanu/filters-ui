import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Scene, type Frame } from "./scenes";

export const metadata: Metadata = {
  title: "Lab: shot",
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// 1600 x 1200 live scenes for recorded shots: one real, working filter on the site's tile surface. ?scene= picks one.
export default async function LabShotPage({ searchParams }: PageProps<"/lab/shot">) {
  // Private scenes for making videos; never served by a production build.
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const scene = first(params.scene) ?? "price";
  const asked = first(params.frame);
  const frame: Frame = asked === "plain" || asked === "tile" ? asked : "edge";

  return (
    <main className="bg-page">
      <Scene name={scene} frame={frame} />
    </main>
  );
}
