"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

type Callback = (msg: any) => void;

type WebSocketContextType = {
  socket: WebSocket | null;
  sendMessage: (data: unknown) => void;
  isConnected: boolean;
  isReconnecting: boolean;
  subscribe: (type: string, cb: Callback) => () => void;
};

// Reconnection config
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds max
const MAX_RETRY_ATTEMPTS = 10;

export const WebSocketContext = createContext<WebSocketContextType | null>(
  null
);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<Callback>>>(new Map());
  const mountedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intentionalCloseRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const connect = useCallback(() => {
    // Don't reconnect if intentionally closed
    if (intentionalCloseRef.current) return;

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "");
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") {
          console.log("🟢 Pong received");
        }
        const listeners = listenersRef.current.get(data.type);
        if (listeners) {
          listeners.forEach((cb) => cb(data));
        }
        console.log("📩 Message:", event.data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket");
      setIsConnected(true);
      setIsReconnecting(false);
      retryCountRef.current = 0; // Reset retry count on successful connection
      // Send ping only after connection is established
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onclose = () => {
      console.log("❌ WebSocket disconnected");
      setIsConnected(false);
      socketRef.current = null;

      // Attempt reconnection if not intentionally closed
      if (!intentionalCloseRef.current && retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current),
          MAX_RETRY_DELAY
        );
        retryCountRef.current += 1;
        setIsReconnecting(true);
        console.log(`🔄 Reconnecting in ${delay / 1000}s... (attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})`);

        retryTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        console.log("❌ Max reconnection attempts reached. Giving up.");
        setIsReconnecting(false);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };
  }, []);

  useEffect(() => {
    // Prevent Strict Mode double-mount cleanup issues
    if (mountedRef.current) return;
    mountedRef.current = true;
    intentionalCloseRef.current = false;

    connect();

    // Close WS only when the tab/window is ACTUALLY closing
    const handleBeforeUnload = () => {
      intentionalCloseRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket");
        socketRef.current.close();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);

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
      value={{ socket: socketRef.current, sendMessage, isConnected, isReconnecting, subscribe }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
