import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// service_role keyで全件取得
const { data, error, count } = await s.from("contests").select("*", { count: "exact" });
console.log("件数:", count);
console.log("エラー:", error);
if (data?.length) {
  data.forEach(c => console.log(c.id, c.year_month, c.status, c.created_at?.slice(0,10)));
} else {
  console.log("データなし");
}
