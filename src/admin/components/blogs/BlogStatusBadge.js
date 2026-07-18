import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    backgroundColor: BLOG_COLORS.warningSoft,
    color: BLOG_COLORS.warning,
  },
  published: {
    label: "Published",
    backgroundColor: BLOG_COLORS.successSoft,
    color: BLOG_COLORS.success,
  },
  scheduled: {
    label: "Scheduled",
    backgroundColor: BLOG_COLORS.infoSoft,
    color: BLOG_COLORS.info,
  },
  archived: {
    label: "Archived",
    backgroundColor: BLOG_COLORS.redSoft,
    color: BLOG_COLORS.red,
  },
};

export default function BlogStatusBadge({ status }) {
  const key = String(status || "draft").toLowerCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.draft;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    ...blogShadow,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
  },
});

