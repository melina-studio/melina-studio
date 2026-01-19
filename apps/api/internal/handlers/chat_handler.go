package handlers

import (
	"context"
	"log"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChatHandler struct {
	chatRepo       repo.ChatRepoInterface
	tempUploadRepo repo.TempUploadRepoInterface
}

func NewChatHandler(chatRepo repo.ChatRepoInterface, tempUploadRepo repo.TempUploadRepoInterface) *ChatHandler {
	return &ChatHandler{chatRepo: chatRepo, tempUploadRepo: tempUploadRepo}
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

// just upload image to gcp and return the url
func (h *ChatHandler) UploadImage(c *fiber.Ctx) error {
	boardId := c.Params("boardId")
	if _, err := uuid.Parse(boardId); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	// Get the file from form data
	fileHeader, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No image provided",
		})
	}

	// Open the file to get a reader
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read image file",
		})
	}
	defer file.Close()

	// Generate a unique object key: boards/{boardId}/images/{uuid}_{filename}
	objectKey := "boards/" + boardId + "/images/" + uuid.NewString() + "_" + fileHeader.Filename

	imageUrl, err := libraries.GetClients().Upload(context.Background(), objectKey, file, fileHeader.Header.Get("Content-Type"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to upload image",
		})
	}

	// Track temp upload for cleanup
	boardUUID, _ := uuid.Parse(boardId)
	tempUpload := &models.TempUpload{
		BoardID:   boardUUID,
		ObjectKey: objectKey,
		URL:       imageUrl,
	}
	if err := h.tempUploadRepo.Create(tempUpload); err != nil {
		log.Printf("Failed to track temp upload: %v", err)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Image uploaded successfully",
		"url":     imageUrl,
	})
}