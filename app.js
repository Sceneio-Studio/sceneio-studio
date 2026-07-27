const content = window.siteContent;
const projectGrid = document.querySelector("#project-grid");
const journalList = document.querySelector("#journal-list");
const modal = document.querySelector(".project-modal");
let activeFilter = "all";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function getSupabaseClient() {
  const config = window.SCENEIO_CONFIG || {};
  if (!window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) return null;
  return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
}

function normalizeProject(row) {
  const playbackId = row.mux_playback_id || row.muxPlaybackId || "";
  const coverImage = row.cover_image_url || row.coverImageUrl || (playbackId ? `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.jpg?width=1400&time=1` : "");
  const category = row.category || "Other";
  return {
    title: row.title || "Untitled project",
    type: category,
    category,
    year: row.created_at ? new Date(row.created_at).getFullYear().toString() : (row.year || new Date().getFullYear().toString()),
    client: row.client || "SCENEIO STUDIO",
    services: row.services || "Concept / Production / Edit",
    description: row.caption || row.description || "A new piece from the SCENEIO STUDIO field journal.",
    image: coverImage,
    muxPlaybackId: playbackId,
    videoId: row.video_id || row.videoId || "",
    isPublished: row.published !== false,
    createdAt: row.created_at || ""
  };
}

async function loadProjects() {
  const client = getSupabaseClient();
  if (!client) return;
  const { data, error } = await client
    .from("projects")
    .select("title,caption,category,mux_playback_id,cover_image_url,published,created_at")
    .eq("published", true)
    .not("mux_playback_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  content.projects = (data || []).map(normalizeProject);
  renderProjects();
}

function renderProjects(filter = activeFilter) {
  activeFilter = filter;
  const projects = content.projects.filter((project) => filter === "all" || project.category === filter);
  projectGrid.innerHTML = projects.length ? projects.map((project, index) => {
    const projectIndex = content.projects.indexOf(project);
    const media = project.muxPlaybackId
      ? `<mux-player class="project-preview" playback-id="${escapeHTML(project.muxPlaybackId)}" ${project.image ? `poster="${escapeHTML(project.image)}"` : ""} muted playsinline preload="metadata" aria-label="Preview of ${escapeHTML(project.title)}"></mux-player>`
      : project.videoId
        ? `<img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title)}" loading="lazy" />`
        : `<img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title)}" loading="lazy" />`;
    return `
      <article class="project-card reveal" style="--reveal-delay:${Math.min(index * 90, 360)}ms" data-project="${projectIndex}" tabindex="0" role="button" aria-label="View ${escapeHTML(project.title)}">
        <div class="project-visual">${media}${project.isPublished ? '<span class="project-live">Live update</span>' : ""}</div>
        <div class="project-info">
          <h3 class="project-title">${escapeHTML(project.title)}</h3>
          <div class="project-meta">${escapeHTML(project.category)}<br />${escapeHTML(project.year)}</div>
        </div>
      </article>
    `;
  }).join("") : '<p class="empty-projects">No work in this cut yet.</p>';
  bindProjectCards();
  observeReveals();
  requestScrollMotion();
}

function renderJournal() {
  journalList.innerHTML = content.journal.map((entry) => `
    <article class="journal-entry reveal">
      <time class="journal-date">${escapeHTML(entry.date)}</time>
      <div><h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.tag)}</p></div>
      <span class="journal-arrow">↗</span>
    </article>
  `).join("");
}

function openProject(project) {
  document.querySelector("#modal-meta").textContent = `${project.category} / ${project.year}`;
  document.querySelector("#modal-title").textContent = project.title;
  document.querySelector("#modal-description").textContent = project.description;
  document.querySelector("#modal-client").textContent = project.client;
  document.querySelector("#modal-services").textContent = project.services;
  const modalMedia = document.querySelector("#modal-media");
  if (project.muxPlaybackId) {
    modalMedia.innerHTML = `<mux-player class="modal-player" playback-id="${escapeHTML(project.muxPlaybackId)}" ${project.image ? `poster="${escapeHTML(project.image)}"` : ""} autoplay controls playsinline></mux-player>`;
  } else if (project.videoId) {
    modalMedia.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(project.videoId)}" title="${escapeHTML(project.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  } else {
    modalMedia.innerHTML = `<div class="modal-image" style="background-image:url('${escapeHTML(project.image)}')"></div>`;
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeProject() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  window.setTimeout(() => { document.querySelector("#modal-media").innerHTML = ""; }, 400);
}

function bindProjectCards() {
  document.querySelectorAll(".project-card").forEach((card) => {
    const project = content.projects[Number(card.dataset.project)];
    const preview = card.querySelector(".project-preview");
    const open = () => openProject(project);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
    card.addEventListener("pointerenter", () => {
      if (preview && typeof preview.play === "function") preview.play().catch(() => {});
    });
    card.addEventListener("pointerleave", () => {
      if (preview && typeof preview.pause === "function") preview.pause();
    });
    if (!reducedMotion) {
      card.addEventListener("pointermove", (event) => {
        const visual = card.querySelector(".project-visual");
        const bounds = visual.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        visual.style.setProperty("--tilt-x", `${y * -5}deg`);
        visual.style.setProperty("--tilt-y", `${x * 5}deg`);
      });
      card.addEventListener("pointerleave", () => {
        const visual = card.querySelector(".project-visual");
        visual.style.setProperty("--tilt-x", "0deg");
        visual.style.setProperty("--tilt-y", "0deg");
      });
    }
  });
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-button.active")?.classList.remove("active");
    button.classList.add("active");
    renderProjects(button.dataset.filter);
  });
});

document.querySelector(".modal-close").addEventListener("click", closeProject);
modal.addEventListener("click", (event) => { if (event.target === modal) closeProject(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeProject(); });

const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector(".mobile-menu");
menuButton.addEventListener("click", () => {
  const isOpen = mobileMenu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
});
document.querySelectorAll(".mobile-menu a").forEach((link) => link.addEventListener("click", () => {
  mobileMenu.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");
}));

let revealObserver;
function observeReveals() {
  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); currentObserver.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  document.querySelectorAll(".reveal:not(.visible)").forEach((element) => revealObserver.observe(element));
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scrollProgress = document.querySelector(".scroll-progress span");
const hero = document.querySelector(".hero");
const heroImage = document.querySelector(".hero-image");
const heroContent = document.querySelector(".hero-content");
const heroOverlay = document.querySelector(".hero-overlay");
let scrollFrame = null;

function updateScrollMotion() {
  scrollFrame = null;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  scrollProgress.style.transform = `scaleX(${progress})`;
  if (reducedMotion) return;
  const heroProgress = Math.min(window.scrollY / Math.max(hero.offsetHeight, 1), 1);
  heroImage.style.transform = `scale(${1.04 + heroProgress * .1}) translate3d(0, ${heroProgress * 5}%, 0)`;
  heroContent.style.transform = `translate3d(0, ${heroProgress * 12}%, 0)`;
  heroOverlay.style.opacity = String(1 - heroProgress * .14);
  document.querySelectorAll(".project-card").forEach((card) => {
    const bounds = card.getBoundingClientRect();
    const distance = (bounds.top + bounds.height / 2 - window.innerHeight / 2) / window.innerHeight;
    card.style.setProperty("--lift", `${Math.max(-10, Math.min(10, distance * -8))}px`);
  });
}

function requestScrollMotion() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollMotion);
}

window.addEventListener("scroll", requestScrollMotion, { passive: true });
window.addEventListener("resize", requestScrollMotion);

const cursor = document.querySelector(".cursor");
const cursorLabel = document.querySelector(".cursor-label");
let cursorX = 0;
let cursorY = 0;
let followerX = 0;
let followerY = 0;
window.addEventListener("mousemove", (event) => { cursorX = event.clientX; cursorY = event.clientY; cursor.style.opacity = "1"; });
function animateCursor() {
  followerX += (cursorX - followerX) * .18;
  followerY += (cursorY - followerY) * .18;
  cursor.style.left = `${cursorX}px`;
  cursor.style.top = `${cursorY}px`;
  cursorLabel.style.left = `${followerX}px`;
  cursorLabel.style.top = `${followerY}px`;
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.addEventListener("mouseover", (event) => {
  const card = event.target.closest(".project-card");
  const link = event.target.closest("a, button, .magnetic");
  if (card) { cursor.classList.add("is-link"); cursorLabel.classList.add("visible"); }
  else if (link) { cursor.classList.add("is-link"); cursorLabel.classList.remove("visible"); }
});
document.addEventListener("mouseout", (event) => {
  if (event.target.closest(".project-card, a, button, .magnetic")) { cursor.classList.remove("is-link"); cursorLabel.classList.remove("visible"); }
});

document.querySelectorAll(".magnetic").forEach((element) => {
  element.addEventListener("mousemove", (event) => {
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * .12;
    const y = (event.clientY - bounds.top - bounds.height / 2) * .12;
    element.style.transform = `translate(${x}px, ${y}px)`;
  });
  element.addEventListener("mouseleave", () => { element.style.transform = "translate(0, 0)"; });
});

renderProjects();
renderJournal();
observeReveals();
requestScrollMotion();
loadProjects().catch((error) => console.warn("SCENEIO cloud projects unavailable; showing studio reel.", error));
