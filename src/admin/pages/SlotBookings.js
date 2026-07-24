import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminGetBookings,
  adminGetUpcomingBookings,
  normalizeList,
  normalizeObject,
} from "../utils/adminApi";
import { Colors } from "../../theme/colors";

function toText(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value).trim();
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

function formatTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value, currency = "USD") {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return toText(value, "N/A");
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch (error) {
    return `${String(currency || "USD").toUpperCase()} ${numeric}`;
  }
}

function normalizeBookingRecord(item, fallbackIndex = 0, source = "booking") {
  const raw = normalizeObject(item);
  const user = raw?.user || raw?.customer || raw?.client || {};
  const advisor = raw?.advisor || raw?.consultant || raw?.admin || raw?.host || {};
  const service = raw?.service || raw?.package || raw?.plan || raw?.title || "Booking";
  const bookingDate =
    raw?.bookingDate ||
    raw?.bookingOn ||
    raw?.appointmentDate ||
    raw?.scheduledDate ||
    raw?.date ||
    raw?.requestedAt ||
    raw?.createdAt ||
    "";
  const bookingId =
    raw?.bookingId ||
    raw?.referenceId ||
    raw?.reference ||
    raw?._id ||
    raw?.id ||
    `booking-${fallbackIndex + 1}`;
  const startAt =
    raw?.startAt ||
    raw?.bookingStartAt ||
    raw?.scheduledAt ||
    raw?.requestedAt ||
    raw?.createdAt ||
    "";
  const endAt = raw?.endAt || raw?.bookingEndAt || raw?.finishedAt || raw?.updatedAt || "";
  const durationMinutes =
    raw?.durationMinutes ?? raw?.duration ?? raw?.slotMinutes ?? raw?.minutes ?? null;
  const amount =
    raw?.amount ?? raw?.price ?? raw?.bookingAmount ?? raw?.totalAmount ?? raw?.fee ?? null;
  const currency = String(
    raw?.currency || raw?.currencyCode || raw?.amountCurrency || "USD"
  ).toUpperCase();
  const paymentMethod = toText(
    raw?.paymentMethod || raw?.method || raw?.gateway || raw?.provider,
    "N/A"
  );
  const paymentStatus = toText(
    raw?.paymentStatus || raw?.paymentState || raw?.transactionStatus || raw?.status,
    "N/A"
  );
  const bookingStatus = toText(
    raw?.bookingStatus || raw?.status || raw?.state || raw?.currentStatus,
    "N/A"
  );
  const consultationType = toText(
    raw?.consultationType || raw?.type || raw?.mode || source,
    "N/A"
  );

  return {
    id: String(bookingId),
    rawId: raw?._id || raw?.id || "",
    bookingId: String(bookingId),
    bookingType: source,
    userName: toText(
      user?.name ||
        user?.fullName ||
        user?.userName ||
        raw?.userName ||
        raw?.customerName ||
        raw?.name ||
        raw?.email,
      "N/A"
    ),
    userId: toText(
      raw?.userId ||
        raw?.customerId ||
        raw?.ownerId ||
        raw?.user?._id ||
        raw?.user?.id ||
        raw?.customer?._id ||
        raw?.customer?.id ||
        raw?.owner?._id ||
        raw?.owner?.id,
      "N/A"
    ),
    email: toText(
      user?.email || raw?.email || raw?.userEmail || raw?.customerEmail,
      "N/A"
    ),
    phone: toText(
      user?.phone || user?.mobile || raw?.phone || raw?.userPhone || raw?.customerPhone,
      "N/A"
    ),
    userContact: toText(
      [
        user?.phone || user?.mobile || raw?.phone || raw?.userPhone || raw?.customerPhone,
        user?.email || raw?.email || raw?.userEmail || raw?.customerEmail,
      ]
        .filter(Boolean)
        .join(" | "),
      "N/A"
    ),
    advisorName: toText(
      advisor?.name ||
        advisor?.fullName ||
        advisor?.userName ||
        raw?.advisorName ||
        raw?.consultantName ||
        raw?.adminName ||
        raw?.readerName ||
        "N/A",
      "N/A"
    ),
    advisorId: toText(
      raw?.advisorId ||
        raw?.consultantId ||
        raw?.adminId ||
        raw?.hostId ||
        advisor?._id ||
        advisor?.id,
      "N/A"
    ),
    service: toText(service, "N/A"),
    plan: toText(raw?.plan || raw?.package || raw?.title || raw?.slotPlan || service, "N/A"),
    consultationType,
    bookingDate,
    bookingDateDisplay: formatDateOnly(bookingDate),
    status: bookingStatus,
    bookingStatus,
    paymentMethod,
    paymentStatus,
    startAt,
    startTime: formatTime(startAt),
    endAt,
    endTime: formatTime(endAt),
    durationMinutes,
    amount,
    currency,
    amountDisplay: formatMoney(amount, currency),
    transactionId: toText(
      raw?.transactionId ||
        raw?.paymentId ||
        raw?.referenceId ||
        raw?.reference ||
        raw?.orderId ||
        raw?._id,
      "N/A"
    ),
    source: source,
    createdAt: raw?.createdAt || bookingDate || startAt || "",
    createdAtDisplay: formatDate(raw?.createdAt || bookingDate || startAt || ""),
    updatedAt: endAt || raw?.updatedAt || "",
    raw,
  };
}

function extractBookingList(response, keys = ["bookings", "upcomingBookings"]) {
  const source = normalizeObject(response);
  const list = normalizeList(source, [...keys, "data", "items", "results", "list", "rows"]);
  return Array.isArray(list) ? list : [];
}

function mergeBookings(primary = [], secondary = []) {
  const merged = new Map();

  [...primary, ...secondary].forEach((item) => {
    if (!item?.id && !item?.bookingId) {
      return;
    }

    const key = String(item.id || item.bookingId);
    if (!merged.has(key)) {
      merged.set(key, item);
      return;
    }

    merged.set(key, {
      ...merged.get(key),
      ...item,
      raw: item.raw || merged.get(key).raw,
    });
  });

  return Array.from(merged.values());
}

function getStatusTone(status = "") {
  const normalized = String(status).toLowerCase();
  if (["completed", "confirmed", "approved", "active"].includes(normalized)) {
    return "success";
  }
  if (["pending", "upcoming", "scheduled"].includes(normalized)) {
    return "warning";
  }
  if (["cancelled", "canceled", "rejected", "failed", "expired"].includes(normalized)) {
    return "danger";
  }
  return "neutral";
}

function statCard({ label, value, hint, icon, accent }) {
  return { label, value, hint, icon, accent };
}

export default function SlotBookings() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const columns = useMemo(
    () => [
      { title: "Booking ID", key: "bookingId", width: 170 },
      { title: "User", key: "userName", width: 170 },
      { title: "User Mobile/Email", key: "userContact", width: 220 },
      { title: "Consultation Type", key: "consultationType", width: 150 },
      { title: "Plan", key: "plan", width: 160 },
      { title: "Booking Date", key: "bookingDateDisplay", width: 140 },
      { title: "Start Time", key: "startTime", width: 110 },
      { title: "End Time", key: "endTime", width: 110 },
      { title: "Amount", key: "amountDisplay", width: 130 },
      { title: "Payment Method", key: "paymentMethod", width: 150 },
      { title: "Payment Status", key: "paymentStatus", width: 140 },
      { title: "Booking Status", key: "bookingStatus", width: 140 },
      { title: "Created At", key: "createdAtDisplay", width: 170 },
    ],
    []
  );

  const loadBookings = async () => {
    setLoading(true);
    setError("");

    try {
      const [bookingRes, upcomingRes] = await Promise.all([
        adminGetBookings(),
        adminGetUpcomingBookings(),
      ]);

      const bookingList = extractBookingList(bookingRes, ["bookings", "data", "items", "results"]);
      const upcomingList = extractBookingList(upcomingRes, [
        "upcomingBookings",
        "bookings",
        "data",
        "items",
        "results",
      ]);

      const nextBookings = bookingList.map((item, index) =>
        normalizeBookingRecord(item, index, "booking")
      );
      const nextUpcoming = upcomingList.map((item, index) =>
        normalizeBookingRecord(item, index, "upcoming")
      );

      const merged = mergeBookings(nextBookings, nextUpcoming).sort(
        (a, b) => new Date(b.startAt || b.createdAt || 0).getTime() - new Date(a.startAt || a.createdAt || 0).getTime()
      );

      setBookings(
        merged
          .filter((item) => item.bookingType !== "upcoming")
          .sort(
            (a, b) =>
              new Date(b.bookingDate || b.startAt || b.createdAt || 0).getTime() -
              new Date(a.bookingDate || a.startAt || a.createdAt || 0).getTime()
          )
      );
      setUpcomingBookings(
        nextUpcoming.sort(
          (a, b) =>
            new Date(b.bookingDate || b.startAt || 0).getTime() -
            new Date(a.bookingDate || a.startAt || 0).getTime()
        )
      );

      if (__DEV__) {
        console.log("[SlotBookings] loaded", {
          bookings: nextBookings.length,
          upcoming: nextUpcoming.length,
          sample: merged[0] || null,
        });
      }
    } catch (err) {
      console.warn("[SlotBookings] load failed", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      setBookings([]);
      setUpcomingBookings([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Booking details load nahi ho paye."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const allBookings = useMemo(() => {
    return mergeBookings(bookings, upcomingBookings).sort(
      (a, b) =>
        new Date(b.bookingDate || b.startAt || b.createdAt || 0).getTime() -
        new Date(a.bookingDate || a.startAt || a.createdAt || 0).getTime()
    );
  }, [bookings, upcomingBookings]);

  const currentItems = tab === "upcoming" ? upcomingBookings : tab === "all" ? allBookings : bookings;

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return currentItems;
    }

    return currentItems.filter((item) =>
      [
        item.bookingId,
        item.userName,
        item.userContact,
        item.consultationType,
        item.plan,
        item.bookingDateDisplay,
        item.startTime,
        item.endTime,
        item.amountDisplay,
        item.paymentMethod,
        item.paymentStatus,
        item.bookingStatus,
        item.createdAtDisplay,
        item.amountDisplay,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [currentItems, search]);

  const stats = useMemo(
    () => [
      statCard({
        label: "Total Bookings",
        value: String(allBookings.length),
        hint: "All booked slots",
        icon: "calendar-outline",
        accent: Colors.primary,
      }),
      statCard({
        label: "Upcoming",
        value: String(upcomingBookings.length),
        hint: "Future bookings",
        icon: "time-outline",
        accent: Colors.accent,
      }),
      statCard({
        label: "Completed",
        value: String(allBookings.filter((item) => String(item.status).toLowerCase().includes("completed")).length),
        hint: "Done bookings",
        icon: "checkmark-circle-outline",
        accent: "#22C55E",
      }),
      statCard({
        label: "Revenue",
        value: allBookings.length
          ? formatMoney(
              allBookings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
              allBookings.find((item) => item.currency)?.currency || "USD"
            )
          : "N/A",
        hint: "Total booking value",
        icon: "cash-outline",
        accent: Colors.accent2,
      }),
    ],
    [allBookings, upcomingBookings]
  );

  const renderCell = (item, col) => {
    if (col.key === "startAt") {
      return <Text style={styles.cellText}>{formatDate(item.startAt)}</Text>;
    }

    if (col.key === "durationMinutes") {
      return (
        <Text style={styles.cellText}>
          {item.durationMinutes ? `${item.durationMinutes} min` : "N/A"}
        </Text>
      );
    }

    if (col.key === "amountDisplay") {
      return <Text style={styles.cellTextStrong}>{item.amountDisplay || "N/A"}</Text>;
    }

    if (col.key === "status") {
      return (
        <View style={[styles.statusPill, styles[`statusPill_${getStatusTone(item.status)}`]]}>
          <Text style={styles.statusPillText}>{toText(item.status).toUpperCase()}</Text>
        </View>
      );
    }

    return (
      <Text style={styles.cellText} numberOfLines={1}>
        {toText(item[col.key])}
      </Text>
    );
  };

  const openDetails = (item) => setSelectedBooking(item);

  const renderRowActions = (item) => (
    <TouchableOpacity style={styles.viewBtn} onPress={() => openDetails(item)}>
      <Ionicons name="eye-outline" size={14} color="#fff" />
      <Text style={styles.viewBtnText}>View</Text>
    </TouchableOpacity>
  );

  const summaryRows = useMemo(
    () => [
      ["Booking ID", selectedBooking?.bookingId],
      ["User", selectedBooking?.userName],
      ["User Mobile/Email", selectedBooking?.userContact],
      ["Consultation Type", selectedBooking?.consultationType],
      ["Plan", selectedBooking?.plan],
      ["Booking Date", selectedBooking?.bookingDateDisplay],
      ["Start Time", selectedBooking?.startTime],
      ["End Time", selectedBooking?.endTime],
      ["Amount", selectedBooking?.amountDisplay],
      ["Payment Method", selectedBooking?.paymentMethod],
      ["Payment Status", selectedBooking?.paymentStatus],
      ["Booking Status", selectedBooking?.bookingStatus],
      ["Created At", selectedBooking?.createdAtDisplay],
      ["Advisor", selectedBooking?.advisorName],
      ["Advisor ID", selectedBooking?.advisorId],
      ["Transaction ID", selectedBooking?.transactionId],
      ["Source", selectedBooking?.source],
    ],
    [selectedBooking]
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <Text style={styles.kicker}>Booking Center</Text>
        <Text style={styles.title}>Slot Booking</Text>
        <Text style={styles.subtitle}>
          Yahan se booked slots, upcoming bookings aur unka complete detail dekho.
        </Text>

        <View style={styles.heroStats}>
          {stats.map((item) => (
            <View key={item.label} style={styles.heroStat}>
              <View style={[styles.heroStatIcon, { backgroundColor: item.accent }]}>
                <Ionicons name={item.icon} size={18} color="#fff" />
              </View>
              <Text style={styles.heroStatValue}>{item.value}</Text>
              <Text style={styles.heroStatLabel}>{item.label}</Text>
              <Text style={styles.heroStatHint}>{item.hint}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Booked Slot Details</Text>
            <Text style={styles.cardSub}>
              Search karo, filter karo aur row open karke full booking detail dekho.
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadBookings} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="refresh-outline" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {[
            { key: "all", label: "All Bookings" },
            { key: "bookings", label: "Booked" },
            { key: "upcoming", label: "Upcoming" },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.tabChip, tab === item.key && styles.tabChipActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabChipText, tab === item.key && styles.tabChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search booking id, user, advisor, status..."
        />

        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator color="#7C3AED" />
            <Text style={styles.statusText}>Slot bookings loading...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.statusText}>{error}</Text>
          </View>
        ) : null}

        <DataTable
          columns={columns}
          data={filteredItems}
          renderCell={renderCell}
          renderRowActions={renderRowActions}
          actionColumnTitle="Actions"
          actionColumnWidth={120}
        />
      </View>

      <Modal
        visible={Boolean(selectedBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Booking Detail</Text>
                <Text style={styles.modalSub}>
                  Selected booked slot ka complete record
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBooking(null)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <View style={styles.detailGrid}>
                {summaryRows.map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {toText(value)}
                    </Text>
                  </View>
                ))}
              </View>

              {selectedBooking?.raw ? (
                <View style={styles.rawBox}>
                  <Text style={styles.rawTitle}>Raw Payload</Text>
                  <Text style={styles.rawText}>
                    {JSON.stringify(selectedBooking.raw, null, 2)}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    ...Platform.select({
      web: { boxShadow: "0px 8px 24px rgba(0,0,0,0.35)" },
      default: { elevation: 6 },
    }),
  },
  heroGlow: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: "rgba(124,58,237,0.25)",
  },
  kicker: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: "#B5B7C9",
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 760,
  },
  heroStats: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  heroStat: {
    flexGrow: 1,
    minWidth: 160,
    backgroundColor: "#1B2240",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
  },
  heroStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroStatValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  heroStatHint: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#242B45",
    ...Platform.select({
      web: { boxShadow: "0px 8px 24px rgba(0,0,0,0.24)" },
      default: { elevation: 4 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  tabChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.14)",
    backgroundColor: "#0E0826",
    alignItems: "center",
    justifyContent: "center",
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabChipText: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 12,
  },
  tabChipTextActive: {
    color: "#fff",
  },
  statusBox: {
    backgroundColor: "#0E0826",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
  },
  statusText: {
    color: "#F5EAFF",
    fontWeight: "700",
    flex: 1,
  },
  cellText: {
    color: "#F5EAFF",
    fontSize: 12,
  },
  cellTextStrong: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusPill_success: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
  },
  statusPill_warning: {
    backgroundColor: "rgba(249,115,22,0.18)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
  },
  statusPill_danger: {
    backgroundColor: "rgba(220,38,38,0.18)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.35)",
  },
  statusPill_neutral: {
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
  },
  statusPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  viewBtn: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  viewBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 5, 12, 0.78)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    maxHeight: "92%",
    backgroundColor: "#151B2E",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#242B45",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  modalSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    paddingBottom: 8,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailRow: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: "#0E0826",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
  },
  detailLabel: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    color: "#fff",
    marginTop: 6,
    fontWeight: "700",
    fontSize: 13,
  },
  rawBox: {
    marginTop: 14,
    backgroundColor: "#0B1020",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
    padding: 14,
  },
  rawTitle: {
    color: "#fff",
    fontWeight: "900",
    marginBottom: 10,
  },
  rawText: {
    color: "#D1D5DB",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
});
