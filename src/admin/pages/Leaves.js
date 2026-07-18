import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { adminCreateLeave, adminGetLeaves, normalizeList } from "../utils/adminApi";
import { Colors } from "../../theme/colors";

const EMPTY_FORM = {
  startAt: "2026-07-20T09:00:00.000Z",
  endAt: "2026-07-20T12:00:00.000Z",
  reason: "Morning leave",
  isActive: true,
};

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function normalizeLeave(item) {
  return {
    id: item?._id || item?.id || `leave-${Math.random().toString(36).slice(2)}`,
    rawId: item?._id || item?.id || null,
    startAt: item?.startAt || "",
    endAt: item?.endAt || "",
    reason: item?.reason || "N/A",
    isActive: Boolean(item?.isActive),
    createdAt: formatDateTime(item?.createdAt),
    updatedAt: formatDateTime(item?.updatedAt),
  };
}

function extractLeaveList(data) {
  if (!data || typeof data !== "object") return [];
  const list = normalizeList(data, ["leaves", "data", "items", "results"]);
  return Array.isArray(list) ? list : [];
}

export default function Leaves() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const columns = useMemo(
    () => [
      { title: "Start", key: "startAt", width: 180 },
      { title: "End", key: "endAt", width: 180 },
      { title: "Reason", key: "reason", width: 260 },
      { title: "Status", key: "status", width: 100 },
      { title: "Created", key: "createdAt", width: 180 },
    ],
    []
  );

  const loadLeaves = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGetLeaves();
      const list = extractLeaveList(data);
      setRecords(list.map(normalizeLeave));
    } catch (err) {
      setRecords([]);
      setError(err?.response?.data?.message || err?.message || "Leaves load nahi ho payi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const filteredRecords = records.filter((item) =>
    [item.startAt, item.endAt, item.reason, item.isActive ? "active" : "inactive"]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = records.length;
    const active = records.filter((item) => item.isActive).length;
    const inactive = total - active;

    return [
      { label: "Leaves", value: String(total), icon: "calendar-outline", color: Colors.primary },
      { label: "Active", value: String(active), icon: "checkmark-circle-outline", color: "#22C55E" },
      { label: "Inactive", value: String(inactive), icon: "close-circle-outline", color: Colors.accent },
    ];
  }, [records]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setSelectedRecord(null);
    setForm(EMPTY_FORM);
  };

  const setFormFromRecord = (record) => {
    setSelectedRecord(record);
    setForm({
      startAt: record.startAt || "",
      endAt: record.endAt || "",
      reason: record.reason || "",
      isActive: Boolean(record.isActive),
    });
  };

  const validate = () => {
    if (!form.startAt.trim() || !form.endAt.trim() || !form.reason.trim()) {
      Alert.alert("Error", "Start, end aur reason required hai.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      startAt: form.startAt.trim(),
      endAt: form.endAt.trim(),
      reason: form.reason.trim(),
      isActive: Boolean(form.isActive),
    };

    setSaving(true);

    try {
      const result = await adminCreateLeave(payload);
      const nextItem = normalizeLeave(result?.data || result?.result || result || payload);
      setRecords((prev) => [nextItem, ...prev]);
      Alert.alert("Success", "Leave created.");
      resetForm();
      await loadLeaves();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.message || err?.message || "Leave create nahi ho payi.");
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (item, col) => {
    if (col.key === "status") {
      return (
        <View style={[styles.badge, item.isActive ? styles.badgeOn : styles.badgeOff]}>
          <Text style={styles.badgeText}>{item.isActive ? "Active" : "Inactive"}</Text>
        </View>
      );
    }

    if (col.key === "reason") {
      return <Text style={styles.cellText}>{item.reason}</Text>;
    }

    return <Text style={styles.cellText}>{String(item[col.key] ?? "")}</Text>;
  };

  const renderRowActions = (item) => (
    <View style={styles.rowActions}>
      <TouchableOpacity style={styles.actionPill} onPress={() => setFormFromRecord(item)}>
        <Ionicons name="copy-outline" size={14} color="#fff" />
        <Text style={styles.actionPillText}>Load</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.kicker}>Leave Manager</Text>
        <Text style={styles.title}>Leaves</Text>
        <Text style={styles.subtitle}>
          Create and review leave windows for the admin schedule.
        </Text>
        <View style={styles.heroStats}>
          {stats.map((item) => (
            <View key={item.label} style={styles.heroStat}>
              <View style={[styles.heroStatIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={18} color="#fff" />
              </View>
              <Text style={styles.heroStatValue}>{item.value}</Text>
              <Text style={styles.heroStatLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.grid, isWide && styles.gridWide]}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Create Leave</Text>
              <Text style={styles.cardSub}>
                {selectedRecord
                  ? "Row se data load hua hai. Save karne par naya leave create hoga."
                  : "New leave window add karo."}
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadLeaves}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Start At</Text>
          <TextInput
            style={styles.input}
            value={form.startAt}
            onChangeText={(text) => handleChange("startAt", text)}
            placeholder="2026-07-20T09:00:00.000Z"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>End At</Text>
          <TextInput
            style={styles.input}
            value={form.endAt}
            onChangeText={(text) => handleChange("endAt", text)}
            placeholder="2026-07-20T12:00:00.000Z"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.reason}
            onChangeText={(text) => handleChange("reason", text)}
            placeholder="Morning leave"
            placeholderTextColor="#8B7AA8"
            multiline
          />

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => handleChange("isActive", !form.isActive)}
          >
            <Ionicons
              name={form.isActive ? "checkmark-circle" : "close-circle"}
              size={16}
              color="#fff"
            />
            <Text style={styles.switchText}>
              {form.isActive ? "Active" : "Inactive"}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={resetForm}>
              <Text style={styles.secondaryText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.disabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Create Leave</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Leave List</Text>
              <Text style={styles.cardSub}>Latest leave records from API</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredRecords.length} items</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Leaves loading...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.statusBox}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.accent} />
              <Text style={styles.statusText}>{error}</Text>
            </View>
          ) : null}

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by date, reason or status..."
          />

          <DataTable
            columns={columns}
            data={filteredRecords}
            onRowPress={setFormFromRecord}
            renderCell={renderCell}
            renderRowActions={renderRowActions}
            actionColumnWidth={110}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 10px 30px rgba(0,0,0,0.35)" },
  default: { elevation: 7 },
});

const styles = StyleSheet.create({
  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#14172A",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#272D47",
    marginBottom: 14,
    ...shadow,
  },
  heroGlow: {
    position: "absolute",
    right: -36,
    top: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(6,182,212,0.18)",
  },
  kicker: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8,
  },
  subtitle: {
    color: "#B7C0E0",
    marginTop: 8,
    lineHeight: 20,
    fontSize: 14,
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroStat: {
    minWidth: 110,
    padding: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "#D8B4FE",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  grid: {
    gap: 14,
  },
  gridWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  card: {
    flex: 1,
    backgroundColor: "#151B2E",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  cardSub: {
    color: "#A7B0D1",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    color: "#D8B4FE",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#0B1020",
    color: "#fff",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 96,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  switchBtn: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#0B1020",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  switchText: {
    color: "#fff",
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "900",
  },
  primaryBtn: {
    flex: 1.25,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
  },
  disabled: { opacity: 0.75 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  countBadgeText: {
    color: "#E9D5FF",
    fontWeight: "800",
    fontSize: 12,
  },
  statusBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#2B3354",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  cellText: {
    color: "#F5EAFF",
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  badgeOn: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.38)",
  },
  badgeOff: {
    backgroundColor: "rgba(249,115,22,0.18)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.38)",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
    textTransform: "uppercase",
  },
  rowActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  actionPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionPillText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
  },
});
