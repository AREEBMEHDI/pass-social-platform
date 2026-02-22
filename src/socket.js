// socket.js
import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

let socket = null;

/**
 * Initialize the global socket connection
 * MUST be called once from App.js
 */
export async function initSocket(baseUrl) {
  if (socket) {
    console.log("⚠️ Socket already initialized");
    return socket;
  }

  const token = await AsyncStorage.getItem("accessToken");
  if (!token) {
    throw new Error("❌ No access token available for socket connection");
  }

  socket = io(baseUrl, {
    // ❌ DO NOT force websocket (your backend blocks it)
    // transports: ["websocket"],

    auth: { token },
    autoConnect: true,

    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("✅ Global socket connected:", socket.id);
    console.log("📡 Transport:", socket.io.engine.transport.name);
  });

  socket.on("disconnect", (reason) => {
    console.log("⚠️ Global socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connect error:", err.message);
  });

  return socket;
}

/**
 * Screens MUST ONLY use this
 */
export function getSocket() {
  return socket;
}

/**
 * MUST be called from App.js cleanup
 */
export function disconnectSocket() {
  if (socket) {
    console.log("🔌 Disconnecting global socket");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
