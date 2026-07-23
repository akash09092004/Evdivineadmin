import Constants from "expo-constants";

const DEFAULT_LOCAL_API = "http://localhost:5000/api";
const DEFAULT_LAN_API = "http://192.168.1.41:5000/api";
const EMULATOR_APIS = ["http://10.0.2.2:5000/api", "http://10.0.3.2:5000/api"];

function normalizeBaseUrl(value) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();

  if (!text || text === "undefined" || text === "null") {
    return "";
  }

  return text.replace(/\/+$/, "");
}

function withApiPath(value) {
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

function getWebFallbacks() {
  if (typeof window === "undefined") {
    return [];
  }

  const hostname = window.location?.hostname;
  const protocol = window.location?.protocol || "http:";
  const hostUrl =
    hostname && hostname !== "undefined" && hostname !== "null"
      ? withApiPath(`${protocol}//${hostname}:5000`)
      : "";

  return uniqueUrls([
    hostUrl,
    withApiPath(`${protocol}//localhost:5000`),
    withApiPath(`${protocol}//127.0.0.1:5000`),
  ]);
}

const envApiUrl = withApiPath(process.env.EXPO_PUBLIC_API_URL);
const extraApiUrl = withApiPath(
  Constants?.expoConfig?.extra?.apiUrl ||
    Constants?.manifest?.extra?.apiUrl ||
    ""
);

function getBaseCandidates() {
  const webFallbacks = getWebFallbacks();
  const envCandidates = uniqueUrls(
    [extraApiUrl, envApiUrl]
      .map(withApiPath)
      .filter((value) => value && value !== "http://undefined:5000/api")
  );
  const runtimeCandidates = uniqueUrls(
    [DEFAULT_LAN_API, ...EMULATOR_APIS, DEFAULT_LOCAL_API].map(withApiPath)
  );

  if (typeof window !== "undefined") {
    const shouldPreferWebFallbacks =
      webFallbacks.length > 0 &&
      (envCandidates.length === 0 ||
        envCandidates.every(isLocalDevelopmentUrl));

    if (shouldPreferWebFallbacks) {
      return uniqueUrls([
        ...webFallbacks,
        ...envCandidates,
        ...runtimeCandidates,
      ]);
    }
  }

  return uniqueUrls([...envCandidates, ...webFallbacks, ...runtimeCandidates]);
}

const baseCandidates = getBaseCandidates();

export const API_BASE_URL = baseCandidates[0] || DEFAULT_LOCAL_API;
export const API_BASE_URLS = baseCandidates;

export function getApiBaseUrls() {
  return [...API_BASE_URLS];
}
