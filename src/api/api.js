import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bootstrapApiConfig, getApiBaseUrl, getApiBaseUrls } from "../config/api";

let adminAuthTokenCache = "";
let adminAuthTokenPromise = null;

export function setAdminAuthToken(token) {
  adminAuthTokenCache = String(token || "").trim();
  adminAuthTokenPromise = null;
}

export function clearAdminAuthToken() {
  adminAuthTokenCache = "";
  adminAuthTokenPromise = null;
}

export async function getAdminAuthToken() {
  if (adminAuthTokenCache) {
    return adminAuthTokenCache;
  }

  if (!adminAuthTokenPromise) {
    adminAuthTokenPromise = AsyncStorage.getItem("evdivine_admin_token")
      .then((token) => {
        adminAuthTokenCache = String(token || "").trim();
        return adminAuthTokenCache;
      })
      .catch(() => "")
      .finally(() => {
        adminAuthTokenPromise = null;
      });
  }

  return adminAuthTokenPromise;
}

function createClient(baseURL) {
  const client = axios.create({
    baseURL,
    timeout: 12000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(async (config) => {
    if (config?.skipAuth) {
      return config;
    }

    const isFormData =
      typeof FormData !== "undefined" && config?.data instanceof FormData;

    if (isFormData && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }

    const token = await getAdminAuthToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers["x-auth-token"] = token;
      config.headers.Authorization = token.startsWith("Bearer ")
        ? token
        : `Bearer ${token}`;
    }

    return config;
  });

  return client;
}

function isNetworkFailure(error) {
  return !error?.response;
}

async function requestWithFallback(config) {
  await bootstrapApiConfig();
  const baseUrls = getApiBaseUrls();
  let lastError = null;
  let lastNetworkError = null;

  for (const baseURL of baseUrls) {
    try {
      const client = createClient(baseURL);
      return await client.request(config);
    } catch (error) {
      lastError = error;

      if (!isNetworkFailure(error)) {
        throw error;
      }

      lastNetworkError = error;
    }
  }

  if (lastNetworkError) {
    const attempted = baseUrls.join(", ");
    const friendly = new Error(
      `Backend server reachable nahi hai. Tried: ${attempted}. Agar aap phone par app chala rahe ho, to backend ka public URL ya same Wi-Fi IP use karo.`
    );
    friendly.code = lastNetworkError.code || "NETWORK_ERROR";
    friendly.originalError = lastNetworkError;
    friendly.attemptedUrls = baseUrls;
    throw friendly;
  }

  throw lastError;
}

const API = {
  request: requestWithFallback,
  get: (url, config = {}) =>
    requestWithFallback({ ...config, method: "get", url }),
  post: (url, data, config = {}) =>
    requestWithFallback({ ...config, method: "post", url, data }),
  put: (url, data, config = {}) =>
    requestWithFallback({ ...config, method: "put", url, data }),
  patch: (url, data, config = {}) =>
    requestWithFallback({ ...config, method: "patch", url, data }),
  delete: (url, config = {}) =>
    requestWithFallback({ ...config, method: "delete", url }),
};

function safeParseUrl(value) {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
}

export function resolveAssetUrl(url) {
  if (!url) {
    return "";
  }

  const value = String(url).trim();

  if (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    value.startsWith("file:")
  ) {
    return value;
  }

  const parsed = safeParseUrl(value);
  const apiBase = safeParseUrl(getApiBaseUrl());
  const apiOrigin = apiBase?.origin || "";
  const fallbackProtocol =
    apiBase?.protocol ||
    (typeof window !== "undefined" && window.location?.protocol) ||
    "http:";

  if (value.startsWith("//")) {
    return resolveAssetUrl(`${fallbackProtocol}${value}`);
  }

  if (
    !parsed &&
    /^[a-z0-9.-]+:\d+\/.+/i.test(value) &&
    !value.startsWith("http://") &&
    !value.startsWith("https://")
  ) {
    return resolveAssetUrl(`${fallbackProtocol}//${value}`);
  }

  if (parsed) {
    if (["localhost", "127.0.0.1"].includes(parsed.hostname) && apiOrigin) {
      return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return value;
  }

  if (value.startsWith("/")) {
    return apiOrigin ? `${apiOrigin}${value}` : value;
  }

  if (value.includes("/")) {
    return apiOrigin ? `${apiOrigin}/${value}` : value;
  }

  return value;
}

export default API;
