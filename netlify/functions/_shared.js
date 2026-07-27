const allowedCategories = new Set(["Final Ad", "BTS", "Short Film", "Other"]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  };
}

function getBody(event) {
  try { return JSON.parse(event.body || "{}"); } catch (error) { return null; }
}

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Netlify environment variable: ${name}`);
  return value;
}

function authorization(event) {
  return event.headers.authorization || event.headers.Authorization || "";
}

async function requireUser(event) {
  const token = authorization(event).replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Sign in is required.");
  const response = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Your studio session has expired. Sign in again.");
  return response.json();
}

function muxAuth() {
  return `Basic ${Buffer.from(`${env("MUX_TOKEN_ID")}:${env("MUX_TOKEN_SECRET")}`).toString("base64")}`;
}

function supabaseHeaders() {
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

module.exports = { allowedCategories, env, getBody, json, muxAuth, requireUser, supabaseHeaders };
