import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { BLOG_COLORS } from "./blogTheme";

export default function BlogImageUploader({
  value,
  altText,
  onAltChange,
  label = "Featured Image",
  showAltText = true,
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.panel}>
        <Text style={styles.note}>
          Web admin panel par direct image upload supported hai. Native fallback
          me selected image yahan preview hoti hai.
        </Text>
        <Text style={styles.current}>
          {value ? "Current image available" : "No image selected"}
        </Text>
        {showAltText ? (
          <>
            <Text style={styles.altLabel}>Alt text</Text>
            <View style={styles.altInputBox}>
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
  block: { marginBottom: 14 },
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
    gap: 10,
  },
  note: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  current: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
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
    justifyContent: "center",
  },
  altInput: {
    minHeight: 42,
    color: BLOG_COLORS.text,
    fontSize: 12,
  },
});
