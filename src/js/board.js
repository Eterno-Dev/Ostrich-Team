/**
 * Renderizado del tablero Kanban, Drag & Drop y resolucion de imagenes de portada.
 */

export const COLUMNS = [
  { id: "ideas", title: "Ideas / Pistas" },
  { id: "month1", title: "Proyecto 1 Mes" },
  { id: "month2", title: "Proyecto 2 Meses" },
  { id: "large", title: "Proyecto Grande" },
  { id: "archive", title: "Archivo / Notas" }
];

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMonth(monthStr) {
  if (!monthStr) return "Sin fecha";
  const parts = monthStr.split("-");
  if (parts.length !== 2) return monthStr;
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = Number(parts[1]) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${parts[0]}` : monthStr;
}

const PIN_SVG = `
  <svg class="case-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
    <path d="M12 17v5"></path>
    <path d="M8 3h8l-1.5 6 3.5 3v2H6v-2l3.5-3L8 3z"></path>
  </svg>
`;

const IMG_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
    <rect x="3" y="3" width="18" height="18"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
`;

const PLUS_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
`;

export function renderBoard({
  container,
  projects,
  searchQuery,
  ownerFilter,
  resolveImageUrl,
  onCardClick,
  onAddClick,
  onDropProject
}) {
  const query = (searchQuery || "").trim().toLowerCase();

  const filtered = projects.filter((p) => {
    if (ownerFilter && ownerFilter !== "all") {
      const owners = (p.owner || "").split(",").map((s) => s.trim().toLowerCase());
      if (!owners.includes(ownerFilter.toLowerCase())) return false;
    }
    if (!query) return true;
    const haystack = [
      p.code,
      p.title,
      p.pitch,
      p.owner,
      ...(p.refs || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  container.innerHTML = "";

  for (const col of COLUMNS) {
    const colProjects = filtered.filter((p) => p.column === col.id);

    const colEl = document.createElement("section");
    colEl.className = "kanban-column";
    colEl.dataset.col = col.id;

    colEl.innerHTML = `
      <header class="column-header">
        <div class="column-title-group">
          <h2 class="column-title">${escapeHtml(col.title)}</h2>
          <span class="column-count">${colProjects.length}</span>
        </div>
        <button type="button" class="column-add-btn" title="Nuevo caso en ${escapeHtml(col.title)}" aria-label="Nuevo caso en ${escapeHtml(col.title)}">
          ${PLUS_SVG}
        </button>
      </header>
      <div class="column-cards"></div>
    `;

    colEl.querySelector(".column-add-btn").addEventListener("click", () => onAddClick(col.id));

    const cardsWrap = colEl.querySelector(".column-cards");

    // Drag & Drop handlers en la columna
    colEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      colEl.classList.add("drag-over");
    });

    colEl.addEventListener("dragleave", (e) => {
      if (!colEl.contains(e.relatedTarget)) {
        colEl.classList.remove("drag-over");
      }
    });

    colEl.addEventListener("drop", (e) => {
      e.preventDefault();
      colEl.classList.remove("drag-over");
      const projectId = e.dataTransfer.getData("text/plain");
      if (projectId) {
        onDropProject(projectId, col.id);
      }
    });

    if (colProjects.length === 0) {
      const empty = document.createElement("div");
      empty.className = "column-empty";
      empty.textContent = "Sin expedientes";
      cardsWrap.appendChild(empty);
    } else {
      for (const proj of colProjects) {
        const card = createCardElement(proj, resolveImageUrl, onCardClick);
        cardsWrap.appendChild(card);
      }
    }

    container.appendChild(colEl);
  }
}

function createCardElement(proj, resolveImageUrl, onCardClick) {
  const card = document.createElement("article");
  card.className = "case-card";
  card.draggable = true;
  card.dataset.id = proj.id;

  const images = Array.isArray(proj.images) ? proj.images : [];
  const hasCover = images.length > 0;
  const refs = Array.isArray(proj.refs) ? proj.refs.slice(0, 4) : [];

  card.innerHTML = `
    <div class="case-top">
      <span class="case-code-wrap">
        ${PIN_SVG}
        <span class="case-code">${escapeHtml(proj.code || "EXP")}</span>
      </span>
      <span class="case-date">${escapeHtml(formatMonth(proj.targetDate))}</span>
    </div>

    ${hasCover ? `
      <div class="case-cover-wrap">
        <img class="case-cover" alt="${escapeHtml(proj.title)}" loading="lazy" />
        ${images.length > 1 ? `<span class="case-img-badge">${IMG_SVG}<span>${images.length}</span></span>` : ""}
      </div>
    ` : ""}

    <h3 class="case-title">${escapeHtml(proj.title)}</h3>
    ${proj.pitch ? `<p class="case-pitch">${escapeHtml(proj.pitch)}</p>` : ""}

    ${refs.length > 0 ? `
      <div class="case-refs">
        ${refs.map((r) => `<span class="ref-tag">${escapeHtml(r)}</span>`).join("")}
      </div>
    ` : ""}

    <div class="case-footer">
      <span class="case-owner">${escapeHtml(proj.owner || "Equipo")}</span>
      <span>Abrir expediente</span>
    </div>
  `;

  if (hasCover) {
    const imgEl = card.querySelector(".case-cover");
    resolveImageUrl(images[0]).then((url) => {
      if (url) imgEl.src = url;
    });
  }

  card.addEventListener("click", () => onCardClick(proj));

  card.addEventListener("dragstart", (e) => {
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", proj.id);
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}
