// netlify/functions/config.js
// Returns public Supabase config (anon key is safe to expose — RLS protects data)
// Called once on app load to inject env vars without hardcoding in client JS

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    }),
  };
};
