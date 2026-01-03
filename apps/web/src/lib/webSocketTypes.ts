export type WebSocketMessage = {
  type:
    | "ping"
    | "pong"
    | "chat_message"
    | "auth"
    | "error"
    | "chat_response"
    | "chat_status";
  data: any;
};
