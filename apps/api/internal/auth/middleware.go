package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

const AccessTokenCookie = "access_token"

func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var tokenStr string

		// First try to get token from cookie
		tokenStr = c.Cookies(AccessTokenCookie)

		// Fallback to Authorization header (for backwards compatibility / API clients)
		if tokenStr == "" {
			authHeader := c.Get("Authorization")
			if authHeader != "" {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
				if tokenStr == authHeader {
					tokenStr = "" // Not a Bearer token
				}
			}
		}

		if tokenStr == "" {
			return fiber.ErrUnauthorized
		}

		claims, err := ValidateAccessToken(tokenStr)
		if err != nil {
			return fiber.ErrUnauthorized
		}

		c.Locals("userID", claims.UserID)
		return c.Next()
	}
}
