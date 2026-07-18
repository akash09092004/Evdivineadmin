import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../theme/colors";

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
}) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={20} color={Colors.primary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    height: 44,
    backgroundColor: "#0E0826",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#F5EAFF",
  },
});
