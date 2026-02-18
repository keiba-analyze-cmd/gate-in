import { createClient } from "microcms-js-sdk";
const client = createClient({ serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN!, apiKey: process.env.MICROCMS_API_KEY! });

client.getList({
  endpoint: "articles",
  queries: { limit: 5, fields: ["id", "content"], orders: "-createdAt" }
}).then(res => {
  for (const a of res.contents) {
    // コメント形式のリンクを検索
    const comments = a.content.match(/<!--.*?-->/g) || [];
    // aタグを検索
    const links = a.content.match(/<a [^>]*>/g) || [];
    // 内部リンクっぽいテキスト
    const refs = a.content.match(/関連[：:]|参考[：:]|リンク[：:]|→.*記事/g) || [];
    
    if (comments.length || links.length || refs.length) {
      console.log(`\n${a.id}:`);
      if (comments.length) console.log(`  コメント: ${comments.slice(0,3).join(' | ')}`);
      if (links.length) console.log(`  aタグ: ${links.slice(0,3).join(' | ')}`);
      if (refs.length) console.log(`  参照テキスト: ${refs.slice(0,3).join(' | ')}`);
    }
  }
});
