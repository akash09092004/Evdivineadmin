import API from "../../api/api";
import {
  buildBlogFormData,
  buildCategoryFormData,
  normalizeBlogRecord,
  normalizeCategoryRecord,
} from "../components/blogs/blogUtils";

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function rethrow(error, fallback) {
  const wrapped = new Error(getApiErrorMessage(error, fallback));
  wrapped.response = error?.response;
  wrapped.status = error?.response?.status;
  wrapped.originalError = error;
  throw wrapped;
}

export async function getAdminBlogs(params = {}, config = {}) {
  const response = await API.request({
    url: "/admin/blogs",
    method: "get",
    params,
    ...config,
  });

  return response.data;
}

export async function getAdminBlog(id, config = {}) {
  const response = await API.request({
    url: `/admin/blogs/${id}`,
    method: "get",
    ...config,
  });

  return response.data;
}

export async function createAdminBlog(
  form,
  imageFile,
  ogImageFile,
  config = {}
) {
  const payload =
    typeof FormData !== "undefined" && form instanceof FormData
      ? form
      : buildBlogFormData(form, imageFile, ogImageFile);

  const response = await API.request({
    url: "/admin/blogs",
    method: "post",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function updateAdminBlog(
  id,
  form,
  imageFile,
  ogImageFile,
  config = {}
) {
  const payload =
    typeof FormData !== "undefined" && form instanceof FormData
      ? form
      : buildBlogFormData(form, imageFile, ogImageFile);

  const response = await API.request({
    url: `/admin/blogs/${id}`,
    method: "put",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function deleteAdminBlog(id, config = {}) {
  const response = await API.request({
    url: `/admin/blogs/${id}`,
    method: "delete",
    ...config,
  });

  return response.data;
}

export async function patchAdminBlogStatus(id, status, config = {}) {
  const response = await API.request({
    url: `/admin/blogs/${id}/status`,
    method: "patch",
    data: { status },
    ...config,
  });

  return response.data;
}

export async function patchAdminBlogFeatured(id, featured, config = {}) {
  const response = await API.request({
    url: `/admin/blogs/${id}/featured`,
    method: "patch",
    data: { featured, isFeatured: featured },
    ...config,
  });

  return response.data;
}

export async function patchAdminBlogTrending(id, trending, config = {}) {
  const response = await API.request({
    url: `/admin/blogs/${id}/trending`,
    method: "patch",
    data: { trending, isTrending: trending },
    ...config,
  });

  return response.data;
}

export async function getAdminBlogCategories(params = {}, config = {}) {
  const response = await API.request({
    url: "/admin/blog-categories",
    method: "get",
    params,
    ...config,
  });

  return response.data;
}

export async function getAdminBlogCategory(id, config = {}) {
  const response = await API.request({
    url: `/admin/blog-categories/${id}`,
    method: "get",
    ...config,
  });

  return response.data;
}

export async function createAdminBlogCategory(form, imageFile, config = {}) {
  const payload =
    typeof FormData !== "undefined" && form instanceof FormData
      ? form
      : buildCategoryFormData(form, imageFile);

  const response = await API.request({
    url: "/admin/blog-categories",
    method: "post",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function updateAdminBlogCategory(
  id,
  form,
  imageFile,
  config = {}
) {
  const payload =
    typeof FormData !== "undefined" && form instanceof FormData
      ? form
      : buildCategoryFormData(form, imageFile);

  const response = await API.request({
    url: `/admin/blog-categories/${id}`,
    method: "put",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function deleteAdminBlogCategory(id, config = {}) {
  try {
    const response = await API.request({
      url: `/admin/blog-categories/${id}`,
      method: "delete",
      ...config,
    });

    return response.data;
  } catch (error) {
    if (
      error?.response?.status &&
      error.response.status !== 404 &&
      error.response.status !== 405
    ) {
      throw error;
    }

    const fallbackResponse = await API.request({
      url: `/admin/blog-categories/${id}/delete`,
      method: "delete",
      ...config,
    });

    return fallbackResponse.data;
  }
}

export async function patchAdminBlogCategoryStatus(id, active, config = {}) {
  const response = await API.request({
    url: `/admin/blog-categories/${id}/status`,
    method: "patch",
    data: { active, isActive: active },
    ...config,
  });

  return response.data;
}

export {
  normalizeBlogRecord,
  normalizeCategoryRecord,
  rethrow,
  getApiErrorMessage,
};
