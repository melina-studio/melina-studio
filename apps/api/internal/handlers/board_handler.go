package handlers

import (
	"log"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"

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

	var body struct {
		Data []models.Shape `json:"data"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(body.Data) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No data provided",
		})
	}

	// Save each shape (create or update)
	for _, data := range body.Data {
		err := h.boardDataRepo.SaveShapeData(boardId, &data)
		if err != nil {
			log.Println(err, "Error saving shape data")
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to save shape data",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Data saved successfully",
	})
}

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

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"board": board,
	})
}
