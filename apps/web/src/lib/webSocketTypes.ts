export type WebSocketMessage = {
  type:
    | "ping"
    | "pong"
    | "chat_message"
    | "auth"
    | "error"
    | "chat_response"
    | "chat_status"
    | "board_renamed"
    | "shape_created"
    | "shape_start"
    | "shape_updated"
    | "shape_update_start"
    | "shape_deleted";
  data: any;
};
