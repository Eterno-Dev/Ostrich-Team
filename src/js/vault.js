/**
 * Boveda cifrada AES-256-GCM + PBKDF2-SHA256.
 * Ni la clave de equipo ni el token de GitHub aparecen en texto plano en el codigo.
 * Para conectar un repositorio privado, usa src/html/setup.html y reemplaza este archivo.
 */

export const VAULT_CONFIG = {
  kdf: "PBKDF2-SHA256",
  iterations: 200000,
  salt: "J5BWN+zvrybRadibtgoa0g==",
  iv: "WGoHfNXPANXK+dDC",
  ciphertext: "oHkKlMzT7x73iOnuyZAcMVKYl18hrYa4JJGGXK4FiNdjSwxTEhL+aytDrWaXKW0iKHl1foP2kVGEvywhI4nm5/FhATVB8ITlP3B/ZLsA3gQRyCFembCcIgcxzVyjVcXy6+W+V2LdDMHMaiQjxrTAHOpZqzhFqyP3auBxLimh02oCGEIzVKPokxU/Oe5Ad2JEZKoVS0XAU9HaXumPAZnCZuO41fFNZ5jtxd16LGPTtLOEvY9xApkXxgeRg9E+PO9Ta5e5CP2E6Ajd"
};

const SESSION_KEY = "ostrich_team_session_v1";

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

async function deriveKey(password, saltBytes, iterations) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function unlockVault(password) {
  const saltBytes = base64ToBytes(VAULT_CONFIG.salt);
  const ivBytes = base64ToBytes(VAULT_CONFIG.iv);
  const cipherBytes = base64ToBytes(VAULT_CONFIG.ciphertext);

  const key = await deriveKey(password, saltBytes, VAULT_CONFIG.iterations);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    cipherBytes
  );

  const decoded = new TextDecoder().decode(plainBuffer);
  return JSON.parse(decoded);
}

export async function encryptVaultPayload(payloadObj, password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 200000;

  const key = await deriveKey(password, saltBytes, iterations);
  const plainBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    plainBytes
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
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(config));
  } catch (_) {
    // Ignorar si sessionStorage no esta disponible
  }
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) {
    // Ignorar
  }
}
