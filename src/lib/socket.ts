import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// 🔥 AUTO DETECT BACKEND PORT
const getBackendURL = () => {
  const host = window.location.hostname;

  // default dev
  return `http://${host}:3000`;
};

export const getSocket = () => {
  if (!socket) {
    const URL = getBackendURL();

    socket = io(URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // 🔥 DEBUG CONNECT
    socket.on("connect", () => {
      console.log("🔥 SOCKET CONNECTED:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("⚠️ SOCKET DISCONNECTED");
    });

    socket.on("connect_error", (err) => {
      console.log("❌ SOCKET ERROR:", err.message);
    });
  }

  return socket;
};