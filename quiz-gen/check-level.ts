import { createClient } from "microcms-js-sdk";
const client = createClient({ serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!, apiKey: process.env.MICROCMS_API_KEY! });
client.getList({ endpoint: "quiz-questions", queries: { limit: 1, fields: ["id", "level", "category"] } }).then(r => {
  console.log(JSON.stringify(r.contents[0], null, 2));
});
