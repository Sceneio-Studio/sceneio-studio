const { config, getYouTubeId, isAuthenticated, parseBody, sendJSON, slugify } = require("./_utils");

module.exports = async function publish(request, response) {
  if (request.method !== "POST") return sendJSON(response, 405, { message: "Method not allowed" });
  const settings = config();
  if (!settings.projectId || !settings.dataset || !settings.writeToken || !settings.sessionSecret) return sendJSON(response, 503, { message: "Cloud publishing is not configured." });
  if (!isAuthenticated(request, settings.sessionSecret)) return sendJSON(response, 401, { message: "Studio login required." });

  const body = parseBody(request);
  const title = String(body.title || "").trim();
  const videoUrl = String(body.videoUrl || "").trim();
  const caption = String(body.description || "").trim();
  const projectType = ["film", "commercial", "brand"].includes(body.type) ? body.type : "film";
  const videoId = getYouTubeId(videoUrl);
  if (!title || !caption || !videoId) return sendJSON(response, 400, { message: "Title, caption, and a valid YouTube link are required." });

  const document = {
    _type: "project",
    title,
    slug: { _type: "slug", current: slugify(title) },
    videoUrl,
    videoId,
    caption,
    projectType,
    coverImageUrl: String(body.image || "").startsWith("http") ? String(body.image) : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    client: "SCENEIO STUDIO",
    services: "Concept / Production / Edit",
    year: Number(body.year) || new Date().getFullYear(),
    published: true,
    publishedAt: new Date().toISOString()
  };
  const endpoint = `https://${settings.projectId}.api.sanity.io/v${settings.apiVersion}/data/mutate/${settings.dataset}`;
  try {
    const sanityResponse = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.writeToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: [{ create: document }] })
    });
    if (!sanityResponse.ok) return sendJSON(response, 502, { message: "Sanity rejected the project." });
    const payload = await sanityResponse.json();
    return sendJSON(response, 201, { id: payload.results?.[0]?.id, project: document });
  } catch (error) {
    return sendJSON(response, 502, { message: "Could not reach Sanity." });
  }
};
