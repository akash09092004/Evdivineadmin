import API from "../api/api";
import {
  normalizeObject,
  normalizePageContentRecord,
} from "../admin/utils/adminApi";

function toText(value) {
  return String(value || "").trim();
}

async function requestPageContent(method, url, config = {}) {
  const response = await API.request({
    url,
    method,
    skipAuth: Boolean(config.skipAuth),
    ...config,
  });

  return response.data;
}

async function requestWithFallbacks(endpoints, config = {}) {
  let lastError = null;

  for (const { url, skipAuth } of endpoints) {
    try {
      return await requestPageContent("get", url, { ...config, skipAuth });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function getPageContentByKey(pageKey, config = {}) {
  const safeKey = toText(pageKey);

  return requestWithFallbacks(
    [
      { url: `/public/page-content/${safeKey}`, skipAuth: true },
      { url: `/public/content/pages/${safeKey}`, skipAuth: true },
      { url: `/page-content/${safeKey}`, skipAuth: true },
      { url: `/content/pages/${safeKey}`, skipAuth: true },
      { url: `/admin/page-content/${safeKey}` },
      { url: `/admin/content/pages/${safeKey}` },
    ],
    config
  );
}

export function normalizePageContent(data) {
  const source = normalizeObject(data);
  const record = normalizePageContentRecord(source);
  const page = record?.page || source.page || source.slug || "";

  return {
    pageKey: record?.pageKey || source.pageKey || page,
    page: page || record?.pageKey || "",
    title: record?.title || source.title || source.name || "Page",
    keywords: record?.keywords || source.keywords || "",
    description: record?.description || source.description || "",
    content: record?.content || source.content || "",
    isActive:
      record?.isActive !== undefined
        ? Boolean(record.isActive)
        : source.isActive !== undefined
        ? Boolean(source.isActive)
        : true,
    raw: source,
  };
}
