import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";
import BlogSelect from "./BlogSelect";
import BlogImageUploader from "./BlogImageUploader";
import BlogEditor from "./BlogEditor";
import BlogSeoFields from "./BlogSeoFields";
import { slugify, toArray } from "./blogUtils";

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Archived", value: "archived" },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  helperText,
  keyboardType,
  autoCapitalize = "sentences",
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={BLOG_COLORS.muted}
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

function ToggleRow({ label, description, value, onChange }) {
  return (
    <TouchableOpacity
      style={[styles.toggleRow, value && styles.toggleRowActive]}
      onPress={() => onChange(!value)}
    >
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.switchThumb, value && styles.switchThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

export default function BlogForm({
  mode = "create",
  initialValue,
  categories = [],
  loading = false,
  savingAction = "",
  uploadProgress = 0,
  onSubmit,
  onPreview,
  onCancel,
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const isCompact = width < 760;
  const [form, setForm] = useState({
    title: "",
    slug: "",
    categoryId: "",
    tags: "",
    excerpt: "",
    authorName: "",
    authorRole: "",
    content: "<p></p>",
    featuredImageRaw: "",
    altText: "",
    status: "draft",
    publishDate: "",
    scheduledDate: "",
    featured: false,
    trending: false,
    seoTitle: "",
    metaDescription: "",
    seoKeywords: "",
    canonicalUrl: "",
    ogImageRaw: "",
    ogImageFile: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!initialValue) {
      return;
    }

    const next = {
      title: initialValue.title || "",
      slug: initialValue.slug || "",
      categoryId: initialValue.categoryId || "",
      tags: Array.isArray(initialValue.tags)
        ? initialValue.tags.join(", ")
        : String(initialValue.tags || ""),
      excerpt: initialValue.excerpt || "",
      authorName: initialValue.authorName || "",
      authorRole: initialValue.authorRole || "",
      content: initialValue.content || "<p></p>",
      featuredImageRaw:
        initialValue.featuredImageUrl ||
        initialValue.featuredImageRaw ||
        initialValue.featuredImage ||
        initialValue.featuredImageData?.url ||
        "",
      altText:
        initialValue.altText ||
        initialValue.featuredImageAlt ||
        initialValue.featuredImageAltText ||
        "",
      status: initialValue.status || "draft",
      publishDate: initialValue.publishDate || "",
      scheduledDate: initialValue.scheduledDate || "",
      featured: Boolean(initialValue.featured),
      trending: Boolean(initialValue.trending),
      seoTitle:
        initialValue.metaTitle ||
        initialValue.seoTitle ||
        initialValue.seo?.metaTitle ||
        "",
      metaDescription:
        initialValue.metaDescription || initialValue.seo?.metaDescription || "",
      seoKeywords: Array.isArray(initialValue.seoKeywords)
        ? initialValue.seoKeywords.join(", ")
        : String(initialValue.seoKeywords || initialValue.seo?.keywords || ""),
      canonicalUrl:
        initialValue.canonicalUrl || initialValue.seo?.canonicalUrl || "",
      ogImageRaw:
        initialValue.ogImageRaw ||
        initialValue.ogImage ||
        initialValue.seo?.ogImage ||
        initialValue.seo?.ogImageUrl ||
        "",
      ogImageFile: null,
    };

    setForm(next);
    setSlugTouched(Boolean(initialValue.slug));
    setImageFile(null);
  }, [initialValue]);

  const categoryOptions = useMemo(
    () =>
      categories.map((item) => ({
        label: item.name,
        value: item.id,
      })),
    [categories]
  );

  const statusLabel =
    STATUS_OPTIONS.find((item) => item.value === form.status)?.label || "Draft";

  const update = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "title" && !slugTouched) {
        next.slug = slugify(value);
      }

      return next;
    });

    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const handleSlugChange = (text) => {
    setSlugTouched(true);
    update("slug", slugify(text));
  };

  const validate = () => {
    const nextErrors = {};

    if (!String(form.title || "").trim()) {
      nextErrors.title = "Blog title required hai.";
    }

    if (!String(form.slug || "").trim()) {
      nextErrors.slug = "Slug required hai.";
    }

    if (!form.categoryId) {
      nextErrors.categoryId = "Category select karo.";
    }

    if (mode === "create" && !imageFile) {
      nextErrors.featuredImageRaw = "Featured image upload karo.";
    }

    if (
      !form.content ||
      !String(form.content)
        .replace(/<[^>]+>/g, "")
        .trim()
    ) {
      nextErrors.content = "Content add karo.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const preparePayload = () => ({
    ...form,
    title: String(form.title || "").trim(),
    slug: String(form.slug || "").trim(),
    categoryId: String(form.categoryId || ""),
    tags: toArray(form.tags),
    excerpt: String(form.excerpt || "").trim(),
    authorName: String(form.authorName || "").trim(),
    authorRole: String(form.authorRole || "").trim(),
    content: String(form.content || ""),
    featuredImageRaw: String(form.featuredImageRaw || "").trim(),
    altText: String(form.altText || "").trim(),
    status: String(form.status || "draft"),
    publishDate: String(form.publishDate || "").trim(),
    scheduledDate: String(form.scheduledDate || "").trim(),
    featured: Boolean(form.featured),
    trending: Boolean(form.trending),
    seoTitle: String(form.seoTitle || "").trim(),
    metaTitle: String(form.seoTitle || "").trim(),
    metaDescription: String(form.metaDescription || "").trim(),
    seoKeywords: toArray(form.seoKeywords),
    canonicalUrl: String(form.canonicalUrl || "").trim(),
    ogImageRaw: String(form.ogImageRaw || "").trim(),
    featuredImageAltText: String(form.altText || "").trim(),
    ogImageFile: null,
  });

  const triggerSubmit = async (action) => {
    if (!validate()) {
      return;
    }

    if (typeof onSubmit === "function") {
      await onSubmit(action, preparePayload(), imageFile, form.ogImageFile);
    }
  };

  const handlePreview = async () => {
    if (!validate()) {
      return;
    }

    if (typeof onPreview === "function") {
      await onPreview(preparePayload());
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <Text style={styles.loadingText}>Blog form loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
    >
      <View style={[styles.headerCard, isCompact && styles.headerCardStack]}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.pageTitle}>
            {mode === "edit" ? "Edit Blog" : "Add New Blog"}
          </Text>
          <Text style={styles.pageSub}>
            Premium blog content create aur manage karo.
          </Text>
        </View>
        <View style={styles.statusPill}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={BLOG_COLORS.background}
          />
          <Text style={styles.statusPillText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={[styles.grid, !isWide && styles.gridStack]}>
        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            <Field
              label="Blog Title"
              value={form.title}
              onChangeText={(text) => update("title", text)}
              placeholder="Blog title"
              helperText={errors.title}
            />

            <Field
              label="Slug"
              value={form.slug}
              onChangeText={handleSlugChange}
              placeholder="auto-generated-slug"
              helperText={errors.slug}
              autoCapitalize="none"
            />

            <BlogSelect
              label="Category"
              value={form.categoryId}
              placeholder="Select category"
              options={categoryOptions}
              onChange={(value) => update("categoryId", value)}
              helperText={errors.categoryId}
            />

            <Field
              label="Tags"
              value={form.tags}
              onChangeText={(text) => update("tags", text)}
              placeholder="tag one, tag two"
              helperText="Comma separated tags."
            />

            <Field
              label="Short Description / Excerpt"
              value={form.excerpt}
              onChangeText={(text) => update("excerpt", text)}
              placeholder="Short summary..."
              multiline
            />

            <View style={[styles.twoCol, width < 760 && styles.twoColStack]}>
              <View style={styles.half}>
                <Field
                  label="Author Name"
                  value={form.authorName}
                  onChangeText={(text) => update("authorName", text)}
                  placeholder="Author name"
                />
              </View>
              <View style={styles.half}>
                <Field
                  label="Author Role"
                  value={form.authorRole}
                  onChangeText={(text) => update("authorRole", text)}
                  placeholder="Editor / Founder"
                />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Featured Image</Text>
            <BlogImageUploader
              value={form.featuredImageRaw}
              altText={form.altText}
              onAltChange={(text) => update("altText", text)}
              progress={uploadProgress}
              onChange={(file, preview) => {
                setImageFile(file);
                update("featuredImageRaw", preview);
                setErrors((current) => ({ ...current, featuredImageRaw: "" }));
              }}
              onRemove={() => {
                setImageFile(null);
                update("featuredImageRaw", "");
                update("altText", "");
                setErrors((current) => ({ ...current, featuredImageRaw: "" }));
              }}
            />
            {errors.featuredImageRaw ? (
              <Text style={styles.errorText}>{errors.featuredImageRaw}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Publishing</Text>
            <BlogSelect
              label="Status"
              value={form.status}
              placeholder="Select status"
              options={STATUS_OPTIONS}
              onChange={(value) => update("status", value)}
            />

            <View style={[styles.twoCol, width < 760 && styles.twoColStack]}>
              <View style={styles.half}>
                <Field
                  label="Publish Date"
                  value={form.publishDate}
                  onChangeText={(text) => update("publishDate", text)}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.half}>
                <Field
                  label="Scheduled Date"
                  value={form.scheduledDate}
                  onChangeText={(text) => update("scheduledDate", text)}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <ToggleRow
              label="Featured"
              description="Homepage aur highlight sections ke liye."
              value={form.featured}
              onChange={(value) => update("featured", value)}
            />

            <ToggleRow
              label="Trending"
              description="Trending chips aur sorting ke liye."
              value={form.trending}
              onChange={(value) => update("trending", value)}
            />
          </View>
        </View>

        <View style={styles.column}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Content</Text>
            <BlogEditor
              value={form.content}
              onChange={(html) => update("content", html)}
            />
            {errors.content ? (
              <Text style={styles.errorText}>{errors.content}</Text>
            ) : null}
          </View>

          <BlogSeoFields
            form={form}
            onChange={(nextForm) => setForm(nextForm)}
            metaDescriptionCount={form.metaDescription.length}
          />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Primary Actions</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.secondaryBtn,
                  isCompact && styles.actionBtnStack,
                ]}
                onPress={onCancel}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.previewBtn,
                  isCompact && styles.actionBtnStack,
                ]}
                onPress={handlePreview}
              >
                <Ionicons
                  name="eye-outline"
                  size={16}
                  color={BLOG_COLORS.background}
                />
                <Text style={styles.previewText}>Preview</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.draftBtn,
                  isCompact && styles.actionBtnStack,
                ]}
                onPress={() => triggerSubmit("draft")}
                disabled={savingAction === "draft"}
              >
                <Ionicons
                  name="save-outline"
                  size={16}
                  color={BLOG_COLORS.white}
                />
                <Text style={styles.actionText}>
                  {savingAction === "draft" ? "Saving..." : "Save Draft"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.publishBtn,
                  isCompact && styles.actionBtnStack,
                ]}
                onPress={() => triggerSubmit("publish")}
                disabled={savingAction === "publish"}
              >
                <Ionicons
                  name="cloud-done-outline"
                  size={16}
                  color={BLOG_COLORS.white}
                />
                <Text style={styles.actionText}>
                  {savingAction === "publish" ? "Publishing..." : "Publish"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Validation Notes</Text>
            <Text style={styles.metaText}>
              Slug editable hai. Title change hoga to slug auto-generate hota
              rahega jab tak aap manually edit nahi karte.
            </Text>
            <Text style={styles.metaText}>
              Content backend ko HTML string ke form me bheja jayega.
            </Text>
            {Platform.OS === "web" ? (
              <Text style={styles.metaText}>
                Web editor mode TipTap par based hai.
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 14,
    paddingBottom: 24,
  },
  loadingCard: {
    minHeight: 260,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
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
    gap: 14,
    ...blogShadow,
  },
  headerCardStack: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: BLOG_COLORS.text,
  },
  pageSub: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: BLOG_COLORS.textSoft,
  },
  statusPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: BLOG_COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPillText: {
    color: BLOG_COLORS.background,
    fontSize: 11,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  gridStack: {
    flexDirection: "column",
  },
  column: {
    flex: 1,
    gap: 14,
    minWidth: 0,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 16,
    gap: 12,
    ...blogShadow,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: BLOG_COLORS.text,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: BLOG_COLORS.goldSoft,
  },
  helper: {
    fontSize: 10,
    color: BLOG_COLORS.textSoft,
    lineHeight: 14,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    color: BLOG_COLORS.text,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 12,
  },
  errorText: {
    marginTop: -4,
    color: BLOG_COLORS.redSoft,
    fontSize: 10,
    fontWeight: "700",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  twoColStack: {
    flexDirection: "column",
    gap: 0,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
  toggleRow: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleRowActive: {
    borderColor: BLOG_COLORS.gold,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    color: BLOG_COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  toggleDesc: {
    marginTop: 3,
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
    lineHeight: 15,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 999,
    backgroundColor: BLOG_COLORS.panelSoft,
    padding: 3,
    justifyContent: "center",
  },
  switchOn: {
    backgroundColor: BLOG_COLORS.gold,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BLOG_COLORS.white,
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  actionBtn: {
    minHeight: 46,
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnStack: {
    flexBasis: "100%",
    width: "100%",
  },
  secondaryBtn: {
    backgroundColor: BLOG_COLORS.panelSoft,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
  },
  previewBtn: {
    backgroundColor: BLOG_COLORS.gold,
  },
  draftBtn: {
    backgroundColor: BLOG_COLORS.red,
  },
  publishBtn: {
    backgroundColor: BLOG_COLORS.success,
  },
  secondaryText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  previewText: {
    color: BLOG_COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },
  actionText: {
    color: BLOG_COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
  metaCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    padding: 16,
    gap: 8,
  },
  metaTitle: {
    color: BLOG_COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  metaText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
    lineHeight: 16,
  },
});
