import React, { useEffect, useMemo, useState } from "react";
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
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import DataTable from "../components/DataTable";
import {
  adminAddUserCredit,
  adminGet,
  adminGetUserCredits,
  normalizeList,
} from "../utils/adminApi";
import { normalizeUserRecord } from "../utils/user";

const shadow = {
  boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
  elevation: 3,
};

function toText(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmountWithCurrency(amount, currencyCode, currencySymbol) {
  const numeric = Number(amount);
  const baseAmount = Number.isFinite(numeric)
    ? numeric.toLocaleString("en-IN")
    : toText(amount, "N/A");
  const code = String(currencyCode || "").toUpperCase();
  const symbol =
    currencySymbol && currencySymbol !== "N/A"
      ? currencySymbol
      : code === "INR"
      ? "₹"
      : code === "USD"
      ? "$"
      : "";

  if (!baseAmount || baseAmount === "N/A") {
    return "N/A";
  }

  if (symbol && code) {
    return `${symbol} ${baseAmount} ${code}`.trim();
  }

  if (symbol) {
    return `${symbol} ${baseAmount}`.trim();
  }

  if (code) {
    return `${baseAmount} ${code}`.trim();
  }

  return baseAmount;
}

function formatDuration(startValue, endValue) {
  if (!startValue) return "N/A";

  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "N/A";
  }

  const diffMs = Math.max(end.getTime() - start.getTime(), 0);
  const totalMinutes = Math.max(Math.round(diffMs / 60000), 0);

  if (totalMinutes < 1) {
    return "< 1 min";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return `${hours} hr ${minutes} min`;
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function toNormalizedText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function buildUserLookup(users = []) {
  const lookup = new Map();

  users.forEach((user) => {
    const rawUser = user?.raw || {};
    const rawKeys = [
      user?.rawId,
      user?.id,
      user?.userId,
      user?.raw?.user?._id,
      user?.raw?.user?.id,
      user?.name,
      user?.fullName,
      user?.userName,
      user?.email,
      user?.phone,
      rawUser?.name,
      rawUser?.fullName,
      rawUser?.userName,
      rawUser?.email,
      rawUser?.phone,
    ]
      .map((value) => toNormalizedText(value))
      .filter(Boolean);

    rawKeys.forEach((key) => {
      if (!lookup.has(key)) {
        lookup.set(key, user);
      }
    });
  });

  return lookup;
}

function findUserForCredit(item, userLookup) {
  const candidateKeys = [
    item?.user?._id,
    item?.user?.id,
    item?.user?.email,
    item?.user?.name,
    item?.user?.fullName,
    item?.user?.userName,
    item?.userId,
    item?.ownerId,
    item?.customerId,
    item?.owner,
    item?.customer,
    item?.email,
    item?.userName,
    item?.name,
    item?.fullName,
    typeof item?.user === "string" || typeof item?.user === "number"
      ? item.user
      : "",
    typeof item?.owner === "string" || typeof item?.owner === "number"
      ? item.owner
      : "",
    typeof item?.customer === "string" || typeof item?.customer === "number"
      ? item.customer
      : "",
  ]
    .map((value) => toNormalizedText(value))
    .filter(Boolean);

  for (const key of candidateKeys) {
    if (userLookup.has(key)) {
      return userLookup.get(key);
    }
  }

  return null;
}

function normalizeChatHistoryRecord(item, index = 0) {
  const kind = String(item?.kind || item?.type || "session").toLowerCase();
  const startedAt = item?.startedAt || item?.createdAt || "";
  const endedAt = item?.endedAt || item?.updatedAt || "";

  return {
    id: String(item?._id || item?.id || `history-${index + 1}`),
    kind,
    selected: Boolean(item?.selected),
    userName: toText(item?.userName, "N/A"),
    userId: toText(item?.userId, "N/A"),
    readerName: toText(
      item?.readerName || item?.adminName || item?.expertName || item?.hostName,
      "N/A"
    ),
    status: toText(item?.status, "N/A"),
    amount:
      item?.amount ??
      item?.deductedAmount ??
      item?.paymentAmount ??
      item?.creditAmount ??
      item?.chargeAmount ??
      null,
    creditAmount: item?.creditAmount ?? item?.amount ?? null,
    usedAmount: item?.usedAmount ?? item?.deductedAmount ?? null,
    balanceAmount: item?.balanceAmount ?? item?.balance ?? null,
    gateway: item?.gateway || item?.provider || item?.paymentMethod || "N/A",
    currencyCode: item?.currencyCode || item?.currency || "N/A",
    currencySymbol: item?.currencySymbol || "N/A",
    amountDisplay: item?.amountDisplay || "N/A",
    transactionId: toText(
      pickFirst(
        item?.transactionId,
        item?.paymentId,
        item?.referenceId,
        item?.reference,
        item?.sessionId,
        item?.chatroomId
      ),
      "N/A"
    ),
    transactionDetail: toText(
      item?.transactionDetail || item?.notes || item?.detail,
      "N/A"
    ),
    date: startedAt || item?.date || endedAt || "",
    createdDate: startedAt || item?.date || "",
    startedAt,
    endedAt,
    duration: formatDuration(startedAt, endedAt),
    source: item?.source || "session",
    raw: item,
  };
}

function normalizeSessionHistoryRecord(session, user, index = 0) {
  const startedAt =
    session?.startedAt ||
    session?.approvedAt ||
    session?.requestedAt ||
    session?.createdAt ||
    "";

  const endedAt =
    session?.endedAt || session?.closedAt || session?.updatedAt || "";
  const amount = pickFirst(
    session?.amount,
    session?.deductedAmount,
    session?.paymentAmount,
    session?.chargeAmount,
    session?.fee,
    session?.price,
    session?.walletDeduction
  );

  return normalizeChatHistoryRecord(
    {
      id: session?._id || session?.id || `session-${index + 1}`,
      kind: "session",
      userName: user?.userName || session?.userName || session?.name || "N/A",
      userId:
        session?.userId ||
        session?.user ||
        session?.customerId ||
        user?.userId ||
        "N/A",
      readerName:
        session?.readerName ||
        session?.adminName ||
        session?.expertName ||
        session?.hostName ||
        "N/A",
      status: session?.status || "completed",
      amount,
      transactionId:
        session?.transactionId ||
        session?.paymentId ||
        session?.referenceId ||
        session?.reference ||
        session?.chatroomId ||
        session?.id ||
        "N/A",
      transactionDetail:
        session?.transactionDetail ||
        session?.note ||
        session?.notes ||
        `Chat session ${session?.chatroomId || session?.id || ""}`.trim(),
      startedAt,
      endedAt,
      date: startedAt,
      source: "session",
    },
    index
  );
}

function normalizeCreditHistoryRecord(record, user, index = 0) {
  const creditAmount = pickFirst(
    record?.credit,
    record?.amount,
    record?.creditAmount,
    record?.totalCredit
  );
  const usedAmount = pickFirst(
    record?.used,
    record?.usedAmount,
    record?.usedCredit
  );
  const balanceAmount = pickFirst(
    record?.balance,
    record?.balanceAfter,
    record?.remainingBalance
  );
  const gateway =
    record?.gateway || record?.provider || record?.paymentMethod || "N/A";
  const currencyCode = String(
    record?.currencyCode || record?.currency || record?.paymentCurrency || "N/A"
  ).toUpperCase();
  const currencySymbol =
    record?.currencySymbol ||
    (currencyCode === "INR" ? "₹" : currencyCode === "USD" ? "$" : "");

  return normalizeChatHistoryRecord(
    {
      id: record?.id,
      kind: "payment",
      userName: user?.userName || record?.userName || "N/A",
      userId: user?.userId || record?.userId || "N/A",
      readerName:
        record?.paymentMethod || record?.transactionType || "Admin Credit",
      status: record?.status || "completed",
      amount: creditAmount,
      creditAmount,
      usedAmount,
      balanceAmount,
      gateway,
      currencyCode,
      currencySymbol,
      amountDisplay: formatAmountWithCurrency(
        creditAmount,
        currencyCode,
        currencySymbol
      ),
      transactionId: record?.transactionId || "N/A",
      transactionDetail:
        record?.transactionType ||
        record?.paymentMethod ||
        record?.notes ||
        "Credit transaction",
      startedAt: record?.date || record?.createdAt || "",
      endedAt: record?.updatedAt || "",
      date: record?.date || record?.createdAt || "",
      source: "payment",
    },
    index
  );
}

function getIdentityValues(user) {
  return Array.from(
    new Set(
      [
        user?.userId,
        user?.raw?.user?._id,
        user?.raw?.userId,
        user?.raw?.owner,
        user?.raw?.customer,
        user?.raw?.customerId,
        user?.raw?.ownerId,
        user?.raw?.user?._id,
        user?.raw?.user?.id,
      ]
        .filter(Boolean)
        .map((value) => String(value).trim())
    )
  );
}

function matchesIdentity(sourceValues = [], targetValues = []) {
  const normalizedSource = sourceValues
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  const normalizedTarget = targetValues
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  return normalizedSource.some((value) => normalizedTarget.includes(value));
}

function normalizeCreditRecord(item, index = 0, userLookup = new Map()) {
  const user = item?.user || item?.owner || item?.customer || {};
  const matchedUser = findUserForCredit(item, userLookup);
  const meta = item?.meta || item?.metadata || {};
  const userIdValue =
    typeof item?.user === "string" || typeof item?.user === "number"
      ? item.user
      : typeof item?.owner === "string" || typeof item?.owner === "number"
      ? item.owner
      : typeof item?.customer === "string" || typeof item?.customer === "number"
      ? item.customer
      : undefined;

  const transactionId = pickFirst(
    item?.transactionId,
    item?.paymentId,
    item?.razorpayPaymentId,
    item?.referenceId,
    item?.reference,
    item?.orderId,
    meta?.transactionId,
    meta?.paymentId,
    meta?.razorpayPaymentId,
    meta?.referenceId,
    meta?.reference,
    meta?.orderId
  );

  const paymentMethod = pickFirst(
    item?.paymentMethod,
    item?.method,
    item?.gateway,
    item?.transactionType,
    item?.type,
    meta?.paymentMethod,
    meta?.method,
    meta?.gateway,
    meta?.transactionType,
    meta?.type
  );

  const gateway = pickFirst(
    item?.gateway,
    item?.gatewayName,
    item?.provider,
    item?.providerName,
    meta?.gateway,
    meta?.gatewayName,
    meta?.provider,
    meta?.providerName
  );

  const currencyCode = String(
    pickFirst(
      item?.currency,
      item?.currencyCode,
      item?.paymentCurrency,
      item?.amountCurrency,
      meta?.currency,
      meta?.currencyCode,
      meta?.paymentCurrency,
      meta?.amountCurrency
    ) || ""
  ).toUpperCase();

  const currencySymbol =
    item?.currencySymbol ||
    meta?.currencySymbol ||
    (currencyCode === "INR" ? "₹" : currencyCode === "USD" ? "$" : "");

  const creditAmount = toNumber(
    pickFirst(
      item?.credit,
      item?.amount,
      item?.creditAmount,
      item?.totalCredit,
      meta?.credit,
      meta?.amount
    ),
    0
  );

  const rawUsedValue = pickFirst(
    item?.used,
    item?.usedAmount,
    item?.usedCredit,
    meta?.used,
    meta?.usedAmount
  );
  const rawBalanceValue = pickFirst(
    item?.balance,
    item?.balanceAfter,
    item?.remainingBalance,
    meta?.balance,
    meta?.balanceAfter
  );
  const usedAmount = toNumber(rawUsedValue, 0);
  const balance =
    rawBalanceValue !== undefined
      ? toNumber(rawBalanceValue, 0)
      : Math.max(creditAmount - usedAmount, 0);
  const resolvedUserName = pickFirst(
    matchedUser?.name,
    matchedUser?.fullName,
    matchedUser?.userName,
    matchedUser?.raw?.name,
    matchedUser?.raw?.fullName,
    matchedUser?.raw?.user?.name,
    matchedUser?.raw?.user?.fullName,
    matchedUser?.raw?.user?.userName,
    item?.userName,
    item?.name,
    item?.fullName,
    item?.ownerName,
    item?.user?.name,
    item?.user?.fullName,
    item?.user?.userName,
    user?.name,
    user?.fullName,
    user?.userName,
    typeof item?.user === "object" ? item?.user?.name : undefined,
    typeof item?.user === "object" ? item?.user?.fullName : undefined,
    typeof item?.user === "object" ? item?.user?.userName : undefined,
    typeof item?.owner === "object" ? item?.owner?.name : undefined,
    typeof item?.customer === "object" ? item?.customer?.name : undefined
  );
  const resolvedEmail = pickFirst(
    matchedUser?.email,
    matchedUser?.raw?.email,
    matchedUser?.raw?.user?.email,
    item?.email,
    item?.ownerEmail,
    item?.userEmail,
    item?.user?.email,
    user?.email,
    typeof item?.user === "object" ? item?.user?.email : undefined,
    typeof item?.owner === "object" ? item?.owner?.email : undefined,
    typeof item?.customer === "object" ? item?.customer?.email : undefined
  );
  const resolvedUsedAmount =
    rawUsedValue !== undefined
      ? usedAmount
      : Math.max(creditAmount - balance, 0);
  const resolvedBalance =
    rawBalanceValue !== undefined
      ? balance
      : Math.max(creditAmount - resolvedUsedAmount, 0);

  return {
    id: String(
      item?._id ||
        item?.id ||
        item?.creditId ||
        item?.recordId ||
        `credit-${index + 1}`
    ),
    raw: item,
    userName: toText(
      pickFirst(
        resolvedUserName,
        user?.name,
        item?.userName,
        item?.name,
        item?.fullName,
        item?.ownerName
      ),
      "N/A"
    ),
    userId: toText(
      pickFirst(
        userIdValue,
        user?._id,
        user?.id,
        item?.userId,
        item?.ownerId,
        item?.customerId,
        item?.user?._id,
        item?.user?.id
      ),
      "N/A"
    ),
    email: toText(
      pickFirst(resolvedEmail, user?.email, item?.ownerEmail, item?.userEmail),
      "N/A"
    ),
    transactionId: toText(transactionId, "N/A"),
    paymentMethod: toText(paymentMethod, "N/A"),
    gateway: toText(gateway, "N/A"),
    currencyCode: currencyCode || "N/A",
    currencySymbol: currencySymbol || "N/A",
    credit: creditAmount,
    used: resolvedUsedAmount,
    balance: resolvedBalance,
    date: pickFirst(
      item?.createdAt,
      item?.transactionDate,
      item?.date,
      item?.created_at,
      item?.updatedAt
    ),
    transactionType: toText(
      pickFirst(
        item?.transactionType,
        item?.type,
        item?.entryType,
        meta?.transactionType
      ),
      "credit"
    ),
    status: toText(
      pickFirst(item?.status, item?.paymentStatus, item?.state, meta?.status),
      "completed"
    ),
  };
}

function StatCard({ label, value, icon, iconColor, iconBackground }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function UserCredit({ onNavigateScreen }) {
  const [search, setSearch] = useState("");
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatHistoryError, setChatHistoryError] = useState("");
  const [chatSessionsHistory, setChatSessionsHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryError, setPaymentHistoryError] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState({});

  const columns = [
    { title: "No.", key: "serial", width: 70 },
    { title: "User Name", key: "userName", width: 170 },
    { title: "User ID", key: "userId", width: 140 },
    { title: "Email", key: "email", width: 220 },
    { title: "Transaction ID", key: "transactionId", width: 180 },
    { title: "Payment Method", key: "paymentMethod", width: 150 },
    { title: "Total Credit", key: "credit", width: 130 },
    { title: "Used Credit", key: "used", width: 120 },
    { title: "Balance", key: "balance", width: 120 },
    { title: "Date", key: "date", width: 180 },
  ];

  const loadCredits = async () => {
    setLoading(true);
    setError("");

    try {
      const [creditsResult, usersResult] = await Promise.allSettled([
        adminGetUserCredits(),
        adminGet("users"),
      ]);

      const creditsData =
        creditsResult.status === "fulfilled" ? creditsResult.value : null;
      const usersData =
        usersResult.status === "fulfilled" ? usersResult.value : null;

      const creditList = normalizeList(creditsData, [
        "credits",
        "userCredits",
        "data",
        "results",
        "items",
      ]);
      const userList = normalizeList(usersData, [
        "users",
        "data",
        "results",
        "items",
      ]);
      const userLookup = buildUserLookup(
        userList.map((item, index) => normalizeUserRecord(item, index))
      );

      const normalizedCredits = creditList.map((item, index) =>
        normalizeCreditRecord(item, index, userLookup)
      );

      normalizedCredits.sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );

      setCredits(normalizedCredits);
    } catch (err) {
      setCredits([]);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "User credit load nahi ho paya."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, []);

  const loadSelectedUserHistory = async (user) => {
    if (!user) {
      return;
    }

    setChatHistoryLoading(true);
    setChatHistoryError("");

    try {
      const selectedIdentityValues = getIdentityValues(user);
      const sessionResponse = await adminGet("chatSessions", {
        params: { status: "all" },
      });
      const sessionItems = normalizeList(sessionResponse, [
        "sessions",
        "data",
        "items",
        "results",
      ]);

      const matchedSessions = sessionItems.filter((session) => {
        const sessionIdentityValues = [
          typeof session?.user === "object"
            ? session?.user?._id || session?.user?.id
            : session?.user,
          typeof session?.owner === "object"
            ? session?.owner?._id || session?.owner?.id
            : session?.owner,
          typeof session?.customer === "object"
            ? session?.customer?._id || session?.customer?.id
            : session?.customer,
          session?._id,
          session?.id,
          session?.userId,
          session?.customerId,
          session?.ownerId,
          session?.hostId,
          session?.chatroomId,
        ];

        return matchesIdentity(sessionIdentityValues, selectedIdentityValues);
      });

      const nextChatHistory = matchedSessions.map((session, index) =>
        normalizeSessionHistoryRecord(session, user, index)
      );

      const nextPaymentHistory = credits
        .filter((record) =>
          matchesIdentity([record.userId], selectedIdentityValues)
        )
        .map((record, index) =>
          normalizeCreditHistoryRecord(record, user, index)
        );

      nextChatHistory.sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );
      nextPaymentHistory.sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );

      setChatSessionsHistory(nextChatHistory);
      setPaymentHistory(nextPaymentHistory);
    } catch (err) {
      setChatSessionsHistory([]);
      setPaymentHistory([]);
      setChatHistoryError(
        err?.response?.data?.message ||
          err?.message ||
          "Chat history load nahi ho payi."
      );
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const filteredCredits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return credits;

    return credits.filter((item) =>
      [
        item.userName,
        item.userId,
        item.email,
        item.transactionId,
        item.paymentMethod,
        item.transactionType,
        item.status,
        String(item.credit),
        String(item.used),
        String(item.balance),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [credits, search]);

  const totals = useMemo(
    () => ({
      totalCredit: credits.reduce(
        (sum, item) => sum + toNumber(item.credit),
        0
      ),
      usedCredit: credits.reduce((sum, item) => sum + toNumber(item.used), 0),
      balance: credits.reduce((sum, item) => sum + toNumber(item.balance), 0),
      records: credits.length,
    }),
    [credits]
  );

  const resetModal = () => {
    setSelectedUser(null);
    setAmount("");
    setAddModalVisible(false);
    setChatModalVisible(false);
    setPaymentModalVisible(false);
    setChatHistoryLoading(false);
    setChatHistoryError("");
    setChatSessionsHistory([]);
    setPaymentHistory([]);
    setSelectedHistoryIds({});
  };

  const openAddCredits = (user) => {
    setSelectedUser(user);
    setAmount("");
    setAddModalVisible(true);
  };

  const openChat = (user) => {
    setSelectedUser(user);
    setChatModalVisible(true);
    setChatHistoryLoading(true);
    setChatHistoryError("");
    setChatSessionsHistory([]);
    setPaymentHistory([]);
    setSelectedHistoryIds({});
    loadSelectedUserHistory(user);
  };

  const openPayment = (user) => {
    setSelectedUser(user);
    setPaymentModalVisible(true);
    setPaymentHistoryLoading(true);
    setPaymentHistoryError("");
    setPaymentHistory([]);

    try {
      const selectedIdentityValues = getIdentityValues(user);
      const nextPaymentHistory = credits
        .filter((record) =>
          matchesIdentity([record.userId], selectedIdentityValues)
        )
        .map((record, index) =>
          normalizeCreditHistoryRecord(record, user, index)
        );

      nextPaymentHistory.sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );
      setPaymentHistory(nextPaymentHistory);
    } catch (err) {
      setPaymentHistory([]);
      setPaymentHistoryError(
        err?.response?.data?.message ||
          err?.message ||
          "Payment history load nahi ho payi."
      );
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const submitAddCredit = async () => {
    if (!selectedUser) {
      Alert.alert("Required", "User select nahi hua.");
      return;
    }

    const numericAmount = toNumber(amount, 0);

    if (!numericAmount || numericAmount <= 0) {
      Alert.alert("Required", "Credit amount valid enter karo.");
      return;
    }

    const userId =
      selectedUser?.raw?.user?._id ||
      selectedUser?.raw?.userId ||
      selectedUser?.raw?.owner ||
      selectedUser?.raw?.customer ||
      selectedUser?.userId;

    if (!userId || userId === "N/A") {
      Alert.alert("Required", "Valid user ID nahi mila.");
      return;
    }

    setSaving(true);

    try {
      await adminAddUserCredit({
        userId,
        amount: numericAmount,
        credit: numericAmount,
        userName: selectedUser.userName,
        email: selectedUser.email,
        paymentMethod: "Admin Credit",
        transactionType: "credit",
        status: "completed",
        notes: "",
      });

      Alert.alert("Success", "Credit successfully add ho gaya.");
      await loadCredits();
      resetModal();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Credit add nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderRowActions = (user) => (
    <View style={styles.actionsWrap}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.addBtnAction]}
        onPress={() => openAddCredits(user)}
      >
        <Ionicons name="add-circle-outline" size={14} color="#fff" />
        <Text style={styles.actionText}>Add Credits</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.chatBtn]}
        onPress={() => openChat(user)}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
        <Text style={styles.actionText}>Chat</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, styles.paymentBtn]}
        onPress={() => openPayment(user)}
      >
        <Ionicons name="card-outline" size={14} color="#fff" />
        <Text style={styles.actionText}>Payment</Text>
      </TouchableOpacity>
    </View>
  );

  const chatHistoryColumns = [
    { title: "Select", key: "select", width: 90 },
    { title: "Unique ID", key: "uniqueId", width: 180 },
    { title: "User Name", key: "userName", width: 170 },
    { title: "Reader Name", key: "readerName", width: 170 },
    { title: "Created Date", key: "createdDate", width: 170 },
    { title: "Status", key: "status", width: 120 },
    { title: "Duration", key: "duration", width: 110 },
    { title: "Amount", key: "amount", width: 120 },
    { title: "Transaction", key: "transactionDetail", width: 220 },
    { title: "Txn ID", key: "transactionId", width: 160 },
  ];

  const paymentHistoryColumns = [
    { title: "Date", key: "date", width: 170 },
    { title: "Payment Method", key: "readerName", width: 150 },
    { title: "Gateway", key: "gateway", width: 150 },
    { title: "Currency", key: "currencyCode", width: 110 },
    { title: "Amount", key: "amount", width: 120 },
    { title: "Txn ID", key: "transactionId", width: 160 },
    { title: "Status", key: "status", width: 120 },
    { title: "Transaction Detail", key: "transactionDetail", width: 240 },
  ];

  const renderHistoryCell = (item, col) => {
    if (col.key === "select") {
      const checked = Boolean(selectedHistoryIds[item.id]);

      return (
        <TouchableOpacity
          style={[styles.selectChip, checked && styles.selectChipActive]}
          onPress={() =>
            setSelectedHistoryIds((prev) => ({
              ...prev,
              [item.id]: !prev[item.id],
            }))
          }
        >
          <Ionicons
            name={checked ? "checkmark-circle" : "square-outline"}
            size={16}
            color="#fff"
          />
        </TouchableOpacity>
      );
    }

    if (col.key === "uniqueId") {
      return (
        <Text style={styles.historyCellStrong} numberOfLines={1}>
          {item.id}
        </Text>
      );
    }

    if (
      col.key === "userName" ||
      col.key === "readerName" ||
      col.key === "createdDate"
    ) {
      if (col.key === "createdDate") {
        return (
          <Text style={styles.historyCellStrong}>
            {formatDate(item.createdDate)}
          </Text>
        );
      }

      return (
        <Text style={styles.historyCell} numberOfLines={2}>
          {toText(item[col.key])}
        </Text>
      );
    }

    if (col.key === "date") {
      return (
        <Text style={styles.historyCellStrong}>{formatDate(item.date)}</Text>
      );
    }

    if (
      col.key === "amount" ||
      col.key === "creditAmount" ||
      col.key === "usedAmount" ||
      col.key === "balanceAmount"
    ) {
      return (
        <Text style={styles.historyCellStrong}>
          {col.key === "amount" &&
          item.amountDisplay &&
          item.amountDisplay !== "N/A"
            ? item.amountDisplay
            : item[col.key] === null ||
              item[col.key] === undefined ||
              item[col.key] === ""
            ? "N/A"
            : String(item[col.key])}
        </Text>
      );
    }

    if (col.key === "currencyCode") {
      return (
        <Text style={styles.historyCellStrong}>
          {item.currencyCode || "N/A"}{" "}
          {item.currencySymbol && item.currencySymbol !== "N/A"
            ? `(${item.currencySymbol})`
            : ""}
        </Text>
      );
    }

    if (col.key === "status") {
      return (
        <Text style={styles.historyCellStrong}>
          {toText(item.status).toUpperCase()}
        </Text>
      );
    }

    return (
      <Text style={styles.historyCell} numberOfLines={2}>
        {toText(item[col.key])}
      </Text>
    );
  };

  const renderCell = (item, col, rowIndex) => {
    if (col.key === "serial") {
      return (
        <Text style={styles.serialText} numberOfLines={1}>
          {String(rowIndex + 1)}
        </Text>
      );
    }

    if (col.key === "userName") {
      return (
        <View style={styles.userCell}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.userName}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {item.transactionType}
          </Text>
        </View>
      );
    }

    if (col.key === "credit" || col.key === "used" || col.key === "balance") {
      return (
        <Text style={styles.cellTextStrong}>{toText(item[col.key], "0")}</Text>
      );
    }

    if (col.key === "date") {
      return (
        <View>
          <Text style={styles.cellText} numberOfLines={1}>
            {formatDate(item.date)}
          </Text>
          <Text style={styles.cellMetaText} numberOfLines={1}>
            {item.status}
          </Text>
        </View>
      );
    }

    return (
      <Text style={styles.cellText} numberOfLines={1}>
        {toText(item[col.key])}
      </Text>
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
            <Text style={styles.title}>User Credit</Text>
            <Text style={styles.subtitle}>
              Real transactions, payment method aur credit history manage karo.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadCredits}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <Ionicons name="refresh-outline" size={16} color="#7C3AED" />
            )}
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Total Records"
          value={totals.records}
          icon="albums-outline"
          iconColor="#7C3AED"
          iconBackground="#F4EEFF"
        />
        <StatCard
          label="Total Credit"
          value={totals.totalCredit}
          icon="wallet-outline"
          iconColor="#0EA5E9"
          iconBackground="#E0F2FE"
        />
        <StatCard
          label="Used Credit"
          value={totals.usedCredit}
          icon="receipt-outline"
          iconColor="#F59E0B"
          iconBackground="#FFF7E6"
        />
        <StatCard
          label="Balance"
          value={totals.balance}
          icon="cash-outline"
          iconColor="#16A34A"
          iconBackground="#ECFDF3"
        />
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#7C3AED" />
          <Text style={styles.statusText}>Credit data loading...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.statusBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
          <Text style={styles.statusText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadCredits}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, ID, email, transaction, method..."
      />

      <View style={styles.tableCard}>
        <DataTable
          columns={columns}
          data={filteredCredits}
          renderCell={renderCell}
          renderRowActions={renderRowActions}
          actionColumnTitle="Action"
          actionColumnWidth={330}
        />
      </View>

      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.addModalCard]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Add Credit</Text>
                <Text style={styles.modalSubtitle}>
                  Enter amount only. Credit directly user wallet me add hoga.
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={resetModal}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Add Credit</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter Credit Amount"
                placeholderTextColor="#8B7AA8"
                keyboardType="numeric"
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                autoFocus
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonSecondary]}
                onPress={resetModal}
                disabled={saving}
              >
                <Text style={styles.footerButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonPrimary]}
                onPress={submitAddCredit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.footerButtonText}>Add Credit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={chatModalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.chatModalCard]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Chat History</Text>
                <Text style={styles.modalSubtitle}>
                  Selected user ki chat aur payment related history
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={resetModal}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.chatSummaryCard}>
              <View style={styles.chatSummaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatSummaryName}>
                    {selectedUser?.userName || "Selected User"}
                  </Text>
                  <Text style={styles.chatSummaryMeta}>
                    User ID: {selectedUser?.userId || "N/A"}
                  </Text>
                  <Text style={styles.chatSummaryMeta}>
                    Email: {selectedUser?.email || "N/A"}
                  </Text>
                </View>

                <View style={styles.chatSummaryChip}>
                  <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
                  <Text style={styles.chatSummaryChipText}>
                    {chatSessionsHistory.length} Sessions
                  </Text>
                </View>
              </View>

              <View style={styles.chatSummaryStats}>
                <View style={styles.chatStatBox}>
                  <Text style={styles.chatStatValue}>
                    {chatSessionsHistory.length}
                  </Text>
                  <Text style={styles.chatStatLabel}>Chat Sessions</Text>
                </View>
                <View style={styles.chatStatBox}>
                  <Text style={styles.chatStatValue}>
                    {paymentHistory.length}
                  </Text>
                  <Text style={styles.chatStatLabel}>Payment Records</Text>
                </View>
              </View>
            </View>

            {chatHistoryLoading ? (
              <View style={styles.statusBox}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.statusText}>Chat history loading...</Text>
              </View>
            ) : null}

            {chatHistoryError ? (
              <View style={styles.statusBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={styles.statusText}>{chatHistoryError}</Text>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatModalScroll}
            >
              <View style={styles.historySection}>
                <Text style={styles.historySectionTitle}>Chat Sessions</Text>
                <View style={styles.historyTableCard}>
                  <DataTable
                    columns={chatHistoryColumns}
                    data={chatSessionsHistory}
                    renderCell={renderHistoryCell}
                  />
                </View>
              </View>

              <View style={styles.historySection}>
                <Text style={styles.historySectionTitle}>
                  Payment / Credit History
                </Text>
                <View style={styles.historyTableCard}>
                  <DataTable
                    columns={paymentHistoryColumns}
                    data={paymentHistory}
                    renderCell={renderHistoryCell}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonSecondary]}
                onPress={resetModal}
              >
                <Text style={styles.footerButtonText}>Back to List</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonPrimary]}
                onPress={() => {
                  const currentUser = selectedUser;
                  resetModal();
                  if (currentUser) {
                    openAddCredits(currentUser);
                  }
                }}
              >
                <Text style={styles.footerButtonText}>Add Credits</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.paymentModalCard]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Payment Details</Text>
                <Text style={styles.modalSubtitle}>
                  Selected user ki payment history aur gateway details
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={resetModal}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.chatSummaryCard}>
              <View style={styles.chatSummaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatSummaryName}>
                    {selectedUser?.userName || "Selected User"}
                  </Text>
                  <Text style={styles.chatSummaryMeta}>
                    User ID: {selectedUser?.userId || "N/A"}
                  </Text>
                  <Text style={styles.chatSummaryMeta}>
                    Email: {selectedUser?.email || "N/A"}
                  </Text>
                </View>

                <View style={styles.chatSummaryChip}>
                  <Ionicons name="wallet-outline" size={16} color="#fff" />
                  <Text style={styles.chatSummaryChipText}>
                    {paymentHistory.length} Payments
                  </Text>
                </View>
              </View>

              <View style={styles.chatSummaryStats}>
                <View style={styles.chatStatBox}>
                  <Text style={styles.chatStatValue}>
                    {paymentHistory.length}
                  </Text>
                  <Text style={styles.chatStatLabel}>Payment Records</Text>
                </View>
                <View style={styles.chatStatBox}>
                  <Text style={styles.chatStatValue}>
                    {paymentHistory
                      .reduce((sum, item) => sum + toNumber(item.amount), 0)
                      .toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.chatStatLabel}>Total Amount</Text>
                </View>
              </View>
            </View>

            {paymentHistoryLoading ? (
              <View style={styles.statusBox}>
                <ActivityIndicator color="#7C3AED" />
                <Text style={styles.statusText}>
                  Payment history loading...
                </Text>
              </View>
            ) : null}

            {paymentHistoryError ? (
              <View style={styles.statusBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={styles.statusText}>{paymentHistoryError}</Text>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.chatModalScroll}
            >
              <View style={styles.historySection}>
                <Text style={styles.historySectionTitle}>Payment Records</Text>
                <View style={styles.historyTableCard}>
                  <DataTable
                    columns={paymentHistoryColumns}
                    data={paymentHistory}
                    renderCell={renderHistoryCell}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonSecondary]}
                onPress={resetModal}
              >
                <Text style={styles.footerButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerButton, styles.footerButtonPrimary]}
                onPress={() => {
                  const currentUser = selectedUser;
                  resetModal();
                  if (currentUser) {
                    openAddCredits(currentUser);
                  }
                }}
              >
                <Text style={styles.footerButtonText}>Add Credits</Text>
              </TouchableOpacity>
            </View>
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
    color: "#C084FC",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: "24%",
    minWidth: 140,
    backgroundColor: "#151B2E",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  statLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  statusBox: {
    backgroundColor: "#151B2E",
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
  statusText: {
    color: "#D1D5DB",
    fontWeight: "700",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "#0B1020",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#242B45",
  },
  retryText: {
    color: "#C084FC",
    fontWeight: "900",
    fontSize: 12,
  },
  tableCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#242B45",
    padding: 12,
    marginBottom: 14,
    ...shadow,
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
  serialText: {
    color: "#C4B5FD",
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
  actionsWrap: {
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
  actionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  addBtnAction: {
    backgroundColor: "#7C3AED",
  },
  chatBtn: {
    backgroundColor: "#0EA5E9",
  },
  paymentBtn: {
    backgroundColor: "#7C3AED",
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
  addModalCard: {
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    borderRadius: 16,
    padding: 12,
  },
  chatModalCard: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },
  paymentModalCard: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#C084FC",
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7C3AED",
  },
  chatSummaryCard: {
    backgroundColor: "#151B2E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 10,
  },
  chatSummaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    justifyContent: "space-between",
  },
  chatSummaryName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  chatSummaryMeta: {
    color: "#9CA3AF",
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },
  chatSummaryChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatSummaryChipText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  chatSummaryStats: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },
  chatStatBox: {
    minWidth: 130,
    flex: 1,
    backgroundColor: "#0B1020",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#242B45",
    padding: 10,
  },
  chatStatValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  chatStatLabel: {
    color: "#9CA3AF",
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },
  chatModalScroll: {
    paddingBottom: 6,
  },
  historySection: {
    marginBottom: 12,
  },
  historySectionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  historyTableCard: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  historyCell: {
    color: "#F5EAFF",
    fontSize: 11,
    fontWeight: "700",
  },
  historyCellStrong: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  selectChip: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  selectChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
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
  modalFooter: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  footerButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
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
    backgroundColor: "#7C3AED",
  },
  footerButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  detailScroll: {
    flexGrow: 0,
  },
  detailGrid: {
    gap: 10,
  },
  detailRow: {
    backgroundColor: "#151B2E",
    borderWidth: 1,
    borderColor: "#242B45",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    color: "#C084FC",
    fontSize: 11,
    fontWeight: "800",
    width: "42%",
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
    textAlign: "right",
  },
});
