import React from "react";
import { View, StyleSheet } from "react-native";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

function Line({ width = "100%", height = 16 }) {
  return <View style={[styles.line, { width, height }]} />;
}

export default function BlogSkeleton({ variant = "page" }) {
  if (variant === "table") {
    return (
      <View style={styles.card}>
        <Line width="45%" height={18} />
        <Line width="100%" height={52} />
        <Line width="100%" height={52} />
        <Line width="100%" height={52} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Line width="62%" height={24} />
      <Line width="48%" />
      <Line width="100%" height={48} />
      <Line width="100%" height={48} />
      <Line width="100%" height={180} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 16,
    gap: 12,
    ...blogShadow,
  },
  line: {
    borderRadius: 999,
    backgroundColor: "#3A2320",
  },
});

