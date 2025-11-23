package v1

import (
	"github.com/gofiber/fiber/v2"
)

func RegisterRoutes(r fiber.Router) {
	registerBoard(r)
}
