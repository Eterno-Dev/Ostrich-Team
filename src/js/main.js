import { unlockVault, saveSession, loadSession, clearSession } from "./vault.js";
import { createDataClient } from "./githubApi.js";
import { renderBoard } from "./board.js";
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
const ownerFilter = document.getElementById("ownerFilter");
const syncBtn = document.getElementById("syncBtn");
const newProjectBtn = document.getElementById("newProjectBtn");
const logoutBtn = document.getElementById("logoutBtn");
const kanbanBoard = document.getElementById("kanbanBoard");
const toastEl = document.getElementById("toast");

let dataClient = null;
let projects = [];
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

function computeNextCode() {
  let maxNum = 0;
  for (const p of projects) {
    const match = String(p.code || "").match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }
  return `EXP-${String(maxNum + 1).padStart(3, "0")}`;
}

function refreshOwnerFilter() {
  const prev = ownerFilter.value;
  const set = new Set();
  for (const p of projects) {
    String(p.owner || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => set.add(name));
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  ownerFilter.innerHTML = `<option value="all">Todo el equipo</option>`;
  for (const name of sorted) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    ownerFilter.appendChild(opt);
  }
  if (Array.from(ownerFilter.options).some((o) => o.value === prev)) {
    ownerFilter.value = prev;
  }
}

function drawBoard() {
  renderBoard({
    container: kanbanBoard,
    projects,
    searchQuery: searchInput.value,
    ownerFilter: ownerFilter.value,
    resolveImageUrl: (src) => dataClient.resolveImageUrl(src),
    onCardClick: (proj) => modalCtrl.open({ project: proj }),
    onAddClick: (colId) => modalCtrl.open({ defaultColumn: colId, nextCode: computeNextCode() }),
    onDropProject: handleDropProject
  });
}

async function persistProjects(commitMsg) {
  setSyncState("syncing", "Guardando...");
  try {
    await dataClient.saveProjects(projects, commitMsg);
    if (dataClient.mode === "github") {
      setSyncState("ok", `${dataClient.repo}`);
    } else {
      setSyncState("demo", "Local");
    }
  } catch (err) {
    if (err.message === "CONFLICT") {
      showToast("Cambio remoto detectado. Recargando...");
      await syncNow(true);
    } else {
      setSyncState("error", "Error sync");
      showToast(err.message || "No se pudo guardar");
    }
  }
}

async function handleDropProject(projectId, targetColumn) {
  const item = projects.find((p) => p.id === projectId);
  if (!item || item.column === targetColumn) return;
  item.column = targetColumn;
  item.updatedAt = new Date().toISOString();
  drawBoard();
  await persistProjects(`Mover ${item.code} a ${targetColumn}`);
  showToast(`${item.code} movido`);
}

async function handleSaveProject(projectData) {
  const idx = projects.findIndex((p) => p.id === projectData.id);
  const isNew = idx === -1;
  if (isNew) {
    projects.unshift(projectData);
  } else {
    projects[idx] = projectData;
  }
  refreshOwnerFilter();
  drawBoard();
  await persistProjects(isNew ? `Nuevo caso ${projectData.code}` : `Editar ${projectData.code}`);
  showToast(isNew ? "Expediente creado" : "Expediente guardado");
}

async function handleDeleteProject(projectId) {
  const item = projects.find((p) => p.id === projectId);
  projects = projects.filter((p) => p.id !== projectId);
  refreshOwnerFilter();
  drawBoard();
  await persistProjects(`Eliminar ${item?.code || projectId}`);
  showToast("Expediente eliminado");
}

async function syncNow(silent = false) {
  if (!dataClient) return;
  setSyncState("syncing", "Sincronizando...");
  try {
    const res = await dataClient.loadProjects({ conditional: false });
    if (res.projects) {
      projects = res.projects;
      refreshOwnerFilter();
      drawBoard();
    }
    if (dataClient.mode === "github") {
      setSyncState("ok", `${dataClient.repo}`);
    } else {
      setSyncState("demo", "Local");
    }
    if (!silent) showToast("Tablero sincronizado");
  } catch (err) {
    setSyncState("error", "Error sync");
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
      refreshOwnerFilter();
      drawBoard();
      setSyncState("ok", `${dataClient.repo}`);
      showToast("Actualizado por el equipo");
    }, 15000);
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
    loginError.textContent = "Clave incorrecta. Intentalo de nuevo.";
    loginError.classList.remove("hidden");
    passwordInput.select();
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Desbloquear tablero";
  }
});

searchInput.addEventListener("input", drawBoard);
ownerFilter.addEventListener("change", drawBoard);
syncBtn.addEventListener("click", () => syncNow(false));
newProjectBtn.addEventListener("click", () => {
  modalCtrl.open({ defaultColumn: "ideas", nextCode: computeNextCode() });
});

logoutBtn.addEventListener("click", () => {
  if (dataClient) dataClient.stopPolling();
  clearSession();
  appShell.classList.add("hidden");
  lockScreen.classList.remove("hidden");
  passwordInput.focus();
});

// Restaurar sesion activa en la pestaña actual si ya se desbloqueo
const existingSession = loadSession();
if (existingSession) {
  startApp(existingSession);
}
