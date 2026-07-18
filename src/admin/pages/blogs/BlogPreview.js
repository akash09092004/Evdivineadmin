import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import BlogStatusBadge from "../../components/blogs/BlogStatusBadge";
import BlogContentRenderer from "../../components/blogs/BlogContentRenderer";
import BlogSkeleton from "../../components/blogs/BlogSkeleton";
import { BLOG_COLORS, blogShadow } from "../../components/blogs/blogTheme";
import { getAdminBlog, getAdminBlogs } from "../../services/adminBlogApi";
import { normalizeList, normalizeObject } from "../../utils/adminApi";
import {
  formatDateTime,
  normalizeBlogRecord,
  readingTimeFromContent,
} from "../../components/blogs/blogUtils";
import AdminImage from "../../components/AdminImage";

export default function BlogPreview() {
  const navigation = useNavigation();
  const route = useRoute();
  const blogId = route.params?.id;
  const draftBlog = route.params?.draftBlog || null;
  const isCreateDraftPreview = blogId === "draft" || !blogId;
  const [blog, setBlog] = useState(
    draftBlog ? normalizeBlogRecord(draftBlog) : null
  );
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(!draftBlog);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (draftBlog) {
        setLoading(false);
        setError("");
        setBlog(normalizeBlogRecord(draftBlog));
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await getAdminBlog(blogId);
        if (!mounted) return;

        const blogObject = normalizeObject(response);
        const normalized = normalizeBlogRecord(blogObject);
        setBlog(normalized);
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Preview load nahi ho paya."
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
  }, [blogId, draftBlog]);

  useEffect(() => {
    let mounted = true;

    const loadRelated = async () => {
      if (!blog?.categoryId) {
        setRelated([]);
        return;
      }

      try {
        const response = await getAdminBlogs({
          categoryId: blog.categoryId,
          limit: 4,
        });
        if (!mounted) return;

        const list = normalizeList(response, [
          "blogs",
          "items",
          "results",
          "data",
        ]);
        const relatedBlogs = list
          .map((item, index) => normalizeBlogRecord(item, index))
          .filter((item) => item.id !== blog.id)
          .slice(0, 3);

        setRelated(relatedBlogs);
      } catch (err) {
        if (!mounted) return;
        setRelated([]);
      }
    };

    loadRelated();

    return () => {
      mounted = false;
    };
  }, [blog?.categoryId, blog?.id]);

  const handleBack = () => {
    if (isCreateDraftPreview) {
      navigation.goBack();
      return;
    }

    navigation.navigate("AdminBlogEdit", { id: blogId });
  };

  const contentHtml = useMemo(() => blog?.content || "<p></p>", [blog]);
  const canOpenEditor = Boolean(blog?.id && !isCreateDraftPreview);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
    >
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.title}>Blog Preview</Text>
          <Text style={styles.subtitle}>
            Public article jaisa preview, draft content support ke saath.
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
            <Ionicons
              name="create-outline"
              size={18}
              color={BLOG_COLORS.background}
            />
            <Text style={styles.secondaryText}>Back to Edit</Text>
          </TouchableOpacity>
          {canOpenEditor ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                navigation.navigate("AdminBlogEdit", { id: blog.id })
              }
            >
              <Ionicons
                name="open-outline"
                size={18}
                color={BLOG_COLORS.background}
              />
              <Text style={styles.primaryText}>Open Editor</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <BlogSkeleton />
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={BLOG_COLORS.red}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() =>
              navigation.replace("AdminBlogPreview", { id: blogId })
            }
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : blog ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.mediaWrap}>
              {blog.featuredImage ? (
                <AdminImage
                  uri={blog.featuredImageRaw || blog.featuredImage}
                  style={styles.media}
                  placeholderLabel="No image"
                />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={34}
                    color={BLOG_COLORS.muted}
                  />
                </View>
              )}
            </View>

            <View style={styles.heroContent}>
              <View style={styles.metaRow}>
                <Text style={styles.categoryText}>{blog.categoryName}</Text>
                <BlogStatusBadge status={blog.status} />
                {blog.featured ? (
                  <View style={styles.smallPill}>
                    <Text style={styles.smallPillText}>Featured</Text>
                  </View>
                ) : null}
                {blog.trending ? (
                  <View style={styles.smallPill}>
                    <Text style={styles.smallPillText}>Trending</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.blogTitle}>{blog.title}</Text>

              <View style={styles.infoRow}>
                <InfoItem icon="person-outline" text={blog.authorName} />
                <InfoItem
                  icon="calendar-outline"
                  text={formatDateTime(
                    blog.publishDate || blog.updatedAt || blog.createdAt
                  )}
                />
                <InfoItem
                  icon="time-outline"
                  text={
                    blog.readingTime || readingTimeFromContent(blog.content)
                  }
                />
                <InfoItem
                  icon="eye-outline"
                  text={`${blog.views || 0} views`}
                />
              </View>

              {blog.excerpt ? (
                <Text style={styles.excerpt}>{blog.excerpt}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Full Content</Text>
            <View style={styles.article}>
              <BlogContentRenderer html={contentHtml} />
            </View>
          </View>

          <View style={styles.relatedCard}>
            <View style={styles.relatedHeader}>
              <Text style={styles.sectionTitle}>Related Preview</Text>
              <Text style={styles.relatedSub}>Same category ke aur blogs</Text>
            </View>

            {related.length ? (
              <View style={styles.relatedList}>
                {related.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.relatedItem}
                    onPress={() =>
                      navigation.navigate("AdminBlogPreview", { id: item.id })
                    }
                  >
                    <View style={styles.relatedThumb}>
                      <AdminImage
                        uri={item.featuredImageRaw || item.featuredImage}
                        style={styles.relatedThumbImage}
                        placeholderLabel=""
                        renderFallback={() => (
                          <Ionicons
                            name="image-outline"
                            size={18}
                            color={BLOG_COLORS.muted}
                          />
                        )}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.relatedTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.relatedMeta} numberOfLines={1}>
                        {item.categoryName} -{" "}
                        {formatDateTime(
                          item.publishDate || item.updatedAt || item.createdAt
                        )}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={16}
                      color={BLOG_COLORS.textSoft}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyRelated}>
                <Ionicons
                  name="albums-outline"
                  size={22}
                  color={BLOG_COLORS.gold}
                />
                <Text style={styles.emptyText}>
                  Related preview available nahi hai.
                </Text>
              </View>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function InfoItem({ icon, text }) {
  return (
    <View style={stylesInfo.infoItem}>
      <Ionicons name={icon} size={14} color={BLOG_COLORS.gold} />
      <Text style={stylesInfo.infoText}>{text}</Text>
    </View>
  );
}

const stylesInfo = StyleSheet.create({
  infoItem: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
});

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
    backgroundColor: BLOG_COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryText: {
    color: BLOG_COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panelSoft,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryText: {
    color: BLOG_COLORS.text,
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
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    overflow: "hidden",
    ...blogShadow,
  },
  mediaWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: BLOG_COLORS.background,
  },
  media: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContent: {
    padding: 18,
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  categoryText: {
    color: BLOG_COLORS.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  smallPill: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  smallPillText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 10,
    fontWeight: "800",
  },
  blogTitle: {
    color: BLOG_COLORS.text,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "900",
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  excerpt: {
    color: BLOG_COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  contentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 18,
    gap: 12,
    ...blogShadow,
  },
  sectionTitle: {
    color: BLOG_COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  article: {
    backgroundColor: BLOG_COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    padding: 16,
  },
  relatedCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 18,
    gap: 12,
    ...blogShadow,
  },
  relatedHeader: {
    gap: 3,
  },
  relatedSub: {
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
  },
  relatedList: {
    gap: 10,
  },
  relatedItem: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  relatedThumb: {
    width: 66,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panelSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  relatedThumbImage: {
    width: "100%",
    height: "100%",
  },
  relatedTitle: {
    color: BLOG_COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  relatedMeta: {
    marginTop: 4,
    color: BLOG_COLORS.textSoft,
    fontSize: 10,
    fontWeight: "700",
  },
  emptyRelated: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
});
