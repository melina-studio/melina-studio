"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Callback = (msg: any) => void;

type WebSocketContextType = {
  socket: WebSocket | null;
  sendMessage: (data: unknown) => void;
  isConnected: boolean;
  subscribe: (type: string, cb: Callback) => () => void;
};

export const WebSocketContext = createContext<WebSocketContextType | null>(
  null
);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<Callback>>>(new Map());
  const mountedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // if (socketRef.current) return; // to avoid multiple connections
    // Prevent Strict Mode double-mount cleanup issues
    if (mountedRef.current) return;
    mountedRef.current = true;

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "");
    socketRef.current = ws;

    // Set up message handler before connection opens
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "pong") {
        console.log("🟢 Pong received");
      }
      const listeners = listenersRef.current.get(data.type);
      if (listeners) {
        listeners.forEach((cb) => cb(data));
      }
      console.log("📩 Message:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") {
          console.log("🟢 Pong received");
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onopen = () => {
      console.log("Connected to WebSocket");
      setIsConnected(true);
      // Send ping only after connection is established
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onclose = () => {
      console.log("❌ WebSocket disconnected");
      setIsConnected(false);
      socketRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    // ✅ Close WS only when the tab/window is ACTUALLY closing
    const handleBeforeUnload = () => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket");
        ws.close();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // ws.close();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const sendMessage = (data: unknown) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  const subscribe = (type: string, cb: Callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }

    listenersRef.current.get(type)!.add(cb);

    // cleanup
    return () => {
      listenersRef.current.get(type)?.delete(cb);
    };
  };

  return (
    <WebSocketContext.Provider
      value={{ socket: socketRef.current, sendMessage, isConnected, subscribe }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
