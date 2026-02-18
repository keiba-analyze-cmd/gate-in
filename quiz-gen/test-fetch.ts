import { createClient } from 'microcms-js-sdk';
const client = createClient({ serviceDomain: 'gatein', apiKey: process.env.MICROCMS_API_KEY! });
client.getList({ endpoint: 'articles', queries: { limit: 5, fields: ['id', 'title', 'category'] } }).then(r => {
  r.contents.forEach(a => console.log(a.id, '|', a.category, '|', a.title));
});
