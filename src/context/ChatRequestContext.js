import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "./AuthContext";
import {
  adminGet,
  adminApproveChatAccessRequest,
  adminRejectChatAccessRequest,
  normalizeList,
  normalizeObject,
} from "../admin/utils/adminApi";
import { createAdminChatSocket } from "../services/chatSocketService";
import { startRingtone, stopRingtone } from "../services/ringtoneService";
import { navigate } from "../navigation/navigationRef";
import AdminImage from "../admin/components/AdminImage";
import { resolveAssetUrl } from "../api/api";

const ChatRequestContext = createContext({
  pendingRequestCount: 0,
  activeRequest: null,
  startTestRingtone: () => {},
  stopTestRingtone: () => {},
});

const DEFAULT_REJECT_REASON = "Not available right now";

function pickRequestId(payload) {
  return (
    payload?._id ||
    payload?.id ||
    payload?.requestId ||
    payload?.chatRequestId ||
    payload?.chatAccessRequestId ||
    payload?.data?._id ||
    payload?.data?.id ||
    payload?.request?._id ||
    payload?.request?.id ||
    ""
  );
}

function normalizeIncomingRequest(payload) {
  const source = normalizeObject(payload);

  const nested =
    source.request ||
    source.data?.request ||
    source.data ||
    source.payload ||
    source.chatRequest ||
    source.chatAccessRequest ||
    source;

  return {
    id: pickRequestId(source) || pickRequestId(nested) || `${Date.now()}`,
    name: nested?.name || nested?.userName || nested?.fullName || "N/A",
    email: nested?.email || nested?.userEmail || "N/A",
    phone: nested?.phone || nested?.mobile || nested?.userPhone || "N/A",
    requestedAt:
      nested?.chatAccessRequestedAt ||
      nested?.requestedAt ||
      nested?.createdAt ||
      source?.requestedAt ||
      source?.createdAt ||
      "",
    image:
      nested?.image ||
      nested?.avatar ||
      nested?.userImage ||
      nested?.profileImage ||
      nested?.photo ||
      "",
    reason:
      nested?.chatAccessReason ||
      nested?.reason ||
      nested?.message ||
      nested?.note ||
      "",
    raw: payload,
  };
}

function normalizeRequestList(data) {
  const source = normalizeObject(data);

  return normalizeList(source, [
    "requests",
    "items",
    "results",
    "data",
    "list",
  ]).map(normalizeIncomingRequest);
}

function RequestAvatar({ request }) {
  const imageUrl = request?.image ? resolveAssetUrl(request.image) : "";

  if (imageUrl) {
    return (
      <AdminImage
        uri={imageUrl}
        style={styles.avatarImage}
        resizeMode="cover"
        placeholderLabel=""
        renderFallback={() => null}
      />
    );
  }

  const initials =
    request?.name
      ?.split(" ")
      ?.filter(Boolean)
      ?.slice(0, 2)
      ?.map((part) => part[0]?.toUpperCase())
      ?.join("") || "U";

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{initials}</Text>
    </View>
  );
}

export function ChatRequestProvider({ children }) {
  const { user, isAuthenticated, isAuthReady } = useAuth();
  const insets = useSafeAreaInsets();
  const socketRef = useRef(null);
  const dismissedRequestIdsRef = useRef(new Set());
  const [queue, setQueue] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [rejectReason, setRejectReason] = useState(DEFAULT_REJECT_REASON);
  const [connectionError, setConnectionError] = useState("");
  const [soundTick, setSoundTick] = useState(0);

  const activeRequest = queue[0] || null;

  const upsertRequests = (incoming) => {
    if (!incoming.length) {
      return;
    }

    setQueue((previous) => {
      const merged = new Map(previous.map((item) => [item.id, item]));

      incoming.forEach((item) => {
        if (!item?.id) {
          return;
        }

        if (dismissedRequestIdsRef.current.has(item.id)) {
          return;
        }

        const existing = merged.get(item.id);

        merged.set(item.id, existing ? { ...existing, ...item } : item);
      });

      return Array.from(merged.values());
    });
  };

  useEffect(() => {
    if (!isAuthReady) {
      return undefined;
    }

    if (!isAuthenticated) {
      stopRingtone();
      dismissedRequestIdsRef.current.clear();
      setQueue([]);
      setActionLoading(false);
      setActionError("");
      setRejectReason(DEFAULT_REJECT_REASON);
      setConnectionError("");

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      return undefined;
    }

    const token = user?.token;
    const socket = createAdminChatSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionError("");
      setSoundTick((value) => value + 1);
      console.log("[Socket] admin chat socket connected");
    });

    socket.on("disconnect", () => {
      console.log("[Socket] admin chat socket disconnected");
      stopRingtone();
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] connect_error", error);
      setConnectionError(
        error?.message || "Socket connection failed. Please refresh."
      );
    });

    socket.on("chat:request:new", (payload) => {
      const normalized = normalizeIncomingRequest(payload);

      if (!normalized.id) {
        return;
      }

      if (dismissedRequestIdsRef.current.has(normalized.id)) {
        return;
      }

      setQueue((previous) => {
        const exists = previous.find((item) => item.id === normalized.id);

        if (exists) {
          return previous.map((item) =>
            item.id === normalized.id ? { ...item, ...normalized } : item
          );
        }

        return [...previous, normalized];
      });
    });

    socket.on("chat:request:cancelled", (payload) => {
      const requestId = pickRequestId(payload);

      if (!requestId) {
        return;
      }

      setQueue((previous) => previous.filter((item) => item.id !== requestId));
    });

    socket.on("chat:request:expired", (payload) => {
      const requestId = pickRequestId(payload);

      if (!requestId) {
        return;
      }

      setQueue((previous) => previous.filter((item) => item.id !== requestId));
    });

    return () => {
      stopRingtone();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthReady, isAuthenticated, user?.token]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) {
      return undefined;
    }

    let cancelled = false;
    let refreshTimer = null;

    const loadPendingRequests = async () => {
      try {
        const data = await adminGet("chatAccessRequests", {
          params: { status: "pending" },
        });

        if (cancelled) {
          return;
        }

        upsertRequests(normalizeRequestList(data));
      } catch (error) {
        if (!cancelled) {
          console.warn("[ChatRequest] Failed to load pending requests", error);
        }
      }
    };

    loadPendingRequests();
    refreshTimer = setInterval(() => {
      loadPendingRequests();
    }, 5000);

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [isAuthReady, isAuthenticated, user?.token]);

  useEffect(() => {
    if (activeRequest) {
      startRingtone();
    } else {
      stopRingtone();
    }
  }, [activeRequest?.id, soundTick]);

  useEffect(() => {
    setRejectReason(DEFAULT_REJECT_REASON);
    setActionError("");
    setActionLoading(false);
  }, [activeRequest?.id]);

  const removeActiveRequest = () => {
    setQueue((previous) => previous.slice(1));
  };

  const dismissActiveRequest = () => {
    if (activeRequest?.id) {
      dismissedRequestIdsRef.current.add(activeRequest.id);
    }

    stopRingtone();
    removeActiveRequest();
  };

  const handleRequestCompleted = () => {
    if (activeRequest?.id) {
      dismissedRequestIdsRef.current.delete(activeRequest.id);
    }
    stopRingtone();
    removeActiveRequest();
  };

  const handleAccept = async () => {
    if (!activeRequest || actionLoading) {
      return;
    }

    setActionLoading(true);
    setActionError("");
    stopRingtone();

    try {
      const response = await adminApproveChatAccessRequest(activeRequest.id, {
        status: "approved",
        chatAccessStatus: "approved",
      });
      handleRequestCompleted();
      navigate("AdminHome", {
        screen: "ChatRequests",
        requestId: activeRequest.id,
      });

      return response;
    } catch (error) {
      console.error("[ChatRequest] accept failed", error);
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Request accept nahi ho paya."
      );
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest || actionLoading) {
      return;
    }

    const reason = rejectReason.trim() || DEFAULT_REJECT_REASON;

    setActionLoading(true);
    setActionError("");
    stopRingtone();

    try {
      const response = await adminRejectChatAccessRequest(activeRequest.id, {
        status: "rejected",
        chatAccessStatus: "rejected",
        reason,
      });
      handleRequestCompleted();
      return response;
    } catch (error) {
      console.error("[ChatRequest] reject failed", error);
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Request reject nahi ho paya."
      );
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      pendingRequestCount: queue.length,
      activeRequest,
      startTestRingtone: startRingtone,
      stopTestRingtone: stopRingtone,
    }),
    [activeRequest, queue.length]
  );

  return (
    <ChatRequestContext.Provider value={value}>
      {children}

      <Modal
        visible={Boolean(activeRequest)}
        transparent
        animationType="fade"
        onRequestClose={stopRingtone}
      >
        <View style={styles.overlay}>
          <View style={[styles.card, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Incoming Chat Request</Text>
                <Text style={styles.subtitle}>
                  {queue.length > 1
                    ? `${queue.length} requests queued`
                    : "New request waiting for admin action"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={dismissActiveRequest}
                accessibilityRole="button"
                accessibilityLabel="Dismiss incoming request"
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {connectionError ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                <Text style={styles.errorText}>{connectionError}</Text>
              </View>
            ) : null}

            {activeRequest ? (
              <>
                <View style={styles.profileRow}>
                  <RequestAvatar request={activeRequest} />

                  <View style={styles.profileTextWrap}>
                    <Text style={styles.nameText}>{activeRequest.name}</Text>
                    <Text style={styles.metaText}>{activeRequest.email}</Text>
                    <Text style={styles.metaText}>{activeRequest.phone}</Text>
                    <Text style={styles.metaText}>
                      Requested: {String(activeRequest.requestedAt || "N/A")}
                    </Text>
                  </View>
                </View>

                {activeRequest.reason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Request Note</Text>
                    <Text style={styles.reasonText}>
                      {activeRequest.reason}
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Reject Reason</Text>
                <TextInput
                  style={styles.input}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Not available right now"
                  placeholderTextColor="#8B7AA8"
                  editable={!actionLoading}
                  multiline
                />

                {actionError ? (
                  <Text style={styles.errorMessage}>{actionError}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={handleReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionText}>Reject</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={handleAccept}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {queue.length > 1 ? (
              <View style={styles.queueFooter}>
                <Ionicons name="albums-outline" size={16} color="#C4B5FD" />
                <Text style={styles.queueText}>
                  Next request will show automatically after this one is
                  handled.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </ChatRequestContext.Provider>
  );
}

export function useChatRequestContext() {
  return useContext(ChatRequestContext);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(3, 6, 24, 0.72)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#0E0826",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(196, 181, 253, 0.18)",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "#C4B5FD",
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: "#FDE68A",
    fontSize: 12,
    lineHeight: 18,
  },
  profileRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "#1F2937",
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "#312E81",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  profileTextWrap: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  metaText: {
    color: "#C4B5FD",
    fontSize: 12,
    lineHeight: 17,
  },
  reasonBox: {
    marginTop: 14,
    backgroundColor: "#151B2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2B3354",
    padding: 12,
  },
  reasonLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
  },
  reasonText: {
    color: "#E5E7EB",
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2B3354",
    backgroundColor: "#090515",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  errorMessage: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtn: {
    backgroundColor: "#047857",
  },
  rejectBtn: {
    backgroundColor: "#B91C1C",
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  queueFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  queueText: {
    flex: 1,
    color: "#E9D5FF",
    fontSize: 12,
    lineHeight: 18,
  },
});
