import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BlogFilters from "../../components/blogs/BlogFilters";
import BlogTable from "../../components/blogs/BlogTable";
import BlogSkeleton from "../../components/blogs/BlogSkeleton";
import BlogConfirmModal from "../../components/blogs/BlogConfirmModal";
import BlogToast, { useBlogToast } from "../../components/blogs/BlogToast";
import { BLOG_COLORS, blogShadow } from "../../components/blogs/blogTheme";
import {
  createAdminBlog,
  deleteAdminBlog,
  getAdminBlogCategories,
  getAdminBlogs,
  patchAdminBlogStatus,
  normalizeBlogRecord,
  normalizeCategoryRecord,
} from "../../services/adminBlogApi";
import { normalizeList, normalizeObject } from "../../utils/adminApi";

const PAGE_SIZE = 10;

const defaultFilters = {
  search: "",
  categoryId: "",
  status: "",
  featured: "",
  trending: "",
  dateFrom: "",
  dateTo: "",
};

function parsePagination(source, fallbackPage, fallbackCount, pageSize) {
  const data = normalizeObject(source);
  const pagination = data.pagination || data.meta || data.pageInfo || {};
  const total = Number(
    pagination.total ??
      data.total ??
      data.totalCount ??
      data.count ??
      fallbackCount ??
      0
  );
  const current = Number(pagination.page ?? data.page ?? fallbackPage ?? 1);
  const limit = Number(pagination.limit ?? data.limit ?? pageSize ?? PAGE_SIZE);
  const totalPages = Number(
    pagination.totalPages ??
      pagination.pageCount ??
      data.totalPages ??
      (total ? Math.ceil(total / limit) : 1)
  );

  return {
    page: current || 1,
    limit: limit || PAGE_SIZE,
    total: total || fallbackCount || 0,
    totalPages: totalPages || 1,
  };
}

function buildParams(page, filters) {
  return {
    page,
    limit: PAGE_SIZE,
    search: filters.search || undefined,
    q: filters.search || undefined,
    categoryId: filters.categoryId || undefined,
    category: filters.categoryId || undefined,
    status: filters.status || undefined,
    featured:
      filters.featured === ""
        ? undefined
        : filters.featured === "true" || filters.featured === true,
    trending:
      filters.trending === ""
        ? undefined
        : filters.trending === "true" || filters.trending === true,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
}

export default function BlogList() {
  const navigation = useNavigation();
  const { toast, showToast, hideToast } = useBlogToast();
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [confirmState, setConfirmState] = useState({
    visible: false,
    action: "",
    blog: null,
  });

  const loadCategories = useCallback(async () => {
    try {
      const categoryResponse = await getAdminBlogCategories({ limit: 200 });

      const categoryList = normalizeList(categoryResponse, [
        "categories",
        "items",
        "results",
        "data",
      ]).map((item, index) => normalizeCategoryRecord(item, index));

      setCategories(categoryList);
    } catch (err) {
      setCategories([]);
    }
  }, []);

  const loadBlogs = useCallback(
    async (nextPage = page, nextFilters = filters, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const blogResponse = await getAdminBlogs(buildParams(nextPage, nextFilters));

        const blogList = normalizeList(blogResponse, [
          "blogs",
          "items",
          "results",
          "data",
        ]).map((item, index) => normalizeBlogRecord(item, index));

        setBlogs(blogList);
        setPagination(
          parsePagination(blogResponse, nextPage, blogList.length, PAGE_SIZE)
        );
      } catch (err) {
        setBlogs([]);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Blogs load nahi ho paye."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, page]
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({
        ...current,
        search: searchInput.trim(),
      }));
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadBlogs(page, filters);
  }, [page, filters, loadBlogs]);

  const categoryOptions = useMemo(
    () =>
      categories.map((item) => ({
        id: item.id,
        name: item.name,
      })),
    [categories]
  );

  const handleFilterChange = (nextFilters) => {
    setPage(1);
    setFilters((current) => ({
      ...current,
      ...nextFilters,
    }));
  };

  const resetFilters = () => {
    setSearchInput("");
    setPage(1);
    setFilters(defaultFilters);
  };

  const openConfirm = (action, blog) => {
    setConfirmState({
      visible: true,
      action,
      blog,
    });
  };

  const closeConfirm = () => {
    setConfirmState({
      visible: false,
      action: "",
      blog: null,
    });
  };

  const navigateToCreate = () => navigation.navigate("AdminBlogCreate");

  const navigateToEdit = (blog) =>
    navigation.navigate("AdminBlogEdit", { id: blog.id });

  const navigateToPreview = (blog) =>
    navigation.navigate("AdminBlogPreview", { id: blog.id });

  const handleDuplicate = async (blog) => {
    try {
      const duplicate = {
        title: `${blog.title} Copy`,
        slug: `${blog.slug}-copy`,
        categoryId: blog.categoryId,
        tags: blog.tags,
        excerpt: blog.excerpt,
        authorName: blog.authorName,
        authorRole: blog.authorRole,
        content: blog.content,
        featuredImageRaw: blog.featuredImageRaw,
        altText: blog.altText,
        status: "draft",
        publishDate: "",
        scheduledDate: "",
        featured: false,
        trending: false,
        seoTitle: `${blog.seoTitle || blog.title} Copy`,
        metaDescription: blog.metaDescription,
        seoKeywords: blog.seoKeywords,
        canonicalUrl: "",
        ogImageRaw: blog.ogImageRaw,
        allowImageUrl: true,
      };

      await createAdminBlog(duplicate, null);
      showToast("success", "Blog duplicate create ho gaya.");
      await loadBlogs(page, filters, true);
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Blog duplicate nahi ho paya."
      );
    }
  };

  const executeAction = async () => {
    const { action, blog } = confirmState;

    if (!blog) {
      closeConfirm();
      return;
    }

    closeConfirm();

    try {
      let updatedBlog = null;

      if (action === "delete") {
        await deleteAdminBlog(blog.id);
        showToast("success", "Blog delete ho gaya.");
      } else if (action === "publish") {
        updatedBlog = normalizeBlogRecord(normalizeObject(await patchAdminBlogStatus(blog.id, "published")));
        showToast("success", "Blog publish ho gaya.");
      } else if (action === "unpublish") {
        updatedBlog = normalizeBlogRecord(normalizeObject(await patchAdminBlogStatus(blog.id, "draft")));
        showToast("success", "Blog unpublish ho gaya.");
      } else if (action === "archive") {
        updatedBlog = normalizeBlogRecord(normalizeObject(await patchAdminBlogStatus(blog.id, "archived")));
        showToast("success", "Blog archive ho gaya.");
      }

      if (updatedBlog) {
        setBlogs((current) =>
          current.map((item) => (item.id === updatedBlog.id ? updatedBlog : item))
        );
      }

      await loadBlogs(page, filters, true);
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Action complete nahi ho paya."
      );
    }
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages) {
      return;
    }

    setPage(nextPage);
  };

  const pagesToShow = useMemo(() => {
    const total = pagination.totalPages || 1;
    const current = page;
    const result = [];

    if (total <= 5) {
      for (let index = 1; index <= total; index += 1) {
        result.push(index);
      }
      return result;
    }

    result.push(1);

    if (current > 3) {
      result.push("...");
    }

    for (
      let index = Math.max(2, current - 1);
      index <= Math.min(total - 1, current + 1);
      index += 1
    ) {
      result.push(index);
    }

    if (current < total - 2) {
      result.push("...");
    }

    result.push(total);
    return result;
  }, [page, pagination.totalPages]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
      <View style={styles.headerCard}>
        <View style={styles.headerCopy}>
          <View style={styles.headerIcon}>
            <Ionicons name="library-outline" size={22} color={BLOG_COLORS.gold} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Blog Management</Text>
            <Text style={styles.subtitle}>
              Blogs list, filters, actions aur status workflow.
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => loadBlogs(page, filters, true)} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={BLOG_COLORS.background} />
            ) : (
              <Ionicons name="refresh-outline" size={18} color={BLOG_COLORS.background} />
            )}
            <Text style={styles.secondaryText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={navigateToCreate}>
            <Ionicons name="add-circle-outline" size={18} color={BLOG_COLORS.background} />
            <Text style={styles.primaryText}>Add New Blog</Text>
          </TouchableOpacity>
        </View>
      </View>

      {toast ? <BlogToast toast={toast} onDismiss={hideToast} /> : null}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={BLOG_COLORS.red} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadBlogs(page, filters, true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <>
          <BlogSkeleton />
          <BlogSkeleton variant="table" />
        </>
      ) : (
        <>
          <BlogFilters
            search={searchInput}
            onSearchChange={setSearchInput}
            categoryValue={filters.categoryId}
            categoryOptions={categoryOptions}
            statusValue={filters.status}
            featuredValue={filters.featured}
            trendingValue={filters.trending}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={handleFilterChange}
            onReset={resetFilters}
          />

          <View style={styles.summaryRow}>
            {[
              { label: "Total", value: pagination.total || blogs.length },
              { label: "Draft", value: blogs.filter((item) => item.status === "draft").length },
              { label: "Published", value: blogs.filter((item) => item.status === "published").length },
              { label: "Featured", value: blogs.filter((item) => item.featured).length },
            ].map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <BlogTable
            blogs={blogs}
            loading={false}
            onView={navigateToPreview}
            onEdit={navigateToEdit}
            onPreview={navigateToPreview}
            onPublish={(blog) => openConfirm("publish", blog)}
            onUnpublish={(blog) => openConfirm("unpublish", blog)}
            onArchive={(blog) => openConfirm("archive", blog)}
            onDuplicate={handleDuplicate}
            onDelete={(blog) => openConfirm("delete", blog)}
            onRefresh={() => loadBlogs(page, filters, true)}
          />

          <View style={styles.paginationCard}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back-outline" size={16} color={page <= 1 ? BLOG_COLORS.muted : BLOG_COLORS.text} />
            </TouchableOpacity>

            {pagesToShow.map((item, index) =>
              item === "..." ? (
                <View key={`dots-${index}`} style={styles.dotsBox}>
                  <Text style={styles.dotsText}>...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  key={item}
                  style={[styles.pageNumBtn, page === item && styles.pageNumBtnActive]}
                  onPress={() => handlePageChange(item)}
                >
                  <Text style={[styles.pageNumText, page === item && styles.pageNumTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={[styles.pageBtn, page >= pagination.totalPages && styles.pageBtnDisabled]}
              onPress={() => handlePageChange(page + 1)}
              disabled={page >= pagination.totalPages}
            >
              <Ionicons name="chevron-forward-outline" size={16} color={page >= pagination.totalPages ? BLOG_COLORS.muted : BLOG_COLORS.text} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <BlogConfirmModal
        visible={confirmState.visible}
        title={
          confirmState.action === "delete"
            ? "Delete this blog?"
            : confirmState.action === "publish"
              ? "Publish this blog?"
              : confirmState.action === "unpublish"
                ? "Unpublish this blog?"
                : "Archive this blog?"
        }
        message={
          confirmState.action === "delete"
            ? "क्या आप इस blog को delete करना चाहते हैं?"
            : confirmState.action === "publish"
              ? "Is blog ko publish karna hai?"
              : confirmState.action === "unpublish"
                ? "Is blog ko draft me wapas lana hai?"
                : "Is blog ko archive karna hai?"
        }
        confirmLabel={
          confirmState.action === "delete"
            ? "Delete"
            : confirmState.action === "publish"
              ? "Publish"
              : confirmState.action === "unpublish"
                ? "Unpublish"
                : "Archive"
        }
        confirmTone={confirmState.action === "delete" ? "danger" : "primary"}
        onConfirm={executeAction}
        onCancel={closeConfirm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 14,
    paddingBottom: 24,
  },
  headerCard: {
    minHeight: 76,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    ...blogShadow,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: BLOG_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
  },
  title: {
    fontSize: 21,
    fontWeight: "900",
    color: BLOG_COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panelSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryText: {
    color: BLOG_COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },
  errorBox: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: BLOG_COLORS.redSoft,
    borderWidth: 1,
    borderColor: "#E7B7B0",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: BLOG_COLORS.red,
    fontSize: 12,
    fontWeight: "700",
  },
  retryBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: BLOG_COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: BLOG_COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    minWidth: 140,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 14,
    gap: 4,
    ...blogShadow,
  },
  summaryValue: {
    color: BLOG_COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  summaryLabel: {
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  paginationCard: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...blogShadow,
  },
  pageBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: {
    opacity: 0.45,
  },
  pageNumBtn: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageNumBtnActive: {
    backgroundColor: BLOG_COLORS.red,
    borderColor: BLOG_COLORS.red,
  },
  pageNumText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  pageNumTextActive: {
    color: BLOG_COLORS.white,
  },
  dotsBox: {
    minWidth: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
});
