import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminHeader({
  title = "Dashboard",
  showMenu = false,
  onMenuPress,
  safeTopInset = 0,
}) {
  const insets = useSafeAreaInsets();
  const topPad = 10 + Math.max(insets.top, safeTopInset) * 0.65;

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.leftGroup}>
        {showMenu ? (
          <Pressable
            accessibilityRole="button"
            onPress={onMenuPress}
            style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <Ionicons name="menu" size={24} color="#fff" />
          </Pressable>
        ) : (
          <View style={styles.menuPlaceholder} />
        )}

        <View style={styles.titleBox}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.subTitle}>Admin Panel</Text>
        </View>
      </View>

      <View style={styles.profileCircle}>
        <Ionicons name="person" size={21} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0C0818",
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,154,255,0.08)",
  },
  leftGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  menuPlaceholder: {
    width: 38,
    height: 38,
    marginRight: 8,
  },
  titleBox: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F5EAFF",
  },
  subTitle: {
    fontSize: 11,
    color: "#9B8FC0",
    marginTop: 2,
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
