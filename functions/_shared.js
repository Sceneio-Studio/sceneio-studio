export const allowedCategories = new Set(["Final Ad", "BTS", "Short Film", "Other"]);

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function getBody(request) {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

export function env(context, name) {
  const value = context.env[name];
  if (!value) throw new Error(`Missing Cloudflare environment variable: ${name}`);
  return value;
}

export async function requireUser(context) {
  const token = context.request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!token) throw new Error("Sign in is required.");
  const response = await fetch(`${env(context, "SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: env(context, "SUPABASE_ANON_KEY"),
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error("Your studio session has expired. Sign in again.");
  return response.json();
}

export function muxAuth(context) {
  return `Basic ${btoa(`${env(context, "MUX_TOKEN_ID")}:${env(context, "MUX_TOKEN_SECRET")}`)}`;
}

export function supabaseHeaders(context) {
  const serviceRoleKey = env(context, "SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}
