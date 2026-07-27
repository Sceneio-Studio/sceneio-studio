const config = window.SCENEIO_CONFIG || {};
const authView = document.querySelector("#auth-view");
const uploadView = document.querySelector("#upload-view");
const loginForm = document.querySelector("#login-form");
const uploadForm = document.querySelector("#upload-form");
const logoutButton = document.querySelector("#logout-button");
const statusMessage = document.querySelector("#dashboard-status");
const loginStatus = document.querySelector("#login-status");
const uploadButton = document.querySelector("#upload-button");
const progress = document.querySelector("#upload-progress");
const progressBar = progress.querySelector("span");

const client = window.supabase && config.supabaseUrl && config.supabaseAnonKey
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

function setStatus(message, state = "") {
  statusMessage.textContent = message;
  statusMessage.className = `publish-status ${state}`.trim();
}

function setLoginStatus(message, state = "") {
  loginStatus.textContent = message;
  loginStatus.className = `publish-status ${state}`.trim();
}

function toggleView(session) {
  authView.classList.toggle("hidden", Boolean(session));
  uploadView.classList.toggle("hidden", !session);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function getSession() {
  if (!client) {
    toggleView(false);
    setLoginStatus("Add your Supabase URL and anon key to config.js before using the console.", "error");
    return null;
  }
  const { data: { session } } = await client.auth.getSession();
  toggleView(session);
  return session;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return getSession();
  const data = new FormData(loginForm);
  const button = loginForm.querySelector("button");
  button.disabled = true;
  setLoginStatus("Opening the console…");
  const { data: result, error } = await client.auth.signInWithPassword({
    email: String(data.get("email") || "").trim(),
    password: String(data.get("password") || "")
  });
  button.disabled = false;
  if (error) return setLoginStatus(error.message, "error");
  toggleView(result.session);
  setLoginStatus("");
});

logoutButton.addEventListener("click", async () => {
  await client?.auth.signOut();
  toggleView(false);
  setStatus("Signed out.");
});

function directUpload(url, file) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      progressBar.style.transform = `scaleX(${event.loaded / event.total})`;
      setStatus(`Uploading the master… ${Math.round((event.loaded / event.total) * 100)}%`);
    });
    request.addEventListener("load", () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Mux could not receive the video.")));
    request.addEventListener("error", () => reject(new Error("The upload connection was interrupted.")));
    request.send(file);
  });
}

async function waitForPlayback(uploadId, accessToken) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(3000);
    const response = await fetch("/api/mux-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ uploadId })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Mux processing failed.");
    if (result.status === "ready") return result;
    if (result.status === "errored") throw new Error("Mux could not process this video.");
    setStatus("Mux is processing the playback version…");
  }
  throw new Error("Processing is taking longer than expected. The project will finish in the background.");
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return getSession();
  const { data: { session } } = await client.auth.getSession();
  if (!session) return toggleView(false);
  const data = new FormData(uploadForm);
  const file = data.get("video");
  if (!(file instanceof File) || !file.size) return setStatus("Choose a video file first.", "error");
  uploadButton.disabled = true;
  progress.classList.remove("hidden");
  progressBar.style.transform = "scaleX(0)";
  try {
    setStatus("Preparing a direct upload…");
    const response = await fetch("/api/mux-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        title: String(data.get("title") || "").trim(),
        caption: String(data.get("caption") || "").trim(),
        category: String(data.get("category") || ""),
        coverImageUrl: String(data.get("coverImageUrl") || "").trim()
      })
    });
    const upload = await response.json();
    if (!response.ok) throw new Error(upload.message || "Could not create the Mux upload.");
    await directUpload(upload.uploadUrl, file);
    setStatus("Upload received. Building the playback version…");
    await waitForPlayback(upload.uploadId, session.access_token);
    setStatus("Published. The new project is now in the public reel.", "success");
    uploadForm.reset();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    uploadButton.disabled = false;
    window.setTimeout(() => progress.classList.add("hidden"), 700);
  }
});

client?.auth.onAuthStateChange((_event, session) => toggleView(session));
getSession();
