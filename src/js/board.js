/**
 * Catalogo horizontal estilo Steam con filtros por categoria y capsulas de juego.
 */

export const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "ideas", label: "Ideas", short: "Idea" },
  { id: "month1", label: "1 Mes", short: "1 Mes" },
  { id: "month2", label: "2 Meses", short: "2 Meses" },
  { id: "large", label: "Proyecto Grande", short: "Grande" },
  { id: "archive", label: "Archivo", short: "Archivo" }
];

export function getCategoryLabel(colId) {
  const found = CATEGORIES.find((c) => c.id === colId);
  return found ? (found.short || found.label) : "Idea";
}

export function formatMonth(monthStr) {
  if (!monthStr) return "Por definir";
  const parts = String(monthStr).split("-");
  if (parts.length !== 2) return monthStr;
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const idx = Number(parts[1]) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${parts[0]}` : monthStr;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCategoryTabs({ container, projects, activeCategory, onSelect }) {
  container.innerHTML = "";
  for (const cat of CATEGORIES) {
    const count = cat.id === "all"
      ? projects.length
      : projects.filter((p) => p.column === cat.id).length;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `cat-tab${activeCategory === cat.id ? " active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(activeCategory === cat.id));
    btn.innerHTML = `<span>${escapeHtml(cat.label)}</span><span class="cat-tab-count">${count}</span>`;
    btn.addEventListener("click", () => onSelect(cat.id));
    container.appendChild(btn);
  }
}

export function renderCatalog({
  container,
  countEl,
  projects,
  activeCategory,
  searchQuery,
  resolveImageUrl,
  onCardClick
}) {
  const query = (searchQuery || "").trim().toLowerCase();

  const filtered = projects.filter((p) => {
    if (activeCategory && activeCategory !== "all" && p.column !== activeCategory) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      p.title,
      p.pitch,
      p.mode,
      p.price,
      ...(p.refs || []),
      ...(p.goals || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  if (countEl) {
    countEl.textContent = filtered.length === 1 ? "1 juego" : `${filtered.length} juegos`;
  }

  container.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No hay juegos en esta vista.";
    container.appendChild(empty);
    return;
  }

  for (const proj of filtered) {
    const card = document.createElement("article");
    card.className = "game-card";

    const images = Array.isArray(proj.images) ? proj.images : [];
    const hasCover = images.length > 0;
    const scopeLabel = getCategoryLabel(proj.column);
    const priceText = (proj.price || "").trim() || "Por definir";
    const modeText = (proj.mode || "").trim();

    card.innerHTML = `
      <div class="game-cover-wrap">
        ${hasCover
          ? `<img class="game-cover" alt="${escapeHtml(proj.title)}" loading="lazy" />`
          : `<div class="game-cover-placeholder">Sin imagen</div>`
        }
      </div>
      <div class="game-card-body">
        <h2 class="game-card-title" title="${escapeHtml(proj.title)}">${escapeHtml(proj.title)}</h2>
        <div class="game-card-meta">
          <div class="game-badges">
            <span class="scope-badge" data-col="${escapeHtml(proj.column || "ideas")}">${escapeHtml(scopeLabel)}</span>
            ${modeText ? `<span class="mode-label">${escapeHtml(modeText)}</span>` : ""}
          </div>
          <span class="price-box">${escapeHtml(priceText)}</span>
        </div>
      </div>
    `;

    if (hasCover) {
      const imgEl = card.querySelector(".game-cover");
      resolveImageUrl(images[0]).then((url) => {
        if (url) imgEl.src = url;
      });
    }

    card.addEventListener("click", () => onCardClick(proj));
    container.appendChild(card);
  }
}
