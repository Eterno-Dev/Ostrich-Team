/**
 * Modal de expediente: creacion, edicion, subida/pegado de imagenes y Lightbox.
 */

export function createModalController({ onSave, onDelete, uploadImage, resolveImageUrl, showToast }) {
  const backdrop = document.getElementById("projectModal");
  const form = document.getElementById("projectForm");
  const modalTitle = document.getElementById("modalTitle");
  const closeBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelModalBtn");
  const deleteBtn = document.getElementById("deleteProjectBtn");

  const fieldId = document.getElementById("fieldId");
  const fieldTitle = document.getElementById("fieldTitle");
  const fieldCode = document.getElementById("fieldCode");
  const fieldColumn = document.getElementById("fieldColumn");
  const fieldDate = document.getElementById("fieldDate");
  const fieldOwner = document.getElementById("fieldOwner");
  const fieldRefs = document.getElementById("fieldRefs");
  const fieldPitch = document.getElementById("fieldPitch");

  const uploadZone = document.getElementById("uploadZone");
  const selectImagesBtn = document.getElementById("selectImagesBtn");
  const imageFileInput = document.getElementById("imageFileInput");
  const galleryGrid = document.getElementById("galleryGrid");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const closeLightboxBtn = document.getElementById("closeLightboxBtn");

  let currentImages = [];
  let isUploading = false;

  function openLightbox(url) {
    lightboxImg.src = url;
    lightbox.classList.remove("hidden");
  }

  function closeLightbox() {
    lightbox.classList.add("hidden");
    lightboxImg.src = "";
  }

  async function renderGallery() {
    galleryGrid.innerHTML = "";
    for (let i = 0; i < currentImages.length; i++) {
      const src = currentImages[i];
      const item = document.createElement("div");
      item.className = "gallery-item";

      const img = document.createElement("img");
      img.alt = `Referencia ${i + 1}`;
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
        renderGallery();
      });

      item.appendChild(img);
      item.appendChild(removeBtn);
      galleryGrid.appendChild(item);
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    isUploading = true;
    selectImagesBtn.disabled = true;
    selectImagesBtn.textContent = "Subiendo...";

    try {
      for (const file of files) {
        const storedPath = await uploadImage(file);
        currentImages.push(storedPath);
      }
      await renderGallery();
      showToast(files.length === 1 ? "Imagen añadida" : `${files.length} imagenes añadidas`);
    } catch (err) {
      showToast(err.message || "Error al subir imagen");
    } finally {
      isUploading = false;
      selectImagesBtn.disabled = false;
      selectImagesBtn.textContent = "Subir imagen";
      imageFileInput.value = "";
    }
  }

  function open({ project = null, defaultColumn = "ideas", nextCode = "EXP-001" }) {
    const isEdit = Boolean(project);
    modalTitle.textContent = isEdit ? `Expediente ${project.code || ""}` : "Nuevo expediente";

    fieldId.value = isEdit ? project.id : "";
    fieldTitle.value = isEdit ? project.title || "" : "";
    fieldCode.value = isEdit ? project.code || nextCode : nextCode;
    fieldColumn.value = isEdit ? project.column || defaultColumn : defaultColumn;
    fieldDate.value = isEdit ? project.targetDate || "" : "";
    fieldOwner.value = isEdit ? project.owner || "" : "";
    fieldRefs.value = isEdit && Array.isArray(project.refs) ? project.refs.join(", ") : "";
    fieldPitch.value = isEdit ? project.pitch || "" : "";

    currentImages = isEdit && Array.isArray(project.images) ? [...project.images] : [];
    renderGallery();

    deleteBtn.classList.toggle("hidden", !isEdit);
    backdrop.classList.remove("hidden");
    fieldTitle.focus();
  }

  function close() {
    backdrop.classList.add("hidden");
  }

  selectImagesBtn.addEventListener("click", () => imageFileInput.click());
  imageFileInput.addEventListener("change", (e) => handleFiles(e.target.files));

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.style.backgroundColor = "#FFFFFF";
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.style.backgroundColor = "";
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.style.backgroundColor = "";
    handleFiles(e.dataTransfer.files);
  });

  // Pegar captura directamente con Ctrl+V cuando el modal esta abierto
  window.addEventListener("paste", (e) => {
    if (backdrop.classList.contains("hidden")) return;
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

    const data = {
      id: fieldId.value || `exp-${Date.now()}`,
      code: fieldCode.value.trim() || "EXP",
      title: fieldTitle.value.trim(),
      column: fieldColumn.value,
      targetDate: fieldDate.value,
      owner: fieldOwner.value.trim(),
      refs,
      pitch: fieldPitch.value.trim(),
      images: [...currentImages],
      updatedAt: new Date().toISOString()
    };

    if (!data.title) return;

    await onSave(data);
    close();
  });

  deleteBtn.addEventListener("click", async () => {
    const id = fieldId.value;
    if (!id) return;
    if (!confirm("¿Eliminar este expediente del tablero?")) return;
    await onDelete(id);
    close();
  });

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);

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

  return { open, close };
}
