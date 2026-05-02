import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:3001", {
      autoConnect: false,
    });
  }
  return socket;
}

export function useSocket() {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    if (!s.connected) s.connect();
    return () => {
      // Don't disconnect on unmount — let the app manage lifecycle
    };
  }, []);

  return socketRef.current;
}
