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
  KeyboardAvoidingView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "../components/SearchBar";
import AdminImage from "../components/AdminImage";
import { Colors } from "../../theme/colors";
import {
  adminGet,
  adminApproveChatAccessRequest,
  adminEndChatRoom,
  adminEndChatSession,
  adminGetChatRoomMessages,
  adminGetChatSessionMessages,
  adminRejectChatAccessRequest,
  adminUpdateChatSession,
  adminSendChatRoomMessage,
  adminSendChatSessionMessage,
  normalizeList,
  normalizeObject,
} from "../utils/adminApi";
import { resolveAssetUrl } from "../../api/api";
import { startRingtone, stopRingtone } from "../../services/ringtoneService";

const TABS = [
  { key: "sessions", label: "Sessions" },
  { key: "requests", label: "Requests" },
];

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function normalizeSession(item, fallbackIndex = 0) {
  return {
    id: item._id || item.id || `session-${fallbackIndex + 1}`,
    userId: item.user || item.userId || "",
    adminId: item.adminId || "",
    adminName: item.adminName || "N/A",
    chatroomId: item.chatroomId || "",
    hostId: item.hostId || "",
    status: String(item.status || "pending").toLowerCase(),
    requestedAt: item.requestedAt || "",
    rejectionReason: item.rejectionReason || "",
    freeMinutes: item.freeMinutes ?? 0,
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    approvedAt: item.approvedAt || "",
    startedAt: item.startedAt || "",
    lastMessageAt: item.lastMessageAt || "",
    rejectedAt: item.rejectedAt || "",
  };
}

function normalizeRequest(item, fallbackIndex = 0) {
  return {
    id: item._id || item.id || `request-${fallbackIndex + 1}`,
    name: item.name || "N/A",
    email: item.email || "N/A",
    phone: item.phone || "N/A",
    otpVerified: Boolean(item.otpVerified),
    status: String(
      item.chatAccessStatus || item.status || "pending"
    ).toLowerCase(),
    reason:
      item.chatAccessReason || item.reason || item.message || item.note || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    requestedAt: item.chatAccessRequestedAt || item.requestedAt || "",
  };
}

function normalizeMessage(item, fallbackIndex = 0) {
  const text = item?.text || item?.message || item?.content || item?.body || "";

  return {
    id: item._id || item.id || `message-${fallbackIndex + 1}`,
    sessionId: item.session || item.sessionId || "",
    chatroomId: item.chatroomId || "",
    senderRole: item.senderRole || "user",
    senderId: item.senderId || "",
    senderName: item.senderName || "N/A",
    type: item.type || "text",
    text,
    mediaUrl: item.mediaUrl || "",
    transcription: item.transcription || "",
    metadata: item.metadata || {},
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

function normalizeListFromResponse(data) {
  const source = normalizeObject(data);
  return normalizeList(source, [
    "requests",
    "sessions",
    "messages",
    "data",
    "items",
    "results",
  ]);
}

function getChatThreadDescriptor(session) {
  if (session?.chatroomId) {
    return {
      kind: "room",
      id: session.chatroomId,
    };
  }

  return {
    kind: "session",
    id: session?.id || "",
  };
}

function isThreadClosed(session) {
  const status = String(session?.status || "").toLowerCase();
  return ["ended", "closed", "completed", "rejected", "inactive"].includes(
    status
  );
}

function getPillStyle(status) {
  if (status === "approved" || status === "active") return "statusapproved";
  if (status === "rejected") return "statusrejected";
  return "statuspending";
}

function areSessionsEqual(previous, next) {
  if (!previous || !next) {
    return false;
  }

  return (
    previous.id === next.id &&
    previous.status === next.status &&
    previous.adminName === next.adminName &&
    previous.adminId === next.adminId &&
    previous.userId === next.userId &&
    previous.chatroomId === next.chatroomId &&
    previous.hostId === next.hostId &&
    previous.freeMinutes === next.freeMinutes &&
    previous.requestedAt === next.requestedAt &&
    previous.updatedAt === next.updatedAt &&
    previous.startedAt === next.startedAt &&
    previous.endedAt === next.endedAt &&
    previous.approvedAt === next.approvedAt &&
    previous.rejectedAt === next.rejectedAt
  );
}

function getAttachmentKind(file) {
  if (!file?.type) return "file";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function buildMessagePayload(thread, selectedSession, draftMessage, attachment) {
  const payload = new FormData();

  payload.append("sessionId", thread.kind === "session" ? thread.id : selectedSession.id);
  payload.append(
    "chatroomId",
    thread.kind === "room" ? thread.id : selectedSession.chatroomId || ""
  );
  payload.append("text", draftMessage);
  payload.append("message", draftMessage);
  payload.append("content", draftMessage);
  payload.append("body", draftMessage);
  payload.append("type", attachment ? attachment.kind : "text");
  payload.append("transcription", "");
  payload.append("metadata", JSON.stringify({}));
  payload.append("mediaUrl", "");

  if (attachment?.file) {
    const fieldName = attachment.kind === "image" ? "image" : "file";
    payload.append(fieldName, attachment.file);
  }

  return payload;
}

export default function ChatRequests() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1100;
  const mobileChatHeight = Math.min(
    560,
    Math.max(440, Math.round(height * 0.72))
  );
  const [activeTab, setActiveTab] = useState("sessions");
  const [search, setSearch] = useState("");

  const [sessions, setSessions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [requestsError, setRequestsError] = useState("");

  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [sessionMessagesLoading, setSessionMessagesLoading] = useState(false);
  const [sessionMessagesError, setSessionMessagesError] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [rejectReason, setRejectReason] = useState("Not available right now");
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [freeMinutesDraft, setFreeMinutesDraft] = useState(0);
  const [freeMinutesSaving, setFreeMinutesSaving] = useState(false);
  const [freeMinutesError, setFreeMinutesError] = useState("");
  const speechRecognitionRef = useRef(null);
  const selectedSessionRef = useRef(null);
  const freeMinutesSaveTimerRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const pageScrollRef = useRef(null);

  const scrollChatComposerIntoView = () => {
    if (isDesktop) {
      return;
    }

    setTimeout(() => {
      pageScrollRef.current?.scrollToEnd?.({ animated: true });
    }, 80);
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError("");

    try {
      const data = await adminGet("chatSessions", {
        params: { status: "all" },
      });
      const nextSessions =
        normalizeListFromResponse(data).map(normalizeSession);
      setSessions(nextSessions);
      return nextSessions;
    } catch (err) {
      setSessions([]);
      setSessionsError(
        err?.response?.data?.message ||
          err?.message ||
          "Chat sessions load nahi ho paye."
      );
      return [];
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const data = await adminGet("chatAccessRequests", {
        params: { status: "pending" },
      });

      setRequests(normalizeListFromResponse(data).map(normalizeRequest));
    } catch (err) {
      setRequests([]);
      setRequestsError(
        err?.response?.data?.message ||
          err?.message ||
          "Chat requests load nahi ho paye."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    loadRequests();
  }, []);

  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  useEffect(() => {
    return () => {
      if (freeMinutesSaveTimerRef.current) {
        clearTimeout(freeMinutesSaveTimerRef.current);
        freeMinutesSaveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setFreeMinutesDraft(selectedSession?.freeMinutes ?? 0);
    setFreeMinutesError("");
    setFreeMinutesSaving(false);

    if (freeMinutesSaveTimerRef.current) {
      clearTimeout(freeMinutesSaveTimerRef.current);
      freeMinutesSaveTimerRef.current = null;
    }
  }, [selectedSession?.id, selectedSession?.freeMinutes]);

  useEffect(() => {
    if (activeTab !== "sessions" || !selectedSession?.id) {
      return undefined;
    }

    const sessionTimer = setInterval(() => {
      refreshSelectedSession().catch(() => {});
    }, 10000);

    const listTimer = setInterval(() => {
      loadSessions().catch(() => {});
    }, 20000);

    return () => {
      clearInterval(sessionTimer);
      clearInterval(listTimer);
    };
  }, [activeTab, selectedSession?.id]);

  useEffect(() => {
    if (selectedSession?.id) {
      scrollChatComposerIntoView();
    }
  }, [selectedSession?.id, isDesktop]);

  useEffect(() => {
    if (activeTab !== "sessions" || !selectedSession?.id) {
      return;
    }

    const timer = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd?.({ animated: true });
    }, 60);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    selectedSession?.id,
    sessionMessages.length,
    sessionMessagesLoading,
  ]);

  const activeItems = activeTab === "sessions" ? sessions : requests;

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return activeItems;
    }

    return activeItems.filter((item) => {
      const values =
        activeTab === "sessions"
          ? [
              item.adminName,
              item.adminId,
              item.userId,
              item.status,
              item.rejectionReason,
            ]
          : [item.name, item.email, item.phone, item.reason, item.status];

      return values.join(" ").toLowerCase().includes(query);
    });
  }, [activeItems, activeTab, search]);

  const summary = useMemo(() => {
    return activeItems.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [activeItems]);

  const fetchSessionThread = async (session, options = {}) => {
    const {
      updateComposer = false,
      updateLoading = true,
      clearError = true,
    } = options;

    if (!session?.id) {
      return null;
    }

    if (updateLoading) {
      setSessionMessagesLoading(true);
    }

    if (clearError) {
      setSessionMessagesError("");
    }

    try {
      const thread = getChatThreadDescriptor(session);
      const data =
        thread.kind === "room"
          ? await adminGetChatRoomMessages(thread.id)
          : await adminGetChatSessionMessages(thread.id);
      const source = normalizeObject(data);
      const backendSession = normalizeSession(
        source.session || source.data?.session || session
      );
      const list = normalizeList(source, [
        "messages",
        "data",
        "items",
        "results",
      ]).map(normalizeMessage);

      setSelectedSession((previous) => {
        if (!previous) {
          return backendSession;
        }

        const mergedSession = {
          ...previous,
          ...backendSession,
        };

        return areSessionsEqual(previous, mergedSession)
          ? previous
          : mergedSession;
      });
      setSessionMessages((previous) => {
        const previousIds = previous.map((item) => item.id).join("|");
        const nextIds = list.map((item) => item.id).join("|");

        if (previousIds === nextIds) {
          return previous;
        }

        return list;
      });

      if (updateComposer) {
        setDraftMessage("");
        setAttachments([]);
      }

      return backendSession;
    } catch (err) {
      if (clearError) {
        setSessionMessages([]);
        setSessionMessagesError(
          err?.response?.data?.message ||
            err?.message ||
            "Session messages load nahi ho paye."
        );
      }

      return null;
    } finally {
      if (updateLoading) {
        setSessionMessagesLoading(false);
      }
    }
  };

  const openSession = async (session) => {
    setSelectedSession(session);
    setSessionMessages([]);
    setSessionMessagesError("");
    setDraftMessage("");
    setAttachments([]);

    return fetchSessionThread(session, {
      updateComposer: false,
      updateLoading: true,
      clearError: true,
    });
  };

  const refreshSelectedSession = async (
    session = selectedSessionRef.current
  ) => {
    if (!session?.id) {
      return null;
    }

    return fetchSessionThread(session, {
      updateComposer: false,
      updateLoading: false,
      clearError: false,
    });
  };

  const openAttachmentPicker = async (kind = "image") => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert(
        "Unsupported",
        "Image upload currently web par supported hai."
      );
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept =
      kind === "image"
        ? "image/*"
        : ".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.zip,.rar,*/*";

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        return;
      }

      const nextAttachments = files.map((file) => ({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        kind: getAttachmentKind(file),
        mimeType: file.type || "application/octet-stream",
        file,
      }));

      setAttachments((prev) => [...prev, ...nextAttachments]);
    };

    input.click();
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (error) {
        // Ignore stop errors from browsers that already ended recognition.
      }
      speechRecognitionRef.current = null;
    }

    setIsListening(false);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = getSpeechRecognitionCtor();

    if (!SpeechRecognition) {
      Alert.alert(
        "Unsupported",
        "Speech-to-text is only supported in browsers that expose Web Speech API."
      );
      return;
    }

    if (isListening) {
      stopSpeechRecognition();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";

      if (transcript) {
        setDraftMessage((prev) => {
          const next = prev.trim();
          return next ? `${next} ${transcript}` : transcript;
        });
      }
    };

    recognition.onerror = () => {
      stopSpeechRecognition();
      Alert.alert("Speech error", "Voice input could not be started.");
    };

    recognition.onend = () => {
      speechRecognitionRef.current = null;
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch (error) {
      stopSpeechRecognition();
      Alert.alert("Speech error", "Voice input start nahi ho paya.");
    }
  };

  const removeAttachment = (attachmentId) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const handleSendMessage = async () => {
    if (!selectedSession) {
      Alert.alert("Error", "Pehle koi session select karo.");
      return;
    }

    if (isThreadClosed(selectedSession)) {
      Alert.alert("Error", "This chat is already ended.");
      return;
    }

    const trimmed = draftMessage.trim();
    if (!trimmed && attachments.length === 0) {
      return;
    }

    const attachment = attachments[0] || null;
    const thread = getChatThreadDescriptor(selectedSession);
    const payload = attachment
      ? buildMessagePayload(thread, selectedSession, trimmed, attachment)
      : {
          sessionId: thread.kind === "session" ? thread.id : selectedSession.id,
          chatroomId:
            thread.kind === "room" ? thread.id : selectedSession.chatroomId,
          text: trimmed,
          message: trimmed,
          content: trimmed,
          body: trimmed,
          type: "text",
          mediaUrl: "",
          transcription: "",
          metadata: {},
        };

    setSending(true);
    try {
      stopSpeechRecognition();
      let response;
      if (thread.kind === "room") {
        response = await adminSendChatRoomMessage(thread.id, payload);
      } else {
        response = await adminSendChatSessionMessage(thread.id, payload);
      }

      const createdMessage = normalizeMessage(
        response?.data || response?.message || response
      );

      if (createdMessage?.id) {
        setSessionMessages((previous) => [...previous, createdMessage]);
      }

      setDraftMessage("");
      setAttachments([]);
      await refreshSelectedSession();
      await loadSessions();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Message send nahi ho paya."
      );
    } finally {
      setSending(false);
    }
  };

  const handleEndChat = async () => {
    if (!selectedSession) {
      return;
    }

    const thread = getChatThreadDescriptor(selectedSession);

    Alert.alert("End Chat", "Is chat ko end karna hai?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          try {
            setSending(true);
            const threadIdCandidates = [thread.id];

            if (thread.kind === "room" && selectedSession.id) {
              threadIdCandidates.push(selectedSession.id);
            }

            let endResponse = null;

            if (thread.kind === "room") {
              for (const threadId of threadIdCandidates) {
                try {
                  endResponse = await adminEndChatRoom(threadId);
                  break;
                } catch (error) {
                  if (error?.response?.status !== 404 && error?.response?.status !== 405) {
                    throw error;
                  }
                }
              }
            } else {
              for (const threadId of threadIdCandidates) {
                try {
                  endResponse = await adminEndChatSession(threadId);
                  break;
                } catch (error) {
                  if (error?.response?.status !== 404 && error?.response?.status !== 405) {
                    throw error;
                  }
                }
              }
            }

            const responseSession =
              endResponse?.session ||
              endResponse?.data?.session ||
              endResponse?.chatSession ||
              endResponse?.data?.chatSession ||
              endResponse ||
              null;

            const nextEndedSession = responseSession
              ? normalizeSession(responseSession)
              : {
                  ...selectedSession,
                  status: "ended",
                  endedAt: new Date().toISOString(),
                };

            const refreshedSessions = await loadSessions();
            const matchedSession =
              refreshedSessions.find((item) => item.id === nextEndedSession.id) ||
              refreshedSessions.find((item) => item.chatroomId === nextEndedSession.chatroomId) ||
              null;

            setSelectedSession(
              matchedSession
                ? {
                    ...matchedSession,
                    status: "ended",
                    endedAt:
                      matchedSession.endedAt ||
                      nextEndedSession.endedAt ||
                      new Date().toISOString(),
                  }
                : nextEndedSession
            );
            setSessionMessagesError("");
          } catch (err) {
            Alert.alert(
              "Error",
              err?.response?.data?.message ||
                err?.message ||
                "Chat end nahi ho paya."
            );
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) {
      return;
    }

    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert("Error", "Rejection reason required hai.");
      return;
    }

    setRejecting(true);
    try {
      await adminRejectChatAccessRequest(selectedRequest.id, { reason });
      Alert.alert("Success", "Chat access rejected");
      setSelectedRequest(null);
      await loadRequests();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Request reject nahi ho paya."
      );
    } finally {
      setRejecting(false);
    }
  };

  const handleApproveRequest = async (request = selectedRequest) => {
    if (!request) {
      return;
    }

    setApproving(true);
    try {
      const response = await adminApproveChatAccessRequest(request.id, {});
      const rawSession = response?.data?.session || response?.session || null;

      Alert.alert("Success", "Chat access approved");
      setSelectedRequest(null);
      setActiveTab("sessions");
      await loadRequests();
      const nextSessions = await loadSessions();

      if (rawSession?._id || rawSession?.id) {
        const approvedSessionId = rawSession._id || rawSession.id;
        const updatedSession =
          nextSessions.find((item) => item.id === approvedSessionId) ||
          normalizeSession(rawSession);

        if (updatedSession?.id) {
          setSelectedSession(updatedSession);
          await openSession(updatedSession);
        }
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ||
          err?.message ||
          "Request approve nahi ho paya."
      );
    } finally {
      setApproving(false);
    }
  };

  const saveFreeMinutes = async (sessionId, nextMinutes) => {
    if (!sessionId) {
      return;
    }

    setFreeMinutesSaving(true);
    setFreeMinutesError("");

    try {
      const response = await adminUpdateChatSession(sessionId, {
        freeMinutes: nextMinutes,
      });

      const payload = response?.session || response?.data?.session || response;
      const savedMinutes =
        payload?.freeMinutes ??
        payload?.free_minutes ??
        payload?.minutes ??
        nextMinutes;

      setSelectedSession((previous) =>
        previous
          ? {
              ...previous,
              freeMinutes: Number(savedMinutes) || 0,
            }
          : previous
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Free minutes save nahi ho paya.";
      setFreeMinutesError(message);
      setFreeMinutesDraft(selectedSessionRef.current?.freeMinutes ?? 0);
    } finally {
      setFreeMinutesSaving(false);
    }
  };

  const queueFreeMinutesSave = (nextMinutes) => {
    if (!selectedSession?.id) {
      return;
    }

    if (freeMinutesSaveTimerRef.current) {
      clearTimeout(freeMinutesSaveTimerRef.current);
    }

    freeMinutesSaveTimerRef.current = setTimeout(() => {
      saveFreeMinutes(selectedSession.id, nextMinutes);
    }, 600);
  };

  const adjustFreeMinutes = (delta) => {
    if (!selectedSession?.id || isThreadClosed(selectedSession)) {
      return;
    }

    const nextMinutes = Math.max(
      0,
      Number(freeMinutesDraft || 0) + Number(delta || 0)
    );

    setFreeMinutesDraft(nextMinutes);
    queueFreeMinutesSave(nextMinutes);
  };

  const renderMessages = () => {
    if (!selectedSession) {
      return (
        <View style={styles.emptyThread}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={34}
            color={Colors.primaryLight}
          />
          <Text style={styles.emptyThreadTitle}>Select a session</Text>
          <Text style={styles.emptyThreadText}>
            Left panel se koi session open karo aur chat start karo.
          </Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={styles.threadCardShell}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View
          style={[
            styles.threadCard,
            !isDesktop && { height: mobileChatHeight },
          ]}
        >
          <View style={styles.threadHeader}>
            <View>
              <Text style={styles.threadTitle}>
                {selectedSession.adminName}
              </Text>
              <Text style={styles.threadSub}>
                User ID: {selectedSession.userId || "N/A"} | Status:{" "}
                {selectedSession.status}
              </Text>
              <Text style={styles.threadSub}>
                Chat: {selectedSession.chatroomId || selectedSession.id}
              </Text>
            </View>

            <View style={styles.threadHeaderActions}>
              <View
                style={[
                  styles.statusPill,
                  styles[getPillStyle(selectedSession.status)],
                ]}
              >
                <Text style={styles.statusPillText}>
                  {selectedSession.status}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.endChatButton,
                  isThreadClosed(selectedSession) &&
                    styles.endChatButtonDisabled,
                ]}
                onPress={handleEndChat}
                disabled={isThreadClosed(selectedSession) || sending}
              >
                <Text style={styles.endChatText}>End Chat</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.detailStrip}>
            <Text style={styles.detailStripText}>
              Requested: {formatDate(selectedSession.requestedAt)}
            </Text>
            <View style={styles.freeMinutesWrap}>
              <Text style={styles.detailStripText}>
                Free minutes: {freeMinutesDraft}
              </Text>

              <View style={styles.freeMinutesControls}>
                <TouchableOpacity
                  style={[
                    styles.minuteBtn,
                    styles.minuteBtnMinus,
                    (freeMinutesSaving ||
                      isThreadClosed(selectedSession) ||
                      freeMinutesDraft <= 0) &&
                      styles.minuteBtnDisabled,
                  ]}
                  onPress={() => adjustFreeMinutes(-1)}
                  disabled={
                    freeMinutesSaving ||
                    isThreadClosed(selectedSession) ||
                    freeMinutesDraft <= 0
                  }
                >
                  <Text style={styles.minuteBtnText}>-</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.minuteBtn,
                    styles.minuteBtnPlus,
                    (freeMinutesSaving || isThreadClosed(selectedSession)) &&
                      styles.minuteBtnDisabled,
                  ]}
                  onPress={() => adjustFreeMinutes(1)}
                  disabled={freeMinutesSaving || isThreadClosed(selectedSession)}
                >
                  <Text style={styles.minuteBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {freeMinutesSaving ? (
                <Text style={styles.freeMinutesState}>Saving...</Text>
              ) : freeMinutesError ? (
                <Text style={styles.freeMinutesError}>
                  {freeMinutesError}
                </Text>
              ) : null}
            </View>

            <Text style={styles.detailStripText}>
              Host: {selectedSession.hostId || "N/A"}
            </Text>
          </View>

          <ScrollView
            ref={messagesScrollRef}
            style={[
              styles.messagesScroll,
              !isDesktop
                ? styles.messagesScrollMobile
                : styles.messagesScrollDesktop,
            ]}
            contentContainerStyle={styles.messagesList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {sessionMessagesLoading ? (
              <View style={styles.statusBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.statusText}>Messages loading...</Text>
              </View>
            ) : null}

            {sessionMessagesError ? (
              <View style={styles.statusBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={Colors.accent}
                />
                <Text style={styles.statusText}>{sessionMessagesError}</Text>
              </View>
            ) : null}

            {sessionMessages.length === 0 && !sessionMessagesLoading ? (
              <View style={styles.emptyThreadSmall}>
                <Text style={styles.emptyThreadTitle}>No messages yet</Text>
                <Text style={styles.emptyThreadText}>
                  Is session ke liye abhi koi message nahi mila.
                </Text>
              </View>
            ) : null}

            {sessionMessages.map((message) => {
              const isAdmin = message.senderRole === "admin";
              const isImage =
                message.type === "image" || Boolean(message.mediaUrl);

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    isAdmin ? styles.adminBubble : styles.userBubble,
                  ]}
                >
                  <Text style={styles.messageSender}>
                    {message.senderName} - {message.senderRole}
                  </Text>

                  {message.text ? (
                    <Text style={styles.messageText}>{message.text}</Text>
                  ) : null}

                  {isImage ? (
                    <AdminImage
                      uri={resolveAssetUrl(message.mediaUrl)}
                      style={styles.messageImage}
                      resizeMode="cover"
                      placeholderLabel="Image"
                    />
                  ) : null}

                  <Text style={styles.messageTime}>
                    {formatDate(message.createdAt)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.composer}>
            <View style={styles.composerTopRow}>
              <TouchableOpacity
                style={styles.composerIconBtn}
                onPress={() => openAttachmentPicker("image")}
              >
                <Ionicons name="image-outline" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.composerIconBtn}
                onPress={() => openAttachmentPicker("file")}
              >
                <Ionicons name="attach-outline" size={18} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.composerIconBtn,
                  isListening && styles.composerIconBtnActive,
                ]}
                onPress={startSpeechRecognition}
              >
                <Ionicons
                  name={isListening ? "mic" : "mic-outline"}
                  size={18}
                  color="#fff"
                />
              </TouchableOpacity>

              <View style={styles.composerInputWrap}>
              <TextInput
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#8B7AA8"
                  style={styles.composerInput}
                  multiline
                  onFocus={scrollChatComposerIntoView}
                />
              </View>
            </View>

            {attachments.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attachmentsRow}
              >
                {attachments.map((attachment) => (
                  <View key={attachment.id} style={styles.attachmentChip}>
                    <Text style={styles.attachmentChipText} numberOfLines={1}>
                      {attachment.kind === "image"
                        ? `Image: ${attachment.name}`
                        : attachment.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeAttachment(attachment.id)}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (sending || isThreadClosed(selectedSession)) &&
                  styles.sendBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={sending || isThreadClosed(selectedSession)}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendText}>
                {sending ? "Sending..." : "Send Message"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderList = () => {
    if (activeTab === "sessions") {
      return filteredItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No sessions found</Text>
          <Text style={styles.emptyText}>
            Try another filter or search term.
          </Text>
        </View>
      ) : (
        filteredItems.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={[
              styles.card,
              selectedSession?.id === session.id && styles.cardActive,
            ]}
            activeOpacity={0.9}
            onPress={() => openSession(session)}
          >
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{session.adminName}</Text>
                <Text style={styles.cardMeta}>
                  Admin: {session.adminId || "N/A"}
                </Text>
                <Text style={styles.cardMeta}>
                  User: {session.userId || "N/A"}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  styles[getPillStyle(session.status)],
                ]}
              >
                <Text style={styles.statusPillText}>{session.status}</Text>
              </View>
            </View>

            <Text style={styles.cardBody}>
              Free Minutes: {session.freeMinutes} | Requested:{" "}
              {formatDate(session.requestedAt)}
            </Text>
            <Text style={styles.cardHint}>Tap to open chat</Text>
          </TouchableOpacity>
        ))
      );
    }

    return filteredItems.length === 0 ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>No requests found</Text>
        <Text style={styles.emptyText}>Try another filter or search term.</Text>
      </View>
    ) : (
      filteredItems.map((request) => (
        <View key={request.id} style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{request.name}</Text>
              <Text style={styles.cardMeta}>{request.email}</Text>
              <Text style={styles.cardMeta}>{request.phone}</Text>
            </View>

            <View
              style={[styles.statusPill, styles[getPillStyle(request.status)]]}
            >
              <Text style={styles.statusPillText}>{request.status}</Text>
            </View>
          </View>

          <Text style={styles.cardBody}>
            {request.reason || "No reason shared"} | OTP Verified:{" "}
            {request.otpVerified ? "Yes" : "No"}
          </Text>

          <View style={styles.requestActionRow}>
            <TouchableOpacity
              style={[styles.requestActionBtn, styles.requestAcceptBtn]}
              onPress={(event) => {
                event?.stopPropagation?.();
                handleApproveRequest(request);
              }}
              disabled={approving || rejecting}
            >
              <Text style={styles.requestActionText}>
                {approving ? "Accepting..." : "Accept"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.requestActionBtn, styles.requestDetailsBtn]}
              onPress={(event) => {
                event?.stopPropagation?.();
                setSelectedRequest(request);
                setRejectReason("Not available right now");
              }}
              disabled={approving || rejecting}
            >
              <Text style={styles.requestActionText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))
    );
  };

  return (
    <ScrollView
      ref={pageScrollRef}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[
        styles.pageScrollContent,
        !isDesktop && styles.pageScrollContentMobile,
      ]}
    >
      <View style={styles.headerBox}>
        <Text style={styles.title}>Chat Center</Text>
        <Text style={styles.subtitle}>
          Proper chat page with session list, request rejection, messages and
          image sending
        </Text>
        {__DEV__ ? (
          <View style={styles.devToolsRow}>
            <TouchableOpacity style={styles.devToolBtn} onPress={startRingtone}>
              <Text style={styles.devToolText}>Start Test Ringtone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devToolBtnAlt}
              onPress={stopRingtone}
            >
              <Text style={styles.devToolText}>Stop Test Ringtone</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.approved}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.rejected}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={`Search ${activeTab}...`}
      />

      {(activeTab === "sessions" ? sessionsLoading : requestsLoading) ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.statusText}>Loading {activeTab}...</Text>
        </View>
      ) : null}

      {(activeTab === "sessions" ? sessionsError : requestsError) ? (
        <View style={styles.statusBox}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={Colors.accent}
          />
          <Text style={styles.statusText}>
            {activeTab === "sessions" ? sessionsError : requestsError}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.mainGrid,
          { flexDirection: isDesktop ? "row" : "column" },
        ]}
      >
        <View style={[styles.listPane, { width: isDesktop ? 380 : "100%" }]}>
          <Text style={styles.sectionTitle}>
            {activeTab === "sessions" ? "Sessions" : "Requests"}
          </Text>
          {renderList()}
        </View>

        <View style={[styles.chatPane, !isDesktop && styles.chatPaneMobile]}>
          {activeTab === "sessions" ? renderMessages() : null}

          {activeTab === "requests" ? (
            <View style={styles.requestHintCard}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={Colors.primaryLight}
              />
              <Text style={styles.requestHintText}>
                Kisi request ko tap karke reject modal open karo. Session start
                hone ke baad wo chat panel me dikhega.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Modal
        visible={Boolean(selectedRequest)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedRequest ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Reject Request</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedRequest.name} | {selectedRequest.status}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedRequest(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Request Info</Text>
                  <Text style={styles.detailText}>{selectedRequest.email}</Text>
                  <Text style={styles.detailMeta}>
                    Phone: {selectedRequest.phone}
                  </Text>
                  <Text style={styles.detailMeta}>
                    Requested At: {formatDate(selectedRequest.requestedAt)}
                  </Text>
                  <Text style={styles.detailMeta}>
                    Created At: {formatDate(selectedRequest.createdAt)}
                  </Text>
                  <Text style={styles.detailMeta}>
                    Updated At: {formatDate(selectedRequest.updatedAt)}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApproveRequest()}
                    disabled={approving || rejecting}
                  >
                    <Text style={styles.actionBtnText}>
                      {approving ? "Approving..." : "Approve"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={handleRejectRequest}
                    disabled={rejecting || approving}
                  >
                    <Text style={styles.actionBtnText}>
                      {rejecting ? "Rejecting..." : "Reject"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Rejection Reason</Text>
                <TextInput
                  style={styles.rejectInput}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Not available right now"
                  placeholderTextColor="#8B7AA8"
                  multiline
                  editable={!approving && !rejecting}
                />

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.closeActionBtn,
                    { marginTop: 12 },
                  ]}
                  onPress={() => setSelectedRequest(null)}
                  disabled={rejecting || approving}
                >
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageScrollContent: {
    paddingBottom: 24,
  },
  pageScrollContentMobile: {
    paddingBottom: 220,
  },
  headerBox: {
    backgroundColor: "#151B2E",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#242B45",
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  subtitle: {
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
  },
  devToolsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  devToolBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
  },
  devToolBtnAlt: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#394261",
    justifyContent: "center",
    alignItems: "center",
  },
  devToolText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  tabBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#151B2E",
    borderWidth: 1,
    borderColor: "#242B45",
    justifyContent: "center",
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: "#D1D5DB",
    fontWeight: "800",
    fontSize: 12,
  },
  tabTextActive: {
    color: "#fff",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  summaryCard: {
    width: "23%",
    minWidth: 108,
    backgroundColor: "#151B2E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242B45",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  summaryLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
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
  mainGrid: {
    gap: 14,
    alignItems: "flex-start",
  },
  listPane: {
    flexGrow: 0,
  },
  chatPane: {
    flex: 1,
    minHeight: 420,
  },
  chatPaneMobile: {
    width: "100%",
  },
  threadCardShell: {
    width: "100%",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: "#151B2E",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
  },
  card: {
    backgroundColor: "#151B2E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    marginBottom: 10,
  },
  cardActive: {
    borderColor: Colors.primary,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },
  cardMeta: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 1,
  },
  cardBody: {
    color: "#E5E7EB",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  cardHint: {
    color: Colors.primaryLight,
    fontSize: 11,
    marginTop: 8,
  },
  requestActionRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  requestActionBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  requestAcceptBtn: {
    backgroundColor: "#047857",
  },
  requestDetailsBtn: {
    backgroundColor: "#232B47",
    borderWidth: 1,
    borderColor: "#394261",
  },
  requestActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statuspending: {
    backgroundColor: "#D97706",
  },
  statusapproved: {
    backgroundColor: "#059669",
  },
  statusrejected: {
    backgroundColor: "#DC2626",
  },
  threadCard: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    minHeight: 420,
    overflow: "hidden",
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  threadHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  threadTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  threadSub: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 3,
  },
  detailStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#242B45",
  },
  detailStripText: {
    color: Colors.primaryLight,
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  freeMinutesWrap: {
    flex: 1.15,
    minWidth: 210,
    gap: 8,
  },
  freeMinutesControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  minuteBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  minuteBtnPlus: {
    backgroundColor: "#0F766E",
    borderColor: "#14B8A6",
  },
  minuteBtnMinus: {
    backgroundColor: "#3B82F6",
    borderColor: "#60A5FA",
  },
  minuteBtnDisabled: {
    opacity: 0.45,
  },
  minuteBtnText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "900",
  },
  freeMinutesState: {
    color: "#93C5FD",
    fontSize: 10,
    fontWeight: "700",
  },
  freeMinutesError: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "700",
  },
  endChatButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#B91C1C",
    justifyContent: "center",
    alignItems: "center",
  },
  endChatButtonDisabled: {
    opacity: 0.55,
  },
  endChatText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  messagesScroll: {
    marginTop: 12,
    minHeight: 0,
  },
  messagesScrollDesktop: {
    maxHeight: 360,
  },
  messagesScrollMobile: {
    flex: 1,
  },
  messagesList: {
    gap: 8,
    paddingBottom: 8,
  },
  emptyThread: {
    backgroundColor: "#151B2E",
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: "#242B45",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 420,
  },
  emptyThreadSmall: {
    backgroundColor: "#101728",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#242B45",
  },
  emptyThreadTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyThreadText: {
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  messageBubble: {
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    alignSelf: "flex-start",
  },
  adminBubble: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    alignSelf: "flex-end",
  },
  messageSender: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 5,
  },
  messageText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 18,
  },
  messageImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: "#0B1020",
  },
  messageTime: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    marginTop: 5,
    textAlign: "right",
  },
  composer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#242B45",
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },
  composerTopRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    flexShrink: 0,
  },
  composerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#232B47",
    justifyContent: "center",
    alignItems: "center",
  },
  composerIconBtnActive: {
    backgroundColor: Colors.primary,
  },
  composerInputWrap: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#0B1020",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composerInput: {
    minHeight: 40,
    maxHeight: 100,
    color: "#fff",
    padding: 0,
    fontSize: 13,
  },
  attachmentsRow: {
    gap: 8,
    marginTop: 10,
  },
  attachmentChip: {
    minWidth: 140,
    maxWidth: 220,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#232B47",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  attachmentChipText: {
    color: "#fff",
    flex: 1,
    fontSize: 11,
  },
  sendBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.75,
  },
  sendText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },
  requestHintCard: {
    backgroundColor: "#151B2E",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#242B45",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 120,
  },
  requestHintText: {
    color: "#D1D5DB",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0E0826",
    borderRadius: 20,
    padding: 14,
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    lineHeight: 17,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  detailBox: {
    backgroundColor: "#151B2E",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#242B45",
  },
  detailLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 6,
    fontWeight: "800",
  },
  detailText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "900",
  },
  detailMeta: {
    color: Colors.primaryLight,
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
  },
  label: {
    color: "#D8B4FE",
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 10,
    fontSize: 12,
  },
  rejectInput: {
    minHeight: 72,
    color: "#fff",
    backgroundColor: "#0B1020",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2B3354",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: {
    backgroundColor: "#B91C1C",
  },
  approveBtn: {
    backgroundColor: "#047857",
  },
  closeActionBtn: {
    backgroundColor: Colors.primary,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
});
