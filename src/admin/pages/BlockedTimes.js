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
  adminCreateBlockedTime,
  adminGetBlockedTimes,
  adminGetBookings,
  adminGetUpcomingBookings,
  normalizeList,
} from "../utils/adminApi";
import { Colors } from "../../theme/colors";

const EMPTY_FORM = {
  startAt: "2026-07-21T15:00:00.000Z",
  endAt: "2026-07-21T16:00:00.000Z",
  reason: "Personal block",
  isActive: true,
};

const bookingTabs = [
  { label: "Bookings", value: "all", icon: "calendar-outline" },
  { label: "Upcoming", value: "upcoming", icon: "time-outline" },
];

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function normalizeBlockedTime(item) {
  return {
    id: item?._id || item?.id || `blocked-${Math.random().toString(36).slice(2)}`,
    rawId: item?._id || item?.id || null,
    startAt: item?.startAt || "",
    endAt: item?.endAt || "",
    reason: item?.reason || "N/A",
    isActive: Boolean(item?.isActive),
    createdAt: formatDateTime(item?.createdAt),
    updatedAt: formatDateTime(item?.updatedAt),
  };
}

function normalizeBooking(item, index = 0) {
  const user = item?.user || item?.customer || {};
  const advisor = item?.advisor || item?.admin || item?.consultant || {};

  return {
    id:
      item?._id ||
      item?.id ||
      item?.bookingId ||
      `booking-${index + 1}`,
    bookingId: item?.bookingId || item?.referenceId || item?._id || "N/A",
    userName:
      user?.name ||
      user?.fullName ||
      item?.userName ||
      item?.customerName ||
      item?.name ||
      "N/A",
    advisorName:
      advisor?.name ||
      advisor?.fullName ||
      item?.advisorName ||
      item?.consultantName ||
      "N/A",
    service: item?.service || item?.package || item?.plan || "Booking",
    status: String(item?.status || item?.bookingStatus || item?.state || "N/A"),
    startAt: item?.startAt || item?.bookingStartAt || item?.scheduledAt || "",
    endAt: item?.endAt || item?.bookingEndAt || item?.finishedAt || "",
    createdAt: formatDateTime(item?.createdAt),
    updatedAt: formatDateTime(item?.updatedAt),
    raw: item || {},
  };
}

function extractBlockedTimes(data) {
  if (!data || typeof data !== "object") return [];
  const list = normalizeList(data, ["blockedTimes", "data", "items", "results"]);
  return Array.isArray(list) ? list : [];
}

function extractBookings(data) {
  if (!data || typeof data !== "object") return [];
  const list = normalizeList(data, ["bookings", "data", "items", "results"]);
  return Array.isArray(list) ? list : [];
}

export default function BlockedTimes() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const blockedColumns = useMemo(
    () => [
      { title: "Start", key: "startAt", width: 180 },
      { title: "End", key: "endAt", width: 180 },
      { title: "Reason", key: "reason", width: 250 },
      { title: "Status", key: "status", width: 100 },
      { title: "Created", key: "createdAt", width: 180 },
    ],
    []
  );

  const bookingColumns = useMemo(
    () => [
      { title: "Booking ID", key: "bookingId", width: 180 },
      { title: "User", key: "userName", width: 180 },
      { title: "Advisor", key: "advisorName", width: 180 },
      { title: "Service", key: "service", width: 160 },
      { title: "Status", key: "status", width: 120 },
      { title: "Start", key: "startAt", width: 180 },
    ],
    []
  );

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [blockedRes, bookingsRes, upcomingRes] = await Promise.all([
        adminGetBlockedTimes(),
        adminGetBookings(),
        adminGetUpcomingBookings(),
      ]);

      setBlockedTimes(extractBlockedTimes(blockedRes).map(normalizeBlockedTime));
      setBookings(extractBookings(bookingsRes).map(normalizeBooking));
      setUpcomingBookings(extractBookings(upcomingRes).map(normalizeBooking));
    } catch (err) {
      setBlockedTimes([]);
      setBookings([]);
      setUpcomingBookings([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Blocked times ya bookings load nahi ho paye."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBlockedTimes = blockedTimes.filter((item) =>
    [item.startAt, item.endAt, item.reason, item.isActive ? "active" : "inactive"]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const currentBookings = tab === "upcoming" ? upcomingBookings : bookings;
  const filteredBookings = currentBookings.filter((item) =>
    [
      item.bookingId,
      item.userName,
      item.advisorName,
      item.service,
      item.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    return [
      {
        label: "Blocked Times",
        value: String(blockedTimes.length),
        icon: "ban-outline",
        color: Colors.primary,
      },
      {
        label: "Bookings",
        value: String(bookings.length),
        icon: "calendar-outline",
        color: "#22C55E",
      },
      {
        label: "Upcoming",
        value: String(upcomingBookings.length),
        icon: "time-outline",
        color: Colors.accent,
      },
    ];
  }, [blockedTimes, bookings, upcomingBookings]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setSelectedRecord(null);
    setForm(EMPTY_FORM);
  };

  const setFormFromBlocked = (record) => {
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

    setSaving(true);

    try {
      const payload = {
        startAt: form.startAt.trim(),
        endAt: form.endAt.trim(),
        reason: form.reason.trim(),
        isActive: Boolean(form.isActive),
      };

      const result = await adminCreateBlockedTime(payload);
      const nextItem = normalizeBlockedTime(result?.data || result?.result || result || payload);
      setBlockedTimes((prev) => [nextItem, ...prev]);
      Alert.alert("Success", "Blocked time created.");
      resetForm();
      await loadData();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Blocked time create nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderBlockedCell = (item, col) => {
    if (col.key === "status") {
      return (
        <View style={[styles.badge, item.isActive ? styles.badgeOn : styles.badgeOff]}>
          <Text style={styles.badgeText}>{item.isActive ? "Active" : "Inactive"}</Text>
        </View>
      );
    }

    return <Text style={styles.cellText}>{String(item[col.key] ?? "")}</Text>;
  };

  const renderBookingCell = (item, col) => {
    if (col.key === "status") {
      return (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{String(item.status || "N/A")}</Text>
        </View>
      );
    }

    return <Text style={styles.cellText}>{String(item[col.key] ?? "")}</Text>;
  };

  const renderRowActions = (item) => (
    <View style={styles.rowActions}>
      <TouchableOpacity style={styles.actionPill} onPress={() => setFormFromBlocked(item)}>
        <Ionicons name="create-outline" size={14} color="#fff" />
        <Text style={styles.actionPillText}>Load</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.kicker}>Schedule Controls</Text>
        <Text style={styles.title}>Blocked Times</Text>
        <Text style={styles.subtitle}>
          Block time create karo aur bookings/upcoming bookings ek hi responsive screen pe dekho.
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
                {selectedRecord ? "Edit Blocked Time" : "Create Blocked Time"}
              </Text>
              <Text style={styles.cardSub}>
                {selectedRecord
                  ? "Row load hua hai. Save se new block create hoga."
                  : "New blocked time add karo."}
              </Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Start At</Text>
          <TextInput
            style={styles.input}
            value={form.startAt}
            onChangeText={(text) => handleChange("startAt", text)}
            placeholder="2026-07-21T15:00:00.000Z"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>End At</Text>
          <TextInput
            style={styles.input}
            value={form.endAt}
            onChangeText={(text) => handleChange("endAt", text)}
            placeholder="2026-07-21T16:00:00.000Z"
            placeholderTextColor="#8B7AA8"
          />

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.reason}
            onChangeText={(text) => handleChange("reason", text)}
            placeholder="Personal block"
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
                <Text style={styles.primaryText}>Create Block</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Blocked Times</Text>
              <Text style={styles.cardSub}>Admin blocked windows from API</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredBlockedTimes.length} items</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.statusText}>Blocked times loading...</Text>
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
            placeholder="Search blocked time or booking..."
          />

          <DataTable
            columns={blockedColumns}
            data={filteredBlockedTimes}
            onRowPress={setFormFromBlocked}
            renderCell={renderBlockedCell}
            renderRowActions={renderRowActions}
            actionColumnWidth={110}
          />
        </View>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Bookings</Text>
            <Text style={styles.cardSub}>All bookings and upcoming bookings tabs</Text>
          </View>

          <View style={styles.tabRow}>
            {bookingTabs.map((item) => {
              const active = tab === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setTab(item.value)}
                  style={[styles.tabChip, active && styles.tabChipActive]}
                >
                  <Ionicons name={item.icon} size={14} color={active ? "#fff" : "#C4B5FD"} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.statusStrip}>
          <Text style={styles.statusStripText}>
            Showing {tab === "upcoming" ? upcomingBookings.length : bookings.length}{" "}
            {tab === "upcoming" ? "upcoming bookings" : "bookings"}
          </Text>
        </View>

        <DataTable
          columns={bookingColumns}
          data={filteredBookings}
          renderCell={renderBookingCell}
        />
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
    backgroundColor: "rgba(249,115,22,0.18)",
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
    minWidth: 120,
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
  bottomCard: {
    marginTop: 14,
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
    flexWrap: "wrap",
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
  statusBadge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(6,182,212,0.16)",
    borderWidth: 1,
    borderColor: "rgba(6,182,212,0.38)",
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  tabChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#2B3354",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: "#C4B5FD",
    fontWeight: "800",
    fontSize: 12,
  },
  tabTextActive: {
    color: "#fff",
  },
  statusStrip: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#2B3354",
  },
  statusStripText: {
    color: "#D1D5DB",
    fontWeight: "700",
    fontSize: 12,
  },
});
