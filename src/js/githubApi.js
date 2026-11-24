/**
 * Capa de datos blindada para GitHub Repo Privado (Ostrich-Team-Data).
 * - Cola secuencial de escritura (evita conflictos 409 por commits simultaneos).
 * - Reintentos automaticos con recarga de SHA ante cualquier 409 o error transitorio.
 * - Compresion y redimensionado automatico de imagenes en cliente antes de subir.
 */

const DEMO_STORAGE_KEY = "ostrich_team_steam_v1";
const DATA_PATH = "data/projects.json";

export const DEFAULT_PROJECTS = [
  {
    id: "exp-001",
    title: "PvP Tower Defense + Parkour 3D",
    column: "large",
    price: "14,99 €",
    mode: "Online PvP",
    targetDate: "2027-04",
    refs: ["Plants vs. Zombies", "Meet Your Maker", "Deckbuilder"],
    pitch: "PvP simultaneo al mejor de X puntos: fase 1 en vista isometrica diseñando un mapa cerrado con trampas para el rival; fase 2 en primera persona superando el mapa enemigo (estrategia + parkour/habilidad). Economia de oro por rendimiento para comprar defensas o mejoras temporales por ronda, con sistema deckbuilder (elige 1 de 3 defensas y 1 de 3 mejoras por ronda).",
    goals: [
      "Prototipo 3D de editor isometrico + movimiento en primera persona",
      "Sistema de cartas y economia de oro por ronda",
      "Multijugador 1v1 simultaneo sin tiempos muertos"
    ],
    links: [
      { label: "Meet Your Maker (Steam)", url: "https://store.steampowered.com/app/1194810/" },
      { label: "Plants vs. Zombies (Steam)", url: "https://store.steampowered.com/app/3590/" }
    ],
    images: [
      "./src/assets/images/jpg/meet-your-maker.jpg",
      "./src/assets/images/jpg/plants-vs-zombies.jpg"
    ],
    updatedAt: "2026-11-24T18:15:00Z"
  },
  {
    id: "exp-002",
    title: "Clash of Thieves Acelerado",
    column: "month2",
    price: "9,99 €",
    mode: "Online PvP",
    targetDate: "2027-02",
    refs: ["Clash of Clans", "King of Thieves"],
    pitch: "Juego estilo Clash of Clans superacelerado mezclado con King of Thieves: construyes y refuerzas tu base con trampas mientras atacas simultaneamente la base rival enviando tropas en lugar de controlar directamente a un unico personaje.",
    goals: [
      "Partidas rapidas de 3 a 5 minutos",
      "Editor rapido de base con trampas y oleadas de tropas"
    ],
    links: [
      { label: "King of Thieves (Google Play)", url: "https://play.google.com/store/apps/details?id=com.zeptolab.thieves.google" }
    ],
    images: [
      "./src/assets/images/png/king-of-thieves.png",
      "./src/assets/images/png/clash-of-clans.png"
    ],
    updatedAt: "2026-11-24T18:15:00Z"
  },
  {
    id: "exp-003",
    title: "Cooperativo Pixel Art",
    column: "month1",
    price: "4,99 €",
    mode: "Online Co-op",
    targetDate: "2027-01",
    refs: ["Pico Park", "Pixel Art"],
    pitch: "Juego multijugador online de plataformas con estetica pixel art centrado en la cooperacion y coordinacion en equipo.",
    goals: [
      "15 niveles cooperativos de 2 a 4 jugadores",
      "Controles simples aptos para cualquier jugador"
    ],
    links: [
      { label: "Pico Park (Steam)", url: "https://store.steampowered.com/app/1509960/" }
    ],
    images: ["./src/assets/images/jpg/pico-park.jpg"],
    updatedAt: "2026-11-24T18:15:00Z"
  },
  {
    id: "exp-004",
    title: "Defensa de Hordas Tactica",
    column: "month1",
    price: "6,99 €",
    mode: "Offline",
    targetDate: "2027-01",
    refs: ["Plants vs. Zombies", "Sir, We Have an Orc Problem"],
    pitch: "Juego offline de estrategia y defensa donde debes detener hordas de enemigos colocando diferentes unidades y objetos defensivos.",
    goals: [
      "10 tipos de defensas con sinergias",
      "Modo campaña corto y modo oleadas infinitas"
    ],
    links: [
      { label: "Plants vs. Zombies (Steam)", url: "https://store.steampowered.com/app/3590/" }
    ],
    images: ["./src/assets/images/jpg/plants-vs-zombies.jpg"],
    updatedAt: "2026-11-24T18:15:00Z"
  },
  {
    id: "exp-005",
    title: "Expansion de Bases y Negocios",
    column: "month2",
    price: "7,99 €",
    mode: "Offline",
    targetDate: "2027-03",
    refs: ["JellyGo", "Estrategia"],
    pitch: "Juego offline de gestion y estrategia en el que desarrollas ciudades o bases, inviertes en negocios y consigues recursos para seguir expandiendote.",
    goals: [
      "Mapa de nodos conquistables con gestion economica",
      "Progresion de mejoras entre partidas"
    ],
    links: [],
    images: ["./src/assets/images/svg/ref-jellygo.svg"],
    updatedAt: "2026-11-24T18:15:00Z"
  },
  {
    id: "exp-006",
    title: "Plataformas Sin Margen de Error",
    column: "month1",
    price: "4,99 €",
    mode: "Offline / Local",
    targetDate: "2027-02",
    refs: ["Golf It Over It!", "Bread & Fred"],
    pitch: "Juego local o multijugador de precision extrema donde un fallo te devuelve literalmente al principio del recorrido.",
    goals: [
      "Un unico mapa vertical continuo de alta precision",
      "Cronometro y soporte cooperativo local"
    ],
    links: [
      { label: "Bread & Fred (Steam)", url: "https://store.steampowered.com/app/1607680/" },
      { label: "Golfing Over It (Steam)", url: "https://store.steampowered.com/app/817510/" }
    ],
    images: [
      "./src/assets/images/jpg/bread-and-fred.jpg",
      "./src/assets/images/jpg/golfing-over-it.jpg"
    ],
    updatedAt: "2026-11-24T18:15:00Z"
  },
  {
    id: "exp-007",
    title: "Decisiones en Diario / Red Social",
    column: "ideas",
    price: "5,99 €",
    mode: "Offline",
    targetDate: "2027-03",
    refs: ["60 Seconds! Reatomized", "Narrativo"],
    pitch: "Juego offline donde tomas decisiones desde una zona estatica y cada eleccion tiene consecuencias directas reflejadas en un diario o red social.",
    goals: [
      "Sistema de eventos ramificados por dias",
      "Multiples finales segun reputacion y recursos"
    ],
    links: [
      { label: "60 Seconds! Reatomized (Steam)", url: "https://store.steampowered.com/app/1012880/" }
    ],
    images: ["./src/assets/images/jpg/60-seconds-reatomized.jpg"],
    updatedAt: "2026-11-24T18:15:00Z"
  }
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
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

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Optimiza cualquier imagen raster (PNG/JPG/WebP/BMP) a max 1280px JPEG para
 * garantizar subidas rapidas y sin fallos en GitHub API. Mantiene SVG/GIF intactos.
 */
async function prepareImageForUpload(file) {
  const type = (file.type || "").toLowerCase();
  if (type === "image/svg+xml" || type === "image/gif") {
    const ext = type === "image/svg+xml" ? "svg" : "gif";
    return { blob: file, ext };
  }

  try {
    const bitmapUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Imagen no compatible"));
      el.src = bitmapUrl;
    });
    URL.revokeObjectURL(bitmapUrl);

    const maxW = 1280;
    const maxH = 1280;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    if (w > maxW || h > maxH) {
      const ratio = Math.min(maxW / w, maxH / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#16202D";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (blob && blob.size > 0) {
      return { blob, ext: "jpg" };
    }
  } catch (_) {
    // Si canvas falla, subir archivo original
  }

  const fallbackExt = (file.name || "img.png").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return { blob: file, ext: fallbackExt };
}

function sanitizeBaseName(name) {
  const base = (name || "imagen").replace(/\.[^/.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32) || "imagen";
}

export function createDataClient(sessionConfig) {
  const isGitHub = sessionConfig?.mode === "github" && sessionConfig.token && sessionConfig.owner && sessionConfig.repo;
  return isGitHub ? createGitHubClient(sessionConfig) : createDemoClient();
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
      const { blob } = await prepareImageForUpload(file);
      return await blobToDataUrl(blob);
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
  let writeQueue = Promise.resolve();
  const imageUrlCache = new Map();

  function headers(extra = {}) {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...extra
    };
  }

  /**
   * Serializa todas las escrituras a GitHub para evitar carreras de HEAD (409).
   */
  function enqueueWrite(taskFn) {
    const next = writeQueue.then(taskFn, taskFn);
    writeQueue = next.catch(() => {});
    return next;
  }

  async function fetchCurrentDataSha() {
    const url = `${apiBase}/${DATA_PATH}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`;
    const res = await fetch(url, { headers: headers(), cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) return currentSha;
    const json = await res.json();
    return json.sha || null;
  }

  async function loadProjects({ conditional = false } = {}) {
    const cacheBust = conditional ? "" : `&_t=${Date.now()}`;
    const url = `${apiBase}/${DATA_PATH}?ref=${encodeURIComponent(branch)}${cacheBust}`;
    const reqHeaders = headers();
    if (conditional && lastEtag) {
      reqHeaders["If-None-Match"] = lastEtag;
    }

    const res = await fetch(url, { headers: reqHeaders, cache: "no-store" });

    if (res.status === 304) {
      return { projects: null, changed: false };
    }

    if (res.status === 404) {
      const initial = structuredClone(DEFAULT_PROJECTS);
      await saveProjects(initial, "Inicializar catalogo");
      return { projects: initial, changed: true };
    }

    if (!res.ok) {
      throw new Error(`No se pudo cargar (${res.status})`);
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

  function saveProjects(projects, message = "Actualizar catalogo") {
    return enqueueWrite(async () => {
      const url = `${apiBase}/${DATA_PATH}`;
      const payload = {
        updatedAt: new Date().toISOString(),
        projects
      };
      const encodedContent = utf8ToBase64(JSON.stringify(payload, null, 2));

      for (let attempt = 1; attempt <= 4; attempt++) {
        // Asegurar SHA actualizado en reintentos o si no se ha cargado
        if (!currentSha || attempt > 1) {
          currentSha = await fetchCurrentDataSha();
        }

        const body = {
          message,
          branch,
          content: encodedContent
        };
        if (currentSha) {
          body.sha = currentSha;
        }

        const res = await fetch(url, {
          method: "PUT",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          currentSha = data.content?.sha || currentSha;
          lastEtag = null;
          return { ok: true };
        }

        if (res.status === 409 || res.status >= 500) {
          await sleep(350 * attempt);
          continue;
        }

        throw new Error(`Error al guardar (${res.status})`);
      }

      throw new Error("No se pudo guardar tras varios intentos. Prueba de nuevo.");
    });
  }

  function uploadImage(file) {
    return enqueueWrite(async () => {
      const { blob, ext } = await prepareImageForUpload(file);
      const base64Content = await blobToBase64(blob);
      const baseName = sanitizeBaseName(file.name);

      for (let attempt = 1; attempt <= 4; attempt++) {
        const rand = Math.random().toString(36).slice(2, 7);
        const safeName = `${Date.now()}-${rand}-${baseName}.${ext}`;
        const repoPath = `assets/uploads/${safeName}`;
        const url = `${apiBase}/${repoPath}`;

        const res = await fetch(url, {
          method: "PUT",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            message: `Imagen ${safeName}`,
            branch,
            content: base64Content
          })
        });

        if (res.ok) {
          const blobUrl = URL.createObjectURL(blob);
          imageUrlCache.set(`gh:${repoPath}`, blobUrl);
          return `gh:${repoPath}`;
        }

        if (res.status === 409 || res.status >= 500) {
          await sleep(450 * attempt);
          continue;
        }

        throw new Error(`No se pudo subir la imagen (${res.status})`);
      }

      throw new Error("La subida de imagen tardo demasiado. Intentalo de nuevo.");
    });
  }

  async function resolveImageUrl(src) {
    if (!src) return "";
    if (!src.startsWith("gh:")) return src;
    if (imageUrlCache.has(src)) return imageUrlCache.get(src);

    const repoPath = src.slice(3);
    const url = `${apiBase}/${repoPath}?ref=${encodeURIComponent(branch)}`;
    try {
      const res = await fetch(url, {
        headers: headers({ Accept: "application/vnd.github.raw+json" })
      });
      if (!res.ok) return "";
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      imageUrlCache.set(src, blobUrl);
      return blobUrl;
    } catch (_) {
      return "";
    }
  }

  function startPolling(onUpdate, intervalMs = 20000) {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const result = await loadProjects({ conditional: true });
        if (result.changed && result.projects) {
          onUpdate(result.projects);
        }
      } catch (_) {
        // Silenciar errores transitorios en polling
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
