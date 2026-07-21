const { config, sendJSON } = require("./_utils");

module.exports = async function projects(request, response) {
  if (request.method !== "GET") return sendJSON(response, 405, { message: "Method not allowed" });
  const settings = config();
  if (!settings.projectId || !settings.dataset) return sendJSON(response, 503, { configured: false, projects: [] });

  const query = `*[_type == "project" && published == true] | order(publishedAt desc) { title, videoUrl, videoId, caption, projectType, coverImageUrl, client, services, year }`;
  const endpoint = `https://${settings.projectId}.api.sanity.io/v${settings.apiVersion}/data/query/${settings.dataset}?query=${encodeURIComponent(query)}`;
  try {
    const sanityResponse = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!sanityResponse.ok) return sendJSON(response, 502, { configured: true, message: "Could not read Sanity content." });
    const payload = await sanityResponse.json();
    const projects = (payload.result || []).map((project) => ({
      title: project.title,
      type: project.projectType || "film",
      category: project.projectType === "commercial" ? "Brand commercial" : project.projectType === "brand" ? "Brand world" : "Original film",
      year: String(project.year || new Date().getFullYear()),
      client: project.client || "SCENEIO STUDIO",
      services: project.services || "Concept / Production / Edit",
      description: project.caption || "",
      image: project.coverImageUrl || (project.videoId ? `https://img.youtube.com/vi/${project.videoId}/maxresdefault.jpg` : ""),
      videoUrl: project.videoUrl,
      videoId: project.videoId,
      isPublished: true
    }));
    return sendJSON(response, 200, { configured: true, projects });
  } catch (error) {
    return sendJSON(response, 502, { configured: true, message: "Could not reach Sanity." });
  }
};
