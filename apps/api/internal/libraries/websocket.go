package libraries

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// WebSocketMessage represents the standard structure for all websocket messages
type WebSocketMessageType string
const (
	WebSocketMessageTypePing WebSocketMessageType = "ping"
	WebSocketMessageTypePong WebSocketMessageType = "pong"
	WebSocketMessageTypeError WebSocketMessageType = "error"
	WebSocketMessageTypeMessage WebSocketMessageType = "chat_message"
	WebSocketMessageTypeChatResponse WebSocketMessageType = "chat_response"
	WebSocketMessageTypeChatStarting WebSocketMessageType = "chat_starting"
	WebSocketMessageTypeChatCompleted WebSocketMessageType = "chat_completed"
)


type Client struct {
	ID       string
	Conn     *websocket.Conn
	Send     chan []byte
	once     sync.Once
}

type Hub struct {
	Clients    map[string]*Client
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan []byte
}

type WebSocketMessage struct {
	Type WebSocketMessageType      `json:"type"`
	Data *ChatMessagePayload 		`json:"data,omitempty"`
}

type ChatMessagePayload struct {
	BoardId string `json:"board_id,omitempty"`
	Message string `json:"message"`
}

type ChatMessageResponsePayload struct {
	BoardId        string      `json:"board_id"`
	Message        string      `json:"message"`
	HumanMessageId string      `json:"human_message_id"`
	AiMessageId    string      `json:"ai_message_id"`
	Data           interface{} `json:"data,omitempty"`
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
				client.Send <- message
			}
		}
	}
}

func (h *Hub) BroadcastMessage(message []byte) {
	h.Broadcast <- message
}

func (h *Hub) SendMessage(client *Client, message []byte) {
	client.Send <- message
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
		Data: &ChatMessagePayload{
			Message: message.Message,
		},
	}

	if message.BoardId != "" {
		chatMessageResponseResp.Data.BoardId = message.BoardId
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


// parseWebSocketMessage parses incoming websocket message and returns the message structure
func parseWebSocketMessage(msg []byte) (*WebSocketMessage, error) {
	var message WebSocketMessage
	if err := json.Unmarshal(msg, &message); err != nil {
		return nil, err
	}
	return &message, nil
}

// ChatMessageProcessor defines an interface for processing chat messages
type ChatMessageProcessor interface {
	ProcessChatMessage(hub *Hub, client *Client, boardId string, message *ChatMessagePayload)
}

func WebSocketHandler(hub *Hub, processor ChatMessageProcessor) fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		client := &Client{
			ID:   uuid.NewString(),
			Conn: conn,
			Send: make(chan []byte, 256),
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
				// extract the board id from the message
				boardId := message.Data.BoardId
				if boardId == "" {
					SendErrorMessage(hub, client, "Board ID is required")
					continue
				}
				// send the chat message to the processor
				go processor.ProcessChatMessage(hub, client,boardId, message.Data)
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

