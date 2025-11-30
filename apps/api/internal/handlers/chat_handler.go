package handlers

import (
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatRepo repo.ChatRepoInterface
}

func NewChatHandler(chatRepo repo.ChatRepoInterface) *ChatHandler {
	return &ChatHandler{chatRepo: chatRepo}
}

// get chats by board id
func (h *ChatHandler) GetChatsByBoardId(c *fiber.Ctx) error {
	boardId := c.Params("boardId")

	boardIdUUID, err := uuid.Parse(boardId)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	chats, total, err := h.chatRepo.GetChatsByBoardId(boardIdUUID, 1, 20)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get chats",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"chats": chats,
		"total": total,
	})
}