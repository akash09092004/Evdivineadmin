import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import BlogForm from "../../components/blogs/BlogForm";
import BlogToast, { useBlogToast } from "../../components/blogs/BlogToast";
import BlogSkeleton from "../../components/blogs/BlogSkeleton";
import { BLOG_COLORS, blogShadow } from "../../components/blogs/blogTheme";
import {
  getAdminBlog,
  getAdminBlogCategories,
  updateAdminBlog,
} from "../../services/adminBlogApi";
import { normalizeList, normalizeObject } from "../../utils/adminApi";
import {
  normalizeBlogRecord,
  normalizeCategoryRecord,
} from "../../components/blogs/blogUtils";

export default function BlogEdit() {
  const navigation = useNavigation();
  const route = useRoute();
  const blogId = route.params?.id;
  const { toast, showToast, hideToast } = useBlogToast();
  const [categories, setCategories] = useState([]);
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingAction, setSavingAction] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [blogData, categoryData] = await Promise.all([
          getAdminBlog(blogId),
          getAdminBlogCategories({ limit: 200 }).catch(() => null),
        ]);

        if (!mounted) return;

        const blogObject = normalizeObject(blogData);
        setBlog(normalizeBlogRecord(blogObject));

        const list = normalizeList(categoryData, [
          "categories",
          "items",
          "results",
          "data",
        ]);
        setCategories(
          list.map((item, index) => normalizeCategoryRecord(item, index))
        );
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Blog load nahi ho paya."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (blogId) {
      load();
    } else {
      setError("Blog id missing hai.");
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [blogId]);

  const handleSubmit = async (action, payload, imageFile, ogImageFile) => {
    setSavingAction(action);
    setUploadProgress(0);

    try {
      const blogPayload = {
        ...payload,
        status:
          action === "publish"
            ? "published"
            : action === "draft"
            ? payload.status || "draft"
            : payload.status || "draft",
      };

      const response = await updateAdminBlog(
        blogId,
        blogPayload,
        imageFile,
        ogImageFile,
        {
          onUploadProgress: (event) => {
            if (!event.total) return;
            setUploadProgress(Math.round((event.loaded * 100) / event.total));
          },
        }
      );

      const nextBlog = normalizeBlogRecord(normalizeObject(response));
      setBlog(nextBlog);
      showToast("success", "Blog update ho gaya.");
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Blog update nahi ho paya."
      );
    } finally {
      setSavingAction("");
      setUploadProgress(0);
    }
  };

  const handlePreview = (payload) => {
    navigation.navigate("AdminBlogPreview", {
      id: blogId,
      draftBlog: payload,
    });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
    >
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Edit Blog</Text>
          <Text style={styles.subtitle}>
            Existing blog data load karke update karo.
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              navigation.navigate("AdminBlogPreview", { id: blogId })
            }
          >
            <Ionicons
              name="eye-outline"
              size={18}
              color={BLOG_COLORS.background}
            />
            <Text style={styles.backText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("AdminBlogs")}
          >
            <Ionicons
              name="arrow-back-outline"
              size={18}
              color={BLOG_COLORS.background}
            />
            <Text style={styles.backText}>Back</Text>
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
            onPress={() => navigation.replace("AdminBlogEdit", { id: blogId })}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <BlogSkeleton />
      ) : (
        <BlogForm
          mode="edit"
          initialValue={blog}
          categories={categories}
          savingAction={savingAction}
          uploadProgress={uploadProgress}
          onSubmit={handleSubmit}
          onPreview={handlePreview}
          onCancel={() => navigation.navigate("AdminBlogs")}
        />
      )}
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
  backBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: {
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
});
