import React from "react";
import { View, StyleSheet, Platform } from "react-native";

export default function AuthBackground({ children }) {
  return <View style={styles.background}>{children}</View>;
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#12092E",
    ...Platform.select({
      web: {
        backgroundImage:
          "radial-gradient(circle at top, rgba(124,58,237,0.35), transparent 35%), linear-gradient(180deg, #12092E 0%, #07041A 100%)",
      },
    }),
  },
});
