import { resolveAssetUrl } from "../../../api/api";

function extractAssetValue(source) {
  if (!source) {
    return "";
  }

  if (Array.isArray(source)) {
    return extractAssetValue(source[0]);
  }

  if (typeof source === "object") {
    const candidates = [
      source.url,
      source.secure_url,
      source.secureUrl,
      source.imageUrl,
      source.image,
      source.uri,
      source.src,
      source.path,
      source.publicUrl,
    ];

    for (const candidate of candidates) {
      const resolved = extractAssetValue(candidate);

      if (resolved) {
        return resolved;
      }
    }

    return "";
  }

  return String(source).trim();
}

function getSeoRecord(source) {
  if (!source || typeof source !== "object") {
    return {};
  }

  return source.seo || source.meta || source.metadata || {};
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTimeWithTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN").format(number);
}

export function readingTimeFromContent(content) {
  const text = String(content || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.ceil(words / 220));

  return `${minutes} min read`;
}

function getCategoryRecord(source) {
  if (!source || typeof source !== "object") {
    return {};
  }

  return source.category || source.blogCategory || source.categoryId || {};
}

function getAuthorRecord(source) {
  if (!source || typeof source !== "object") {
    return {};
  }

  return source.author || source.createdBy || source.user || {};
}

export function normalizeBlogRecord(blog, index = 0) {
  const category = getCategoryRecord(blog);
  const seo = getSeoRecord(blog);
  const author = getAuthorRecord(blog);
  const rawId = blog?._id || blog?.id || blog?.blogId || "";
  const featuredImageRecord =
    blog?.featuredImage ||
    blog?.featuredImageUrl ||
    blog?.featuredImageRaw ||
    blog?.featuredImageData ||
    blog?.image ||
    blog?.imageUrl ||
    blog?.coverImage ||
    blog?.thumbnail ||
    "";
  const featuredImageRaw = extractAssetValue(featuredImageRecord);
  const featuredImageObject =
    featuredImageRecord && typeof featuredImageRecord === "object"
      ? featuredImageRecord
      : {
          url: featuredImageRaw,
        };
  const featuredImageAlt =
    featuredImageRecord?.altText ||
    featuredImageRecord?.alt ||
    blog?.featuredImageAlt ||
    blog?.imageAlt ||
    blog?.altText ||
    blog?.title ||
    "";
  const featuredImagePublicId =
    featuredImageRecord?.publicId ||
    featuredImageRecord?.public_id ||
    blog?.featuredImagePublicId ||
    "";
  const content = blog?.content || blog?.body || blog?.htmlContent || "";
  const status =
    String(
      blog?.status ||
        blog?.publishStatus ||
        (blog?.isArchived ? "archived" : "")
    )
      .toLowerCase()
      .trim() || "draft";
  const featured = Boolean(blog?.featured || blog?.isFeatured);
  const trending = Boolean(blog?.trending || blog?.isTrending);
  const views = Number(blog?.views ?? blog?.viewCount ?? blog?.totalViews ?? 0);

  return {
    id: rawId || `blog-${index + 1}`,
    title: blog?.title || blog?.name || "Untitled Blog",
    slug:
      blog?.slug || slugify(blog?.title || blog?.name || `blog-${index + 1}`),
    categoryId:
      category?._id || category?.id || blog?.categoryId || blog?.category || "",
    categoryName:
      category?.name ||
      category?.title ||
      blog?.categoryName ||
      blog?.category ||
      "Uncategorized",
    categorySlug: category?.slug || "",
    authorName:
      author?.name ||
      author?.fullName ||
      blog?.authorName ||
      blog?.author ||
      "Admin",
    authorRole:
      author?.role ||
      blog?.authorRole ||
      author?.designation ||
      blog?.authorTitle ||
      "",
    authorId: author?._id || author?.id || "",
    excerpt: blog?.excerpt || blog?.summary || blog?.shortDescription || "",
    content,
    featuredImage: resolveAssetUrl(featuredImageRaw),
    featuredImageUrl: resolveAssetUrl(featuredImageRaw),
    featuredImageRaw,
    featuredImageAlt,
    featuredImagePublicId,
    altText: featuredImageAlt,
    status,
    featured,
    trending,
    views: Number.isFinite(views) ? views : 0,
    publishDate:
      blog?.publishDate ||
      blog?.publishedAt ||
      blog?.published_on ||
      blog?.createdAt ||
      "",
    scheduledDate: blog?.scheduledDate || blog?.scheduledAt || "",
    createdAt: blog?.createdAt || "",
    updatedAt: blog?.updatedAt || "",
    tags: toArray(blog?.tags || blog?.keywords || seo?.keywords),
    seoTitle:
      seo?.metaTitle || blog?.seoTitle || blog?.metaTitle || blog?.title || "",
    metaDescription:
      seo?.metaDescription ||
      blog?.metaDescription ||
      blog?.description ||
      blog?.seoDescription ||
      "",
    seoKeywords: toArray(seo?.keywords || blog?.seoKeywords || blog?.keywords),
    canonicalUrl:
      seo?.canonicalUrl || blog?.canonicalUrl || blog?.canonical || "",
    ogImage: resolveAssetUrl(
      extractAssetValue(
        seo?.ogImage ||
          blog?.ogImage ||
          blog?.ogImageUrl ||
          blog?.socialImage ||
          ""
      )
    ),
    ogImageRaw: extractAssetValue(
      seo?.ogImage ||
        blog?.ogImage ||
        blog?.ogImageUrl ||
        blog?.socialImage ||
        ""
    ),
    seo: {
      metaTitle:
        seo?.metaTitle ||
        blog?.seoTitle ||
        blog?.metaTitle ||
        blog?.title ||
        "",
      metaDescription:
        seo?.metaDescription ||
        blog?.metaDescription ||
        blog?.description ||
        blog?.seoDescription ||
        "",
      canonicalUrl:
        seo?.canonicalUrl || blog?.canonicalUrl || blog?.canonical || "",
      ogImage: extractAssetValue(
        seo?.ogImage ||
          blog?.ogImage ||
          blog?.ogImageUrl ||
          blog?.socialImage ||
          ""
      ),
      keywords: toArray(seo?.keywords || blog?.seoKeywords || blog?.keywords),
    },
    featuredImageData: featuredImageObject,
    featuredImageObject,
    category,
    readingTime: blog?.readingTime || readingTimeFromContent(content),
    raw: blog || {},
  };
}

export function normalizeCategoryRecord(category, index = 0) {
  const rawId = category?._id || category?.id || category?.categoryId || "";
  const active =
    category?.isActive !== undefined
      ? Boolean(category.isActive)
      : category?.active !== undefined
      ? Boolean(category.active)
      : true;
  const imageRecord =
    category?.image ||
    category?.imageUrl ||
    category?.imageRaw ||
    category?.imageData ||
    category?.thumbnail ||
    "";
  const imageRaw = extractAssetValue(imageRecord);
  const imageObject =
    imageRecord && typeof imageRecord === "object"
      ? imageRecord
      : {
          url: imageRaw,
        };

  return {
    id: rawId || `category-${index + 1}`,
    name: category?.name || category?.title || "Untitled Category",
    slug: category?.slug || slugify(category?.name || category?.title || ""),
    description: category?.description || "",
    image: resolveAssetUrl(imageRaw),
    imageUrl: resolveAssetUrl(imageRaw),
    imageRaw,
    imageAlt:
      imageRecord?.altText || category?.imageAlt || category?.title || "",
    imagePublicId: imageRecord?.publicId || imageRecord?.public_id || "",
    imageObject,
    active,
    blogCount: Number(category?.blogCount || category?.totalBlogs || 0),
    createdAt: category?.createdAt || "",
    updatedAt: category?.updatedAt || "",
    raw: category || {},
  };
}

export function buildBlogFormData(form, featuredImageFile, ogImageFile) {
  const payload = new FormData();
  const seoPayload = {
    metaTitle: String(form.metaTitle || form.seoTitle || "").trim(),
    metaDescription: String(form.metaDescription || "").trim(),
    canonicalUrl: String(form.canonicalUrl || "").trim(),
    ogImage: String(form.ogImageRaw || "").trim(),
    keywords: toArray(form.seoKeywords || form.tags),
  };

  payload.append("title", String(form.title || "").trim());
  payload.append("slug", String(form.slug || "").trim());
  payload.append("categoryId", String(form.categoryId || "").trim());
  payload.append("category", String(form.categoryId || "").trim());
  payload.append("excerpt", String(form.excerpt || "").trim());
  payload.append("content", String(form.content || ""));
  payload.append("authorName", String(form.authorName || "").trim());
  payload.append("authorRole", String(form.authorRole || "").trim());
  payload.append("status", String(form.status || "draft").trim());
  payload.append("publishDate", String(form.publishDate || "").trim());
  payload.append("publishedAt", String(form.publishDate || "").trim());
  payload.append("scheduledDate", String(form.scheduledDate || "").trim());
  payload.append("scheduledAt", String(form.scheduledDate || "").trim());
  payload.append("featured", String(Boolean(form.featured)));
  payload.append("isFeatured", String(Boolean(form.featured)));
  payload.append("trending", String(Boolean(form.trending)));
  payload.append("isTrending", String(Boolean(form.trending)));
  payload.append("seoTitle", String(form.seoTitle || "").trim());
  payload.append(
    "metaTitle",
    String(form.metaTitle || form.seoTitle || "").trim()
  );
  payload.append("metaDescription", String(form.metaDescription || "").trim());
  payload.append(
    "seoKeywords",
    JSON.stringify(toArray(form.seoKeywords || form.tags))
  );
  payload.append("canonicalUrl", String(form.canonicalUrl || "").trim());
  payload.append("altText", String(form.altText || "").trim());
  payload.append("featuredImageAltText", String(form.altText || "").trim());
  payload.append("seo", JSON.stringify(seoPayload));

  if (Array.isArray(form.tags)) {
    payload.append("tags", JSON.stringify(form.tags));
  } else {
    payload.append("tags", JSON.stringify(toArray(form.tags)));
  }

  if (featuredImageFile) {
    payload.append("featuredImage", featuredImageFile);
    payload.append("image", featuredImageFile);
  } else if (
    form?.allowImageUrl === true &&
    String(form.featuredImageRaw || "").trim()
  ) {
    const featuredImageValue = String(form.featuredImageRaw || "").trim();
    payload.append("featuredImage", featuredImageValue);
    payload.append("featuredImageUrl", featuredImageValue);
    payload.append("image", featuredImageValue);
  }

  if (ogImageFile) {
    payload.append("ogImage", ogImageFile);
    payload.append("socialImage", ogImageFile);
  } else if (String(form.ogImageRaw || "").trim()) {
    payload.append("ogImage", String(form.ogImageRaw || "").trim());
  }

  return payload;
}

export function buildCategoryFormData(form, imageFile) {
  const payload = new FormData();

  payload.append("name", String(form.name || "").trim());
  payload.append("slug", String(form.slug || "").trim());
  payload.append("description", String(form.description || "").trim());
  payload.append("active", String(Boolean(form.active)));
  payload.append("isActive", String(Boolean(form.active)));

  if (imageFile) {
    payload.append("image", imageFile);
    payload.append("categoryImage", imageFile);
  }

  return payload;
}
