import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const DEFAULT_LOCAL_API = "http://localhost:5000/api";
const DEFAULT_LAN_API = "http://192.168.1.41:5000/api";
const EMULATOR_APIS = ["http://10.0.2.2:5000/api", "http://10.0.3.2:5000/api"];
const API_URL_STORAGE_KEY = "evdivine_api_base_url";

let runtimeApiUrl = "";
let bootstrapPromise = null;

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }

  let text = String(value).trim();

  if (!text || text === "undefined" || text === "null") {
    return "";
  }

  if (text.startsWith("//")) {
    text = `http:${text}`;
  } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    text = `http://${text}`;
  }

  return text.replace(/\/+$/, "");
}

function normalizeApiCandidate(value) {
  const normalized = normalizeBaseUrl(value);

  if (!normalized) {
    return "";
  }

  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

function uniqueUrls(values) {
  return [...new Set(values.filter(Boolean))];
}

function isPrivateIpv4(hostname) {
  const match = hostname.match(
    /^(10|127)(?:\.\d{1,3}){3}$|^(?:192\.168|169\.254)(?:\.\d{1,3}){2}$|^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/
  );

  return Boolean(match);
}

function isLocalDevelopmentUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname;

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "10.0.2.2" ||
      hostname === "10.0.3.2" ||
      isPrivateIpv4(hostname)
    );
  } catch (error) {
    return false;
  }
}

function getExplicitConfiguredApiUrls() {
  const envApiUrl = normalizeApiCandidate(process.env.EXPO_PUBLIC_API_URL);
  const extraApiUrl = normalizeApiCandidate(
    Constants?.expoConfig?.extra?.apiUrl ||
      Constants?.manifest?.extra?.apiUrl ||
      ""
  );

  return uniqueUrls(
    [envApiUrl, extraApiUrl]
      .map(normalizeApiCandidate)
      .filter((value) => value && value !== "http://undefined:5000/api")
  );
}

function getSavedApiUrls() {
  return uniqueUrls(
    [runtimeApiUrl]
      .map(normalizeApiCandidate)
      .filter((value) => value && value !== "http://undefined:5000/api")
  );
}

function getRuntimeFallbackUrls() {
  return uniqueUrls(
    [DEFAULT_LAN_API, ...EMULATOR_APIS, DEFAULT_LOCAL_API].map(
      normalizeApiCandidate
    )
  );
}

function getWebFallbacks() {
  if (typeof window === "undefined") {
    return [];
  }

  const hostname = window.location?.hostname;
  const protocol = window.location?.protocol || "http:";
  const hostUrl =
    hostname && hostname !== "undefined" && hostname !== "null"
      ? normalizeApiCandidate(`${protocol}//${hostname}:5000`)
      : "";

  return uniqueUrls([
    hostUrl,
    normalizeApiCandidate(`${protocol}//localhost:5000`),
    normalizeApiCandidate(`${protocol}//127.0.0.1:5000`),
  ]);
}

export async function bootstrapApiConfig() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = AsyncStorage.getItem(API_URL_STORAGE_KEY)
    .then((value) => {
      runtimeApiUrl = normalizeApiCandidate(value);
      return runtimeApiUrl;
    })
    .catch(() => {
      runtimeApiUrl = "";
      return "";
    })
    .finally(() => {
      bootstrapPromise = null;
    });

  return bootstrapPromise;
}

export async function setPreferredApiBaseUrl(value) {
  const nextUrl = normalizeApiCandidate(value);

  runtimeApiUrl = nextUrl;

  if (nextUrl) {
    await AsyncStorage.setItem(API_URL_STORAGE_KEY, nextUrl);
  } else {
    await AsyncStorage.removeItem(API_URL_STORAGE_KEY);
  }

  return nextUrl;
}

export async function clearPreferredApiBaseUrl() {
  runtimeApiUrl = "";
  await AsyncStorage.removeItem(API_URL_STORAGE_KEY);
}

export function getPreferredApiBaseUrl() {
  const configured = getBaseCandidates();

  if (configured.length > 0) {
    return configured[0];
  }

  const runtimeFallbacks = getRuntimeFallbackUrls();
  return runtimeFallbacks[0] || DEFAULT_LOCAL_API;
}

function getBaseCandidates() {
  const explicitCandidates = getExplicitConfiguredApiUrls();
  const savedCandidates = getSavedApiUrls();
  const webFallbacks = getWebFallbacks();
  const runtimeCandidates = getRuntimeFallbackUrls();

  if (typeof window !== "undefined") {
    return uniqueUrls([
      ...explicitCandidates,
      ...webFallbacks,
      ...savedCandidates,
      ...runtimeCandidates,
    ]);
  }

  return uniqueUrls([
    ...explicitCandidates,
    ...savedCandidates,
    ...runtimeCandidates,
  ]);
}

export function getApiBaseUrls() {
  return getBaseCandidates();
}

export function getApiBaseUrl() {
  return getApiBaseUrls()[0] || DEFAULT_LOCAL_API;
}
