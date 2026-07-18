import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BlogForm from "../../components/blogs/BlogForm";
import BlogToast, { useBlogToast } from "../../components/blogs/BlogToast";
import BlogSkeleton from "../../components/blogs/BlogSkeleton";
import { BLOG_COLORS, blogShadow } from "../../components/blogs/blogTheme";
import {
  createAdminBlog,
  getAdminBlogCategories,
} from "../../services/adminBlogApi";
import { normalizeList, normalizeObject } from "../../utils/adminApi";
import { normalizeCategoryRecord } from "../../components/blogs/blogUtils";

export default function BlogCreate() {
  const navigation = useNavigation();
  const { toast, showToast, hideToast } = useBlogToast();
  const [categories, setCategories] = useState([]);
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
        const data = await getAdminBlogCategories({ limit: 200 });
        if (!mounted) return;

        const list = normalizeList(data, [
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
        setCategories([]);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Categories load nahi ho payi."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (action, payload, imageFile, ogImageFile) => {
    setSavingAction(action);
    setUploadProgress(0);

    try {
      const blogPayload = {
        ...payload,
        status: action === "publish" ? "published" : payload.status || "draft",
      };

      const response = await createAdminBlog(
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

      const created = normalizeObject(response);
      showToast(
        "success",
        action === "publish"
          ? "Blog publish ho gaya."
          : "Blog draft save ho gaya."
      );

      if (created?._id || created?.id) {
        navigation.replace("AdminBlogEdit", { id: created._id || created.id });
      } else {
        navigation.navigate("AdminBlogs");
      }
    } catch (err) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Blog create nahi ho paya."
      );
    } finally {
      setSavingAction("");
      setUploadProgress(0);
    }
  };

  const handlePreview = (payload) => {
    navigation.navigate("AdminBlogPreview", {
      id: "draft",
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
          <Text style={styles.title}>Add New Blog</Text>
          <Text style={styles.subtitle}>
            Naya blog create karo aur turant preview bhi dekho.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("AdminBlogs")}
        >
          <Ionicons
            name="arrow-back-outline"
            size={18}
            color={BLOG_COLORS.background}
          />
          <Text style={styles.backText}>Back to Blogs</Text>
        </TouchableOpacity>
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
            onPress={() => navigation.replace("AdminBlogCreate")}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <BlogSkeleton />
      ) : (
        <BlogForm
          mode="create"
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
