import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import { adminGet, normalizeList } from "../utils/adminApi";

export default function DropMeList() {
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const columns = [
    { title: "Name", key: "name", width: 160 },
    { title: "Email", key: "email", width: 220 },
    { title: "Phone", key: "phone", width: 140 },
    { title: "Message", key: "message", width: 260 },
    { title: "Date", key: "date", width: 140 },
  ];

  useEffect(() => {
    let mounted = true;

    const loadMessages = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await adminGet("dropMessages");
        if (!mounted) return;

        const list = normalizeList(data, ["messages", "dropMessages", "data"]);
        setMessages(
          list.map((item) => ({
            name: item.name || item.fullName || "N/A",
            email: item.email || "N/A",
            phone: item.phone || item.mobile || "N/A",
            message: item.message || item.note || "N/A",
            date: item.date || item.createdAt || "N/A",
          }))
        );
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Drop me messages load nahi ho paye."
        );
        setMessages([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredMessages = messages.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search)
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Drop Me List</Text>
        <Text style={styles.subtitle}>Users contact request messages</Text>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>Messages loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>24</Text>
          <Text style={styles.summaryLabel}>Total Requests</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>10</Text>
          <Text style={styles.summaryLabel}>New</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>14</Text>
          <Text style={styles.summaryLabel}>Read</Text>
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search message..."
      />

      <DataTable columns={columns} data={filteredMessages} />
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
