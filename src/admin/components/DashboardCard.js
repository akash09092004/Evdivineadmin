import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";

export default function DashboardCard({ title, value, icon, color = Colors.primary }) {
  const { width } = useWindowDimensions();
  const cardWidth = width >= 1100 ? "24%" : width >= 700 ? "48.5%" : "100%";

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0E0826",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 12,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.08)",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoBox: {
    flex: 1,
  },
  value: {
    fontSize: 17,
    fontWeight: "900",
    color: "#F5EAFF",
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 2,
  },
});
