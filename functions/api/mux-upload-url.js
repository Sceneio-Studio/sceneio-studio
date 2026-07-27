import { allowedCategories, env, getBody, json, muxAuth, requireUser, supabaseHeaders } from "../_shared.js";

export async function onRequestPost(context) {
  try {
    const user = await requireUser(context);
    const body = await getBody(context.request);
    if (!body || !body.title || !body.caption || !allowedCategories.has(body.category)) {
      return json(400, { message: "Title, caption and a valid category are required." });
    }
    const origin = context.request.headers.get("Origin") || "*";
    const muxResponse = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: { Authorization: muxAuth(context), "Content-Type": "application/json" },
      body: JSON.stringify({
        cors_origin: origin,
        new_asset_settings: { playback_policies: ["public"] },
        passthrough: user.id
      })
    });
    const muxResult = await muxResponse.json();
    if (!muxResponse.ok) return json(502, { message: muxResult.error?.messages?.join(" ") || "Mux could not create the upload." });

    const project = {
      title: String(body.title).trim(),
      caption: String(body.caption).trim(),
      category: body.category,
      cover_image_url: body.coverImageUrl || null,
      mux_upload_id: muxResult.data.id,
      status: "uploading",
      published: true,
      created_by: user.id
    };
    const supabaseResponse = await fetch(`${env(context, "SUPABASE_URL")}/rest/v1/projects`, {
      method: "POST",
      headers: supabaseHeaders(context),
      body: JSON.stringify(project)
    });
    if (!supabaseResponse.ok) {
      const failure = await supabaseResponse.text();
      return json(502, { message: `Upload created, but project metadata could not be saved: ${failure}` });
    }
    return json(200, { uploadUrl: muxResult.data.url, uploadId: muxResult.data.id });
  } catch (error) {
    return json(error.message.startsWith("Missing ") ? 500 : 401, { message: error.message });
  }
}
