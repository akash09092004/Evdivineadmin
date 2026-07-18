import React, { useEffect, useState } from "react";
import {
  Animated,
  Platform,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

export function useBlogToast() {
  const [toast, setToast] = useState(null);

  const showToast = (type, message, duration = 2600) => {
    setToast({ id: Date.now(), type, message });

    if (duration !== 0) {
      setTimeout(() => {
        setToast((current) => (current?.id ? null : current));
      }, duration);
    }
  };

  const hideToast = () => setToast(null);

  return { toast, showToast, hideToast };
}

export default function BlogToast({ toast, onDismiss }) {
  const [opacity] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(10));

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(10);
    }
  }, [toast, opacity, translateY]);

  if (!toast) {
    return null;
  }

  const tone =
    toast.type === "error"
      ? {
          backgroundColor: BLOG_COLORS.redSoft,
          borderColor: "#E7B7B0",
          icon: "alert-circle-outline",
          iconColor: BLOG_COLORS.red,
          textColor: BLOG_COLORS.red,
        }
      : {
          backgroundColor: BLOG_COLORS.successSoft,
          borderColor: "#BFE6D9",
          icon: "checkmark-circle-outline",
          iconColor: BLOG_COLORS.success,
          textColor: BLOG_COLORS.success,
        };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: tone.backgroundColor,
          borderColor: tone.borderColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name={tone.icon} size={18} color={tone.iconColor} />
      <Text style={[styles.message, { color: tone.textColor }]}>
        {toast.message}
      </Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={10}>
        <Ionicons name="close-outline" size={18} color={tone.textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    ...blogShadow,
  },
  message: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
