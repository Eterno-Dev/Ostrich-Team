import { getCategoryLabel, formatMonth } from "./board.js";

/**
 * Modal dual estilo Steam:
 * 1. Vista Detalle (por defecto al hacer clic en un juego): portada, galeria, descripcion, objetivos, precio y enlaces.
 * 2. Modo Edicion (al pulsar el lapiz o "Nuevo juego"): formulario limpio con subida de imagenes blindada.
 */

const LINK_SVG = `
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
`;

function parseLinksText(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes("|")) {
        const [label, ...rest] = line.split("|");
        const url = rest.join("|").trim();
        return { label: label.trim() || url, url };
      }
      return { label: line.replace(/^https?:\/\//, "").slice(0, 40), url: line };
    })
    .filter((item) => item.url);
}

function formatLinksText(links) {
  if (!Array.isArray(links)) return "";
  return links
    .map((l) => (l.label && l.label !== l.url ? `${l.label} | ${l.url}` : l.url))
    .join("\n");
}

export function createModalController({ onSave, onDelete, uploadImage, resolveImageUrl, showToast }) {
  const backdrop = document.getElementById("projectModal");
  const modalTitle = document.getElementById("modalTitle");
  const editModeBtn = document.getElementById("editModeBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  // Vista Detalle
  const detailView = document.getElementById("detailView");
  const detailHeroWrap = document.getElementById("detailHeroWrap");
  const detailHeroImg = document.getElementById("detailHeroImg");
  const detailThumbStrip = document.getElementById("detailThumbStrip");
  const detailPitch = document.getElementById("detailPitch");
  const detailGoalsSection = document.getElementById("detailGoalsSection");
  const detailGoals = document.getElementById("detailGoals");
  const detailPrice = document.getElementById("detailPrice");
  const detailScope = document.getElementById("detailScope");
  const detailDate = document.getElementById("detailDate");
  const detailMode = document.getElementById("detailMode");
  const detailRefsBlock = document.getElementById("detailRefsBlock");
  const detailRefs = document.getElementById("detailRefs");
  const detailLinksBlock = document.getElementById("detailLinksBlock");
  const detailLinks = document.getElementById("detailLinks");

  // Vista Edicion
  const form = document.getElementById("projectForm");
  const editFooter = document.getElementById("editFooter");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const deleteBtn = document.getElementById("deleteProjectBtn");
  const saveBtn = document.getElementById("saveProjectBtn");

  const fieldId = document.getElementById("fieldId");
  const fieldTitle = document.getElementById("fieldTitle");
  const fieldColumn = document.getElementById("fieldColumn");
  const fieldPrice = document.getElementById("fieldPrice");
  const fieldDate = document.getElementById("fieldDate");
  const fieldMode = document.getElementById("fieldMode");
  const fieldRefs = document.getElementById("fieldRefs");
  const fieldPitch = document.getElementById("fieldPitch");
  const fieldGoals = document.getElementById("fieldGoals");
  const fieldLinks = document.getElementById("fieldLinks");

  const uploadZone = document.getElementById("uploadZone");
  const selectImagesBtn = document.getElementById("selectImagesBtn");
  const imageFileInput = document.getElementById("imageFileInput");
  const galleryGrid = document.getElementById("galleryGrid");

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const closeLightboxBtn = document.getElementById("closeLightboxBtn");

  let activeProject = null;
  let currentImages = [];
  let isEditMode = false;
  let isUploading = false;

  function openLightbox(url) {
    if (!url) return;
    lightboxImg.src = url;
    lightbox.classList.remove("hidden");
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    lightboxImg.src = "";
  }

  function setViewMode(editing) {
    isEditMode = editing;
    detailView.classList.toggle("hidden", editing);
    form.classList.toggle("hidden", !editing);
    editFooter.classList.toggle("hidden", !editing);
    editModeBtn.classList.toggle("hidden", editing);
  }

  async function renderDetailView(proj) {
    activeProject = proj;
    modalTitle.textContent = proj.title || "Proyecto";
    setViewMode(false);

    // Imagen principal y miniaturas
    const imgs = Array.isArray(proj.images) ? proj.images : [];
    detailThumbStrip.innerHTML = "";

    if (imgs.length > 0) {
      detailHeroWrap.classList.remove("hidden");
      const resolvedUrls = await Promise.all(imgs.map((src) => resolveImageUrl(src)));
      const validUrls = resolvedUrls.filter(Boolean);

      if (validUrls.length > 0) {
        detailHeroImg.src = validUrls[0];
        detailHeroImg.alt = proj.title || "";
        detailHeroWrap.onclick = () => openLightbox(detailHeroImg.src);

        if (validUrls.length > 1) {
          validUrls.forEach((url, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `thumb-btn${idx === 0 ? " active" : ""}`;
            const im = document.createElement("img");
            im.src = url;
            im.alt = `Captura ${idx + 1}`;
            btn.appendChild(im);
            btn.addEventListener("click", () => {
              detailHeroImg.src = url;
              detailThumbStrip.querySelectorAll(".thumb-btn").forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
            });
            detailThumbStrip.appendChild(btn);
          });
        }
      } else {
        detailHeroWrap.classList.add("hidden");
      }
    } else {
      detailHeroWrap.classList.add("hidden");
    }

    // Descripcion
    detailPitch.textContent = (proj.pitch || "").trim() || "Sin descripcion todavia.";

    // Objetivos
    const goals = Array.isArray(proj.goals) ? proj.goals.filter(Boolean) : [];
    detailGoals.innerHTML = "";
    detailGoalsSection.classList.toggle("hidden", goals.length === 0);
    for (const g of goals) {
      const li = document.createElement("li");
      li.textContent = g;
      detailGoals.appendChild(li);
    }

    // Ficha lateral
    detailPrice.textContent = (proj.price || "").trim() || "Por definir";
    detailScope.textContent = getCategoryLabel(proj.column);
    detailScope.dataset.col = proj.column || "ideas";
    detailDate.textContent = formatMonth(proj.targetDate);
    detailMode.textContent = (proj.mode || "").trim() || "Por definir";

    // Referencias
    const refs = Array.isArray(proj.refs) ? proj.refs.filter(Boolean) : [];
    detailRefs.innerHTML = "";
    detailRefsBlock.classList.toggle("hidden", refs.length === 0);
    for (const r of refs) {
      const tag = document.createElement("span");
      tag.className = "steam-tag";
      tag.textContent = r;
      detailRefs.appendChild(tag);
    }

    // Enlaces
    const links = Array.isArray(proj.links) ? proj.links.filter((l) => l && l.url) : [];
    detailLinks.innerHTML = "";
    detailLinksBlock.classList.toggle("hidden", links.length === 0);
    for (const l of links) {
      const a = document.createElement("a");
      a.className = "ref-link";
      a.href = l.url.startsWith("http") ? l.url : `https://${l.url}`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `${LINK_SVG}<span></span>`;
      a.querySelector("span").textContent = l.label || l.url;
      detailLinks.appendChild(a);
    }
  }

  async function renderEditGallery() {
    galleryGrid.innerHTML = "";
    for (let i = 0; i < currentImages.length; i++) {
      const src = currentImages[i];
      const item = document.createElement("div");
      item.className = "gallery-item";

      const img = document.createElement("img");
      img.alt = `Imagen ${i + 1}`;
      resolveImageUrl(src).then((resolved) => {
        if (resolved) {
          img.src = resolved;
          img.addEventListener("click", () => openLightbox(resolved));
        }
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "gallery-remove";
      removeBtn.title = "Quitar imagen";
      removeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      removeBtn.addEventListener("click", () => {
        currentImages.splice(i, 1);
        renderEditGallery();
      });

      item.appendChild(img);
      item.appendChild(removeBtn);
      galleryGrid.appendChild(item);
    }
  }

  function populateEditForm(proj) {
    const isEdit = Boolean(proj);
    modalTitle.textContent = isEdit ? `Editar: ${proj.title}` : "Nuevo juego";

    fieldId.value = isEdit ? proj.id : "";
    fieldTitle.value = isEdit ? proj.title || "" : "";
    fieldColumn.value = isEdit ? proj.column || "ideas" : "ideas";
    fieldPrice.value = isEdit ? proj.price || "" : "";
    fieldDate.value = isEdit ? proj.targetDate || "" : "";
    fieldMode.value = isEdit ? proj.mode || "" : "";
    fieldRefs.value = isEdit && Array.isArray(proj.refs) ? proj.refs.join(", ") : "";
    fieldPitch.value = isEdit ? proj.pitch || "" : "";
    fieldGoals.value = isEdit && Array.isArray(proj.goals) ? proj.goals.join("\n") : "";
    fieldLinks.value = isEdit ? formatLinksText(proj.links) : "";

    currentImages = isEdit && Array.isArray(proj.images) ? [...proj.images] : [];
    renderEditGallery();

    deleteBtn.classList.toggle("hidden", !isEdit);
    setViewMode(true);
    fieldTitle.focus();
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    isUploading = true;
    selectImagesBtn.disabled = true;
    saveBtn.disabled = true;
    selectImagesBtn.textContent = `Subiendo (0/${files.length})...`;

    let uploadedCount = 0;
    try {
      for (const file of files) {
        const storedPath = await uploadImage(file);
        currentImages.push(storedPath);
        uploadedCount++;
        selectImagesBtn.textContent = `Subiendo (${uploadedCount}/${files.length})...`;
        await renderEditGallery();
      }
      showToast(uploadedCount === 1 ? "Imagen subida" : `${uploadedCount} imagenes subidas`);
    } catch (err) {
      showToast(err.message || "Error al subir la imagen");
    } finally {
      isUploading = false;
      selectImagesBtn.disabled = false;
      saveBtn.disabled = false;
      selectImagesBtn.textContent = "Subir imagen";
      imageFileInput.value = "";
    }
  }

  function openDetail(project) {
    backdrop.classList.remove("hidden");
    renderDetailView(project);
  }

  function openCreate() {
    activeProject = null;
    backdrop.classList.remove("hidden");
    populateEditForm(null);
  }

  function close() {
    backdrop.classList.add("hidden");
    activeProject = null;
  }

  editModeBtn.addEventListener("click", () => {
    if (activeProject) populateEditForm(activeProject);
  });

  cancelEditBtn.addEventListener("click", () => {
    if (activeProject) {
      renderDetailView(activeProject);
    } else {
      close();
    }
  });

  selectImagesBtn.addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", (e) => handleFiles(e.target.files));

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--accent-blue)";
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.style.borderColor = "";
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "";
    handleFiles(e.dataTransfer.files);
  });

  window.addEventListener("paste", (e) => {
    if (backdrop.classList.contains("hidden") || !isEditMode) return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles = items
      .filter((it) => it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter(Boolean);
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFiles(imageFiles);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isUploading) return;

    const refs = fieldRefs.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const goals = fieldGoals.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const links = parseLinksText(fieldLinks.value);

    const data = {
      id: fieldId.value || `game-${Date.now()}`,
      title: fieldTitle.value.trim(),
      column: fieldColumn.value,
      price: fieldPrice.value.trim(),
      targetDate: fieldDate.value,
      mode: fieldMode.value.trim(),
      refs,
      pitch: fieldPitch.value.trim(),
      goals,
      links,
      images: [...currentImages],
      updatedAt: new Date().toISOString()
    };

    if (!data.title) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";
    try {
      await onSave(data);
      await renderDetailView(data);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar";
    }
  });

  deleteBtn.addEventListener("click", async () => {
    const id = fieldId.value;
    if (!id) return;
    if (!confirm("¿Eliminar este juego del catalogo?")) return;
    await onDelete(id);
    close();
  });

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  closeLightboxBtn.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!lightbox.classList.contains("hidden")) {
        closeLightbox();
      } else if (!backdrop.classList.contains("hidden")) {
        close();
      }
    }
  });

  return { openDetail, openCreate, close };
}
