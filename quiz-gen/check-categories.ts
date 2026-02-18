import { createClient } from "microcms-js-sdk";
const client = createClient({ serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!, apiKey: process.env.MICROCMS_API_KEY! });
client.getList({ endpoint: "quiz-categories", queries: { limit: 50 } }).then(r => {
  r.contents.forEach(c => console.log(`${c.id}: ${c.name} (${c.icon})`));
  console.log(`\n合計: ${r.totalCount}件`);
});
