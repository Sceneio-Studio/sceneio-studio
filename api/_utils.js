const crypto = require("node:crypto");

function parseBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  try {
    return JSON.parse(request.body || "{}");
  } catch (error) {
    return {};
  }
}

function sendJSON(response, status, payload) {
  response.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(payload));
}

function config() {
  return {
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET || "production",
    apiVersion: (process.env.SANITY_API_VERSION || "2025-05-30").replace(/^v/, ""),
    writeToken: process.env.SANITY_WRITE_TOKEN,
    adminPassword: process.env.SCENEIO_ADMIN_PASSWORD,
    sessionSecret: process.env.SCENEIO_SESSION_SECRET || process.env.SCENEIO_ADMIN_PASSWORD
  };
}

function getYouTubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0];
    if (url.hostname.includes("youtube.com")) return url.searchParams.get("v") || url.pathname.split("/").pop();
  } catch (error) {
    return null;
  }
  return null;
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((entry) => {
    const separator = entry.indexOf("=");
    return [entry.slice(0, separator).trim(), decodeURIComponent(entry.slice(separator + 1).trim())];
  }));
}

function sessionToken(secret) {
  return crypto.createHmac("sha256", secret).update("sceneio-admin-session").digest("hex");
}

function isAuthenticated(request, secret) {
  const received = parseCookies(request).sceneio_admin || "";
  const expected = sessionToken(secret);
  return received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96) || `project-${Date.now()}`;
}

module.exports = { config, getYouTubeId, isAuthenticated, parseBody, sendJSON, sessionToken, slugify };
