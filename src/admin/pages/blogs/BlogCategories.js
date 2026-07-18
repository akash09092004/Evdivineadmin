import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BlogCategoryModal from "../../components/blogs/BlogCategoryModal";
import BlogConfirmModal from "../../components/blogs/BlogConfirmModal";
import BlogToast, { useBlogToast } from "../../components/blogs/BlogToast";
import BlogSkeleton from "../../components/blogs/BlogSkeleton";
import { BLOG_COLORS, blogShadow } from "../../components/blogs/blogTheme";
import {
  createAdminBlogCategory,
  deleteAdminBlogCategory,
  getAdminBlogCategories,
  getAdminBlogCategory,
  getAdminBlogs,
  updateAdminBlogCategory,
} from "../../services/adminBlogApi";
import {
  normalizeCategoryRecord,
  normalizeBlogRecord,
} from "../../components/blogs/blogUtils";
import { normalizeList, normalizeObject } from "../../utils/adminApi";
import { adminSetBlogCategoryActive } from "../../utils/adminApi";
import AdminImage from "../../components/AdminImage";

const PAGE_SIZE = 8;

export default function BlogCategories() {
  const { toast, showToast, hideToast } = useBlogToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    category: null,
  });

  const loadCategories = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [categoryData, blogData] = await Promise.all([
        getAdminBlogCategories({ limit: 200 }),
        getAdminBlogs({ limit: 500 }).catch(() => null),
      ]);

      const categoryList = normalizeList(categoryData, [
        "categories",
        "items",
        "results",
        "data",
      ]).map((item, index) => normalizeCategoryRecord(item, index));

      const blogList = normalizeList(blogData, [
        "blogs",
        "items",
        "results",
        "data",
      ]).map((item, index) => normalizeBlogRecord(item, index));

      const countMap = blogList.reduce((accumulator, blog) => {
        const key = blog.categoryId || blog.categoryName;
        if (!key) return accumulator;
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      }, {});

      setCategories(
        categoryList.map((item) => ({
          ...item,
          blogCount:
            countMap[item.id] || countMap[item.name] || item.blogCount || 0,
        }))
      );
    } catch (err) {
      setCategories([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Blog categories load nahi ho payi."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((item) =>
      [item.name, item.slug, item.description]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [categories, searchInput]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE)
  );
  const paginatedCategories = filteredCategories.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const openCreate = () => {
    setSelectedCategory(null);
    setModalVisible(true);
  };

  const openEdit = async (category) => {
    try {
      const response = await getAdminBlogCategory(category.id);
      const data = normalizeObject(response);
      setSelectedCategory(normalizeCategoryRecord(data));
    } catch (err) {
      setSelectedCategory(category);
    } finally {
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCategory(null);
  };

  const handleSave = async (form, imageFile) => {
    setSaving(true);

    try {
      if (selectedCategory) {
        await updateAdminBlogCategory(selectedCategory.id, form, imageFile);
        showToast("success", "Category update ho gayi.");
      } else {
        await createAdminBlogCategory(form, imageFile);
        showToast("success", "Category create ho gayi.");
      }

      closeModal();
      await loadCategories(true);
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Category save nahi ho payi."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category) => {
    try {
      const response = await adminSetBlogCategoryActive(
        category.id,
        !category.active
      );
      const updated = normalizeCategoryRecord(normalizeObject(response));
      setCategories((previous) =>
        previous.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
              }
            : item
        )
      );
      showToast(
        "success",
        category.active
          ? "Category inactive ho gayi."
          : "Category active ho gayi."
      );
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Category status update nahi ho paya."
      );
    }
  };

  const ensureCanDelete = async (category) => {
    try {
      const blogData = await getAdminBlogs({
        categoryId: category.id,
        limit: 1,
      });

      const list = normalizeList(blogData, [
        "blogs",
        "items",
        "results",
        "data",
      ]);
      if (list.length > 0) {
        showToast(
          "error",
          "Is category me blogs maujood hain, pehle unko move ya delete karo."
        );
        return;
      }

      setConfirmDelete({ visible: true, category });
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Delete validation nahi ho payi."
      );
    }
  };

  const deleteCategory = async () => {
    const category = confirmDelete.category;
    if (!category) return;

    setConfirmDelete({ visible: false, category: null });

    try {
      await deleteAdminBlogCategory(category.id);
      showToast("success", "Category delete ho gayi.");
      await loadCategories(true);
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Category delete nahi ho payi."
      );
    }
  };

  const pagesToShow = useMemo(() => {
    const result = [];

    if (totalPages <= 5) {
      for (let index = 1; index <= totalPages; index += 1) {
        result.push(index);
      }
      return result;
    }

    result.push(1);
    if (page > 3) result.push("...");
    for (
      let index = Math.max(2, page - 1);
      index <= Math.min(totalPages - 1, page + 1);
      index += 1
    ) {
      result.push(index);
    }
    if (page < totalPages - 2) result.push("...");
    result.push(totalPages);
    return result;
  }, [page, totalPages]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
    >
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Blog Categories</Text>
          <Text style={styles.subtitle}>
            Category list, active toggle aur delete validation.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => loadCategories(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={BLOG_COLORS.background} />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={18}
                color={BLOG_COLORS.background}
              />
            )}
            <Text style={styles.secondaryText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={BLOG_COLORS.background}
            />
            <Text style={styles.primaryText}>Add Category</Text>
          </TouchableOpacity>
        </View>
      </View>

      {toast ? <BlogToast toast={toast} onDismiss={hideToast} /> : null}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={BLOG_COLORS.red}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadCategories(true)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={BLOG_COLORS.gold} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search categories..."
          placeholderTextColor={BLOG_COLORS.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <BlogSkeleton />
      ) : paginatedCategories.length ? (
        <View style={styles.listCard}>
          {paginatedCategories.map((category) => (
            <View key={category.id} style={styles.row}>
              <View style={styles.rowMain}>
                <View style={styles.thumb}>
                  <AdminImage
                    uri={category.imageRaw || category.image}
                    style={styles.thumbFill}
                    placeholderLabel=""
                    renderFallback={() => (
                      <Ionicons
                        name="albums-outline"
                        size={18}
                        color={BLOG_COLORS.muted}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {category.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {category.slug}
                  </Text>
                </View>
              </View>

              <View style={styles.stats}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>
                    {category.blogCount || 0} blogs
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    category.active ? styles.activePill : styles.inactivePill,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      category.active
                        ? styles.activePillText
                        : styles.inactivePillText,
                    ]}
                  >
                    {category.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => openEdit(category)}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={BLOG_COLORS.text}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => toggleActive(category)}
                >
                  <Ionicons
                    name={category.active ? "pause-outline" : "play-outline"}
                    size={16}
                    color={
                      category.active ? BLOG_COLORS.red : BLOG_COLORS.success
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtnDanger}
                  onPress={() => ensureCanDelete(category)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={BLOG_COLORS.white}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons
            name="folder-open-outline"
            size={24}
            color={BLOG_COLORS.gold}
          />
          <Text style={styles.emptyTitle}>No categories found</Text>
          <Text style={styles.emptyText}>
            Search ya filter clear karke try karo.
          </Text>
        </View>
      )}

      <View style={styles.paginationCard}>
        <TouchableOpacity
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          onPress={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1}
        >
          <Ionicons
            name="chevron-back-outline"
            size={16}
            color={page <= 1 ? BLOG_COLORS.muted : BLOG_COLORS.text}
          />
        </TouchableOpacity>

        {pagesToShow.map((item, index) =>
          item === "..." ? (
            <View key={`dots-${index}`} style={styles.dotsBox}>
              <Text style={styles.dotsText}>...</Text>
            </View>
          ) : (
            <TouchableOpacity
              key={item}
              style={[
                styles.pageNumBtn,
                page === item && styles.pageNumBtnActive,
              ]}
              onPress={() => setPage(item)}
            >
              <Text
                style={[
                  styles.pageNumText,
                  page === item && styles.pageNumTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity
          style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          onPress={() =>
            setPage((current) => Math.min(totalPages, current + 1))
          }
          disabled={page >= totalPages}
        >
          <Ionicons
            name="chevron-forward-outline"
            size={16}
            color={page >= totalPages ? BLOG_COLORS.muted : BLOG_COLORS.text}
          />
        </TouchableOpacity>
      </View>

      <BlogCategoryModal
        visible={modalVisible}
        mode={selectedCategory ? "edit" : "create"}
        initialValue={selectedCategory}
        onClose={closeModal}
        onSave={handleSave}
      />

      <BlogConfirmModal
        visible={confirmDelete.visible}
        title="Delete this category?"
        message="Delete se pehle check ho gaya hai ki is category me koi blogs nahi hain."
        confirmLabel={saving ? "Processing..." : "Delete"}
        confirmTone="danger"
        onConfirm={deleteCategory}
        onCancel={() => setConfirmDelete({ visible: false, category: null })}
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
    minHeight: 72,
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
  title: {
    color: BLOG_COLORS.text,
    fontSize: 21,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 4,
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
  },
  actions: {
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
  searchBox: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: BLOG_COLORS.text,
    fontSize: 13,
  },
  listCard: {
    gap: 10,
  },
  row: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...blogShadow,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbFill: {
    width: "100%",
    height: "100%",
    backgroundColor: BLOG_COLORS.panelSoft,
  },
  rowTitle: {
    color: BLOG_COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  rowMeta: {
    marginTop: 4,
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  activePill: {
    backgroundColor: BLOG_COLORS.successSoft,
    borderColor: BLOG_COLORS.successSoft,
  },
  inactivePill: {
    backgroundColor: BLOG_COLORS.redSoft,
    borderColor: BLOG_COLORS.redSoft,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "800",
    color: BLOG_COLORS.textSoft,
  },
  activePillText: {
    color: BLOG_COLORS.success,
  },
  inactivePillText: {
    color: BLOG_COLORS.red,
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDanger: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: BLOG_COLORS.red,
    borderWidth: 1,
    borderColor: BLOG_COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    minHeight: 180,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...blogShadow,
  },
  emptyTitle: {
    color: BLOG_COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
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
