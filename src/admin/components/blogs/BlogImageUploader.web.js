import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";
import AdminImage from "../AdminImage";

export default function BlogImageUploader({
  value,
  altText,
  onChange,
  onRemove,
  onAltChange,
  progress = 0,
  label = "Featured Image",
  showAltText = true,
}) {
  const [preview, setPreview] = useState(value || "");

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const openPicker = () => {
    if (typeof document === "undefined") {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/jpg,image/webp";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        window.alert("Image size 5 MB se kam honi chahiye.");
        return;
      }

      if (Platform.OS === "web" && preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onChange(file, objectUrl);
    };

    input.click();
  };

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.panel}>
        <TouchableOpacity style={styles.uploadBtn} onPress={openPicker}>
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color={BLOG_COLORS.gold}
          />
          <Text style={styles.uploadText}>Upload or replace</Text>
        </TouchableOpacity>

        {preview || value ? (
          <View style={styles.previewWrap}>
            <AdminImage
              uri={preview || value || ""}
              style={styles.previewImage}
              placeholderLabel="No image selected yet"
            />
            <View style={styles.previewMeta}>
              <Text style={styles.previewPath} numberOfLines={1}>
                {String(value?.name || value || preview || "").slice(0, 80)}
              </Text>
              <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color={BLOG_COLORS.red}
                />
                <Text style={styles.removeText}>Remove image</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons
              name="image-outline"
              size={24}
              color={BLOG_COLORS.muted}
            />
            <Text style={styles.emptyText}>No image selected yet</Text>
          </View>
        )}

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, progress))}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress || 0)}%</Text>
        </View>

        {showAltText ? (
          <>
            <Text style={styles.altLabel}>Alt text</Text>
            <View style={styles.altInputBox}>
              <Ionicons
                name="text-outline"
                size={16}
                color={BLOG_COLORS.muted}
              />
              <TextInput
                value={altText}
                onChangeText={onAltChange}
                placeholder="Describe the image"
                placeholderTextColor={BLOG_COLORS.muted}
                style={styles.altInput}
              />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "800",
    color: BLOG_COLORS.goldSoft,
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    padding: 14,
    gap: 12,
    ...blogShadow,
  },
  uploadBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panelSoft,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  uploadText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  previewWrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
  },
  previewImage: {
    width: "100%",
    height: 220,
    backgroundColor: BLOG_COLORS.panelSoft,
  },
  previewMeta: {
    padding: 12,
    gap: 8,
  },
  previewPath: {
    color: BLOG_COLORS.text,
    fontSize: 11,
    fontWeight: "700",
  },
  removeBtn: {
    alignSelf: "flex-start",
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: BLOG_COLORS.redLight,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  removeText: {
    color: BLOG_COLORS.red,
    fontSize: 10,
    fontWeight: "800",
  },
  emptyPreview: {
    minHeight: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BLOG_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    color: BLOG_COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: BLOG_COLORS.panelSoft,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: BLOG_COLORS.gold,
  },
  progressText: {
    width: 38,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    color: BLOG_COLORS.textSoft,
  },
  altLabel: {
    fontSize: 10,
    color: BLOG_COLORS.textSoft,
    fontWeight: "700",
  },
  altInputBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panelAlt,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  altInput: {
    flex: 1,
    minHeight: 42,
    color: BLOG_COLORS.text,
    fontSize: 12,
  },
});
