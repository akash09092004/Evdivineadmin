import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

export default function BlogSelect({
  label,
  value,
  placeholder = "Select",
  options = [],
  onChange,
  helperText,
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    const found = options.find((item) => String(item.value) === String(value));
    return found?.label || "";
  }, [options, value]);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity style={styles.selector} onPress={() => setOpen(true)}>
        <Text style={[styles.selectorText, !selectedLabel && styles.placeholder]}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down-outline" size={16} color={BLOG_COLORS.textSoft} />
      </TouchableOpacity>

      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close-outline" size={20} color={BLOG_COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetList}>
              {options.map((item) => {
                const active = String(item.value) === String(value);
                return (
                  <TouchableOpacity
                    key={String(item.value) || item.label}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {item.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={16} color={BLOG_COLORS.gold} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: BLOG_COLORS.goldSoft,
  },
  selector: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectorText: {
    flex: 1,
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  placeholder: {
    color: BLOG_COLORS.muted,
    fontWeight: "600",
  },
  helper: {
    fontSize: 10,
    color: BLOG_COLORS.textSoft,
    lineHeight: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 7, 6, 0.5)",
    justifyContent: "center",
    padding: 18,
  },
  sheet: {
    maxHeight: "70%",
    borderRadius: 18,
    backgroundColor: BLOG_COLORS.panel,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    overflow: "hidden",
    ...blogShadow,
  },
  sheetHeader: {
    minHeight: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BLOG_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: BLOG_COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  sheetList: {
    padding: 10,
    gap: 8,
  },
  option: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionActive: {
    borderColor: BLOG_COLORS.gold,
    backgroundColor: BLOG_COLORS.panelAlt,
  },
  optionText: {
    flex: 1,
    color: BLOG_COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  optionTextActive: {
    color: BLOG_COLORS.goldSoft,
  },
});

