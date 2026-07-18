import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminApproveRefundTransaction,
  adminGet,
  adminGetRefundTransaction,
  adminRejectRefundTransaction,
  normalizeList,
  normalizeObject,
} from "../utils/adminApi";
import { Colors } from "../../theme/colors";

const PAGE_SIZE = 10;

const ZERO_SUMMARY = {
  total: 0,
  approved: 0,
  pending: 0,
  rejected: 0,
};

const STATUS_OPTIONS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const DATE_OPTIONS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom range" },
];

function safeNumber(value) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : 0;
}

function friendlyErrorMessage(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  if (!message) {
    return fallback;
  }

  if (String(message).toLowerCase().includes("network")) {
    return "Network issue hua hai. Please retry.";
  }

  return String(message);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function getDateRange(option) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (option === "today") {
    const day = toIsoDate(today);
    return { startDate: day, endDate: day };
  }

  if (option === "week") {
    const start = new Date(today);
    const dayOfWeek = start.getDay();
    const delta = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - delta);

    return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
  }

  if (option === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
  }

  return { startDate: "", endDate: "" };
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function formatDateTime(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function formatAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value ? String(value) : "N/A";
  }

  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function normalizeRefundTransaction(item, fallbackIndex = 0) {
  const user = item?.user || {};
  const amount = item?.amount ?? item?.refundAmount ?? 0;
  const originalAmount =
    item?.originalAmount ?? item?.paymentAmount ?? item?.paidAmount ?? amount;
  const status = String(item?.status || "pending").toLowerCase();
  const createdAt = item?.createdAt || item?.requestDate || item?.requestedAt;
  const updatedAt = item?.updatedAt || "";
  const approvedAt = item?.approvedAt || "";
  const rejectedAt = item?.rejectedAt || "";

  return {
    id: item?._id || item?.id || `refund-${fallbackIndex + 1}`,
    userId: user?._id || user?.id || item?.userId || "",
    userName: user?.name || item?.name || "N/A",
    userEmail: user?.email || item?.email || "N/A",
    userPhone: user?.phone || item?.phone || "N/A",
    transactionId:
      item?.transactionId || item?.txnId || item?.transaction_id || "N/A",
    paymentId: item?.paymentId || item?.payment_id || "N/A",
    orderId: item?.orderId || item?.order_id || "N/A",
    amount,
    originalAmount,
    reason: item?.reason || item?.note || item?.refundReason || "N/A",
    status,
    adminRemark: item?.adminRemark || item?.remark || "",
    createdAt,
    updatedAt,
    approvedAt,
    rejectedAt,
    decisionAt: approvedAt || rejectedAt || updatedAt || "",
  };
}

function getStatusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (!value) return "N/A";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusStyleKey(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "statusApproved";
  if (value === "rejected") return "statusRejected";
  return "statusPending";
}

function extractSummary(source, refunds) {
  const summary = source?.summary || {};

  return {
    total: safeNumber(summary.total ?? refunds.length),
    approved: safeNumber(
      summary.approved ??
        refunds.filter((item) => item.status === "approved").length
    ),
    pending: safeNumber(
      summary.pending ?? refunds.filter((item) => item.status === "pending").length
    ),
    rejected: safeNumber(
      summary.rejected ?? refunds.filter((item) => item.status === "rejected").length
    ),
  };
}

function extractPagination(source, fallbackPage, fallbackLimit, refunds) {
  const pagination = source?.pagination || {};

  const totalItems = safeNumber(
    pagination.totalItems ?? source?.totalItems ?? source?.summary?.total
  );
  const items = totalItems || refunds.length;
  const limit = safeNumber(pagination.limit ?? fallbackLimit) || fallbackLimit;
  const totalPages = safeNumber(
    pagination.totalPages ?? Math.max(1, Math.ceil(items / limit))
  );

  return {
    page: safeNumber(pagination.page ?? fallbackPage) || fallbackPage,
    limit,
    totalPages: totalPages || 1,
    totalItems: items,
  };
}

function buildQueryParams({
  search,
  statusFilter,
  dateFilter,
  customRange,
  page,
  limit,
}) {
  const params = {
    page,
    limit,
  };

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.search = trimmedSearch;
  }

  if (statusFilter !== "all") {
    params.status = statusFilter;
  }

  let range = { startDate: "", endDate: "" };
  if (dateFilter === "today" || dateFilter === "week" || dateFilter === "month") {
    range = getDateRange(dateFilter);
  } else if (dateFilter === "custom") {
    range = customRange;
  }

  if (range.startDate || range.endDate) {
    params.startDate = range.startDate;
    params.endDate = range.endDate;
  }

  return params;
}

function getDetailValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return String(value);
}

export default function RefundTransactionsList() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customRangeDraft, setCustomRangeDraft] = useState({
    startDate: "",
    endDate: "",
  });
  const [appliedCustomRange, setAppliedCustomRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState(ZERO_SUMMARY);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
    totalItems: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailRefund, setDetailRefund] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [approveRefund, setApproveRefund] = useState(null);
  const [approveRemark, setApproveRemark] = useState("Refund approved");
  const [rejectRefund, setRejectRefund] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const requestIdRef = useRef(0);

  const loadRefunds = async ({ showLoader = true } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const params = buildQueryParams({
        search,
        statusFilter,
        dateFilter,
        customRange: appliedCustomRange,
        page,
        limit: PAGE_SIZE,
      });

      if (
        dateFilter === "custom" &&
        (!appliedCustomRange.startDate || !appliedCustomRange.endDate)
      ) {
        if (showLoader) {
          setLoading(false);
        }
        return;
      }

      const data = await adminGet("refundTransactions", { params });
      const source = normalizeObject(data);
      const list = normalizeList(source, ["refunds", "data", "items", "results"]);
      const normalized = list.map((item, index) =>
        normalizeRefundTransaction(item, index)
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRefunds(normalized);
      setSummary(extractSummary(source, normalized));
      setPagination(extractPagination(source, page, PAGE_SIZE, normalized));
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setRefunds([]);
      setSummary(ZERO_SUMMARY);
      setPagination({
        page,
        limit: PAGE_SIZE,
        totalPages: 1,
        totalItems: 0,
      });
      setError(
        friendlyErrorMessage(
          err,
          "Refund transactions load nahi ho paye. Please try again."
        )
      );
    } finally {
      if (requestId === requestIdRef.current && showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (
      dateFilter === "custom" &&
      (!appliedCustomRange.startDate || !appliedCustomRange.endDate)
    ) {
      return undefined;
    }

    const timer = setTimeout(() => {
      loadRefunds({ showLoader: true }).catch(() => {});
    }, 250);

    return () => clearTimeout(timer);
  }, [search, statusFilter, dateFilter, appliedCustomRange, page]);

  const columns = [
    { title: "User", key: "user", width: 220 },
    { title: "Transaction ID", key: "transactionId", width: 180 },
    { title: "Amount", key: "amount", width: 120 },
    { title: "Reason", key: "reason", width: 220 },
    { title: "Status", key: "status", width: 140 },
    { title: "Date", key: "date", width: 160 },
  ];

  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const activeDateLabel = useMemo(() => {
    const selected = DATE_OPTIONS.find((item) => item.key === dateFilter);
    if (!selected) {
      return "All Time";
    }

    if (dateFilter !== "custom") {
      return selected.label;
    }

    const { startDate, endDate } = appliedCustomRange;
    if (!startDate || !endDate) {
      return "Custom range";
    }

    return `${startDate} to ${endDate}`;
  }, [dateFilter, appliedCustomRange]);

  const handleSearchChange = (text) => {
    requestIdRef.current += 1;
    setSearch(text);
    setPage(1);
  };

  const handleStatusChange = (nextStatus) => {
    requestIdRef.current += 1;
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const handleDateFilterChange = (nextFilter) => {
    requestIdRef.current += 1;
    setDateFilter(nextFilter);
    setPage(1);
    setLoading(false);
    setError("");

    if (nextFilter !== "custom") {
      setAppliedCustomRange({ startDate: "", endDate: "" });
      return;
    }

    setRefunds([]);
    setSummary(ZERO_SUMMARY);
    setPagination({
      page: 1,
      limit: PAGE_SIZE,
      totalPages: 1,
      totalItems: 0,
    });
  };

  const handleApplyCustomRange = () => {
    requestIdRef.current += 1;
    const { startDate, endDate } = customRangeDraft;

    if (!startDate || !endDate) {
      Alert.alert("Error", "Start date aur end date dono required hain.");
      return;
    }

    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      Alert.alert("Error", "Date format YYYY-MM-DD hona chahiye.");
      return;
    }

    if (new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T23:59:59`)) {
      Alert.alert("Error", "Start date end date se chhoti honi chahiye.");
      return;
    }

    setAppliedCustomRange({
      startDate,
      endDate,
    });
    setPage(1);
  };

  const openRefundDetails = async (item) => {
    const fallbackRecord = normalizeRefundTransaction(item);
    setDetailRefund(fallbackRecord);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response = await adminGetRefundTransaction(fallbackRecord.id);
      const source = normalizeObject(response);
      const normalized = normalizeRefundTransaction(
        source?.refund || source?.transaction || source?.refundTransaction || source
      );
      setDetailRefund((previous) => ({
        ...previous,
        ...normalized,
      }));
    } catch (err) {
      setDetailError(
        friendlyErrorMessage(
          err,
          "Refund details load nahi ho paye. List data dikhaya ja raha hai."
        )
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailRefund(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const openApproveModal = (item) => {
    const record = normalizeRefundTransaction(item);
    setApproveRefund(record);
    setApproveRemark(record.adminRemark || "Refund approved");
  };

  const openRejectModal = (item) => {
    const record = normalizeRefundTransaction(item);
    setRejectRefund(record);
    setRejectReason("");
  };

  const closeActionModals = () => {
    setApproveRefund(null);
    setRejectRefund(null);
    setApproveRemark("Refund approved");
    setRejectReason("");
  };

  const refreshAfterAction = async () => {
    await loadRefunds({ showLoader: true });
  };

  const handleApproveRefund = async () => {
    if (!approveRefund) {
      return;
    }

    setActionLoading(true);

    try {
      await adminApproveRefundTransaction(approveRefund.id, {
        remark: approveRemark.trim() || "Refund approved",
      });
      closeActionModals();
      await refreshAfterAction();
      Alert.alert("Success", "Refund approved successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        friendlyErrorMessage(
          err,
          "Refund approve nahi ho paya. Please try again."
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRefund = async () => {
    if (!rejectRefund) {
      return;
    }

    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert("Error", "Rejection reason required hai.");
      return;
    }

    setActionLoading(true);

    try {
      await adminRejectRefundTransaction(rejectRefund.id, {
        reason,
      });
      closeActionModals();
      await refreshAfterAction();
      Alert.alert("Success", "Refund rejected successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        friendlyErrorMessage(
          err,
          "Refund reject nahi ho paya. Please try again."
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  const renderCell = (item, col) => {
    if (col.key === "user") {
      return (
        <View style={styles.userCell}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {item.userEmail}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {item.userPhone}
          </Text>
        </View>
      );
    }

    if (col.key === "amount") {
      return <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>;
    }

    if (col.key === "reason") {
      return (
        <Text style={styles.tableText} numberOfLines={1}>
          {getDetailValue(item.reason)}
        </Text>
      );
    }

    if (col.key === "status") {
      const statusStyle = getStatusStyleKey(item.status);
      return (
        <View style={[styles.statusBadge, styles[statusStyle]]}>
          <Text style={styles.statusBadgeText}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      );
    }

    if (col.key === "date") {
      return (
        <View>
          <Text style={styles.tableText} numberOfLines={1}>
            {formatDateTime(item.createdAt)}
          </Text>
          <Text style={styles.tableMetaText} numberOfLines={1}>
            {item.decisionAt ? `Updated: ${formatDateTime(item.decisionAt)}` : "Request date"}
          </Text>
        </View>
      );
    }

    return (
      <Text style={styles.tableText} numberOfLines={1}>
        {getDetailValue(item[col.key])}
      </Text>
    );
  };

  const renderRowActions = (item) => {
    const pending = item.status === "pending";
    const actionDisabled = actionLoading;

    return (
      <View style={styles.actionWrap}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.viewBtn]}
          onPress={() => openRefundDetails(item)}
          disabled={actionDisabled}
        >
          <Ionicons name="eye-outline" size={14} color="#fff" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>

        {pending ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => openApproveModal(item)}
              disabled={actionDisabled}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => openRejectModal(item)}
              disabled={actionDisabled}
            >
              <Ionicons name="close-circle-outline" size={14} color="#fff" />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = pagination.page || page;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextBox}>
            <Text style={styles.title}>Refund Transactions</Text>
            <Text style={styles.subtitle}>
              Refund requests ko search, filter, review aur process karo
            </Text>
          </View>

          <View style={styles.headerChip}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.headerChipText}>Admin Actions</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryPrimary]}>
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total Refunds</Text>
        </View>

        <View style={[styles.summaryCard, styles.summarySuccess]}>
          <Text style={styles.summaryValue}>{summary.approved}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>

        <View style={[styles.summaryCard, styles.summaryWarning]}>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>

        <View style={[styles.summaryCard, styles.summaryDanger]}>
          <Text style={styles.summaryValue}>{summary.rejected}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <SearchBar
          value={search}
          onChangeText={handleSearchChange}
          placeholder="Search by user name, email, phone, transaction ID or payment ID..."
        />

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((item) => {
              const active = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleStatusChange(item.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Date Filter</Text>
          <View style={styles.chipRow}>
            {DATE_OPTIONS.map((item) => {
              const active = dateFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleDateFilterChange(item.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {dateFilter === "custom" ? (
            <View style={styles.customRangeBox}>
              <View style={styles.customInputsRow}>
                <View style={styles.customField}>
                  <Text style={styles.dateFieldLabel}>Start Date</Text>
                  <TextInput
                    value={customRangeDraft.startDate}
                    onChangeText={(text) =>
                      setCustomRangeDraft((previous) => ({
                        ...previous,
                        startDate: text,
                      }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B7AA8"
                    style={styles.dateInput}
                  />
                </View>

                <View style={styles.customField}>
                  <Text style={styles.dateFieldLabel}>End Date</Text>
                  <TextInput
                    value={customRangeDraft.endDate}
                    onChangeText={(text) =>
                      setCustomRangeDraft((previous) => ({
                        ...previous,
                        endDate: text,
                      }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#8B7AA8"
                    style={styles.dateInput}
                  />
                </View>
              </View>

              <View style={styles.customActionsRow}>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApplyCustomRange}
                >
                  <Ionicons name="calendar-outline" size={16} color="#fff" />
                  <Text style={styles.applyBtnText}>Apply Range</Text>
                </TouchableOpacity>

                <Text style={styles.rangeHint}>
                  Selected range will apply after validation.
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.activeRangeText}>
              Showing: {activeDateLabel}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.statusText}>Refund transactions loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.statusText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          {dateFilter === "custom" && !appliedCustomRange.startDate ? (
            <View style={styles.infoBox}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primaryLight} />
              <Text style={styles.infoText}>
                Custom range select kiya gaya hai. Results dekhne ke liye start aur end date fill karke Apply Range dabao.
              </Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Refunds</Text>
                  <Text style={styles.sectionSubTitle}>
                    Page {currentPage} of {totalPages} | {pagination.totalItems} items | {activeDateLabel}
                  </Text>
                </View>

                <View style={styles.tableBadge}>
                  <Text style={styles.tableBadgeText}>
                    {statusFilter.toUpperCase()}
                  </Text>
                </View>
              </View>

              <DataTable
                columns={columns}
                data={refunds}
                renderCell={renderCell}
                renderRowActions={renderRowActions}
                actionColumnWidth={isDesktop ? 320 : 300}
              />

              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
                  onPress={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={currentPage <= 1}
                >
                  <Ionicons name="chevron-back-outline" size={14} color="#fff" />
                  <Text style={styles.pageBtnText}>Prev</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageBtn,
                    currentPage >= totalPages && styles.pageBtnDisabled,
                  ]}
                  onPress={() =>
                    setPage((previous) => Math.min(totalPages, previous + 1))
                  }
                  disabled={currentPage >= totalPages}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={14}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : null}

      <Modal
        visible={Boolean(detailRefund)}
        transparent
        animationType="slide"
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && styles.modalCardWide]}>
            {detailRefund ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Refund Details</Text>
                    <Text style={styles.modalSubtitle}>
                      {detailRefund.transactionId} | {getStatusLabel(detailRefund.status)}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.closeBtn} onPress={closeDetailModal}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {detailLoading ? (
                  <View style={styles.detailLoader}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.detailLoaderText}>Loading details...</Text>
                  </View>
                ) : null}

                {detailError ? (
                  <View style={styles.detailErrorBox}>
                    <Ionicons name="warning-outline" size={16} color={Colors.accent} />
                    <Text style={styles.detailErrorText}>{detailError}</Text>
                  </View>
                ) : null}

                <ScrollView
                  style={styles.detailScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.detailGrid}>
                    {[
                      ["User name", detailRefund.userName],
                      ["Email", detailRefund.userEmail],
                      ["Phone", detailRefund.userPhone],
                      ["Transaction ID", detailRefund.transactionId],
                      ["Payment ID", detailRefund.paymentId],
                      ["Order ID", detailRefund.orderId],
                      ["Refund amount", formatAmount(detailRefund.amount)],
                      [
                        "Original payment amount",
                        formatAmount(detailRefund.originalAmount),
                      ],
                      ["Reason", detailRefund.reason],
                      ["Status", getStatusLabel(detailRefund.status)],
                      ["Request date", formatDateTime(detailRefund.createdAt)],
                      [
                        "Approved/Rejected date",
                        formatDateTime(detailRefund.decisionAt),
                      ],
                      ["Admin remark", getDetailValue(detailRefund.adminRemark)],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.detailFooter}>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.footerBtnSecondary]}
                    onPress={closeDetailModal}
                  >
                    <Text style={styles.footerBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(approveRefund)}
        transparent
        animationType="slide"
        onRequestClose={closeActionModals}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {approveRefund ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Approve Refund</Text>
                    <Text style={styles.modalSubtitle}>
                      {approveRefund.userName} | {approveRefund.transactionId}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.closeBtn} onPress={closeActionModals}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalInfoText}>
                  Are you sure you want to approve this refund request?
                </Text>

                <Text style={styles.inputLabel}>Approval remark</Text>
                <TextInput
                  value={approveRemark}
                  onChangeText={setApproveRemark}
                  placeholder="Refund approved"
                  placeholderTextColor="#8B7AA8"
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                />

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.footerBtnSecondary]}
                    onPress={closeActionModals}
                    disabled={actionLoading}
                  >
                    <Text style={styles.footerBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.footerBtn, styles.footerBtnSuccess]}
                    onPress={handleApproveRefund}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.footerBtnText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(rejectRefund)}
        transparent
        animationType="slide"
        onRequestClose={closeActionModals}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {rejectRefund ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Reject Refund</Text>
                    <Text style={styles.modalSubtitle}>
                      {rejectRefund.userName} | {rejectRefund.transactionId}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.closeBtn} onPress={closeActionModals}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalInfoText}>
                  Rejection reason required hai.
                </Text>

                <Text style={styles.inputLabel}>Rejection reason</Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Enter valid rejection reason"
                  placeholderTextColor="#8B7AA8"
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                />

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[styles.footerBtn, styles.footerBtnSecondary]}
                    onPress={closeActionModals}
                    disabled={actionLoading}
                  >
                    <Text style={styles.footerBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.footerBtn, styles.footerBtnDanger]}
                    onPress={handleRejectRefund}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.footerBtnText}>Reject</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: "#151B2E",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    ...Platform.select({
      web: { boxShadow: "0px 8px 24px rgba(0,0,0,0.35)" },
      default: { elevation: 6 },
    }),
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  headerTextBox: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  headerChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerChipText: {
    color: Colors.primaryLight,
    fontWeight: "800",
    fontSize: 11,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "23%",
    minWidth: 130,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    backgroundColor: "#151B2E",
    ...Platform.select({
      web: { boxShadow: "0px 8px 20px rgba(0,0,0,0.22)" },
      default: { elevation: 4 },
    }),
  },
  summaryPrimary: {
    borderColor: "rgba(124,58,237,0.45)",
  },
  summarySuccess: {
    borderColor: "rgba(16,185,129,0.35)",
  },
  summaryWarning: {
    borderColor: "rgba(245,158,11,0.4)",
  },
  summaryDanger: {
    borderColor: "rgba(220,38,38,0.45)",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
    fontWeight: "700",
  },
  filterCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
  },
  filterSection: {
    marginTop: 8,
  },
  filterLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#2B3354",
    justifyContent: "center",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 11,
  },
  chipTextActive: {
    color: "#fff",
  },
  activeRangeText: {
    color: Colors.primaryLight,
    marginTop: 10,
    fontSize: 11,
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "#101728",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    flex: 1,
  },
  customRangeBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  customInputsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  customField: {
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 160,
  },
  dateFieldLabel: {
    color: "#D8B4FE",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },
  dateInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#151B2E",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 12,
  },
  customActionsRow: {
    marginTop: 10,
    gap: 8,
  },
  applyBtn: {
    alignSelf: "flex-start",
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    justifyContent: "center",
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  rangeHint: {
    color: "#9CA3AF",
    fontSize: 11,
    lineHeight: 16,
  },
  statusBox: {
    backgroundColor: "#101728",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#242B45",
  },
  statusText: {
    color: "#D1D5DB",
    fontWeight: "700",
    flex: 1,
    fontSize: 12,
  },
  tableCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
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
    color: Colors.primaryLight,
    fontWeight: "900",
    fontSize: 10,
  },
  userCell: {
    gap: 2,
  },
  userName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  userMeta: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
  },
  amountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  tableText: {
    color: "#F5EAFF",
    fontSize: 12,
    fontWeight: "700",
  },
  tableMetaText: {
    color: "#9CA3AF",
    fontSize: 10,
    marginTop: 2,
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
  statusPending: {
    backgroundColor: "rgba(245,158,11,0.18)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  statusApproved: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderColor: "rgba(16,185,129,0.4)",
  },
  statusRejected: {
    backgroundColor: "rgba(220,38,38,0.18)",
    borderColor: "rgba(220,38,38,0.4)",
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
  viewBtn: {
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
  },
  approveBtn: {
    backgroundColor: "#047857",
  },
  rejectBtn: {
    backgroundColor: "#B91C1C",
  },
  actionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  paginationRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pageBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
  },
  pageInfo: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 11,
    textAlign: "center",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    backgroundColor: "#0E0826",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxHeight: "92%",
  },
  modalCardWide: {
    maxWidth: 860,
    alignSelf: "center",
    width: "100%",
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
    color: Colors.primaryLight,
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
    backgroundColor: Colors.primary,
  },
  detailLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#101728",
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 10,
  },
  detailLoaderText: {
    color: "#D1D5DB",
    fontWeight: "700",
    fontSize: 12,
  },
  detailErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(220,38,38,0.12)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.28)",
    marginBottom: 10,
  },
  detailErrorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  detailScroll: {
    flexGrow: 0,
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
  detailFooter: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalInfoText: {
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  inputLabel: {
    color: "#D8B4FE",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#151B2E",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 12,
  },
  modalTextArea: {
    minHeight: 78,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  modalActionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  footerBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  footerBtnSecondary: {
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
  },
  footerBtnSuccess: {
    backgroundColor: "#047857",
  },
  footerBtnDanger: {
    backgroundColor: "#B91C1C",
  },
  footerBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
});
