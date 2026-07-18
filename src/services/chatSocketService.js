import { io } from "socket.io-client";
import { API_BASE_URL } from "../config/api";

function getSocketBaseUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_SOCKET_URL;

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, "");
  }

  try {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (error) {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }
}

export function createAdminChatSocket(token) {
  const socketUrl = getSocketBaseUrl();

  return io(socketUrl, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 15000,
    auth: token ? { token } : undefined,
  });
}
