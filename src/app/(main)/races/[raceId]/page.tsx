import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import RaceDetailClient from "./RaceDetailClient";

type Props = {
  params: Promise<{ raceId: string }>;
};

export default async function RaceDetailPage({ params }: Props) {
  const { raceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: race, error } = await supabase
    .from("races").select("*").eq("id", raceId).single();

  if (!race || error) notFound();

  const { data: entries } = await supabase
    .from("race_entries")
    .select("*, horses(id, name, sex, sire, trainer, stable_area, career_record)")
    .eq("race_id", raceId).eq("is_scratched", false)
    .order("post_number", { ascending: true });

  const { data: myVote } = await supabase
    .from("votes")
    .select("*, vote_picks(*, race_entries(post_number, horses(name)))")
    .eq("race_id", raceId).eq("user_id", user.id).maybeSingle();

  // 馬券種ごとのポイント内訳を取得
  let pointsTransactions = null;
  if (myVote) {
    const { data: transactions } = await supabase
      .from("points_transactions")
      .select("reason, amount, description")
      .eq("vote_id", myVote.id)
      .order("created_at", { ascending: true });
    pointsTransactions = transactions;
  }

  const { createAdminClient } = await import("@/lib/admin");
  const adminDb = createAdminClient();
  const { count: totalVotes } = await adminDb
    .from("votes").select("*", { count: "exact", head: true }).eq("race_id", raceId);

  let results = null;
  let payouts = null;
  if (race.status === "finished") {
    const { data: r } = await supabase
      .from("race_results")
      .select("*, race_entries(post_number, jockey, odds, popularity, horses(name))")
      .eq("race_id", raceId).order("finish_position", { ascending: true });
    results = r;
    const { data: p } = await supabase.from("payouts").select("*").eq("race_id", raceId);
    payouts = p;
  }

  const now = new Date();
  const postTimeDate = race.post_time ? new Date(race.post_time) : null;
  const isBeforeDeadline = postTimeDate
    ? now.getTime() < postTimeDate.getTime() - 2 * 60 * 1000
    : true;
  const isVotable = race.status === "voting_open" && !myVote && isBeforeDeadline;
  const hasVoted = !!myVote;
  const isFinished = race.status === "finished";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: race.name,
    description: `${race.course_name} ${race.race_number ? race.race_number + "R" : ""} ${race.grade ? "[" + race.grade + "]" : ""} ${race.name}`,
    startDate: race.post_time
      ? new Date(race.post_time).toISOString()
      : `${race.race_date}T00:00:00+09:00`,
    location: {
      "@type": "Place",
      name: race.course_name + "競馬場",
      address: { "@type": "PostalAddress", addressCountry: "JP" },
    },
    sport: "Horse Racing",
    url: `https://gate-in.jp/races/${raceId}`,
    organizer: { "@type": "Organization", name: "ゲートイン！", url: "https://gate-in.jp" },
    ...(isFinished && results && results.length > 0 ? {
      competitor: results.slice(0, 3).map((r: any) => ({
        "@type": "Person",
        name: r.race_entries?.horses?.name ?? "不明",
        result: `${r.finish_position}着`,
      })),
    } : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <RaceDetailClient
        race={race}
        entries={entries}
        myVote={myVote}
        results={results}
        payouts={payouts}
        totalVotes={totalVotes ?? 0}
        userId={user.id}
        isVotable={isVotable}
        hasVoted={hasVoted}
        isFinished={isFinished}
        isBeforeDeadline={isBeforeDeadline}
        pointsTransactions={pointsTransactions}
      />
    </>
  );
}
