import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { adminGet, normalizeList, normalizeObject } from "../utils/adminApi";

function toText(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value).trim();
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function normalizeCloseRequest(item) {
  const source = normalizeObject(item);
  const user = source?.user || source?.customer || source?.client || {};
  const booking = source?.booking || source?.reservation || source?.session || {};

  return {
    user: toText(
      user?.name ||
        user?.fullName ||
        source?.userName ||
        source?.customerName ||
        source?.name ||
        source?.userId ||
        source?.customerId,
      "N/A"
    ),
    booking: toText(
      booking?.bookingId ||
        booking?.referenceId ||
        booking?.name ||
        source?.bookingId ||
        source?.service ||
        source?.appointmentId ||
        source?.sessionId,
      "N/A"
    ),
    reason: toText(
      source?.reason ||
        source?.requestReason ||
        source?.note ||
        source?.message ||
        source?.description,
      "N/A"
    ),
    status: toText(source?.status || source?.requestStatus || source?.state, "N/A"),
    date: formatDate(source?.date || source?.createdAt || source?.updatedAt || source?.requestedAt),
  };
}

export default function CloseRequest() {
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = [
    { title: "User", key: "user", width: 160 },
    { title: "Booking", key: "booking", width: 170 },
    { title: "Reason", key: "reason", width: 250 },
    { title: "Status", key: "status", width: 130 },
    { title: "Date", key: "date", width: 140 },
  ];

  useEffect(() => {
    let mounted = true;

    const loadRequests = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await adminGet("closeRequests");
        if (!mounted) return;

        const source = normalizeObject(data);
        const list = normalizeList(source, [
          "closeRequests",
          "requests",
          "data",
          "items",
          "results",
        ]);

        const nextRequests = list.map(normalizeCloseRequest);
        nextRequests.sort(
          (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        );

        setRequests(nextRequests);

        if (__DEV__) {
          console.log("[CloseRequest] loaded", {
            count: nextRequests.length,
            sample: nextRequests[0] || null,
          });
        }
      } catch (err) {
        if (!mounted) return;
        console.warn("[CloseRequest] load failed", {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
        });
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Close requests load nahi ho paye."
        );
        setRequests([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadRequests();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRequests = requests.filter(
    (item) =>
      item.user.toLowerCase().includes(search.toLowerCase()) ||
      item.booking.toLowerCase().includes(search.toLowerCase()) ||
      item.status.toLowerCase().includes(search.toLowerCase())
  );

  const summary = {
    total: requests.length,
    approved: requests.filter((item) => item.status.toLowerCase().includes("approve")).length,
    pending: requests.filter((item) => item.status.toLowerCase().includes("pending")).length,
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Close Request</Text>
        <Text style={styles.subtitle}>Manage booking close requests</Text>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>Close requests loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.approved}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search close request..."
      />

      <DataTable columns={columns} data={filteredRequests} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2B124C",
  },
  subtitle: {
    color: "#777",
    marginTop: 4,
  },
  statusBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    elevation: 3,
  },
  statusText: {
    color: "#4B5563",
    fontWeight: "700",
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  summaryCard: {
    width: "32%",
    minWidth: 105,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    elevation: 3,
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#7C3AED",
  },
  summaryLabel: {
    color: "#777",
    fontSize: 12,
    marginTop: 4,
  },
});
