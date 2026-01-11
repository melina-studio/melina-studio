package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"
	"os"
	"path/filepath"

	"github.com/google/uuid"

	"github.com/gofiber/fiber/v2"
)

// for simple crud operations service layer is not required
type BoardHandler struct {
	repo          repo.BoardRepoInterface
	boardDataRepo repo.BoardDataRepoInterface
}

func NewBoardHandler(repo repo.BoardRepoInterface, boardDataRepo repo.BoardDataRepoInterface) *BoardHandler {
	return &BoardHandler{
		repo:          repo,
		boardDataRepo: boardDataRepo,
	}
}

// function to create a board
func (h *BoardHandler) CreateBoard(c *fiber.Ctx) error {
	var dto struct {
		Title  string `json:"title"`
		UserID string `json:"userId"`
	}
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	userID, err := uuid.Parse(dto.UserID)
	if err != nil {
		log.Println(err, "Error parsing user id")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user id",
		})
	}

	// create a new board
	uuid, err := h.repo.CreateBoard(&models.Board{
		Title:  dto.Title,
		UserID: userID,
	})
	if err != nil {
		log.Println(err, "Error creating board")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create board",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"uuid":    uuid.String(),
		"message": "Board created successfully",
	})
}

// function to get all boards
func (h *BoardHandler) GetAllBoards(c *fiber.Ctx) error {
	boards, error := h.repo.GetAllBoards()
	if error != nil {
		log.Println(error, "Error getting boards")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get boards",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"boards": boards,
	})
}

// function to save data to board
func (h *BoardHandler) SaveData(c *fiber.Ctx) error {
	// Get board ID from URL params
	boardIdStr := c.Params("boardId")
	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	// Parse multipart form data
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid form data",
		})
	}

	// Extract and parse the boardData JSON field
	boardDataValues := form.Value["boardData"]
	if len(boardDataValues) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No board data provided",
		})
	}

	// Unmarshal directly into a slice of shapes
	var shapes []models.Shape

	if err := json.Unmarshal([]byte(boardDataValues[0]), &shapes); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board data JSON",
		})
	}

	// Collect UUIDs of shapes being saved
	var shapeUUIDs []uuid.UUID

	// Save each shape (create or update)
	for _, data := range shapes {
		shapeUUID, err := uuid.Parse(data.ID)
		if err != nil {
			log.Println(err, "Error parsing shape ID")
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid shape ID",
			})
		}
		shapeUUIDs = append(shapeUUIDs, shapeUUID)

		err = h.boardDataRepo.SaveShapeData(boardId, &data)
		if err != nil {
			log.Println(err, "Error saving shape data")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to save shape data",
			})
		}
	}

	// Delete shapes that exist in the database but are not in the payload
	err = h.boardDataRepo.DeleteShapesNotInList(boardId, shapeUUIDs)
	if err != nil {
		log.Println(err, "Error deleting removed shapes")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete removed shapes",
		})
	}

	// Handle image file if provided
	files := form.File["image"]
	if len(files) > 0 {
		file := files[0]

		// Create temp/images directory if it doesn't exist
		imageDir := "temp/images"
		if err := os.MkdirAll(imageDir, 0755); err != nil {
			log.Println(err, "Error creating image directory")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create image directory",
			})
		}

		// Save the file with boardId as filename
		filename := fmt.Sprintf("%s.png", boardId.String())
		filepath := filepath.Join(imageDir, filename)

		if err := c.SaveFile(file, filepath); err != nil {
			log.Println(err, "Error saving image file")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to save image",
			})
		}

		log.Printf("Image saved successfully: %s", filepath)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Data saved successfully",
	})
}

// function to get board by ID
func (h *BoardHandler) GetBoardByID(c *fiber.Ctx) error {
	boardIdStr := c.Params("boardId")
	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	board, err := h.boardDataRepo.GetBoardData(boardId)
	if err != nil {
		log.Println(err, "Error getting board")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get board",
		})
	}

	boardInfo, err := h.repo.GetBoardById(boardId)
	if err != nil {
		log.Println(err, "Error getting board info")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get board info",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"board": board,
		"boardInfo": boardInfo,
	})
}

// function to clear board
func (h *BoardHandler) ClearBoard(c *fiber.Ctx) error {
	boardIdStr := c.Params("boardId")
	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	err = h.boardDataRepo.ClearBoardData(boardId)
	if err != nil {
		log.Println(err, "Error clearing board")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to clear board",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Board cleared successfully",
	})
}

// function to delete board by ID
func (h *BoardHandler) DeleteBoardByID(c *fiber.Ctx) error {
	boardIdStr := c.Params("boardId")
	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	err = h.repo.DeleteBoardByID(boardId)
	if err != nil {
		log.Println(err, "Error deleting board")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete board",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Board deleted successfully",
	})
}

// function to update board by ID
func (h *BoardHandler) UpdateBoardByID(c *fiber.Ctx) error {
	boardIdStr := c.Params("boardId")
	boardId, err := uuid.Parse(boardIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid board ID",
		})
	}

	var dto struct {
		Title     *string `json:"title"`
		Thumbnail *string `json:"thumbnail"`
		Starred   *bool   `json:"starred"`
		SaveThumbnail *bool   `json:"saveThumbnail"`
	}

	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	payload := &models.Board{}
	if dto.Title != nil {
		payload.Title = *dto.Title
	}
	if dto.Thumbnail != nil {
		payload.Thumbnail = *dto.Thumbnail
	}
	if dto.Starred != nil {
		payload.Starred = *dto.Starred
	}

	if dto.SaveThumbnail != nil && *dto.SaveThumbnail {
		// get the image from the temp/images directory
		imagePath := "temp/images/" + boardId.String() + ".png"
		image, err := os.ReadFile(imagePath)
		if err != nil {
			log.Println(err, "Error reading image file")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to read image",
			})
		}
		// upload the image to gcs
		url ,err := libraries.GetClients().Upload(context.Background(), boardId.String()+".png", bytes.NewReader(image), "image/png")
		if err != nil {
			log.Println(err, "Error uploading image to gcs")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to upload image to gcs",
			})
		}

		// save the url to board thumbnail
		payload.Thumbnail = url
	}
	
	err = h.repo.UpdateBoard(boardId, payload)
	if err != nil {
		log.Println(err, "Error updating board")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update board",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Board updated successfully",
	})
}