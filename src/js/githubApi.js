/**
 * Capa de datos unificada:
 * - Modo GitHub: lee y escribe data/projects.json e imagenes en el repo privado via GitHub REST API.
 * - Modo Local/Demo: persiste en localStorage con datos iniciales listos para probar.
 */

const DEMO_STORAGE_KEY = "ostrich_team_demo_projects_v1";
const DATA_PATH = "data/projects.json";

export const DEFAULT_PROJECTS = [
  {
    id: "exp-001",
    code: "EXP-001",
    title: "Sandstorm Crypt",
    column: "large",
    targetDate: "2027-04",
    owner: "Pau, Alex",
    refs: ["Hollow Knight", "Tunic", "Hyper Light Drifter"],
    pitch: "Aventura isometrica en ruinas enterradas bajo dunas cambiantes. Combate preciso y mapa sin texto.",
    images: ["./src/assets/images/svg/sample-dune.svg"],
    updatedAt: "2026-11-20T10:00:00Z"
  },
  {
    id: "exp-002",
    code: "EXP-002",
    title: "Folio Gambit",
    column: "month1",
    targetDate: "2027-01",
    owner: "Alex",
    refs: ["Balatro", "Inscryption"],
    pitch: "Roguelike de cartas en una mesa de pruebas policiales. Combina pistas para resolver casos en 15 minutos.",
    images: ["./src/assets/images/svg/sample-cards.svg"],
    updatedAt: "2026-11-21T15:30:00Z"
  },
  {
    id: "exp-003",
    code: "EXP-003",
    title: "Greenhouse Post",
    column: "month2",
    targetDate: "2027-02",
    owner: "Sara, Pau",
    refs: ["A Short Hike", "Dredge"],
    pitch: "Gestion relajada de una estacion de correo rural con repartos diarios y mejora de vehiculos.",
    images: ["./src/assets/images/svg/sample-cozy.svg"],
    updatedAt: "2026-11-22T12:15:00Z"
  },
  {
    id: "exp-004",
    code: "EXP-004",
    title: "Noir Signal 99",
    column: "ideas",
    targetDate: "2027-06",
    owner: "Sara",
    refs: ["Disco Elysium", "Papers Please"],
    pitch: "Investigacion narrativa nocturna interceptando frecuencias de radio en una ciudad costera.",
    images: ["./src/assets/images/svg/sample-noir.svg"],
    updatedAt: "2026-11-23T18:00:00Z"
  }
];

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const clean = b64.replace(/\s/g, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

function sanitizeFilename(name) {
  return (name || "ref.png")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export function createDataClient(sessionConfig) {
  const isGitHub = sessionConfig?.mode === "github" && sessionConfig.token && sessionConfig.owner && sessionConfig.repo;

  if (!isGitHub) {
    return createDemoClient();
  }

  return createGitHubClient(sessionConfig);
}

function createDemoClient() {
  return {
    mode: "demo",
    async loadProjects() {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (!raw) {
        const initial = structuredClone(DEFAULT_PROJECTS);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
        return { projects: initial, changed: true };
      }
      return { projects: JSON.parse(raw), changed: true };
    },
    async saveProjects(projects) {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(projects));
      return { ok: true };
    },
    async uploadImage(file) {
      return await fileToDataUrl(file);
    },
    async resolveImageUrl(src) {
      return src;
    },
    startPolling() {},
    stopPolling() {}
  };
}

function createGitHubClient({ owner, repo, branch = "main", token }) {
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`;
  let currentSha = null;
  let lastEtag = null;
  let pollTimer = null;
  const imageUrlCache = new Map();

  function headers(extra = {}) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...extra
    };
  }

  async function loadProjects({ conditional = false } = {}) {
    const url = `${apiBase}/${DATA_PATH}?ref=${encodeURIComponent(branch)}`;
    const reqHeaders = headers();
    if (conditional && lastEtag) {
      reqHeaders["If-None-Match"] = lastEtag;
    }

    const res = await fetch(url, { headers: reqHeaders, cache: "no-store" });

    if (res.status === 304) {
      return { projects: null, changed: false };
    }

    if (res.status === 404) {
      // Primer uso en repo vacio: crear archivo inicial
      const initial = structuredClone(DEFAULT_PROJECTS);
      await saveProjects(initial, "Inicializar tablero Ostrich Team");
      return { projects: initial, changed: true };
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub API ${res.status}: ${errText.slice(0, 120)}`);
    }

    const etag = res.headers.get("ETag");
    if (etag) lastEtag = etag;

    const json = await res.json();
    currentSha = json.sha;

    const decoded = base64ToUtf8(json.content || "");
    const parsed = JSON.parse(decoded);
    const projects = Array.isArray(parsed) ? parsed : (parsed.projects || []);
    return { projects, changed: true };
  }

  async function saveProjects(projects, message = "Actualizar tablero Ostrich Team") {
    const url = `${apiBase}/${DATA_PATH}`;
    const payload = {
      updatedAt: new Date().toISOString(),
      projects
    };

    const body = {
      message,
      branch,
      content: utf8ToBase64(JSON.stringify(payload, null, 2))
    };
    if (currentSha) {
      body.sha = currentSha;
    }

    const res = await fetch(url, {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body)
    });

    if (res.status === 409) {
      throw new Error("CONFLICT");
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al guardar (${res.status}): ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    currentSha = data.content?.sha || currentSha;
    lastEtag = null;
    return { ok: true };
  }

  async function uploadImage(file) {
    const safeName = `${Date.now()}-${sanitizeFilename(file.name)}`;
    const repoPath = `assets/uploads/${safeName}`;
    const url = `${apiBase}/${repoPath}`;
    const content = await fileToBase64(file);

    const res = await fetch(url, {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message: `Subir imagen ${safeName}`,
        branch,
        content
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error subiendo imagen (${res.status}): ${errText.slice(0, 120)}`);
    }

    // Guardar preview inmediata en cache local
    const blobUrl = URL.createObjectURL(file);
    imageUrlCache.set(`gh:${repoPath}`, blobUrl);
    return `gh:${repoPath}`;
  }

  async function resolveImageUrl(src) {
    if (!src) return "";
    if (!src.startsWith("gh:")) return src;
    if (imageUrlCache.has(src)) return imageUrlCache.get(src);

    const repoPath = src.slice(3);
    const url = `${apiBase}/${repoPath}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, {
      headers: headers({ Accept: "application/vnd.github.raw+json" })
    });

    if (!res.ok) return "";
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    imageUrlCache.set(src, blobUrl);
    return blobUrl;
  }

  function startPolling(onUpdate, intervalMs = 15000) {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const result = await loadProjects({ conditional: true });
        if (result.changed && result.projects) {
          onUpdate(result.projects);
        }
      } catch (_) {
        // Silenciar errores transitorios de red en polling
      }
    }, intervalMs);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return {
    mode: "github",
    owner,
    repo,
    loadProjects,
    saveProjects,
    uploadImage,
    resolveImageUrl,
    startPolling,
    stopPolling
  };
}
