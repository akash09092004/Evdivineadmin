import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminGet,
  adminSendBulkEmail,
  getAdminBulkEmailEndpoint,
  adminUpdateDropMessage,
  normalizeList,
  normalizeObject,
} from "../utils/adminApi";

const STATUS_FILTERS = ["all", "new", "read", "replied", "closed"];

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

function normalizeDropMessage(item, index = 0) {
  const source = normalizeObject(item);
  const id = source._id || source.id || `drop-message-${index + 1}`;
  const status = String(source.status || "new").toLowerCase();

  return {
    id,
    raw: source,
    name: toText(source.name || source.fullName || source.userName),
    email: toText(source.email || source.mail || source.userEmail),
    phone: toText(
      source.phone || source.mobile || source.contact || source.number
    ),
    subject: toText(source.subject || source.title || source.topic),
    message: toText(source.message || source.note || source.body, ""),
    reply: toText(
      source.reply ||
        source.adminReply ||
        source.replyMessage ||
        source.response,
      ""
    ),
    status,
    replyAt: source.replyAt || source.repliedAt || source.updatedAt || "",
    date: source.date || source.createdAt || source.updatedAt || "",
    dateLabel: formatDate(
      source.date || source.createdAt || source.updatedAt || source.time
    ),
    replyAtLabel: formatDate(
      source.replyAt || source.repliedAt || source.updatedAt || source.time
    ),
  };
}

function getStatusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (!value) return "Unknown";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusStyle(status) {
  const value = String(status || "").toLowerCase();

  if (value === "read") return styles.statusRead;
  if (value === "replied") return styles.statusReplied;
  if (value === "closed") return styles.statusClosed;

  return styles.statusNew;
}

function getNextStatusOptions(currentStatus) {
  const value = String(currentStatus || "").toLowerCase();
  const baseOptions = ["new", "read", "replied", "closed"];

  return baseOptions.filter((status) => status !== value);
}

export default function DropMeList({
  title = "Drop Me List",
  subtitle = "Users ke contact requests yahan se review aur status update karo",
  sectionTitle = "Contact Requests",
  sectionSubtitle = "Tap View for full details or change status from the row actions.",
  refreshLabel = "Refresh",
  loadingLabel = "Messages loading...",
  enableReplyComposer = false,
} = {}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const requestIdRef = useRef(0);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const loadMessages = async ({ showLoader = true } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const data = await adminGet("dropMessages");
      const source = normalizeObject(data);
      const list = normalizeList(source, [
        "messages",
        "dropMessages",
        "data",
        "items",
        "results",
      ]);

      const normalized = list.map((item, index) =>
        normalizeDropMessage(item, index)
      );
      normalized.sort((a, b) => {
        const left = new Date(b.date || 0).getTime();
        const right = new Date(a.date || 0).getTime();
        return left - right;
      });

      const numbered = normalized.map((item, index) => ({
        ...item,
        serial: index + 1,
      }));

      if (requestId !== requestIdRef.current) {
        return;
      }

      setMessages(numbered);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setMessages([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Drop me messages load nahi ho paye."
      );
    } finally {
      if (requestId === requestIdRef.current && showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMessages().catch(() => {});
  }, []);

  const summary = useMemo(() => {
    const total = messages.length;
    const newCount = messages.filter((item) => item.status === "new").length;
    const readCount = messages.filter((item) => item.status === "read").length;
    const repliedCount = messages.filter(
      (item) => item.status === "replied"
    ).length;
    const closedCount = messages.filter(
      (item) => item.status === "closed"
    ).length;

    return {
      total,
      newCount,
      readCount,
      repliedCount,
      closedCount,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();

    return messages.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        item.phone.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [messages, search, statusFilter]);

  const columns = [
    { title: "No.", key: "serial", width: 70 },
    { title: "Name", key: "name", width: 160 },
    { title: "Email", key: "email", width: 220 },
    { title: "Phone", key: "phone", width: 140 },
    { title: "Subject", key: "subject", width: 180 },
    { title: "Message", key: "message", width: 280 },
    { title: "Status", key: "status", width: 120 },
    { title: "Date", key: "dateLabel", width: 160 },
  ];

  const openDetails = (item) => {
    setSelectedMessage(item);
    setReplyText(item?.reply || "");
  };

  const closeDetails = () => {
    setSelectedMessage(null);
    setReplyText("");
  };

  const updateStatus = async (item, nextStatus) => {
    if (!item?.id || !nextStatus) {
      return;
    }

    setActionLoadingId(item.id);

    try {
      await adminUpdateDropMessage(item.id, {
        ...item.raw,
        status: nextStatus,
      });

      await loadMessages({ showLoader: false });

      setSelectedMessage((current) =>
        current && current.id === item.id
          ? {
              ...current,
              status: nextStatus,
            }
          : current
      );

      Alert.alert(
        "Success",
        `Message status ${getStatusLabel(nextStatus)} ho gayi.`
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Message update nahi ho paya."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const sendReply = async () => {
    if (!selectedMessage?.id) {
      return;
    }

    const text = replyText.trim();
    if (!text) {
      Alert.alert("Error", "Reply text likho pehle.");
      return;
    }

    setActionLoadingId(selectedMessage.id);

    try {
      const emailSubject = `Re: ${selectedMessage.subject || "Your message"}`;
      const emailBody = [
        `Hello ${selectedMessage.name || "there"},`,
        "",
        text,
        "",
        "Original message:",
        selectedMessage.message || "N/A",
        "",
        "Thanks,",
        "EV Divine Team",
      ].join("\n");

      const bulkEmailEndpoint = getAdminBulkEmailEndpoint();
      const emailRecipients = [selectedMessage.email].filter(
        (email) => email && email !== "N/A"
      );
      let emailSent = false;
      let emailErrorMessage = "";

      if (bulkEmailEndpoint && emailRecipients.length > 0) {
        try {
          await adminSendBulkEmail({
            recipients: emailRecipients,
            emails: emailRecipients,
            to: emailRecipients,
            subject: emailSubject,
            message: emailBody,
            body: emailBody,
            content: emailBody,
            replyTo: selectedMessage.email,
            customerEmail: selectedMessage.email,
            name: selectedMessage.name,
            meta: {
              source: "contact-user-reply",
              requestId: selectedMessage.id,
            },
          });
          emailSent = true;
        } catch (emailError) {
          emailSent = false;
          emailErrorMessage =
            emailError?.response?.data?.message ||
            emailError?.message ||
            "Email send nahi ho paya.";
          console.warn(
            "Admin reply email send failed:",
            emailErrorMessage,
            emailError
          );
        }
      } else {
        emailErrorMessage =
          "Bulk email endpoint configured nahi hai. Reply record save hoga, email send skip hoga.";
        console.warn(emailErrorMessage);
      }

      await adminUpdateDropMessage(selectedMessage.id, {
        ...selectedMessage.raw,
        status: "replied",
        reply: text,
        adminReply: text,
        replyMessage: text,
        response: text,
        replyAt: new Date().toISOString(),
        replyEmailSent: emailSent,
      });

      await loadMessages({ showLoader: false });
      setReplyText(text);
      setSelectedMessage((current) =>
        current && current.id === selectedMessage.id
          ? {
              ...current,
              status: "replied",
              reply: text,
              replyAt: new Date().toISOString(),
              replyAtLabel: formatDate(new Date().toISOString()),
            }
          : current
      );

      Alert.alert(
        emailSent ? "Success" : "Warning",
        emailSent
          ? "Reply user ke email par bhej diya gaya aur record save ho gaya."
          : emailErrorMessage ||
            "Reply save ho gaya, lekin email send nahi hua."
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Reply send nahi ho paya."
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const renderCell = (item, col) => {
    if (col.key === "serial") {
      return (
        <Text numberOfLines={1} style={styles.serialText}>
          {item.serial || "N/A"}
        </Text>
      );
    }

    if (col.key === "status") {
      return (
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusBadgeText}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      );
    }

    if (col.key === "message") {
      return (
        <Text numberOfLines={1} style={styles.messagePreview}>
          {item.message || "N/A"}
        </Text>
      );
    }

    return (
      <Text numberOfLines={1} style={styles.tableText}>
        {item[col.key] || "N/A"}
      </Text>
    );
  };

  const renderRowActions = (item) => {
    const nextStatuses = getNextStatusOptions(item.status);
    const isBusy = actionLoadingId === item.id;

    return (
      <View style={styles.actionWrap}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.viewBtn]}
          onPress={() => openDetails(item)}
        >
          <Ionicons name="eye-outline" size={14} color="#fff" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>

        {nextStatuses.slice(0, 2).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.actionBtn,
              status === "closed"
                ? styles.closeActionBtn
                : status === "replied"
                ? styles.replyBtn
                : styles.readBtn,
              isBusy && styles.actionBtnDisabled,
            ]}
            onPress={() => updateStatus(item, status)}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={
                  status === "closed"
                    ? "checkmark-done-outline"
                    : status === "replied"
                    ? "chatbubble-ellipses-outline"
                    : "mail-open-outline"
                }
                size={14}
                color="#fff"
              />
            )}
            <Text style={styles.actionText}>{getStatusLabel(status)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.pageScrollContent}
    >
      <View style={styles.headerBox}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextBox}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => loadMessages()}
          >
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.refreshText}>{refreshLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View
          style={[styles.summaryCard, !isDesktop && styles.summaryCardMobile]}
        >
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total Requests</Text>
        </View>

        <View
          style={[styles.summaryCard, !isDesktop && styles.summaryCardMobile]}
        >
          <Text style={styles.summaryValue}>{summary.newCount}</Text>
          <Text style={styles.summaryLabel}>New</Text>
        </View>

        <View
          style={[styles.summaryCard, !isDesktop && styles.summaryCardMobile]}
        >
          <Text style={styles.summaryValue}>{summary.readCount}</Text>
          <Text style={styles.summaryLabel}>Read</Text>
        </View>

        <View
          style={[styles.summaryCard, !isDesktop && styles.summaryCardMobile]}
        >
          <Text style={styles.summaryValue}>{summary.repliedCount}</Text>
          <Text style={styles.summaryLabel}>Replied</Text>
        </View>

        <View
          style={[styles.summaryCard, !isDesktop && styles.summaryCardMobile]}
        >
          <Text style={styles.summaryValue}>{summary.closedCount}</Text>
          <Text style={styles.summaryLabel}>Closed</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>{loadingLabel}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.statusBox, styles.errorBox]}>
          <Ionicons name="alert-circle-outline" size={18} color="#FCA5A5" />
          <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, email, phone, subject..."
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((status) => {
          const active = statusFilter === status;

          return (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {status === "all" ? "All" : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            <Text style={styles.sectionSubTitle}>{sectionSubtitle}</Text>
          </View>

          <View style={styles.tableBadge}>
            <Text style={styles.tableBadgeText}>
              {filteredMessages.length} visible
            </Text>
          </View>
        </View>

        <DataTable
          columns={columns}
          data={filteredMessages}
          renderCell={renderCell}
          renderRowActions={renderRowActions}
          actionColumnWidth={240}
          onRowPress={openDetails}
        />
      </View>

      <Modal
        visible={Boolean(selectedMessage)}
        transparent
        animationType="slide"
        onRequestClose={closeDetails}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              isDesktop ? styles.modalCardDesktop : styles.modalCardMobile,
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {selectedMessage ? (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>
                        {selectedMessage.name}
                      </Text>
                      <Text style={styles.modalSubtitle}>
                        {selectedMessage.email} | {selectedMessage.phone}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={closeDetails}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.detailGrid}>
                    {[
                      ["Name", selectedMessage.name],
                      ["Email", selectedMessage.email],
                      ["Phone", selectedMessage.phone],
                      ["Subject", selectedMessage.subject],
                      ["Message", selectedMessage.message || "N/A"],
                      ["Admin Reply", selectedMessage.reply || "N/A"],
                      ["Status", getStatusLabel(selectedMessage.status)],
                      ["Date", selectedMessage.dateLabel],
                      ["Reply At", selectedMessage.replyAtLabel || "N/A"],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ))}
                  </View>

                  {enableReplyComposer ? (
                    <View style={styles.replyComposer}>
                      <Text style={styles.replyTitle}>Reply to User</Text>
                      <Text style={styles.replySub}>
                        Reply bhejne par status automatically replied set ho
                        jayega.
                      </Text>

                      <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Type your reply here..."
                        placeholderTextColor="#8B7AA8"
                        style={styles.replyInput}
                        multiline
                        textAlignVertical="top"
                      />

                      <TouchableOpacity
                        style={[
                          styles.sendReplyBtn,
                          actionLoadingId === selectedMessage.id &&
                            styles.sendReplyBtnDisabled,
                        ]}
                        onPress={sendReply}
                        disabled={actionLoadingId === selectedMessage.id}
                      >
                        {actionLoadingId === selectedMessage.id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Ionicons
                            name="send-outline"
                            size={16}
                            color="#fff"
                          />
                        )}
                        <Text style={styles.sendReplyText}>Send Reply</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  <View style={styles.statusActionRow}>
                    {getNextStatusOptions(selectedMessage.status).map(
                      (status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.modalActionBtn,
                            status === "closed"
                              ? styles.closeBtnBg
                              : status === "replied"
                              ? styles.replyBtnBg
                              : styles.readBtnBg,
                          ]}
                          onPress={() => updateStatus(selectedMessage, status)}
                          disabled={actionLoadingId === selectedMessage.id}
                        >
                          <Text style={styles.modalActionText}>
                            Mark {getStatusLabel(status)}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  {enableReplyComposer ? (
                    <View style={styles.replyMetaBox}>
                      <Text style={styles.replyMetaLabel}>Current Reply</Text>
                      <Text style={styles.replyMetaText}>
                        {selectedMessage.reply || "No reply sent yet."}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 8px 22px rgba(0,0,0,0.22)" },
  default: { elevation: 4 },
});

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: "#151B2E",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextBox: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
  },
  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  refreshBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  refreshText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "18%",
    minWidth: 120,
    backgroundColor: "#151B2E",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  summaryCardMobile: {
    flexBasis: "48%",
    minWidth: 0,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#7C3AED",
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 3,
  },
  statusBox: {
    backgroundColor: "#101728",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  errorBox: {
    backgroundColor: "rgba(127, 29, 29, 0.35)",
  },
  errorText: {
    color: "#FECACA",
  },
  statusText: {
    color: "#D1D5DB",
    fontWeight: "700",
    flex: 1,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#2B3354",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  filterText: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 11,
  },
  filterTextActive: {
    color: "#fff",
  },
  tableCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    ...shadow,
  },
  pageScrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionSubTitle: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  tableBadge: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#242B45",
    justifyContent: "center",
    alignItems: "center",
  },
  tableBadgeText: {
    color: "#C4B5FD",
    fontWeight: "900",
    fontSize: 10,
  },
  tableText: {
    color: "#F5EAFF",
    fontSize: 12,
    fontWeight: "700",
  },
  serialText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "900",
  },
  messagePreview: {
    color: "#F5EAFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    justifyContent: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusNew: {
    backgroundColor: "rgba(245,158,11,0.18)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  statusRead: {
    backgroundColor: "rgba(59,130,246,0.18)",
    borderColor: "rgba(59,130,246,0.4)",
  },
  statusReplied: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderColor: "rgba(16,185,129,0.4)",
  },
  statusClosed: {
    backgroundColor: "rgba(148,163,184,0.18)",
    borderColor: "rgba(148,163,184,0.35)",
  },
  actionWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  actionBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.75,
  },
  viewBtn: {
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
  },
  readBtn: {
    backgroundColor: "#1D4ED8",
  },
  replyBtn: {
    backgroundColor: "#047857",
  },
  closeActionBtn: {
    backgroundColor: "#6B7280",
  },
  actionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  modalCard: {
    backgroundColor: "#0E0826",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    maxHeight: "92%",
    width: "100%",
    ...shadow,
  },
  modalCardDesktop: {
    maxWidth: 920,
  },
  modalCardMobile: {
    maxWidth: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#C4B5FD",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7C3AED",
  },
  detailGrid: {
    gap: 10,
  },
  detailItem: {
    borderRadius: 14,
    backgroundColor: "#151B2E",
    borderWidth: 1,
    borderColor: "#242B45",
    padding: 12,
  },
  detailLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  detailValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  modalScroll: {
    maxHeight: "92%",
  },
  modalScrollContent: {
    padding: 14,
    paddingBottom: 18,
  },
  replyComposer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#101728",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  replyTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  replySub: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
  replyInput: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#0B1020",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
  },
  sendReplyBtn: {
    minHeight: 42,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  sendReplyBtnDisabled: {
    opacity: 0.7,
  },
  sendReplyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  replyMetaBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#151B2E",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  replyMetaLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  replyMetaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },
  statusActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  modalActionBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  readBtnBg: {
    backgroundColor: "#1D4ED8",
  },
  replyBtnBg: {
    backgroundColor: "#047857",
  },
  closeBtnBg: {
    backgroundColor: "#6B7280",
  },
  modalActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
});
