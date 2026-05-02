const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const res = await fetch(`${url}/rest/v1/rpc/`, {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
});

// Use pg_catalog via REST
const sqlRes = await fetch(`${url}/rest/v1/?select=*&limit=0`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/openapi+json',
  },
});
const schema = await sqlRes.json();
const table = schema.definitions?.ai_prediction_results;
if (table) {
  console.log("=== ai_prediction_results columns ===");
  console.log(Object.keys(table.properties).join('\n'));
} else {
  console.log("Table not found in OpenAPI schema");
  console.log("Available tables:", Object.keys(schema.definitions || {}).filter(t => t.includes('ai')).join(', '));
}
