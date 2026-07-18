import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminCreateAvailability,
  adminGetAvailability,
  adminUpdateAvailability,
  normalizeList,
} from "../utils/adminApi";
import { Colors } from "../../theme/colors";

const DAY_OPTIONS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];

const EMPTY_SHIFT = { startTime: "10:00", endTime: "18:00" };

const EMPTY_FORM = {
  dayOfWeek: 1,
  timezone: "Asia/Kolkata",
  isAvailable: true,
  shifts: [EMPTY_SHIFT],
};

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function dayName(value) {
  const found = DAY_OPTIONS.find((item) => Number(item.value) === Number(value));
  return found ? found.label : `Day ${value ?? "-"}`;
}

function normalizeAvailability(item) {
  return {
    id: item?._id || item?.id || `availability-${Math.random().toString(36).slice(2)}`,
    rawId: item?._id || item?.id || null,
    dayOfWeek: Number(item?.dayOfWeek ?? 1),
    timezone: item?.timezone || "Asia/Kolkata",
    isAvailable: Boolean(item?.isAvailable),
    shifts: Array.isArray(item?.shifts) ? item.shifts : [],
    createdAt: formatDate(item?.createdAt),
    updatedAt: formatDate(item?.updatedAt),
  };
}

function extractAvailabilityList(data) {
  if (!data || typeof data !== "object") return [];
  const list = normalizeList(data, ["availability", "data", "items", "results"]);
  return Array.isArray(list) ? list : [];
}

function humanizeShifts(shifts = []) {
  if (!Array.isArray(shifts) || shifts.length === 0) return "No shifts";
  return shifts
    .map((shift) => `${shift.startTime || "--:--"} to ${shift.endTime || "--:--"}`)
    .join(" | ");
}

export default function Availability() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const columns = useMemo(
    () => [
      { title: "Day", key: "dayOfWeek", width: 90 },
      { title: "Timezone", key: "timezone", width: 150 },
      { title: "Availability", key: "availability", width: 120 },
      { title: "Shifts", key: "shifts", width: 280 },
      { title: "Updated", key: "updatedAt", width: 180 },
    ],
    []
  );

  const loadAvailability = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGetAvailability();
      const list = extractAvailabilityList(data);
      setRecords(list.map(normalizeAvailability));
    } catch (err) {
      setRecords([]);
      setError(
        err?.response?.data?.message || err?.message || "Availability load nahi ho payi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  const filteredRecords = records.filter((item) =>
    [dayName(item.dayOfWeek), item.timezone, humanizeShifts(item.shifts), item.isAvailable]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const total = records.length;
    const active = records.filter((item) => item.isAvailable).length;
    const shifts = records.reduce((sum, item) => sum + (item.shifts?.length || 0), 0);

    return [
      { label: "Schedules", value: String(total), icon: "calendar-outline", color: Colors.primary },
      { label: "Available", value: String(active), icon: "checkmark-circle-outline", color: "#22C55E" },
      { label: "Shifts", value: String(shifts), icon: "time-outline", color: Colors.accent },
    ];
  }, [records]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleShiftChange = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      shifts: prev.shifts.map((shift, shiftIndex) =>
        shiftIndex === index ? { ...shift, [key]: value } : shift
      ),
    }));
  };

  const addShift = () => {
    setForm((prev) => ({ ...prev, shifts: [...prev.shifts, { ...EMPTY_SHIFT }] }));
  };

  const removeShift = (index) => {
    setForm((prev) => {
      const next = prev.shifts.filter((_, shiftIndex) => shiftIndex !== index);
      return { ...prev, shifts: next.length ? next : [{ ...EMPTY_SHIFT }] };
    });
  };

  const resetForm = () => {
    setSelectedRecord(null);
    setForm(EMPTY_FORM);
  };

  const applyRecordUpdate = (rawId, nextItem, sourceId) => {
    setRecords((prev) =>
      prev.map((item) =>
        item.rawId === rawId || item.id === sourceId
          ? { ...item, ...nextItem, id: item.id, rawId: item.rawId || nextItem.rawId }
          : item
      )
    );
  };

  const setFormFromRecord = (record) => {
    setSelectedRecord(record);
    setForm({
      dayOfWeek: Number(record.dayOfWeek ?? 1),
      timezone: record.timezone || "Asia/Kolkata",
      isAvailable: Boolean(record.isAvailable),
      shifts:
        Array.isArray(record.shifts) && record.shifts.length > 0
          ? record.shifts.map((shift) => ({
              startTime: shift.startTime || "",
              endTime: shift.endTime || "",
            }))
          : [{ ...EMPTY_SHIFT }],
    });
  };

  const validate = () => {
    if (!form.timezone.trim()) {
      Alert.alert("Error", "Timezone required hai.");
      return false;
    }

    if (!Array.isArray(form.shifts) || form.shifts.length === 0) {
      Alert.alert("Error", "At least one shift add karo.");
      return false;
    }

    const hasValidShift = form.shifts.some(
      (shift) => shift.startTime?.trim() && shift.endTime?.trim()
    );

    if (!hasValidShift) {
      Alert.alert("Error", "Shift start aur end time required hai.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      dayOfWeek: Number(form.dayOfWeek || 1),
      timezone: form.timezone.trim(),
      isAvailable: Boolean(form.isAvailable),
      shifts: form.shifts
        .map((shift) => ({
          startTime: String(shift.startTime || "").trim(),
          endTime: String(shift.endTime || "").trim(),
        }))
        .filter((shift) => shift.startTime && shift.endTime),
    };

    setSaving(true);

    try {
      if (selectedRecord?.rawId) {
        const result = await adminUpdateAvailability(selectedRecord.rawId, payload);
        const nextItem = normalizeAvailability(
          result?.data || result?.result || result || { ...payload, _id: selectedRecord.rawId }
        );
        applyRecordUpdate(selectedRecord.rawId, nextItem, selectedRecord.id);
        Alert.alert("Success", "Availability updated.");
      } else {
        const result = await adminCreateAvailability(payload);
        const nextItem = normalizeAvailability(result?.data || result?.result || result || payload);
        setRecords((prev) => [nextItem, ...prev]);
        Alert.alert("Success", "Availability created.");
      }

      resetForm();
      await loadAvailability();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Availability save nahi ho payi."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (item, col) => {
    if (col.key === "dayOfWeek") {
      return <Text style={styles.cellStrong}>{dayName(item.dayOfWeek)}</Text>;
    }

    if (col.key === "availability") {
      return (
        <View style={[styles.badge, item.isAvailable ? styles.badgeOn : styles.badgeOff]}>
          <Text style={styles.badgeText}>{item.isAvailable ? "Available" : "Blocked"}</Text>
        </View>
      );
    }

    if (col.key === "shifts") {
      return (
        <Text style={styles.cellText} numberOfLines={2}>
          {humanizeShifts(item.shifts)}
        </Text>
      );
    }

    if (col.key === "updatedAt") {
      return <Text style={styles.cellText}>{item.updatedAt}</Text>;
    }

    return <Text style={styles.cellText}>{String(item[col.key] ?? "")}</Text>;
  };

  const renderRowActions = (item) => {
    const busy = saving || Boolean(actionId) || loading;

    return (
      <View style={styles.rowActions}>
        <TouchableOpacity
          style={styles.actionPill}
          onPress={() => setFormFromRecord(item)}
          disabled={busy}
        >
          <Ionicons name="create-outline" size={14} color="#fff" />
          <Text style={styles.actionPillText}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.kicker}>Schedule Manager</Text>
        <Text style={styles.title}>Availability</Text>
        <Text style={styles.subtitle}>
          Weekly availability create aur update karo with dynamic shifts.
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
              <Text style={styles.cardTitle}>
                {selectedRecord ? "Edit Availability" : "Create Availability"}
              </Text>
              <Text style={styles.cardSub}>
                {selectedRecord ? "Selected schedule edit mode" : "New weekly schedule add karo"}
              </Text>
            </View>
            {selectedRecord ? (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Editing</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.label}>Day Of Week</Text>
          <View style={styles.dayRow}>
            {DAY_OPTIONS.map((item) => {
              const active = Number(form.dayOfWeek) === Number(item.value);
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleChange("dayOfWeek", item.value)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Timezone</Text>
          <TextInput
            style={styles.input}
            value={form.timezone}
            onChangeText={(text) => handleChange("timezone", text)}
            placeholder="Asia/Kolkata"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>Status</Text>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => handleChange("isAvailable", !form.isAvailable)}
          >
            <Ionicons
              name={form.isAvailable ? "checkmark-circle" : "close-circle"}
              size={16}
              color="#fff"
            />
            <Text style={styles.switchText}>
              {form.isAvailable ? "Available" : "Unavailable"}
            </Text>
          </TouchableOpacity>

          <View style={styles.shiftHeader}>
            <View>
              <Text style={styles.sectionTitle}>Shifts</Text>
              <Text style={styles.sectionSub}>
                Add one or more working windows for the selected day.
              </Text>
            </View>
            <TouchableOpacity style={styles.addShiftBtn} onPress={addShift}>
              <Ionicons name="add-outline" size={14} color="#fff" />
              <Text style={styles.addShiftText}>Add Shift</Text>
            </TouchableOpacity>
          </View>

          {form.shifts.map((shift, index) => (
            <View key={index} style={styles.shiftCard}>
              <View style={styles.shiftRowHeader}>
                <Text style={styles.shiftLabel}>Shift {index + 1}</Text>
                {form.shifts.length > 1 ? (
                  <TouchableOpacity onPress={() => removeShift(index)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.accent} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.shiftRow}>
                <View style={styles.shiftHalf}>
                  <Text style={styles.smallLabel}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={shift.startTime}
                    onChangeText={(text) => handleShiftChange(index, "startTime", text)}
                    placeholder="10:00"
                    placeholderTextColor="#8B7AA8"
                  />
                </View>
                <View style={styles.shiftHalf}>
                  <Text style={styles.smallLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    value={shift.endTime}
                    onChangeText={(text) => handleShiftChange(index, "endTime", text)}
                    placeholder="18:00"
                    placeholderTextColor="#8B7AA8"
                  />
                </View>
              </View>
            </View>
          ))}

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
                <Text style={styles.primaryText}>
                  {selectedRecord ? "Update" : "Create"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Availability List</Text>
              <Text style={styles.cardSub}>Existing schedules on your admin panel</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadAvailability}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Availability loading...</Text>
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
            placeholder="Search day, timezone or shift..."
          />

          <DataTable
            columns={columns}
            data={filteredRecords}
            onRowPress={setFormFromRecord}
            renderCell={renderCell}
            renderRowActions={renderRowActions}
            actionColumnWidth={120}
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
    backgroundColor: "rgba(124,58,237,0.2)",
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
  },
  editBadge: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.accent,
    justifyContent: "center",
  },
  editBadgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  label: {
    color: "#D8B4FE",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 4,
  },
  smallLabel: {
    color: "#A7B0D1",
    fontWeight: "800",
    marginBottom: 8,
    fontSize: 12,
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#0B1020",
    justifyContent: "center",
    alignItems: "center",
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    color: "#E9D5FF",
    fontWeight: "800",
    fontSize: 12,
  },
  dayChipTextActive: {
    color: "#fff",
  },
  input: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#0B1020",
    color: "#fff",
    paddingHorizontal: 14,
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
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionSub: {
    color: "#A7B0D1",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  addShiftBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  addShiftText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  shiftCard: {
    backgroundColor: "#0B1020",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2B3354",
    padding: 14,
    marginBottom: 10,
  },
  shiftRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftLabel: {
    color: "#fff",
    fontWeight: "900",
  },
  shiftRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  shiftHalf: {
    flex: 1,
    minWidth: 150,
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
  cellStrong: {
    color: "#fff",
    fontWeight: "900",
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
