import { unlockVault, saveSession, loadSession, clearSession } from "./vault.js";
import { createDataClient } from "./githubApi.js";
import { renderCategoryTabs, renderCatalog } from "./board.js";
import { createModalController } from "./modal.js";

const lockScreen = document.getElementById("lockScreen");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");

const syncPill = document.getElementById("syncPill");
const syncText = document.getElementById("syncText");
const searchInput = document.getElementById("searchInput");
const syncBtn = document.getElementById("syncBtn");
const newProjectBtn = document.getElementById("newProjectBtn");
const logoutBtn = document.getElementById("logoutBtn");
const categoryTabs = document.getElementById("categoryTabs");
const catalogCount = document.getElementById("catalogCount");
const gamesGrid = document.getElementById("gamesGrid");
const toastEl = document.getElementById("toast");

let dataClient = null;
let projects = [];
let activeCategory = "all";
let modalCtrl = null;
let toastTimer = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2600);
}

function setSyncState(state, label) {
  syncPill.dataset.state = state;
  syncText.textContent = label;
}

function drawUI() {
  renderCategoryTabs({
    container: categoryTabs,
    projects,
    activeCategory,
    onSelect: (catId) => {
      activeCategory = catId;
      drawUI();
    }
  });

  renderCatalog({
    container: gamesGrid,
    countEl: catalogCount,
    projects,
    activeCategory,
    searchQuery: searchInput.value,
    resolveImageUrl: (src) => dataClient.resolveImageUrl(src),
    onCardClick: (proj) => modalCtrl.openDetail(proj)
  });
}

async function persistProjects(commitMsg) {
  setSyncState("syncing", "Guardando...");
  try {
    await dataClient.saveProjects(projects, commitMsg);
    setSyncState(dataClient.mode === "github" ? "ok" : "demo", dataClient.mode === "github" ? "Sincronizado" : "Local");
  } catch (err) {
    setSyncState("error", "Sin conexion");
    showToast(err.message || "No se pudo guardar");
    throw err;
  }
}

async function handleSaveProject(projectData) {
  const idx = projects.findIndex((p) => p.id === projectData.id);
  const isNew = idx === -1;
  if (isNew) {
    projects.unshift(projectData);
  } else {
    projects[idx] = projectData;
  }
  drawUI();
  await persistProjects(isNew ? `Nuevo juego: ${projectData.title}` : `Editar: ${projectData.title}`);
  showToast(isNew ? "Juego añadido" : "Cambios guardados");
}

async function handleDeleteProject(projectId) {
  const item = projects.find((p) => p.id === projectId);
  projects = projects.filter((p) => p.id !== projectId);
  drawUI();
  await persistProjects(`Eliminar: ${item?.title || projectId}`);
  showToast("Juego eliminado");
}

async function syncNow(silent = false) {
  if (!dataClient) return;
  setSyncState("syncing", "Actualizando...");
  try {
    const res = await dataClient.loadProjects({ conditional: false });
    if (res.projects) {
      projects = res.projects;
      drawUI();
    }
    setSyncState(dataClient.mode === "github" ? "ok" : "demo", dataClient.mode === "github" ? "Sincronizado" : "Local");
    if (!silent) showToast("Catalogo actualizado");
  } catch (err) {
    setSyncState("error", "Sin conexion");
    showToast(err.message || "Fallo de conexion");
  }
}

async function startApp(sessionConfig) {
  dataClient = createDataClient(sessionConfig);

  modalCtrl = createModalController({
    onSave: handleSaveProject,
    onDelete: handleDeleteProject,
    uploadImage: (file) => dataClient.uploadImage(file),
    resolveImageUrl: (src) => dataClient.resolveImageUrl(src),
    showToast
  });

  lockScreen.classList.add("hidden");
  appShell.classList.remove("hidden");

  await syncNow(true);

  if (dataClient.mode === "github") {
    dataClient.startPolling((updatedProjects) => {
      projects = updatedProjects;
      drawUI();
      setSyncState("ok", "Sincronizado");
    }, 20000);
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  loginBtn.disabled = true;
  loginBtn.textContent = "Verificando...";

  try {
    const config = await unlockVault(passwordInput.value);
    saveSession(config);
    passwordInput.value = "";
    await startApp(config);
  } catch (_) {
    loginError.textContent = "Clave incorrecta.";
    loginError.classList.remove("hidden");
    passwordInput.select();
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

searchInput.addEventListener("input", drawUI);
syncBtn.addEventListener("click", () => syncNow(false));
newProjectBtn.addEventListener("click", () => modalCtrl.openCreate());

logoutBtn.addEventListener("click", () => {
  if (dataClient) dataClient.stopPolling();
  clearSession();
  appShell.classList.add("hidden");
  lockScreen.classList.remove("hidden");
  passwordInput.focus();
});

const existingSession = loadSession();
if (existingSession) {
  startApp(existingSession);
}
