import API from "../api/api";
import { normalizeList, normalizeObject } from "../admin/utils/adminApi";
import { normalizeBlogRecord } from "../admin/components/blogs/blogUtils";

function cleanValue(value) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const text = String(value).trim();
  return text ? text : undefined;
}

export function buildPublicBlogParams(filters = {}) {
  const params = {};

  const page = Number(filters.page);
  const limit = Number(filters.limit);

  if (Number.isFinite(page) && page > 0) {
    params.page = page;
  }

  if (Number.isFinite(limit) && limit > 0) {
    params.limit = limit;
  }

  const search = cleanValue(filters.search || filters.q);
  const category = cleanValue(
    filters.category ||
      filters.categoryId ||
      filters.slug ||
      filters.categorySlug
  );

  if (search) {
    params.search = search;
    params.q = search;
  }

  if (category) {
    params.category = category;
    params.categoryId = category;
  }

  if (cleanValue(filters.status)) {
    params.status = cleanValue(filters.status);
  }

  if (cleanValue(filters.sort)) {
    params.sort = cleanValue(filters.sort);
  }

  if (cleanValue(filters.order)) {
    params.order = cleanValue(filters.order);
  }

  return params;
}

export function normalizePublicBlogPagination(data) {
  const source = normalizeObject(data);
  const pagination = source.pagination || source.meta || source.pageInfo || {};

  const currentPage = Number(
    pagination.currentPage ??
      pagination.page ??
      source.currentPage ??
      source.page ??
      1
  );
  const pageSize = Number(
    pagination.pageSize ??
      pagination.limit ??
      source.pageSize ??
      source.limit ??
      10
  );
  const totalBlogs = Number(
    pagination.totalBlogs ??
      pagination.total ??
      source.totalBlogs ??
      source.total ??
      source.count ??
      0
  );
  const totalPages = Number(
    pagination.totalPages ??
      pagination.pageCount ??
      source.totalPages ??
      (totalBlogs && pageSize ? Math.ceil(totalBlogs / pageSize) : 1)
  );

  return {
    currentPage: currentPage || 1,
    pageSize: pageSize || 10,
    totalBlogs: totalBlogs || 0,
    totalPages: totalPages || 1,
  };
}

export async function getPublicBlogs(filters = {}, config = {}) {
  const response = await API.request({
    url: "/public/blogs",
    method: "get",
    params: buildPublicBlogParams(filters),
    skipAuth: true,
    ...config,
  });

  return response.data;
}

export async function getPublicBlog(idOrSlug, config = {}) {
  const response = await API.request({
    url: `/public/blogs/${idOrSlug}`,
    method: "get",
    skipAuth: true,
    ...config,
  });

  return response.data;
}

export function normalizePublicBlogRecord(blog, index = 0) {
  return normalizeBlogRecord(normalizeObject(blog), index);
}

export function normalizePublicBlogList(data) {
  return normalizeList(data, ["blogs", "items", "results", "data"]).map((item, index) =>
    normalizePublicBlogRecord(item, index)
  );
}

export function normalizePublicBlogResponse(data) {
  const source = normalizeObject(data);

  return {
    blogs: normalizePublicBlogList(source),
    pagination: normalizePublicBlogPagination(source),
    raw: source,
  };
}
