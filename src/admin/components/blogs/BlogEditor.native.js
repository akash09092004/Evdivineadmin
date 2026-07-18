import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

export default function BlogEditor({ value, onChange }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Rich editor web admin panel par best experience deta hai.</Text>
        <Text style={styles.noticeText}>
          Native fallback HTML source editing allow karta hai, so content backend ke liye safe raha.
        </Text>
      </View>

      <View style={styles.editorCard}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="<p>Write blog content...</p>"
          placeholderTextColor={BLOG_COLORS.muted}
          style={styles.input}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  notice: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panelSoft,
    padding: 14,
    gap: 4,
  },
  noticeTitle: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  noticeText: {
    color: BLOG_COLORS.textSoft,
    fontSize: 11,
    lineHeight: 16,
  },
  editorCard: {
    minHeight: 280,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    padding: 14,
    ...blogShadow,
  },
  input: {
    minHeight: 250,
    color: BLOG_COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
});

