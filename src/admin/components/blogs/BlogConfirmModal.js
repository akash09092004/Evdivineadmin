import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

export default function BlogConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "danger",
  onConfirm,
  onCancel,
}) {
  const actionTone =
    confirmTone === "primary"
      ? styles.primaryBtn
      : confirmTone === "success"
        ? styles.successBtn
        : styles.dangerBtn;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={BLOG_COLORS.gold}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, actionTone]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 7, 6, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: BLOG_COLORS.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    padding: 18,
    ...blogShadow,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: BLOG_COLORS.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: BLOG_COLORS.text,
  },
  message: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: BLOG_COLORS.textSoft,
  },
  actions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panelSoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
  },
  cancelText: {
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  confirmBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dangerBtn: {
    backgroundColor: BLOG_COLORS.red,
  },
  successBtn: {
    backgroundColor: BLOG_COLORS.success,
  },
  primaryBtn: {
    backgroundColor: BLOG_COLORS.gold,
  },
  confirmText: {
    color: BLOG_COLORS.white,
    fontSize: 12,
    fontWeight: "900",
  },
});
