import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";
import { slugify } from "./blogUtils";
import BlogConfirmModal from "./BlogConfirmModal";
import AdminImage from "../AdminImage";

export default function BlogCategoryModal({
  visible,
  mode = "create",
  initialValue,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    active: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [preview, setPreview] = useState("");
  const previewRef = useRef("");

  useEffect(() => {
    previewRef.current = preview || "";
  }, [preview]);

  useEffect(() => {
    if (visible) {
      const next = initialValue || {};
      const imageValue =
        next.imageRaw ||
        next.imageObject?.url ||
        next.imageObject?.secure_url ||
        next.imageObject?.imageUrl ||
        next.image?.url ||
        next.image?.secure_url ||
        next.image?.imageUrl ||
        next.image ||
        "";
      setForm({
        name: next.name || "",
        slug: next.slug || slugify(next.name || ""),
        description: next.description || "",
        active: next.active !== undefined ? Boolean(next.active) : true,
      });
      setImageFile(null);
      setPreview(imageValue);
    }
  }, [visible, initialValue]);

  const title = mode === "edit" ? "Edit Category" : "Add Category";

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (mode === "create" && !imageFile) {
      window.alert(
        "Category create karne ke liye image file upload karna zaroori hai."
      );
      return;
    }

    onSave(
      {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
      },
      imageFile
    );
  };

  const handlePickImage = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (Platform.OS === "web" && previewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setImageFile(file);
    };
    input.click();
  };

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>
                  Category details carefully fill karo.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setConfirmReset(true)}
                style={styles.closeBtn}
              >
                <Ionicons
                  name="close-outline"
                  size={20}
                  color={BLOG_COLORS.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(text) => {
                  update("name", text);
                  if (!form.slug || form.slug === slugify(form.name)) {
                    update("slug", slugify(text));
                  }
                }}
                placeholder="Category name"
                placeholderTextColor={BLOG_COLORS.muted}
                style={styles.input}
              />

              <Text style={styles.label}>Slug</Text>
              <TextInput
                value={form.slug}
                onChangeText={(text) => update("slug", slugify(text))}
                placeholder="auto-generated-slug"
                placeholderTextColor={BLOG_COLORS.muted}
                style={styles.input}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                value={form.description}
                onChangeText={(text) => update("description", text)}
                placeholder="Short description"
                placeholderTextColor={BLOG_COLORS.muted}
                style={[styles.input, styles.textArea]}
                multiline
              />

              <Text style={styles.label}>Category Image</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickImage}
              >
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={BLOG_COLORS.gold}
                />
                <Text style={styles.uploadText}>
                  {preview ? "Replace image" : "Upload image"}
                </Text>
              </TouchableOpacity>

              {preview ? (
                <View style={styles.previewBox}>
                  <AdminImage
                    uri={preview}
                    style={styles.previewImage}
                    placeholderLabel="No image"
                  />
                </View>
              ) : null}
              <Text style={styles.helper}>
                Image file upload hi save hoga, URL text field use nahi hota.
              </Text>

              <TouchableOpacity
                style={[
                  styles.switchRow,
                  form.active && styles.switchRowActive,
                ]}
                onPress={() => update("active", !form.active)}
              >
                <View style={styles.switchTextWrap}>
                  <Text style={styles.switchTitle}>Active</Text>
                  <Text style={styles.switchSub}>
                    Inactive category visible nahi hogi.
                  </Text>
                </View>
                <View style={[styles.switch, form.active && styles.switchOn]}>
                  <View
                    style={[
                      styles.switchThumb,
                      form.active && styles.switchThumbOn,
                    ]}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleSave}
                >
                  <Text style={styles.primaryText}>
                    {mode === "edit" ? "Update Category" : "Save Category"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BlogConfirmModal
        visible={confirmReset}
        title="Discard changes?"
        message="Unsaved category changes discard karni hain?"
        confirmLabel="Discard"
        confirmTone="danger"
        onConfirm={() => {
          setConfirmReset(false);
          onClose();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 7, 6, 0.54)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "92%",
    alignSelf: "center",
    backgroundColor: BLOG_COLORS.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    overflow: "hidden",
    ...blogShadow,
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BLOG_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: BLOG_COLORS.text,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 11,
    color: BLOG_COLORS.textSoft,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panelSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
  },
  body: {
    padding: 18,
  },
  label: {
    marginBottom: 6,
    marginTop: 10,
    fontSize: 11,
    fontWeight: "800",
    color: BLOG_COLORS.goldSoft,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    color: BLOG_COLORS.text,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  textArea: {
    minHeight: 92,
    paddingTop: 12,
  },
  uploadButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  previewBox: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  switchRow: {
    marginTop: 14,
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  switchRowActive: {
    borderColor: BLOG_COLORS.gold,
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    color: BLOG_COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  switchSub: {
    marginTop: 3,
    color: BLOG_COLORS.muted,
    fontSize: 11,
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
  actions: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panelSoft,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  primaryBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: BLOG_COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },
});
