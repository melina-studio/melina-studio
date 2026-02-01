package api

import (
	"log"
	"os"
	"time"

	"context"
	gcp "melina-studio-backend/internal/libraries"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func NewServer() *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: customErrorHandler,
		AppName:      "Melina Studio",
		// Enable proxy header to get real client IP when behind reverse proxy (nginx, cloudflare, etc.)
		ProxyHeader: fiber.HeaderXForwardedFor,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New())
	// Note: Global rate limiting is handled by nginx reverse proxy
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, https://melina.studio , https://www.melina.studio",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-CSRF-Token",
		AllowCredentials: true,
	}))

	// CSRF Protection middleware
	app.Use(csrf.New(csrf.Config{
		KeyLookup:      "header:X-CSRF-Token",
		CookieName:     "csrf_token",
		CookieSameSite: "Lax",
		CookieSecure:   os.Getenv("ENV") == "production",
		CookieHTTPOnly: true,
		Expiration:     1 * time.Hour,
		// Exclude GET, HEAD, OPTIONS, TRACE as they should be safe methods
		Next: func(c *fiber.Ctx) bool {
			// Skip CSRF for WebSocket upgrade requests
			return c.Path() == "/ws" || websocket.IsWebSocketUpgrade(c)
		},
	}))

	// Cache Control middleware - prevent caching of sensitive API responses
	app.Use(func(c *fiber.Ctx) error {
		// Set security headers to prevent caching of sensitive data
		c.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
		c.Set("Pragma", "no-cache")
		c.Set("Expires", "0")
		return c.Next()
	})

	// Middleware to allow WebSocket upgrade
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	ctx := context.Background()
	_, err := gcp.NewClients(ctx)
	if err != nil {
		log.Fatalf("failed to init gcp clients: %v", err)
	}

	return app
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	log.Printf("Error: %v", err)

	return c.Status(code).JSON(fiber.Map{
		"error": err.Error(),
	})
}

func StartServer(app *fiber.App) error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("🚀 Server starting on port %s\n", port)
	return app.Listen(":" + port)
}

// AuthRateLimiter returns a stricter rate limiter for auth routes (10 requests per minute)
func AuthRateLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many authentication attempts, please try again later",
			})
		},
	})
}
