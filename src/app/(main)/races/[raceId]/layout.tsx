import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ raceId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { raceId } = await params;
  const supabase = await createClient();

  const { data: race } = await supabase
    .from("races")
    .select("name, grade, course_name, race_date, distance")
    .eq("id", raceId)
    .single();

  if (!race) {
    return { title: "レース | ゲートイン！" };
  }

  const title = `${race.grade ? `[${race.grade}] ` : ""}${race.name} | ゲートイン！`;
  const description = `${race.race_date} ${race.course_name} ${race.distance ?? ""}の予想を投票しよう！みんなの予想で腕試し。`;
  const ogUrl = `/api/og?title=${encodeURIComponent(race.name)}&grade=${race.grade ?? ""}&course=${encodeURIComponent(race.course_name)}&date=${race.race_date}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: race.name }],
      type: "website",
      siteName: "ゲートイン！",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function RaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
