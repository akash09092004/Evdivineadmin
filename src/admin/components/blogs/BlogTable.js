import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BlogStatusBadge from "./BlogStatusBadge";
import { BLOG_COLORS, blogShadow } from "./blogTheme";
import { formatDateTime, formatNumber } from "./blogUtils";
import AdminImage from "../AdminImage";

function IconAction({ label, icon, onPress, tone = "default" }) {
  const toneStyle =
    tone === "danger"
      ? styles.dangerAction
      : tone === "success"
      ? styles.successAction
      : tone === "gold"
      ? styles.goldAction
      : styles.defaultAction;

  return (
    <TouchableOpacity
      style={[styles.iconBtn, toneStyle]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={15}
        color={tone === "default" ? BLOG_COLORS.text : BLOG_COLORS.white}
      />
    </TouchableOpacity>
  );
}

export default function BlogTable({
  blogs = [],
  loading = false,
  onView,
  onEdit,
  onPreview,
  onPublish,
  onUnpublish,
  onArchive,
  onDuplicate,
  onDelete,
  onRefresh,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;

  if (loading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={BLOG_COLORS.gold} />
        <Text style={styles.stateText}>Blogs loading...</Text>
      </View>
    );
  }

  if (!blogs.length) {
    return (
      <View style={styles.stateBox}>
        <Ionicons
          name="folder-open-outline"
          size={22}
          color={BLOG_COLORS.gold}
        />
        <Text style={styles.stateTitle}>No blogs found</Text>
        <Text style={styles.stateText}>
          Is filter ke saath koi blog available nahi hai.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isDesktop) {
    return (
      <View style={{ gap: 12 }}>
        {blogs.map((blog) => (
          <View key={blog.id} style={styles.mobileCard}>
            <View style={styles.mobileTop}>
              <View style={styles.thumbBox}>
                <AdminImage
                  uri={blog.featuredImageRaw || blog.featuredImage}
                  style={styles.thumbImage}
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
                <Text style={styles.mobileTitle} numberOfLines={2}>
                  {blog.title}
                </Text>
                <Text style={styles.mobileMeta} numberOfLines={1}>
                  {blog.categoryName} - {blog.authorName}
                </Text>
              </View>
            </View>

            <View style={styles.mobileMetaRow}>
              <BlogStatusBadge status={blog.status} />
              <Text style={styles.mobileMeta}>
                {formatNumber(blog.views)} views
              </Text>
              <Text style={styles.mobileMeta}>
                {formatDateTime(
                  blog.publishDate || blog.updatedAt || blog.createdAt
                )}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <IconAction
                label="View"
                icon="eye-outline"
                onPress={() => onView(blog)}
              />
              <IconAction
                label="Edit"
                icon="create-outline"
                onPress={() => onEdit(blog)}
              />
              <IconAction
                label="Preview"
                icon="play-outline"
                onPress={() => onPreview(blog)}
                tone="gold"
              />
              {blog.status === "published" ? (
                <IconAction
                  label="Unpublish"
                  icon="pause-outline"
                  onPress={() => onUnpublish(blog)}
                  tone="default"
                />
              ) : (
                <IconAction
                  label="Publish"
                  icon="cloud-done-outline"
                  onPress={() => onPublish(blog)}
                  tone="success"
                />
              )}
              <IconAction
                label="Archive"
                icon="archive-outline"
                onPress={() => onArchive(blog)}
              />
              <IconAction
                label="Duplicate"
                icon="copy-outline"
                onPress={() => onDuplicate(blog)}
              />
              <IconAction
                label="Delete"
                icon="trash-outline"
                onPress={() => onDelete(blog)}
                tone="danger"
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            {[
              ["Featured Image", 160],
              ["Title", 220],
              ["Category", 150],
              ["Author", 150],
              ["Status", 120],
              ["Featured", 90],
              ["Trending", 90],
              ["Views", 100],
              ["Publish Date", 130],
            ].map(([title, width]) => (
              <Text
                key={title}
                style={[styles.headerCell, { width }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            ))}
            <Text style={[styles.headerCell, { width: 320 }]}>Actions</Text>
          </View>

          {blogs.map((blog) => (
            <View key={blog.id} style={styles.row}>
              <View style={[styles.cell, { width: 160 }]}>
                <View style={styles.imageCell}>
                  <AdminImage
                    uri={blog.featuredImageRaw || blog.featuredImage}
                    style={styles.imagePreview}
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
              </View>
              <View style={[styles.cell, { width: 220 }]}>
                <Text style={styles.title} numberOfLines={2}>
                  {blog.title}
                </Text>
                <Text style={styles.subText} numberOfLines={1}>
                  {blog.slug}
                </Text>
              </View>
              <View style={[styles.cell, { width: 150 }]}>
                <Text style={styles.cellText} numberOfLines={1}>
                  {blog.categoryName}
                </Text>
              </View>
              <View style={[styles.cell, { width: 150 }]}>
                <Text style={styles.cellText} numberOfLines={1}>
                  {blog.authorName}
                </Text>
              </View>
              <View style={[styles.cell, { width: 120 }]}>
                <BlogStatusBadge status={blog.status} />
              </View>
              <View style={[styles.cell, { width: 90 }]}>
                <Text style={styles.cellText}>
                  {blog.featured ? "Yes" : "No"}
                </Text>
              </View>
              <View style={[styles.cell, { width: 90 }]}>
                <Text style={styles.cellText}>
                  {blog.trending ? "Yes" : "No"}
                </Text>
              </View>
              <View style={[styles.cell, { width: 100 }]}>
                <Text style={styles.cellText}>{formatNumber(blog.views)}</Text>
              </View>
              <View style={[styles.cell, { width: 130 }]}>
                <Text style={styles.cellText}>
                  {formatDateTime(
                    blog.publishDate || blog.updatedAt || blog.createdAt
                  )}
                </Text>
              </View>
              <View style={[styles.actionCell, { width: 320 }]}>
                <IconAction
                  label="View"
                  icon="eye-outline"
                  onPress={() => onView(blog)}
                />
                <IconAction
                  label="Edit"
                  icon="create-outline"
                  onPress={() => onEdit(blog)}
                />
                <IconAction
                  label="Preview"
                  icon="play-outline"
                  onPress={() => onPreview(blog)}
                  tone="gold"
                />
                {blog.status === "published" ? (
                  <IconAction
                    label="Unpublish"
                    icon="pause-outline"
                    onPress={() => onUnpublish(blog)}
                  />
                ) : (
                  <IconAction
                    label="Publish"
                    icon="cloud-done-outline"
                    onPress={() => onPublish(blog)}
                    tone="success"
                  />
                )}
                <IconAction
                  label="Archive"
                  icon="archive-outline"
                  onPress={() => onArchive(blog)}
                />
                <IconAction
                  label="Duplicate"
                  icon="copy-outline"
                  onPress={() => onDuplicate(blog)}
                />
                <IconAction
                  label="Delete"
                  icon="trash-outline"
                  onPress={() => onDelete(blog)}
                  tone="danger"
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stateBox: {
    minHeight: 200,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    ...blogShadow,
  },
  stateTitle: {
    color: BLOG_COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  stateText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  retryText: {
    color: BLOG_COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },
  mobileCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 14,
    gap: 10,
    ...blogShadow,
  },
  mobileTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  thumbBox: {
    width: 64,
    height: 56,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    backgroundColor: BLOG_COLORS.panelSoft,
  },
  mobileTitle: {
    color: BLOG_COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  mobileMeta: {
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
    marginTop: 3,
  },
  mobileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  tableCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    overflow: "hidden",
    ...blogShadow,
  },
  table: {
    minWidth: 1320,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: BLOG_COLORS.red,
  },
  headerCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: BLOG_COLORS.white,
    fontSize: 11,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: "center",
  },
  imageCell: {
    width: 122,
    height: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panelAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    backgroundColor: BLOG_COLORS.panelSoft,
  },
  title: {
    color: BLOG_COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  subText: {
    marginTop: 4,
    color: BLOG_COLORS.textSoft,
    fontSize: 10,
  },
  cellText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  actionCell: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  defaultAction: {
    backgroundColor: BLOG_COLORS.panelSoft,
    borderColor: BLOG_COLORS.border,
  },
  successAction: {
    backgroundColor: BLOG_COLORS.success,
    borderColor: BLOG_COLORS.success,
  },
  goldAction: {
    backgroundColor: BLOG_COLORS.gold,
    borderColor: BLOG_COLORS.gold,
  },
  dangerAction: {
    backgroundColor: BLOG_COLORS.red,
    borderColor: BLOG_COLORS.red,
  },
});
