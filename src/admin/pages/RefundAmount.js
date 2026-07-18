import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminCreateRefund,
  adminDeleteRefund,
  adminGetRefunds,
  adminPutRefund,
  normalizeList,
  normalizeObject,
} from "../utils/adminApi";
import { Colors } from "../../theme/colors";

const EMPTY_ADD_FORM = {
  user: "",
  amount: "",
  reason: "",
};

const EMPTY_EDIT_FORM = {
  amount: "",
  reason: "",
  status: "pending",
  adminNotes: "",
};

const STATUS_META = {
  pending: {
    label: "Pending",
    style: "pending",
    icon: "time-outline",
  },
  approved: {
    label: "Approved",
    style: "approved",
    icon: "checkmark-circle-outline",
  },
  completed: {
    label: "Completed",
    style: "completed",
    icon: "checkmark-done-circle-outline",
  },
  rejected: {
    label: "Rejected",
    style: "rejected",
    icon: "close-circle-outline",
  },
};

const STATUS_OPTIONS = ["pending", "approved", "completed", "rejected"];

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();

  if (STATUS_META[status]) {
    return status;
  }

  return status || "pending";
}

function formatAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value ? String(value) : "N/A";
  }

  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function getTextValue(value) {
  if (value === undefined || value === null || value === "") {
    return "N/A";
  }

  return String(value);
}

function friendlyErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeRefundRecord(item, index = 0) {
  const user = item?.user || {};
  const rawStatus = normalizeStatus(
    item?.status || item?.refundStatus || item?.state
  );
  const approvedBy = item?.approvedBy || item?.approvedByUser || {};

  return {
    id:
      item?._id ||
      item?.id ||
      item?.refundId ||
      item?.recordId ||
      `refund-${index + 1}`,
    userName:
      user?.name ||
      user?.fullName ||
      item?.userName ||
      item?.name ||
      item?.user ||
      "N/A",
    userId:
      user?._id ||
      user?.id ||
      item?.userId ||
      item?.customerId ||
      item?.uid ||
      "N/A",
    mobileNumber:
      user?.phone ||
      user?.mobile ||
      item?.mobileNumber ||
      item?.phone ||
      item?.contactNumber ||
      "N/A",
    amount: item?.amount ?? item?.refundAmount ?? item?.value ?? "",
    reason:
      item?.reason ||
      item?.refundReason ||
      item?.note ||
      item?.notes ||
      "N/A",
    status: rawStatus,
    refundDateTime:
      item?.refundDateTime ||
      item?.dateTime ||
      item?.refundedAt ||
      item?.createdAt ||
      item?.updatedAt ||
      "",
    adminNotes:
      item?.adminNotes ||
      item?.adminRemark ||
      item?.adminNote ||
      item?.notes ||
      "",
    approvedBy:
      approvedBy?.name ||
      approvedBy?.fullName ||
      item?.approvedByName ||
      item?.approvedBy ||
      "N/A",
    createdAt: item?.createdAt || "",
    updatedAt: item?.updatedAt || "",
    raw: item || {},
  };
}

function ActionButton({
  icon,
  label,
  onPress,
  colorVariant = "default",
  compact = false,
  disabled = false,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionButton,
        styles[`actionButton_${colorVariant}`],
        compact && styles.actionButtonCompact,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Ionicons name={icon} size={14} color="#fff" />
      {!compact ? <Text style={styles.actionButtonText}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const meta = STATUS_META[normalized] || STATUS_META.pending;

  return (
    <View style={[styles.statusBadge, styles[`statusBadge_${meta.style}`]]}>
      <Ionicons name={meta.icon} size={11} color="#fff" />
      <Text style={styles.statusBadgeText}>{meta.label}</Text>
    </View>
  );
}

export default function RefundAmount() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 920;
  const isCompactActions = width < 700;

  const [search, setSearch] = useState("");
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewRefund, setViewRefund] = useState(null);
  const [editRefund, setEditRefund] = useState(null);
  const [deleteRefund, setDeleteRefund] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const requestIdRef = useRef(0);

  const loadRefunds = async ({ showLoader = true } = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const data = await adminGetRefunds();
      const source = normalizeObject(data);
      const list = normalizeList(source, ["refunds", "data", "items", "results"]);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRefunds(list.map((item, index) => normalizeRefundRecord(item, index)));
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setRefunds([]);
      setError(
        friendlyErrorMessage(err, "Refund list load nahi ho payi.")
      );
    } finally {
      if (requestId === requestIdRef.current && showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadRefunds({ showLoader: true }).catch(() => {});
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  const filteredRefunds = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return refunds;
    }

    return refunds.filter((item) =>
      [
        item.userName,
        item.userId,
        item.mobileNumber,
        item.amount,
        item.reason,
        item.status,
        item.adminNotes,
        item.approvedBy,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [refunds, search]);

  const columns = [
    { title: "User", key: "user", width: isDesktop ? 220 : 150 },
    { title: "Amount", key: "amount", width: isDesktop ? 120 : 92 },
    { title: "Reason", key: "reason", width: isDesktop ? 220 : 140 },
    { title: "Status", key: "status", width: isDesktop ? 140 : 110 },
    { title: "Date", key: "date", width: isDesktop ? 180 : 130 },
  ];

  const resetAddForm = () => {
    setAddForm(EMPTY_ADD_FORM);
  };

  const openEditModal = (item) => {
    if (normalizeStatus(item.status) !== "pending") {
      return;
    }

    setEditRefund(item);
    setEditForm({
      amount: String(item.amount ?? ""),
      reason: item.reason || "",
      status: normalizeStatus(item.status),
      adminNotes: item.adminNotes || "",
    });
  };

  const closeEditModal = () => {
    setEditRefund(null);
    setEditForm(EMPTY_EDIT_FORM);
  };

  const openDeleteModal = (item) => {
    if (normalizeStatus(item.status) !== "pending") {
      return;
    }

    setDeleteRefund(item);
  };

  const closeDeleteModal = () => {
    setDeleteRefund(null);
    setDeleteLoading(false);
  };

  const handleAddRefund = async () => {
    if (!addForm.user.trim() || !addForm.amount.trim() || !addForm.reason.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setSubmitting(true);

    try {
      await adminCreateRefund({
        user: addForm.user.trim(),
        amount: Number(addForm.amount),
        reason: addForm.reason.trim(),
      });

      resetAddForm();
      await loadRefunds({ showLoader: true });
      Alert.alert("Success", "Refund submitted successfully");
    } catch (err) {
      Alert.alert(
        "Error",
        friendlyErrorMessage(err, "Refund submit nahi ho paya")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRefund = async () => {
    if (!editRefund) {
      return;
    }

    if (!editForm.amount.toString().trim() || !editForm.reason.trim()) {
      Alert.alert("Error", "Amount aur reason required hain.");
      return;
    }

    setSaving(true);

    try {
      await adminPutRefund(editRefund.id, {
        amount: Number(editForm.amount),
        reason: editForm.reason.trim(),
        status: normalizeStatus(editForm.status),
        adminNotes: editForm.adminNotes.trim(),
      });

      closeEditModal();
      await loadRefunds({ showLoader: true });
      Alert.alert("Success", "Refund updated successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        friendlyErrorMessage(err, "Refund update nahi ho paya.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRefund = async () => {
    if (!deleteRefund) {
      return;
    }

    const recordId = deleteRefund.id;
    const snapshot = refunds;

    setDeleteLoading(true);
    setRefunds((current) => current.filter((item) => item.id !== recordId));

    try {
      await adminDeleteRefund(recordId);
      closeDeleteModal();
      Alert.alert("Success", "Refund record delete ho gaya.");
    } catch (err) {
      setRefunds(snapshot);
      closeDeleteModal();
      Alert.alert(
        "Error",
        friendlyErrorMessage(err, "Refund delete nahi ho paya.")
      );
    }
  };

  const renderCell = (item, col) => {
    if (col.key === "user") {
      return (
        <View style={styles.userCell}>
          <Text style={styles.userName} numberOfLines={1}>
            {getTextValue(item.userName)}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            User ID: {getTextValue(item.userId)}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {getTextValue(item.mobileNumber)}
          </Text>
        </View>
      );
    }

    if (col.key === "amount") {
      return <Text style={styles.cellTextStrong}>{formatAmount(item.amount)}</Text>;
    }

    if (col.key === "reason") {
      return (
        <Text style={styles.cellText} numberOfLines={2}>
          {getTextValue(item.reason)}
        </Text>
      );
    }

    if (col.key === "status") {
      return <StatusBadge status={item.status} />;
    }

    if (col.key === "date") {
      return (
        <View>
          <Text style={styles.cellText} numberOfLines={1}>
            {formatDateTime(item.refundDateTime)}
          </Text>
          <Text style={styles.cellMetaText} numberOfLines={1}>
            Approved by: {getTextValue(item.approvedBy)}
          </Text>
        </View>
      );
    }

    return (
      <Text style={styles.cellText} numberOfLines={1}>
        {getTextValue(item[col.key])}
      </Text>
    );
  };

  const renderRowActions = (item) => {
    const pending = normalizeStatus(item.status) === "pending";

    return (
      <View style={styles.actionWrap}>
        <ActionButton
          icon="eye-outline"
          label="View"
          compact={isCompactActions}
          colorVariant="view"
          onPress={() => setViewRefund(item)}
          disabled={saving || submitting || deleteLoading}
        />

        <ActionButton
          icon="create-outline"
          label="Edit"
          compact={isCompactActions}
          colorVariant="edit"
          onPress={() => openEditModal(item)}
          disabled={!pending || saving || submitting || deleteLoading}
        />

        <ActionButton
          icon="trash-outline"
          label="Delete"
          compact={isCompactActions}
          colorVariant="delete"
          onPress={() => openDeleteModal(item)}
          disabled={!pending || saving || submitting || deleteLoading}
        />
      </View>
    );
  };

  const renderMobileCard = (item) => {
    const pending = normalizeStatus(item.status) === "pending";

    return (
      <View key={item.id} style={styles.mobileCard}>
        <View style={styles.mobileCardTop}>
          <View style={styles.mobileCardTitleBox}>
            <Text style={styles.mobileCardTitle} numberOfLines={1}>
              {getTextValue(item.userName)}
            </Text>
            <Text style={styles.mobileCardMeta} numberOfLines={1}>
              User ID: {getTextValue(item.userId)}
            </Text>
            <Text style={styles.mobileCardMeta} numberOfLines={1}>
              {getTextValue(item.mobileNumber)}
            </Text>
          </View>

          <StatusBadge status={item.status} />
        </View>

        <View style={styles.mobileInfoRow}>
          <Text style={styles.mobileInfoLabel}>Amount</Text>
          <Text style={styles.mobileInfoValue}>{formatAmount(item.amount)}</Text>
        </View>

        <View style={styles.mobileInfoRow}>
          <Text style={styles.mobileInfoLabel}>Reason</Text>
          <Text style={styles.mobileInfoValue} numberOfLines={2}>
            {getTextValue(item.reason)}
          </Text>
        </View>

        <View style={styles.mobileInfoRow}>
          <Text style={styles.mobileInfoLabel}>Date</Text>
          <Text style={styles.mobileInfoValue} numberOfLines={1}>
            {formatDateTime(item.refundDateTime)}
          </Text>
        </View>

        <View style={styles.mobileActionRow}>
          <ActionButton
            icon="eye-outline"
            label="View"
            compact
            colorVariant="view"
            onPress={() => setViewRefund(item)}
          />
          <ActionButton
            icon="create-outline"
            label="Edit"
            compact
            colorVariant="edit"
            onPress={() => openEditModal(item)}
            disabled={!pending}
          />
          <ActionButton
            icon="trash-outline"
            label="Delete"
            compact
            colorVariant="delete"
            onPress={() => openDeleteModal(item)}
            disabled={!pending}
          />
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextBox}>
            <Text style={styles.title}>Refund Amount</Text>
            <Text style={styles.subtitle}>
              Add, manage aur review refund records without changing the existing admin shell.
            </Text>
          </View>

          <View style={styles.headerChip}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primaryLight} />
            <Text style={styles.headerChipText}>Admin Panel</Text>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Add Refund</Text>
            <Text style={styles.cardDescription}>
              Existing add refund form preserve kiya gaya hai.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => loadRefunds({ showLoader: true })}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primaryLight} />
            ) : (
              <Ionicons name="refresh-outline" size={16} color={Colors.primaryLight} />
            )}
            {!isCompactActions ? <Text style={styles.refreshButtonText}>Refresh</Text> : null}
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          <TextInput
            style={styles.input}
            placeholder="User Name"
            placeholderTextColor="#8B7AA8"
            value={addForm.user}
            onChangeText={(text) =>
              setAddForm((previous) => ({ ...previous, user: text }))
            }
          />

          <TextInput
            style={styles.input}
            placeholder="Refund Amount"
            placeholderTextColor="#8B7AA8"
            keyboardType="numeric"
            value={addForm.amount}
            onChangeText={(text) =>
              setAddForm((previous) => ({ ...previous, amount: text }))
            }
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Refund Reason"
            placeholderTextColor="#8B7AA8"
            multiline
            value={addForm.reason}
            onChangeText={(text) =>
              setAddForm((previous) => ({ ...previous, reason: text }))
            }
          />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleAddRefund}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cash-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Submit Refund</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search refund..."
      />

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color={Colors.primaryLight} />
          <Text style={styles.statusText}>Refund data loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={18} color="#FCA5A5" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadRefunds({ showLoader: true })}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Refund Records</Text>
            <Text style={styles.sectionSubTitle}>
              User, amount, reason, status aur actions ke saath complete management view.
            </Text>
          </View>

          <View style={styles.tableBadge}>
            <Text style={styles.tableBadgeText}>
              {filteredRefunds.length} Records
            </Text>
          </View>
        </View>

        {isDesktop ? (
          <DataTable
            columns={columns}
            data={filteredRefunds}
            renderCell={renderCell}
            renderRowActions={renderRowActions}
            actionColumnTitle="Actions"
            actionColumnWidth={isCompactActions ? 112 : 260}
          />
        ) : filteredRefunds.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={28} color={Colors.primaryLight} />
            <Text style={styles.emptyTitle}>No data found</Text>
          </View>
        ) : (
          <View style={styles.mobileList}>{filteredRefunds.map(renderMobileCard)}</View>
        )}
      </View>

      <Modal
        visible={Boolean(viewRefund)}
        transparent
        animationType="slide"
        onRequestClose={() => setViewRefund(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.modalWide]}>
            {viewRefund ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Refund Details</Text>
                    <Text style={styles.modalSubtitle}>
                      {getTextValue(viewRefund.userName)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setViewRefund(null)}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.detailScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.detailGrid}>
                    {[
                      ["User name", viewRefund.userName],
                      ["User ID", viewRefund.userId],
                      ["Mobile number", viewRefund.mobileNumber],
                      ["Refund amount", formatAmount(viewRefund.amount)],
                      ["Refund reason", viewRefund.reason],
                      ["Refund status", getTextValue(STATUS_META[normalizeStatus(viewRefund.status)]?.label || viewRefund.status)],
                      ["Refund date and time", formatDateTime(viewRefund.refundDateTime)],
                      ["Admin notes", getTextValue(viewRefund.adminNotes)],
                      ["Approved by", getTextValue(viewRefund.approvedBy)],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{label}</Text>
                        <Text style={styles.detailValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.footerButton, styles.footerButtonSecondary]}
                    onPress={() => setViewRefund(null)}
                  >
                    <Text style={styles.footerButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editRefund)}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {editRefund ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Edit Refund</Text>
                    <Text style={styles.modalSubtitle}>
                      Pending refund hi edit ho sakta hai.
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.closeBtn} onPress={closeEditModal}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.inputLabel}>Refund Amount</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={String(editForm.amount)}
                    onChangeText={(text) =>
                      setEditForm((previous) => ({ ...previous, amount: text }))
                    }
                    keyboardType="numeric"
                    placeholder="Enter refund amount"
                    placeholderTextColor="#8B7AA8"
                  />

                  <Text style={styles.inputLabel}>Refund Reason</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={editForm.reason}
                    onChangeText={(text) =>
                      setEditForm((previous) => ({ ...previous, reason: text }))
                    }
                    multiline
                    placeholder="Enter refund reason"
                    placeholderTextColor="#8B7AA8"
                  />

                  <Text style={styles.inputLabel}>Refund Status</Text>
                  <View style={styles.statusOptionRow}>
                    {STATUS_OPTIONS.map((status) => {
                      const active = editForm.status === status;

                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusOption,
                            active && styles.statusOptionActive,
                          ]}
                          onPress={() =>
                            setEditForm((previous) => ({
                              ...previous,
                              status,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              active && styles.statusOptionTextActive,
                            ]}
                          >
                            {STATUS_META[status].label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Admin Notes</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={editForm.adminNotes}
                    onChangeText={(text) =>
                      setEditForm((previous) => ({ ...previous, adminNotes: text }))
                    }
                    multiline
                    placeholder="Add admin notes"
                    placeholderTextColor="#8B7AA8"
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.footerButton, styles.footerButtonSecondary]}
                    onPress={closeEditModal}
                    disabled={saving}
                  >
                    <Text style={styles.footerButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.footerButton, styles.footerButtonPrimary]}
                    onPress={handleSaveRefund}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.footerButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(deleteRefund)}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            {deleteRefund ? (
              <>
                <View style={styles.confirmIconBox}>
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                </View>

                <Text style={styles.confirmTitle}>Delete refund record?</Text>
                <Text style={styles.confirmText}>
                  Are you sure you want to delete this refund record?
                  {"\n"}
                  This action cannot be undone.
                </Text>

                <View style={styles.confirmMetaBox}>
                  <Text style={styles.confirmMetaLabel}>User</Text>
                  <Text style={styles.confirmMetaValue}>
                    {getTextValue(deleteRefund.userName)}
                  </Text>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.footerButton, styles.footerButtonSecondary]}
                    onPress={closeDeleteModal}
                    disabled={deleteLoading}
                  >
                    <Text style={styles.footerButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.footerButton, styles.footerButtonDanger]}
                    onPress={handleDeleteRefund}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.footerButtonText}>Delete</Text>
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
  page: {
    paddingBottom: 20,
  },
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
  formCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#242B45",
    ...Platform.select({
      web: { boxShadow: "0px 8px 20px rgba(0,0,0,0.22)" },
      default: { elevation: 4 },
    }),
  },
  cardHeader: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  cardDescription: {
    marginTop: 3,
    fontSize: 11,
    color: "#9CA3AF",
  },
  refreshButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primaryLight,
  },
  formBody: {
    padding: 16,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#0B1020",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 12,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  statusBox: {
    minHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "#101728",
    borderWidth: 1,
    borderColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#D1D5DB",
    fontWeight: "600",
  },
  errorBox: {
    minHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: "rgba(220,38,38,0.12)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.28)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#FCA5A5",
    fontWeight: "600",
  },
  retryButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  retryButtonText: {
    fontSize: 11,
    color: Colors.primaryLight,
    fontWeight: "700",
  },
  tableCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    ...Platform.select({
      web: { boxShadow: "0px 8px 20px rgba(0,0,0,0.22)" },
      default: { elevation: 4 },
    }),
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
  cellTextStrong: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  cellText: {
    color: "#F5EAFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cellMetaText: {
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusBadge_pending: {
    backgroundColor: "rgba(245,158,11,0.18)",
    borderColor: "rgba(245,158,11,0.4)",
  },
  statusBadge_approved: {
    backgroundColor: "rgba(37,99,235,0.18)",
    borderColor: "rgba(37,99,235,0.4)",
  },
  statusBadge_completed: {
    backgroundColor: "rgba(16,185,129,0.18)",
    borderColor: "rgba(16,185,129,0.4)",
  },
  statusBadge_rejected: {
    backgroundColor: "rgba(220,38,38,0.18)",
    borderColor: "rgba(220,38,38,0.4)",
  },
  actionWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  actionButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  actionButtonCompact: {
    minHeight: 32,
    width: 34,
    paddingHorizontal: 0,
  },
  actionButton_view: {
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
  },
  actionButton_edit: {
    backgroundColor: "#7C3AED",
  },
  actionButton_delete: {
    backgroundColor: "#B91C1C",
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  mobileList: {
    gap: 10,
  },
  mobileCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#242B45",
    gap: 10,
  },
  mobileCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  mobileCardTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  mobileCardTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  mobileCardMeta: {
    marginTop: 2,
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "600",
  },
  mobileInfoRow: {
    gap: 4,
  },
  mobileInfoLabel: {
    color: "#D8B4FE",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  mobileInfoValue: {
    color: "#F5EAFF",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  mobileActionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  emptyBox: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "800",
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
  modalWide: {
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
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
  modalBody: {
    gap: 10,
  },
  inputLabel: {
    color: "#D8B4FE",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
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
  statusOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#2B3354",
    justifyContent: "center",
    alignItems: "center",
  },
  statusOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusOptionText: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 11,
  },
  statusOptionTextActive: {
    color: "#fff",
  },
  modalFooter: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  footerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  footerButtonSecondary: {
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
  },
  footerButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  footerButtonDanger: {
    backgroundColor: "#B91C1C",
  },
  footerButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  confirmCard: {
    backgroundColor: "#0E0826",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    maxWidth: 520,
    alignSelf: "center",
    width: "100%",
  },
  confirmIconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#B91C1C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  confirmText: {
    marginTop: 8,
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 18,
  },
  confirmMetaBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#151B2E",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  confirmMetaLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  confirmMetaValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
