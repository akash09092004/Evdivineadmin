import API from "../../api/api.js";

const ENDPOINTS = {
  authLogin: ["/admin/auth/login"],
  dashboard: ["/admin/dashboard"],
  users: ["/admin/users"],
  userCredits: ["/admin/user-credits", "/admin/users/credits"],
  refundTransactions: [
    "/admin/refund-transactions",
    "/admin/refunds/transactions",
  ],
  refundAmounts: ["/admin/refund-amounts", "/admin/refunds/amounts"],
  refunds: ["/admin/refunds"],
  subscribers: ["/admin/subscribers"],
  closeRequests: ["/admin/close-requests", "/admin/refunds/close-requests"],
  historyNotes: ["/admin/history-notes", "/admin/notes/history"],
  dropMessages: ["/admin/drop-messages", "/admin/messages/drop"],
  chatRequests: ["/admin/chat-requests", "/admin/chat/requests"],
  chatAccessRequests: ["/admin/chat-access-requests"],
  chatSessions: ["/admin/chat/sessions"],
  chatMessages: ["/admin/chat-messages", "/admin/chat/messages"],
  profile: ["/admin/auth/profile", "/admin/profile", "/admin/auth/me"],
  coupons: ["/admin/coupons"],
  banners: ["/admin/banners", "/admin/banner"],
  blogCategories: ["/admin/blog-categories"],
  rashis: ["/admin/rashis", "/admin/rashi"],
  rechargePlans: ["/admin/recharge-plans"],
  slotPlans: ["/admin/slot-plans"],
  availability: ["/admin/availability"],
  leaves: ["/admin/leaves"],
  blockedTimes: ["/admin/blocked-times"],
  bookings: ["/admin/bookings"],
  upcomingBookings: ["/admin/bookings/upcoming"],
  bonusesConfig: ["/admin/bonuses/config"],
  pageContent: ["/admin/page-content", "/admin/content/pages"],
  changePassword: ["/admin/auth/change-password", "/admin/change-password"],
  logout: ["/admin/auth/logout", "/admin/logout"],
};

function getEndpointList(key) {
  const envKey = `EXPO_PUBLIC_ADMIN_${key.toUpperCase()}_ENDPOINT`;
  const envValue = process.env[envKey];

  if (envValue) {
    return [envValue];
  }

  return ENDPOINTS[key] || [];
}

async function runWithFallback(method, key, payload, config = {}) {
  const endpoints = getEndpointList(key);
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await API.request({
        url: endpoint,
        method,
        data: payload,
        ...config,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function requestWithEndpointFallback(
  method,
  endpoints,
  payload,
  config = {}
) {
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await API.request({
        url: endpoint,
        method,
        data: payload,
        ...config,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      if (error?.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function requestWithMethodsAndEndpoints(
  methods,
  endpoints,
  payload,
  config = {}
) {
  let lastError = null;

  for (const method of methods) {
    for (const endpoint of endpoints) {
      try {
        const response = await API.request({
          url: endpoint,
          method,
          data: payload,
          ...config,
        });

        return response.data;
      } catch (error) {
        lastError = error;

        if (
          error?.response?.status !== 404 &&
          error?.response?.status !== 405
        ) {
          throw error;
        }
      }
    }
  }

  throw lastError;
}

export function normalizeAuthPayload(data) {
  if (!data || typeof data !== "object") {
    return {
      token: null,
      refreshToken: null,
      user: null,
      admin: null,
      raw: data || null,
    };
  }

  const body =
    data.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : data;
  const user = body.user || body.admin || data.user || data.admin || null;

  return {
    token: body.token || data.token || null,
    refreshToken: body.refreshToken || data.refreshToken || null,
    user,
    admin: body.admin || data.admin || null,
    raw: data,
  };
}

export function normalizeList(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.list)) return data.list;

  return [];
}

export function normalizeObject(data) {
  if (data && typeof data === "object") {
    if (
      data.data &&
      typeof data.data === "object" &&
      !Array.isArray(data.data)
    ) {
      return data.data;
    }

    if (
      data.result &&
      typeof data.result === "object" &&
      !Array.isArray(data.result)
    ) {
      return data.result;
    }
  }

  return data || {};
}

export function normalizeDashboardStats(data) {
  const source = normalizeObject(data);
  const stats = normalizeList(source, ["stats", "summary", "cards"]);

  if (stats.length > 0) {
    return stats;
  }

  return [
    {
      key: "registeredUsers",
      title: "Registered Users",
      value: source.registeredUsers ?? source.users ?? 0,
    },
    {
      key: "totalBookings",
      title: "Total Bookings",
      value: source.totalBookings ?? source.bookings ?? 0,
    },
    {
      key: "refundRequests",
      title: "Refund Requests",
      value: source.refundRequests ?? source.refunds ?? 0,
    },
    {
      key: "subscribers",
      title: "Subscribers",
      value: source.subscribers ?? source.totalSubscribers ?? 0,
    },
  ];
}

export async function adminGet(key, config = {}) {
  return runWithFallback("get", key, undefined, config);
}

export async function adminGetUserCredits(config = {}) {
  const response = await API.request({
    url: "/admin/user-credits",
    method: "get",
    ...config,
  });

  return response.data;
}

export async function adminPost(key, payload, config = {}) {
  return runWithFallback("post", key, payload, config);
}

export async function adminPut(key, payload, config = {}) {
  return runWithFallback("put", key, payload, config);
}

export async function adminPatch(key, payload, config = {}) {
  return runWithFallback("patch", key, payload, config);
}

export async function adminDelete(key, config = {}) {
  return runWithFallback("delete", key, undefined, config);
}

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function rethrowApiError(error, fallback) {
  const message = getApiErrorMessage(error, fallback);
  const wrapped = new Error(message);
  wrapped.response = error?.response;
  wrapped.status = error?.response?.status;
  wrapped.originalError = error;
  throw wrapped;
}

function getRefundTransactionEndpoints(id) {
  return [
    `/admin/refund-transactions/${id}`,
    `/admin/refunds/transactions/${id}`,
  ];
}

function getRefundTransactionActionEndpoints(id, action) {
  return [
    `/admin/refund-transactions/${id}/${action}`,
    `/admin/refunds/transactions/${id}/${action}`,
  ];
}

export async function adminGetRefundTransaction(id, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["get"],
    getRefundTransactionEndpoints(id),
    undefined,
    config
  );
}

export async function adminApproveRefundTransaction(
  id,
  payload = {},
  config = {}
) {
  return requestWithMethodsAndEndpoints(
    ["put", "patch", "post"],
    getRefundTransactionActionEndpoints(id, "approve"),
    payload,
    config
  );
}

export async function adminRejectRefundTransaction(
  id,
  payload = {},
  config = {}
) {
  return requestWithMethodsAndEndpoints(
    ["put", "patch", "post"],
    getRefundTransactionActionEndpoints(id, "reject"),
    payload,
    config
  );
}

export async function adminGetRefunds(config = {}) {
  return runWithFallback("get", "refunds", undefined, config);
}

export async function adminCreateRefund(payload, config = {}) {
  return runWithFallback("post", "refunds", payload, config);
}

export async function adminPutRefund(refundId, payload, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["put", "patch", "post"],
    [
      `/admin/refunds/${refundId}`,
      `/admin/refunds/${refundId}/update`,
      `/admin/refund-amounts/${refundId}`,
    ],
    payload,
    config
  );
}

export async function adminDeleteRefund(refundId, config = {}) {
  try {
    const response = await API.request({
      url: `/admin/refunds/${refundId}`,
      method: "delete",
      ...config,
    });

    return response.data;
  } catch (error) {
    if (
      error?.response?.status &&
      error.response.status !== 404 &&
      error.response.status !== 405
    ) {
      rethrowApiError(error, "Refund delete nahi ho paya.");
    }

    try {
      return await requestWithMethodsAndEndpoints(
        ["delete", "post", "patch"],
        [
          `/admin/refunds/${refundId}/delete`,
          `/admin/refund-amounts/${refundId}`,
          `/admin/refund-amounts/${refundId}/delete`,
        ],
        undefined,
        config
      );
    } catch (fallbackError) {
      rethrowApiError(fallbackError, "Refund delete nahi ho paya.");
    }
  }
}

export async function adminLogin(payload, config = {}) {
  const response = await runWithFallback("post", "authLogin", payload, {
    ...config,
    skipAuth: true,
  });
  return normalizeAuthPayload(response);
}

export async function adminRejectChatAccessRequest(id, payload, config = {}) {
  const requestBody = {
    id,
    requestId: id,
    chatAccessRequestId: id,
    chatRequestId: id,
    status: "rejected",
    chatAccessStatus: "rejected",
    action: "reject",
    ...payload,
  };

  const actionPayload = {
    ...requestBody,
    data: requestBody,
    request: requestBody,
  };

  return requestWithMethodsAndEndpoints(
    ["patch", "put", "post"],
    [
      `/admin/chat-requests/${id}`,
      `/admin/chat-requests/${id}/reject`,
      `/admin/chat-requests/${id}/decline`,
      `/admin/chat-requests/${id}/status/reject`,
      `/admin/chat-requests/reject/${id}`,
      `/admin/chat-requests/status/reject/${id}`,
      `/admin/chat-requests/reject/status/${id}`,
      `/admin/chat-access-requests/${id}`,
      `/admin/chat-access-requests/${id}/reject`,
      `/admin/chat-access-requests/${id}/decline`,
      `/admin/chat-access-requests/${id}/status/reject`,
      `/admin/chat-access-requests/reject/${id}`,
      `/admin/chat-access-requests/status/reject/${id}`,
      `/admin/chat-access-requests/reject/status/${id}`,
      "/admin/chat-requests/reject",
      "/admin/chat-requests/decline",
      "/admin/chat-requests/status/reject",
      "/admin/chat-access-requests/reject",
      "/admin/chat-access-requests/decline",
      "/admin/chat-access-requests/status/reject",
    ],
    actionPayload,
    config
  );
}

export async function adminApproveChatAccessRequest(id, payload, config = {}) {
  const requestBody = {
    id,
    requestId: id,
    chatAccessRequestId: id,
    chatRequestId: id,
    status: "approved",
    chatAccessStatus: "approved",
    action: "approve",
    ...payload,
  };

  const actionPayload = {
    ...requestBody,
    data: requestBody,
    request: requestBody,
  };

  return requestWithMethodsAndEndpoints(
    ["patch", "put", "post"],
    [
      `/admin/chat-requests/${id}`,
      `/admin/chat-requests/${id}/approve`,
      `/admin/chat-requests/${id}/accept`,
      `/admin/chat-requests/${id}/status/approve`,
      `/admin/chat-requests/approve/${id}`,
      `/admin/chat-requests/status/approve/${id}`,
      `/admin/chat-requests/approve/status/${id}`,
      `/admin/chat-access-requests/${id}`,
      `/admin/chat-access-requests/${id}/approve`,
      `/admin/chat-access-requests/${id}/accept`,
      `/admin/chat-access-requests/${id}/status/approve`,
      `/admin/chat-access-requests/approve/${id}`,
      `/admin/chat-access-requests/status/approve/${id}`,
      `/admin/chat-access-requests/approve/status/${id}`,
      "/admin/chat-requests/approve",
      "/admin/chat-requests/accept",
      "/admin/chat-requests/status/approve",
      "/admin/chat-access-requests/approve",
      "/admin/chat-access-requests/accept",
      "/admin/chat-access-requests/status/approve",
    ],
    actionPayload,
    config
  );
}

async function getChatMessagesByPath(path, id, config = {}) {
  return API.request({
    url: `${path}/${id}/messages`,
    method: "get",
    ...config,
  }).then((response) => response.data);
}

async function sendChatMessageByPath(path, id, payload, config = {}) {
  return API.request({
    url: `${path}/${id}/messages`,
    method: "post",
    data: payload,
    ...config,
  }).then((response) => response.data);
}

async function endChatThreadByPath(path, id, config = {}) {
  return API.request({
    url: `${path}/${id}/end`,
    method: "patch",
    ...config,
  }).then((response) => response.data);
}

export async function adminGetChatSessionMessages(sessionId, config = {}) {
  return getChatMessagesByPath("/admin/chat/sessions", sessionId, config);
}

export async function adminGetChatRoomMessages(chatroomId, config = {}) {
  return getChatMessagesByPath("/admin/chat/rooms", chatroomId, config);
}

export async function adminSendChatSessionMessage(
  sessionId,
  payload,
  config = {}
) {
  return sendChatMessageByPath(
    "/admin/chat/sessions",
    sessionId,
    payload,
    config
  );
}

export async function adminSendChatRoomMessage(
  chatroomId,
  payload,
  config = {}
) {
  return sendChatMessageByPath(
    "/admin/chat/rooms",
    chatroomId,
    payload,
    config
  );
}

export async function adminEndChatSession(sessionId, config = {}) {
  return endChatThreadByPath("/admin/chat/sessions", sessionId, config);
}

export async function adminEndChatRoom(chatroomId, config = {}) {
  return endChatThreadByPath("/admin/chat/rooms", chatroomId, config);
}

export async function adminUpdateChatSession(sessionId, payload, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["patch", "put", "post"],
    [
      `/admin/chat/sessions/${sessionId}`,
      `/admin/chat/sessions/${sessionId}/update`,
      `/admin/chat/sessions/${sessionId}/edit`,
    ],
    payload,
    config
  );
}

export async function userRequestChat(payload = {}, config = {}) {
  return API.request({
    url: "/users/chat/request",
    method: "post",
    data: payload,
    ...config,
  }).then((response) => response.data);
}

export async function userGetChatSessionMessages(sessionId, config = {}) {
  return getChatMessagesByPath("/users/chat/sessions", sessionId, config);
}

export async function userGetChatRoomMessages(chatroomId, config = {}) {
  return getChatMessagesByPath("/users/chat/rooms", chatroomId, config);
}

export async function userSendChatSessionMessage(
  sessionId,
  payload,
  config = {}
) {
  return sendChatMessageByPath(
    "/users/chat/sessions",
    sessionId,
    payload,
    config
  );
}

export async function userSendChatRoomMessage(
  chatroomId,
  payload,
  config = {}
) {
  return sendChatMessageByPath(
    "/users/chat/rooms",
    chatroomId,
    payload,
    config
  );
}

export async function userEndChatSession(sessionId, config = {}) {
  return endChatThreadByPath("/users/chat/sessions", sessionId, config);
}

export async function userEndChatRoom(chatroomId, config = {}) {
  return endChatThreadByPath("/users/chat/rooms", chatroomId, config);
}

async function requestAdminUserAction(path, payload, config = {}) {
  const response = await API.request({
    url: path,
    method: "patch",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function adminSetUserStatus(userId, isActive, config = {}) {
  const payload = {
    isActive,
    active: isActive,
    isBlocked: !isActive,
    status: isActive ? "active" : "inactive",
  };

  return requestAdminUserAction(`/admin/users/${userId}/status`, payload, config);
}

export async function adminSetUserVerification(
  userId,
  isVerified,
  config = {}
) {
  const payload = {
    isVerified,
    verified: isVerified,
    otpVerified: isVerified,
    status: isVerified ? "verified" : "unverified",
  };

  return requestAdminUserAction(
    `/admin/users/${userId}/verification`,
    payload,
    config
  );
}

export async function adminSetUserBlock(userId, isBlocked, config = {}) {
  const payload = {
    isBlocked,
    blocked: isBlocked,
    status: isBlocked ? "blocked" : "active",
  };

  return requestAdminUserAction(`/admin/users/${userId}/block`, payload, config);
}

export async function adminDeleteUser(userId, config = {}) {
  const response = await API.request({
    url: `/admin/users/${userId}`,
    method: "delete",
    ...config,
  });

  return response.data;
}

export async function adminAddUserCredit(payload, config = {}) {
  const response = await API.request({
    url: "/admin/user-credits",
    method: "post",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function adminSendBulkEmail(payload, config = {}) {
  const endpoint =
    process.env.EXPO_PUBLIC_ADMIN_BULK_EMAIL_ENDPOINT ||
    process.env.EXPO_PUBLIC_ADMIN_NEWSLETTER_ENDPOINT ||
    "";

  if (!endpoint) {
    throw new Error(
      "Bulk email endpoint missing. Set EXPO_PUBLIC_ADMIN_BULK_EMAIL_ENDPOINT."
    );
  }

  const response = await API.request({
    url: endpoint,
    method: "post",
    data: payload,
    ...config,
  });

  return response.data;
}

export async function adminSaveBanner(payload, config = {}) {
  return runWithFallback("post", "banners", payload, config);
}

export async function adminUpdateBanner(bannerId, payload, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["put", "patch", "post"],
    [
      `/admin/banners/${bannerId}`,
      `/admin/banner/${bannerId}`,
      `/admin/banners/${bannerId}/update`,
    ],
    payload,
    config
  );
}

export async function adminPutBanner(bannerId, payload, config = {}) {
  return API.request({
    url: `/admin/banners/${bannerId}`,
    method: "put",
    data: payload,
    ...config,
  }).then((response) => response.data);
}

export async function adminDeleteBanner(bannerId, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["delete", "post", "patch"],
    [
      `/admin/banners/${bannerId}`,
      `/admin/banner/${bannerId}`,
      `/admin/banners/${bannerId}/delete`,
    ],
    undefined,
    config
  );
}

export async function adminUpdateSlotPlan(slotPlanId, payload, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["patch", "put", "post"],
    [
      `/admin/slot-plans/${slotPlanId}`,
      `/admin/slot-plans/${slotPlanId}/update`,
      `/admin/slot-plans/${slotPlanId}/edit`,
    ],
    payload,
    config
  );
}

export async function adminDeleteSlotPlan(slotPlanId, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["delete", "post", "patch"],
    [
      `/admin/slot-plans/${slotPlanId}`,
      `/admin/slot-plans/${slotPlanId}/delete`,
      `/admin/slot-plans/${slotPlanId}/remove`,
    ],
    undefined,
    config
  );
}

export async function adminSetSlotPlanStatus(slotPlanId, isActive, config = {}) {
  const payload = {
    isActive,
    active: isActive,
    status: isActive ? "active" : "inactive",
  };

  return requestWithMethodsAndEndpoints(
    ["patch", "put", "post"],
    [
      `/admin/slot-plans/${slotPlanId}/status`,
      `/admin/slot-plans/status/${slotPlanId}`,
      `/admin/slot-plans/${slotPlanId}/active`,
    ],
    payload,
    config
  );
}

export async function adminGetAvailability(config = {}) {
  return runWithFallback("get", "availability", undefined, config);
}

export async function adminCreateAvailability(payload, config = {}) {
  return runWithFallback("post", "availability", payload, config);
}

export async function adminUpdateAvailability(id, payload, config = {}) {
  return requestWithMethodsAndEndpoints(
    ["patch", "put", "post"],
    [
      `/admin/availability/${id}`,
      `/admin/availability/${id}/update`,
      `/admin/availability/${id}/edit`,
    ],
    payload,
    config
  );
}

export async function adminGetLeaves(config = {}) {
  return runWithFallback("get", "leaves", undefined, config);
}

export async function adminCreateLeave(payload, config = {}) {
  return runWithFallback("post", "leaves", payload, config);
}

export async function adminGetBlockedTimes(config = {}) {
  return runWithFallback("get", "blockedTimes", undefined, config);
}

export async function adminCreateBlockedTime(payload, config = {}) {
  return runWithFallback("post", "blockedTimes", payload, config);
}

export async function adminGetBookings(config = {}) {
  return runWithFallback("get", "bookings", undefined, config);
}

export async function adminGetUpcomingBookings(config = {}) {
  return runWithFallback("get", "upcomingBookings", undefined, config);
}

export async function adminSetBannerActive(bannerId, isActive, config = {}) {
  const payload = {
    isActive,
    active: isActive,
    status: isActive ? "active" : "inactive",
  };

  try {
    return await requestWithMethodsAndEndpoints(
      ["patch", "put", "post"],
      [
        `/admin/banners/${bannerId}/status`,
        `/admin/banners/${bannerId}/active`,
        `/admin/banner/${bannerId}/status`,
      ],
      payload,
      config
    );
  } catch (error) {
    return adminUpdateBanner(bannerId, payload, config);
  }
}

export async function adminSetBlogCategoryActive(categoryId, isActive, config = {}) {
  const response = await API.request({
    url: `/admin/blog-categories/${categoryId}/status`,
    method: "patch",
    data: {
      isActive,
      active: isActive,
      status: isActive ? "active" : "inactive",
    },
    ...config,
  });

  return response.data;
}

export async function adminSaveRashi(payload, config = {}) {
  return runWithFallback("post", "rashis", payload, config);
}

export async function adminPutRashi(rashiId, payload, config = {}) {
  return API.request({
    url: `/admin/rashis/${rashiId}`,
    method: "put",
    data: payload,
    ...config,
  }).then((response) => response.data);
}

export async function adminDeleteRashi(rashiId, config = {}) {
  try {
    return await API.request({
      url: `/admin/rashis/${rashiId}`,
      method: "delete",
      ...config,
    }).then((response) => response.data);
  } catch (error) {
    return requestWithMethodsAndEndpoints(
      ["delete", "post", "patch"],
      [
        `/admin/rashis/${rashiId}`,
        `/admin/rashi/${rashiId}`,
        `/admin/rashis/${rashiId}/delete`,
      ],
      undefined,
      config
    );
  }
}

export async function adminSetRashiActive(rashiId, isActive, config = {}) {
  const payload = {
    isActive,
    active: isActive,
    status: isActive ? "active" : "inactive",
  };

  try {
    return await API.request({
      url: `/admin/rashis/${rashiId}`,
      method: "put",
      data: payload,
      ...config,
    }).then((response) => response.data);
  } catch (error) {
    return requestWithMethodsAndEndpoints(
      ["patch", "put", "post"],
      [
        `/admin/rashis/${rashiId}/status`,
        `/admin/rashis/${rashiId}/active`,
        `/admin/rashi/${rashiId}/status`,
      ],
      payload,
      config
    );
  }
}
