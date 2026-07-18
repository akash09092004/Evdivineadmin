import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { adminGet, normalizeList } from "../utils/adminApi";

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

        const list = normalizeList(data, ["historyNotes", "notes", "data"]);
        setNotes(
          list.map((item) => ({
            user: item.user || item.name || "N/A",
            booking: item.booking || item.service || "N/A",
            note: item.note || item.message || "N/A",
            createdBy: item.createdBy || item.author || "Admin",
            date: item.date || item.createdAt || "N/A",
          }))
        );
      } catch (err) {
        if (!mounted) return;
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
