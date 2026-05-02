const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sqlRes = await fetch(`${url}/rest/v1/?select=*&limit=0`, {
  headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Accept': 'application/openapi+json' },
});
const schema = await sqlRes.json();
for (const t of ['ai_monthly_stats','ai_prediction_results']) {
  const table = schema.definitions?.[t];
  if (table) {
    console.log(`\n=== ${t} ===`);
    for (const [col, def] of Object.entries(table.properties)) {
      console.log(`  ${col}: ${def.type || def.format || 'unknown'}`);
    }
  }
}
