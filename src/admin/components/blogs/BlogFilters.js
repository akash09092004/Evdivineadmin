import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BlogFilters({
  search,
  onSearchChange,
  categoryValue,
  categoryOptions = [],
  statusValue,
  featuredValue,
  trendingValue,
  dateFrom,
  dateTo,
  onChange,
  onReset,
}) {
  const update = (key, value) => {
    onChange({
      categoryId: categoryValue,
      status: statusValue,
      featured: featuredValue,
      trending: trendingValue,
      dateFrom,
      dateTo,
      [key]: value,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={BLOG_COLORS.gold} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search blogs..."
            placeholderTextColor={BLOG_COLORS.muted}
            style={styles.searchInput}
          />
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
          <Ionicons name="refresh-outline" size={18} color={BLOG_COLORS.background} />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <FilterChip label="All Categories" active={!categoryValue} onPress={() => update("categoryId", "")} />
        {categoryOptions.map((item) => (
          <FilterChip
            key={item.id}
            label={item.name}
            active={categoryValue === item.id}
            onPress={() => update("categoryId", item.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.grid}>
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {["", "draft", "published", "scheduled", "archived"].map((item) => (
              <FilterChip
                key={item || "all"}
                label={item ? item[0].toUpperCase() + item.slice(1) : "All"}
                active={statusValue === item}
                onPress={() => update("status", item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Featured</Text>
          <View style={styles.chipRow}>
            {[
              { label: "All", value: "" },
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ].map((item) => (
              <FilterChip
                key={item.label}
                label={item.label}
                active={featuredValue === item.value}
                onPress={() => update("featured", item.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Trending</Text>
          <View style={styles.chipRow}>
            {[
              { label: "All", value: "" },
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ].map((item) => (
              <FilterChip
                key={item.label}
                label={item.label}
                active={trendingValue === item.value}
                onPress={() => update("trending", item.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date Filter</Text>
          <View style={styles.dateRow}>
            <TextInput
              value={dateFrom}
              onChangeText={(text) => update("dateFrom", text)}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor={BLOG_COLORS.muted}
              style={styles.dateInput}
            />
            <TextInput
              value={dateTo}
              onChangeText={(text) => update("dateTo", text)}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor={BLOG_COLORS.muted}
              style={styles.dateInput}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.panel,
    padding: 14,
    gap: 12,
    ...blogShadow,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: BLOG_COLORS.text,
    fontSize: 13,
  },
  resetBtn: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: BLOG_COLORS.gold,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resetText: {
    color: BLOG_COLORS.background,
    fontSize: 12,
    fontWeight: "900",
  },
  row: {
    gap: 8,
  },
  grid: {
    gap: 12,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: BLOG_COLORS.goldSoft,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: BLOG_COLORS.background,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: BLOG_COLORS.red,
    borderColor: BLOG_COLORS.red,
  },
  chipText: {
    color: BLOG_COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  chipTextActive: {
    color: BLOG_COLORS.white,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    color: BLOG_COLORS.text,
    paddingHorizontal: 12,
    fontSize: 12,
  },
});

