import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });
  }
  return socket;
}
