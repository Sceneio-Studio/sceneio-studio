const { env, getBody, json, muxAuth, requireUser, supabaseHeaders } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { message: "Method not allowed." });
  try {
    const user = await requireUser(event);
    const body = getBody(event);
    if (!body?.uploadId) return json(400, { message: "Upload ID is required." });
    const uploadId = encodeURIComponent(body.uploadId);
    const uploadResponse = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, { headers: { Authorization: muxAuth() } });
    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok) return json(502, { message: "Mux could not check this upload." });
    const upload = uploadResult.data;
    if (upload.status !== "asset_created" || !upload.asset_id) return json(200, { status: upload.status || "waiting" });

    const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${encodeURIComponent(upload.asset_id)}`, { headers: { Authorization: muxAuth() } });
    const assetResult = await assetResponse.json();
    if (!assetResponse.ok) return json(502, { message: "Mux created the asset, but playback is not ready yet." });
    const asset = assetResult.data;
    if (asset.status !== "ready" || !asset.playback_ids?.length) return json(200, { status: asset.status || "preparing" });
    const playbackId = asset.playback_ids[0].id;
    const filter = `mux_upload_id=eq.${encodeURIComponent(body.uploadId)}&created_by=eq.${encodeURIComponent(user.id)}`;
    const updateResponse = await fetch(`${env("SUPABASE_URL")}/rest/v1/projects?${filter}`, {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify({ mux_asset_id: upload.asset_id, mux_playback_id: playbackId, status: "ready", published: true })
    });
    if (!updateResponse.ok) return json(502, { message: "Playback is ready, but the project could not be published." });
    return json(200, { status: "ready", playbackId });
  } catch (error) {
    return json(error.message.startsWith("Missing ") ? 500 : 401, { message: error.message });
  }
};
