import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import BlogImageUploader from "./BlogImageUploader";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

function Field({ label, value, onChangeText, placeholder, multiline = false }) {
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
      />
    </View>
  );
}

export default function BlogSeoFields({
  form,
  onChange,
  metaDescriptionCount = 0,
}) {
  const update = (key, value) => {
    onChange({
      ...form,
      [key]: value,
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>SEO Section</Text>

      <Field
        label="SEO Title"
        value={form.seoTitle}
        onChangeText={(text) => update("seoTitle", text)}
        placeholder="Search result title"
      />

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Meta Description</Text>
          <Text style={styles.counter}>{metaDescriptionCount}/160</Text>
        </View>
        <TextInput
          value={form.metaDescription}
          onChangeText={(text) => update("metaDescription", text)}
          placeholder="Short search description"
          placeholderTextColor={BLOG_COLORS.muted}
          style={[styles.input, styles.textArea]}
          multiline
        />
      </View>

      <Field
        label="SEO Keywords"
        value={form.seoKeywords}
        onChangeText={(text) => update("seoKeywords", text)}
        placeholder="keyword one, keyword two"
      />

      <Field
        label="Canonical URL"
        value={form.canonicalUrl}
        onChangeText={(text) => update("canonicalUrl", text)}
        placeholder="https://example.com/blog/slug"
      />

      <BlogImageUploader
        label="OG Image"
        value={form.ogImageRaw}
        altText={form.ogImageAltText || ""}
        onAltChange={(text) => update("ogImageAltText", text)}
        onChange={(file, preview) => {
          update("ogImageRaw", preview || "");
          update("ogImageFile", file || null);
        }}
        onRemove={() => {
          update("ogImageRaw", "");
          update("ogImageAltText", "");
          update("ogImageFile", null);
        }}
        showAltText={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    padding: 16,
    gap: 2,
    ...blogShadow,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: BLOG_COLORS.text,
    marginBottom: 8,
  },
  field: {
    marginTop: 10,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: BLOG_COLORS.goldSoft,
  },
  counter: {
    fontSize: 10,
    fontWeight: "800",
    color: BLOG_COLORS.textSoft,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panelAlt,
    color: BLOG_COLORS.text,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 12,
  },
});
