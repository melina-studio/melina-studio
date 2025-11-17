package v1

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(r fiber.Router) {
	registerHealth(r)
	registerTodos(r)

	registerBoard(r)
}
