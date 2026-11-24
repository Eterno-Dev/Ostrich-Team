import { encryptVaultPayload } from "./vault.js";

const setupForm = document.getElementById("setupForm");
const ghOwner = document.getElementById("ghOwner");
const ghRepo = document.getElementById("ghRepo");
const ghBranch = document.getElementById("ghBranch");
const vaultPassword = document.getElementById("vaultPassword");
const ghToken = document.getElementById("ghToken");
const testConnBtn = document.getElementById("testConnBtn");
const setupStatus = document.getElementById("setupStatus");
const resultBlock = document.getElementById("resultBlock");
const vaultOutput = document.getElementById("vaultOutput");
const copyVaultBtn = document.getElementById("copyVaultBtn");
const downloadVaultBtn = document.getElementById("downloadVaultBtn");

function showStatus(msg, isError = true) {
  setupStatus.textContent = msg;
  setupStatus.style.backgroundColor = isError ? "var(--status-err-bg)" : "var(--status-ok-bg)";
  setupStatus.style.color = isError ? "var(--status-err)" : "var(--status-ok)";
  setupStatus.style.borderColor = isError ? "var(--status-err)" : "var(--status-ok)";
  setupStatus.classList.remove("hidden");
}

function buildVaultFileContent(encryptedConfig) {
  return `/**
 * Boveda cifrada AES-256-GCM + PBKDF2-SHA256.
 * Generada con src/html/setup.html para Ostrich Team.
 */

export const VAULT_CONFIG = ${JSON.stringify(encryptedConfig, null, 2)};

const SESSION_KEY = "ostrich_team_session_v1";

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function deriveKey(password, saltBytes, iterations) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function unlockVault(password) {
  const key = await deriveKey(password, base64ToBytes(VAULT_CONFIG.salt), VAULT_CONFIG.iterations);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(VAULT_CONFIG.iv) },
    key,
    base64ToBytes(VAULT_CONFIG.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

export async function encryptVaultPayload(payloadObj, password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 200000;
  const key = await deriveKey(password, saltBytes, iterations);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    new TextEncoder().encode(JSON.stringify(payloadObj))
  );
  return {
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: bytesToBase64(saltBytes),
    iv: bytesToBase64(ivBytes),
    ciphertext: bytesToBase64(new Uint8Array(encrypted))
  };
}

export function saveSession(config) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(config)); } catch (_) {}
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
}
`;
}

testConnBtn.addEventListener("click", async () => {
  const owner = ghOwner.value.trim();
  const repo = ghRepo.value.trim();
  const token = ghToken.value.trim();

  if (!owner || !repo || !token) {
    showStatus("Rellena usuario, repositorio y token antes de probar.");
    return;
  }

  testConnBtn.disabled = true;
  testConnBtn.textContent = "Probando...";
  try {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub devolvio ${res.status}. Revisa el nombre del repo y los permisos del token.`);
    }
    const data = await res.json();
    showStatus(`Conexion correcta con ${data.full_name} (${data.private ? "Privado" : "Publico"}).`, false);
  } catch (err) {
    showStatus(err.message || "Error de conexion con GitHub.");
  } finally {
    testConnBtn.disabled = false;
    testConnBtn.textContent = "Probar conexion";
  }
});

setupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setupStatus.classList.add("hidden");

  const payload = {
    mode: "github",
    owner: ghOwner.value.trim(),
    repo: ghRepo.value.trim(),
    branch: ghBranch.value.trim() || "main",
    token: ghToken.value.trim()
  };

  const password = vaultPassword.value;
  if (!password) {
    showStatus("Introduce una clave de equipo.");
    return;
  }

  const encrypted = await encryptVaultPayload(payload, password);
  vaultOutput.value = buildVaultFileContent(encrypted);
  resultBlock.classList.remove("hidden");
  showStatus("Boveda cifrada generada. Reemplaza src/js/vault.js y sube los cambios a GitHub Pages.", false);
});

copyVaultBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(vaultOutput.value);
  copyVaultBtn.textContent = "Copiado";
  setTimeout(() => { copyVaultBtn.textContent = "Copiar codigo"; }, 1800);
});

downloadVaultBtn.addEventListener("click", () => {
  const blob = new Blob([vaultOutput.value], { type: "application/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vault.js";
  a.click();
});
