package auth

import (
	"errors"
	"strings"

	"github.com/gofiber/contrib/websocket"
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

// AuthenticateWebSocket validates token from WebSocket connection
// Supports: query parameter (?token=xxx) and cookies (access_token)
func AuthenticateWebSocket(conn *websocket.Conn) (string, error) {
	var tokenStr string

	// Try query parameter first (for browser WebSocket connections)
	tokenStr = conn.Query("token")

	// Fallback to cookie
	if tokenStr == "" {
		tokenStr = conn.Cookies(AccessTokenCookie)
	}

	if tokenStr == "" {
		return "", errors.New("no authentication token provided")
	}

	claims, err := ValidateAccessToken(tokenStr)
	if err != nil {
		return "", err
	}

	return claims.UserID, nil
}
