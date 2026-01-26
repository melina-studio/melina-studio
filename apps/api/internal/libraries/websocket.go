package libraries

import (
	"encoding/json"
	"fmt"
	"log"
	"melina-studio-backend/internal/auth"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// WebSocketMessage represents the standard structure for all websocket messages
type WebSocketMessageType string

const (
	WebSocketMessageTypePing             WebSocketMessageType = "ping"
	WebSocketMessageTypePong             WebSocketMessageType = "pong"
	WebSocketMessageTypeError            WebSocketMessageType = "error"
	WebSocketMessageTypeMessage          WebSocketMessageType = "chat_message"
	WebSocketMessageTypeChatResponse     WebSocketMessageType = "chat_response"
	WebSocketMessageTypeChatStarting     WebSocketMessageType = "chat_starting"
	WebSocketMessageTypeChatCompleted    WebSocketMessageType = "chat_completed"
	WebSocketMessageTypeShapeStart       WebSocketMessageType = "shape_start"
	WebSocketMessageTypeShapeCreated     WebSocketMessageType = "shape_created"
	WebSocketMessageTypeShapeUpdateStart WebSocketMessageType = "shape_update_start"
	WebSocketMessageTypeShapeUpdated     WebSocketMessageType = "shape_updated"
	WebSocketMessageTypeShapeDeleted     WebSocketMessageType = "shape_deleted"
	WebSocketMessageTypeBoardRenamed     WebSocketMessageType = "board_renamed"
	WebSocketMessageTypeTokenWarning     WebSocketMessageType = "token_warning"
	WebSocketMessageTypeTokenBlocked     WebSocketMessageType = "token_blocked"
)

type Client struct {
	ID     string
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
	once   sync.Once
}

type Hub struct {
	Clients    map[string]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
}

type WebSocketMessage struct {
	Type WebSocketMessageType `json:"type"`
	Data interface{}          `json:"data,omitempty"`
}

type SelectionBounds struct {
	MinX    float64 `json:"minX"`
	MinY    float64 `json:"minY"`
	Width   float64 `json:"width"`
	Height  float64 `json:"height"`
	Padding float64 `json:"padding"`
}

type ShapeImageUrl struct {
	ShapeId string           `json:"shapeId"`
	Url     string           `json:"url"`
	Bounds  *SelectionBounds `json:"bounds,omitempty"`
}

type ChatMessageMetadata struct {
	ShapeImageUrls    []ShapeImageUrl `json:"shape_image_urls"`
	UploadedImageUrls []string        `json:"uploaded_image_urls"`
}

type ChatMessagePayload struct {
	BoardId     string               `json:"board_id,omitempty"`
	Message     string               `json:"message"`
	ActiveModel string               `json:"active_model"`
	Temperature *float32             `json:"temperature"`
	MaxTokens   *int                 `json:"max_tokens"`
	ActiveTheme string               `json:"active_theme"`
	Metadata    *ChatMessageMetadata `json:"metadata,omitempty"`
}

type ChatMessageResponsePayload struct {
	BoardId        string      `json:"board_id"`
	Message        string      `json:"message"`
	HumanMessageId string      `json:"human_message_id"`
	AiMessageId    string      `json:"ai_message_id"`
	Data           interface{} `json:"data,omitempty"`
}

// Add this new struct
type ShapeCreatedPayload struct {
	BoardId string                 `json:"board_id"`
	Shape   map[string]interface{} `json:"shape"`
}

type ShapeUpdatedPayload struct {
	BoardId string                 `json:"board_id"`
	Shape   map[string]interface{} `json:"shape"`
}

type ShapeDeletedPayload struct {
	BoardId string `json:"board_id"`
	ShapeId string `json:"shape_id"`
}

type WorkflowConfig struct {
	BoardId     string
	UserID      string
	Message     *ChatMessagePayload
	Model       string
	Temperature *float32
	MaxTokens   *int
	ActiveTheme string
}

type BoardRenamedPayload struct {
	BoardId string `json:"board_id"`
	NewName string `json:"new_name"`
}

type TokenUsagePayload struct {
	ConsumedTokens int     `json:"consumed_tokens"`
	TotalLimit     int     `json:"total_limit"`
	Percentage     float64 `json:"percentage"`
	ResetDate      string  `json:"reset_date"` // ISO 8601 format
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan []byte),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client.ID] = client
		case client := <-h.Unregister:
			if _, exists := h.Clients[client.ID]; exists {
				delete(h.Clients, client.ID)
				client.once.Do(func() {
					close(client.Send)
				})
			}
		case message := <-h.Broadcast:
			for _, client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					// Channel full or closed, skip
				}
			}
		}
	}
}

func (h *Hub) BroadcastMessage(message []byte) {
	h.Broadcast <- message
}

func (h *Hub) SendMessage(client *Client, message []byte) {
	// Use defer/recover to safely handle closed channel panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[websocket] SendMessage recovered from panic (client likely disconnected): %v", r)
		}
	}()

	// Non-blocking send with select to avoid blocking on closed channel
	select {
	case client.Send <- message:
		// Message sent successfully
	default:
		// Channel is full or closed, skip this message
		log.Printf("[websocket] SendMessage: channel full or closed, dropping message for client %s", client.ID)
	}
}

// sendErrorMessage sends a standardized error message to a client
func SendErrorMessage(hub *Hub, client *Client, errorMsg string) {
	errorResp := WebSocketMessage{
		Type: WebSocketMessageTypeError,
		Data: &ChatMessagePayload{
			Message: errorMsg,
		},
	}
	errorBytes, err := json.Marshal(errorResp)
	if err != nil {
		log.Println("failed to marshal error response:", err)
		return
	}
	hub.SendMessage(client, errorBytes)
}

// sendPongMessage sends a standardized pong message to a client
func sendPongMessage(hub *Hub, client *Client) {
	pongResp := WebSocketMessage{
		Type: "pong",
	}
	pongBytes, err := json.Marshal(pongResp)
	if err != nil {
		log.Println("failed to marshal pong response:", err)
		return
	}
	hub.SendMessage(client, pongBytes)
}

// Send event type
func SendEventType(hub *Hub, client *Client, eventType WebSocketMessageType) {
	eventTypeResp := WebSocketMessage{
		Type: eventType,
	}
	eventTypeBytes, err := json.Marshal(eventTypeResp)
	if err != nil {
		log.Println("failed to marshal event type response:", err)
		return
	}
	hub.SendMessage(client, eventTypeBytes)
}

// sendChatMessageResponse sends a chat message response to a client
func SendChatMessageResponse(hub *Hub, client *Client, Type WebSocketMessageType, message *ChatMessageResponsePayload) {
	chatMessageResponseResp := WebSocketMessage{
		Type: Type,
		Data: message,
	}

	chatMessageResponseBytes, err := json.Marshal(chatMessageResponseResp)
	if err != nil {
		log.Println("failed to marshal chat message response response:", err)
		return
	}
	hub.SendMessage(client, chatMessageResponseBytes)
	// add a delay mille seconds
	time.Sleep(50 * time.Millisecond)
}

// SendShapeCreatedMessage sends a shape created message to a client
func SendShapeCreatedMessage(hub *Hub, client *Client, boardId string, shape map[string]interface{}) {
	shapeCreatedResp := WebSocketMessage{
		Type: WebSocketMessageTypeShapeCreated,
		Data: &ShapeCreatedPayload{
			BoardId: boardId,
			Shape:   shape,
		},
	}
	shapeCreatedBytes, err := json.Marshal(shapeCreatedResp)
	if err != nil {
		log.Println("failed to marshal shape created response:", err)
		return
	}
	hub.SendMessage(client, shapeCreatedBytes)
}

// SendShapeUpdatedMessage sends a shape updated message to a client
func SendShapeUpdatedMessage(hub *Hub, client *Client, boardId string, shape map[string]interface{}) {
	shapeUpdatedResp := WebSocketMessage{
		Type: WebSocketMessageTypeShapeUpdated,
		Data: &ShapeUpdatedPayload{
			BoardId: boardId,
			Shape:   shape,
		},
	}
	shapeUpdatedBytes, err := json.Marshal(shapeUpdatedResp)
	if err != nil {
		log.Println("failed to marshal shape updated response:", err)
		return
	}
	hub.SendMessage(client, shapeUpdatedBytes)
}

// SendShapeDeletedMessage sends a shape deleted message to a client
func SendShapeDeletedMessage(hub *Hub, client *Client, boardId string, shapeId string) {
	shapeDeletedResp := WebSocketMessage{
		Type: WebSocketMessageTypeShapeDeleted,
		Data: &ShapeDeletedPayload{
			BoardId: boardId,
			ShapeId: shapeId,
		},
	}
	shapeDeletedBytes, err := json.Marshal(shapeDeletedResp)
	if err != nil {
		log.Println("failed to marshal shape deleted response:", err)
		return
	}
	hub.SendMessage(client, shapeDeletedBytes)
}

// SendBoardRenamedMessage sends a board renamed message to a client
func SendBoardRenamedMessage(hub *Hub, client *Client, boardId string, newName string) {
	boardRenamedResp := WebSocketMessage{
		Type: WebSocketMessageTypeBoardRenamed,
		Data: &BoardRenamedPayload{
			BoardId: boardId,
			NewName: newName,
		},
	}
	boardRenamedBytes, err := json.Marshal(boardRenamedResp)
	if err != nil {
		log.Println("failed to marshal board renamed response:", err)
		return
	}
	hub.SendMessage(client, boardRenamedBytes)
}

// SendTokenWarning sends a token warning message to a client (80% threshold reached)
func SendTokenWarning(hub *Hub, client *Client, usage *TokenUsagePayload) {
	tokenWarningResp := WebSocketMessage{
		Type: WebSocketMessageTypeTokenWarning,
		Data: usage,
	}
	tokenWarningBytes, err := json.Marshal(tokenWarningResp)
	if err != nil {
		log.Println("failed to marshal token warning response:", err)
		return
	}
	hub.SendMessage(client, tokenWarningBytes)
}

// SendTokenBlocked sends a token blocked message to a client (100% threshold reached)
func SendTokenBlocked(hub *Hub, client *Client, usage *TokenUsagePayload) {
	tokenBlockedResp := WebSocketMessage{
		Type: WebSocketMessageTypeTokenBlocked,
		Data: usage,
	}
	tokenBlockedBytes, err := json.Marshal(tokenBlockedResp)
	if err != nil {
		log.Println("failed to marshal token blocked response:", err)
		return
	}
	hub.SendMessage(client, tokenBlockedBytes)
}

// parseWebSocketMessage parses incoming websocket message and returns the message structure
func parseWebSocketMessage(msg []byte) (*WebSocketMessage, error) {
	var rawMessage struct {
		Type WebSocketMessageType `json:"type"`
		Data json.RawMessage      `json:"data,omitempty"`
	}
	if err := json.Unmarshal(msg, &rawMessage); err != nil {
		return nil, err
	}

	message := &WebSocketMessage{
		Type: rawMessage.Type,
	}

	// Convert data to appropriate type based on message type
	if len(rawMessage.Data) > 0 {
		switch rawMessage.Type {
		case WebSocketMessageTypeMessage:
			var chatPayload ChatMessagePayload
			if err := json.Unmarshal(rawMessage.Data, &chatPayload); err != nil {
				return nil, err
			}
			message.Data = &chatPayload
		case WebSocketMessageTypeShapeCreated:
			var shapePayload ShapeCreatedPayload
			if err := json.Unmarshal(rawMessage.Data, &shapePayload); err != nil {
				return nil, err
			}
			message.Data = &shapePayload
		case WebSocketMessageTypeShapeUpdated:
			var shapePayload ShapeUpdatedPayload
			if err := json.Unmarshal(rawMessage.Data, &shapePayload); err != nil {
				return nil, err
			}
			message.Data = &shapePayload
		default:
			// For other types, unmarshal as generic interface{}
			var data interface{}
			if err := json.Unmarshal(rawMessage.Data, &data); err != nil {
				return nil, err
			}
			message.Data = data
		}
	}

	return message, nil
}

// ChatMessageProcessor defines an interface for processing chat messages
type ChatMessageProcessor interface {
	ProcessChatMessage(hub *Hub, client *Client, cfg *WorkflowConfig)
}

func WebSocketHandler(hub *Hub, processor ChatMessageProcessor) fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		// Authenticate WebSocket connection
		userID, err := auth.AuthenticateWebSocket(conn)
		if err != nil {
			log.Println("WebSocket auth failed:", err)
			errorMsg := WebSocketMessage{
				Type: WebSocketMessageTypeError,
				Data: map[string]string{"error": "authentication failed: " + err.Error()},
			}
			errorBytes, _ := json.Marshal(errorMsg)
			conn.WriteMessage(websocket.TextMessage, errorBytes)
			conn.Close()
			return
		}

		client := &Client{
			ID:     uuid.NewString(),
			UserID: userID,
			Conn:   conn,
			Send:   make(chan []byte, 256),
		}

		hub.Register <- client

		// Write loop
		go func() {
			defer func() {
				hub.Unregister <- client
				conn.Close()
			}()
			for msg := range client.Send {
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					log.Println("write error:", err)
					return
				}
			}
		}()

		// Read loop
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("read error:", err)
				break
			}
			log.Println("received:", string(msg))

			// Parse message using standard interface
			message, err := parseWebSocketMessage(msg)
			if err != nil {
				log.Println("failed to parse JSON:", err)
				SendErrorMessage(hub, client, "Invalid JSON format")
				continue
			}

			// Handle ping messages
			if message.Type == WebSocketMessageTypePing {
				sendPongMessage(hub, client)
			} else if message.Type == WebSocketMessageTypeMessage {
				if message.Data == nil {
					SendErrorMessage(hub, client, "Chat message payload is required")
					continue
				}
				// Type assert to ChatMessagePayload
				chatPayload, ok := message.Data.(*ChatMessagePayload)
				if !ok {
					SendErrorMessage(hub, client, "Invalid chat message payload type")
					continue
				}
				// extract the board id from the message
				boardId := chatPayload.BoardId
				if boardId == "" {
					SendErrorMessage(hub, client, "Board ID is required")
					continue
				}

				fmt.Println("chatPayload", chatPayload)
				fmt.Println("chatPayload.ActiveModel", chatPayload.ActiveModel)
				fmt.Println("chatPayload.Temperature", chatPayload.Temperature)
				fmt.Println("chatPayload.MaxTokens", chatPayload.MaxTokens)

				payload := &WorkflowConfig{
					BoardId:     boardId,
					UserID:      client.UserID,
					Message:     chatPayload,
					Model:       chatPayload.ActiveModel,
					Temperature: chatPayload.Temperature,
					MaxTokens:   chatPayload.MaxTokens,
					ActiveTheme: chatPayload.ActiveTheme,
				}

				// send the chat message to the processor
				go processor.ProcessChatMessage(hub, client, payload)
			} else {
				//  return error that type is invalid or not provided
				SendErrorMessage(hub, client, "Type is invalid or not provided")
				continue
			}
		}

		hub.Unregister <- client
		conn.Close()
	})
}
