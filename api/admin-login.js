const { config, parseBody, sendJSON, sessionToken } = require("./_utils");

module.exports = async function adminLogin(request, response) {
  if (request.method !== "POST") return sendJSON(response, 405, { message: "Method not allowed" });
  const settings = config();
  const { password } = parseBody(request);
  if (!settings.adminPassword) return sendJSON(response, 503, { message: "Studio password is not configured." });
  if (!password || password !== settings.adminPassword) return sendJSON(response, 401, { message: "The studio password was not accepted." });

  const host = request.headers.host || "";
  const secure = request.headers["x-forwarded-proto"] === "https" || !/localhost|127\.0\.0\.1/.test(host);
  const cookie = [
    `sceneio_admin=${sessionToken(settings.sessionSecret)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=86400",
    secure ? "Secure" : ""
  ].filter(Boolean).join("; ");
  response.setHeader("Set-Cookie", cookie);
  return response.status(204).end();
};
