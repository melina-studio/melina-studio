"use client";

import { useContext } from "react";
import { WebSocketContext } from "@/providers/WebsocketProvider";

export const useWebsocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebsocket must be used within a WebSocketProvider");
  }
  return context;
};
