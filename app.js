const content = window.siteContent;
const storageKey = "sceneio-published-projects";
const projectGrid = document.querySelector("#project-grid");
const journalList = document.querySelector("#journal-list");
const modal = document.querySelector(".project-modal");
const publishForm = document.querySelector("#publish-form");
const publishStatus = document.querySelector("#publish-status");
let activeFilter = "all";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
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

function getSavedProjects() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function savePublishedProjects() {
  const savedProjects = content.projects.filter((project) => project.isPublished).slice(0, 30);
  window.localStorage.setItem(storageKey, JSON.stringify(savedProjects));
}

function hydrateSavedProjects() {
  const savedProjects = getSavedProjects();
  content.projects = [...savedProjects, ...content.projects.filter((project) => !project.isPublished)];
}

function renderProjects(filter = activeFilter) {
  activeFilter = filter;
  const projects = content.projects.filter((project) => filter === "all" || project.type === filter);
  projectGrid.innerHTML = projects.length ? projects.map((project) => `
    <article class="project-card reveal" data-project="${content.projects.indexOf(project)}" tabindex="0" role="button" aria-label="View ${escapeHTML(project.title)}">
      <div class="project-visual"><img src="${escapeHTML(project.image)}" alt="${escapeHTML(project.title)}" loading="lazy" />${project.isPublished ? '<span class="project-live">Live update</span>' : ""}</div>
      <div class="project-info">
        <h3 class="project-title">${escapeHTML(project.title)}</h3>
        <div class="project-meta">${escapeHTML(project.category)}<br />${escapeHTML(project.year)}</div>
      </div>
    </article>
  `).join("") : '<p class="empty-projects">No work in this cut yet.</p>';
  bindProjectCards();
  observeReveals();
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
  if (project.videoId) {
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
    const open = () => openProject(content.projects[Number(card.dataset.project)]);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  });
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-button.active").classList.remove("active");
    button.classList.add("active");
    renderProjects(button.dataset.filter);
  });
});

publishForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(publishForm);
  const title = String(formData.get("title") || "").trim();
  const videoUrl = String(formData.get("video-url") || "").trim();
  const caption = String(formData.get("caption") || "").trim();
  const videoId = getYouTubeId(videoUrl);
  if (!videoId) {
    publishStatus.textContent = "Please paste a valid YouTube link.";
    publishStatus.className = "publish-status error";
    return;
  }
  const type = String(formData.get("type"));
  const categoryMap = { film: "Original film", commercial: "Brand commercial", brand: "Brand world" };
  const coverImage = String(formData.get("image-url") || "").trim() || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const project = {
    title,
    type,
    category: categoryMap[type],
    year: String(new Date().getFullYear()),
    client: "SCENEIO STUDIO",
    services: "Concept / Production / Edit",
    description: caption,
    image: coverImage,
    videoId,
    isPublished: true
  };
  content.projects.unshift(project);
  savePublishedProjects();
  renderProjects(activeFilter);
  publishForm.reset();
  publishStatus.textContent = "Published in this browser. Your new project is now in the work reel.";
  publishStatus.className = "publish-status success";
  document.querySelector("#work").scrollIntoView({ behavior: "smooth" });
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

function observeReveals() {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); currentObserver.unobserve(entry.target); }
    });
  }, { threshold: .08 });
  document.querySelectorAll(".reveal:not(.visible)").forEach((element) => observer.observe(element));
}

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

hydrateSavedProjects();
renderProjects();
renderJournal();
observeReveals();
