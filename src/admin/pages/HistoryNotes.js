import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { adminGet, normalizeList, normalizeObject } from "../utils/adminApi";

function toText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findListCandidate(value, depth = 0) {
  if (!value || depth > 4) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const listKeys = [
    "historyNotes",
    "notes",
    "history_notes",
    "bookingHistory",
    "history",
    "data",
    "items",
    "results",
    "list",
    "rows",
  ];

  for (const key of listKeys) {
    const nested = value[key];

    if (Array.isArray(nested)) {
      return nested;
    }

    if (isPlainObject(nested)) {
      const nestedList = findListCandidate(nested, depth + 1);
      if (nestedList.length > 0) {
        return nestedList;
      }
    }
  }

  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) {
      return nested;
    }

    if (isPlainObject(nested)) {
      const nestedList = findListCandidate(nested, depth + 1);
      if (nestedList.length > 0) {
        return nestedList;
      }
    }
  }

  return [];
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function normalizeHistoryNote(item) {
  const source = normalizeObject(item);
  const user = source?.user || source?.customer || source?.client || {};
  const booking = source?.booking || source?.appointment || source?.session || {};
  const createdBy = source?.createdBy || source?.author || source?.admin || {};

  return {
    user:
      user?.name ||
      user?.fullName ||
      source?.userName ||
      source?.customerName ||
      source?.name ||
      toText(source?.userId) ||
      toText(source?.customerId) ||
      "N/A",
    booking:
      booking?.bookingId ||
      booking?.referenceId ||
      booking?.name ||
      source?.bookingId ||
      source?.service ||
      source?.appointmentId ||
      "N/A",
    note:
      source?.note ||
      source?.message ||
      source?.text ||
      source?.description ||
      source?.remarks ||
      "N/A",
    createdBy:
      createdBy?.name ||
      createdBy?.fullName ||
      source?.createdByName ||
      source?.authorName ||
      source?.createdBy ||
      "Admin",
    date: formatDate(
      source?.date ||
        source?.createdAt ||
      source?.updatedAt ||
      source?.timestamp ||
      source?.noteDate
    ),
    raw: source,
  };
}

export default function HistoryNotes() {
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = [
    { title: "User", key: "user", width: 160 },
    { title: "Booking", key: "booking", width: 160 },
    { title: "Note", key: "note", width: 280 },
    { title: "Created By", key: "createdBy", width: 150 },
    { title: "Date", key: "date", width: 140 },
  ];

  useEffect(() => {
    let mounted = true;

    const loadNotes = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await adminGet("historyNotes");
        if (!mounted) return;

        const source = normalizeObject(data);
        const list = findListCandidate(source);
        const fallbackList = list.length > 0 ? list : normalizeList(source, [
          "historyNotes",
          "notes",
          "data",
          "items",
          "results",
          "list",
          "rows",
        ]);

        const nextNotes = (fallbackList.length > 0 ? fallbackList : []).map(
          normalizeHistoryNote
        );
        nextNotes.sort(
          (a, b) =>
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        );
        setNotes(nextNotes);

        if (__DEV__) {
          console.log("[HistoryNotes] loaded", {
            count: nextNotes.length,
            sample: nextNotes[0] || null,
            responseKeys: isPlainObject(source) ? Object.keys(source) : [],
          });
        }
      } catch (err) {
        if (!mounted) return;
        console.warn("[HistoryNotes] load failed", {
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
        });
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "History notes load nahi ho paye."
        );
        setNotes([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadNotes();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredNotes = notes.filter(
    (item) =>
      item.user.toLowerCase().includes(search.toLowerCase()) ||
      item.booking.toLowerCase().includes(search.toLowerCase()) ||
      item.note.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>History Notes</Text>
        <Text style={styles.subtitle}>Admin notes and booking history</Text>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>History notes loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search history notes..."
      />

      <DataTable columns={columns} data={filteredNotes} />
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
});
