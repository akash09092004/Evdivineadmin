import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import {
  adminGet,
  adminSendBulkEmail,
  getAdminBulkEmailEndpoint,
  normalizeList,
} from "../utils/adminApi";

function normalizeSubscriber(item, index = 0) {
  const email = item.email || item.subscriberEmail || item.mail || "N/A";

  return {
    id: item._id || item.id || item.email || `subscriber-${index + 1}`,
    email,
    status:
      item.status ||
      item.subscriptionStatus ||
      (item.isActive === false ? "inactive" : "active"),
    date: item.date || item.createdAt || item.subscribedDate || "N/A",
  };
}

export default function SubscriberList() {
  const [search, setSearch] = useState("");
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const loadSubscribers = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminGet("subscribers");
      const list = normalizeList(data, ["subscribers", "data", "results"]);
      const normalized = list.map((item, index) =>
        normalizeSubscriber(item, index)
      );
      setSubscribers(normalized);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Subscribers data load nahi ho paya."
      );
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((item) =>
      item.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, subscribers]);

  const selectedSubscribers = useMemo(() => {
    return subscribers.filter((item) => selectedIds.includes(item.id));
  }, [selectedIds, subscribers]);

  const allFilteredSelected =
    filteredSubscribers.length > 0 &&
    filteredSubscribers.every((item) => selectedIds.includes(item.id));

  const toggleSubscriber = (subscriberId) => {
    setSelectedIds((prev) =>
      prev.includes(subscriberId)
        ? prev.filter((id) => id !== subscriberId)
        : [...prev, subscriberId]
    );
  };

  const toggleAllVisible = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !filteredSubscribers.some((item) => item.id === id))
      );
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredSubscribers.forEach((item) => next.add(item.id));
      return Array.from(next);
    });
  };

  const handleSendEmail = async () => {
    const recipients = selectedSubscribers
      .map((item) => item.email)
      .filter((email) => email && email !== "N/A");

    if (recipients.length === 0) {
      Alert.alert("Error", "Kam se kam ek subscriber select karo.");
      return;
    }

    if (!subject.trim() || !message.trim()) {
      Alert.alert("Error", "Subject aur email content dono required hain.");
      return;
    }

    setSending(true);
    try {
      const bulkEmailEndpoint = getAdminBulkEmailEndpoint();

      if (!bulkEmailEndpoint) {
        throw new Error(
          "Bulk email endpoint configured nahi hai. `.env` me EXPO_PUBLIC_ADMIN_BULK_EMAIL_ENDPOINT set karo."
        );
      }

      const response = await adminSendBulkEmail({
        recipients,
        emails: recipients,
        to: recipients,
        subject: subject.trim(),
        message: message.trim(),
        body: message.trim(),
        content: message.trim(),
      });

      Alert.alert(
        "Success",
        response?.message ||
          `${recipients.length} subscriber(s) ko email bhej diya gaya.`
      );

      setSubject("");
      setMessage("");
      setSelectedIds([]);
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Email send nahi ho paya."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerBox}>
        <Text style={styles.title}>Subscriber List</Text>
        <Text style={styles.subtitle}>
          Select subscribers and send bulk email
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{subscribers.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{selectedSubscribers.length}</Text>
          <Text style={styles.summaryLabel}>Selected</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {subscribers.filter((item) => item.status === "active").length}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>Subscribers loading...</Text>
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
        placeholder="Search subscriber email..."
      />

      <View style={styles.selectAllRow}>
        <TouchableOpacity
          style={styles.selectAllBtn}
          onPress={toggleAllVisible}
        >
          <Ionicons
            name={allFilteredSelected ? "checkbox" : "square-outline"}
            size={18}
            color="#fff"
          />
          <Text style={styles.selectAllText}>
            {allFilteredSelected ? "Unselect Visible" : "Select Visible"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadSubscribers}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.selectAllText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { width: 52 }]} />
          <Text style={[styles.headerText, { flex: 1 }]}>Email</Text>
          <Text style={[styles.headerText, { width: 120 }]}>Status</Text>
          <Text style={[styles.headerText, { width: 180 }]}>
            Subscribed Date
          </Text>
        </View>

        {filteredSubscribers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No subscriber found</Text>
          </View>
        ) : (
          filteredSubscribers.map((item) => {
            const checked = selectedIds.includes(item.id);

            return (
              <View key={item.id} style={styles.row}>
                <TouchableOpacity
                  style={styles.checkboxCell}
                  onPress={() => toggleSubscriber(item.id)}
                >
                  <Ionicons
                    name={checked ? "checkbox" : "square-outline"}
                    size={22}
                    color={checked ? "#8B5CF6" : "#C4B5FD"}
                  />
                </TouchableOpacity>

                <Text numberOfLines={1} style={[styles.cell, styles.emailCell]}>
                  {item.email}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.statusCell]}
                >
                  {item.status}
                </Text>

                <Text numberOfLines={1} style={[styles.cell, styles.dateCell]}>
                  {item.date}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.composeCard}>
        <Text style={styles.composeTitle}>Email Compose</Text>
        <Text style={styles.composeSub}>
          Selected users ko same content bhej diya jayega.
        </Text>

        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Enter email subject"
          placeholderTextColor="#8B7AA8"
        />

        <Text style={styles.label}>Email Content</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Write email body here..."
          placeholderTextColor="#8B7AA8"
          multiline
        />

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSendEmail}
          disabled={sending}
        >
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.sendText}>
            {sending
              ? "Sending..."
              : `Send to Selected (${selectedSubscribers.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 8px 22px rgba(0,0,0,0.22)" },
  default: { elevation: 4 },
});

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0E9FF",
    ...shadow,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2B124C",
  },
  subtitle: {
    color: "#777",
    marginTop: 3,
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryCard: {
    width: "32%",
    minWidth: 96,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0E9FF",
    ...shadow,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#7C3AED",
  },
  summaryLabel: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },
  statusBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F0E9FF",
    ...shadow,
  },
  statusText: {
    color: "#4B5563",
    fontWeight: "700",
    flex: 1,
  },
  selectAllRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  selectAllBtn: {
    backgroundColor: "#7C3AED",
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  refreshBtn: {
    backgroundColor: "#1F2937",
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  selectAllText: {
    color: "#fff",
    fontWeight: "900",
  },
  listCard: {
    backgroundColor: "#0E0826",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(200,154,255,0.12)",
    marginBottom: 16,
    ...shadow,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#7C3AED",
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  headerText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,154,255,0.10)",
  },
  checkboxCell: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    color: "#F5EAFF",
    fontSize: 11,
    paddingRight: 8,
  },
  emailCell: {
    flex: 1,
  },
  statusCell: {
    width: 120,
  },
  dateCell: {
    width: 180,
  },
  emptyBox: {
    padding: 18,
  },
  emptyText: {
    textAlign: "center",
    color: "#D8B4FE",
    fontWeight: "700",
  },
  composeCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 18,
    ...shadow,
  },
  composeTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  composeSub: {
    color: "#A7B0D1",
    marginTop: 5,
    marginBottom: 12,
    fontSize: 12,
  },
  label: {
    color: "#D8B4FE",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#0B1020",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 14,
    minHeight: 46,
    color: "#fff",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 130,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  sendBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
