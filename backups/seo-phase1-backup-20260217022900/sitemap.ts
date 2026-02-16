import { createAdminClient } from "@/lib/admin";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://gate-in.jp";
  const admin = createAdminClient();

  // 公開レースを取得
  const { data: races } = await admin
    .from("races")
    .select("id, race_date")
    .order("race_date", { ascending: false })
    .limit(200);

  const raceEntries = (races ?? []).map((race) => ({
    url: `${baseUrl}/races/${race.id}`,
    lastModified: new Date(race.race_date),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/races`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/contest`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/legal`, changeFrequency: "monthly", priority: 0.3 },
    ...raceEntries,
  ];
}
