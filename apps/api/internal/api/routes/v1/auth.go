package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

func registerAuthPublic(r fiber.Router) {
	authRepo := repo.NewAuthRepository(config.DB)
	refreshTokenRepo := repo.NewRefreshTokenRepository(config.DB)
	authService := service.NewAuthService(refreshTokenRepo)
	authHandler := handlers.NewAuthHandler(authRepo, authService)

	// Public auth routes (no auth required)
	r.Post("/login", authHandler.Login)
	r.Post("/register", authHandler.Register)
	r.Post("/refresh", authHandler.RefreshToken)
	r.Post("/logout", authHandler.Logout)

	// OAuth routes
	r.Get("/oauth/google", authHandler.GoogleLogin)
	r.Get("/oauth/google/callback", authHandler.GoogleCallback)
	
	r.Get("/oauth/github", authHandler.GithubLogin)
	r.Get("/oauth/github/callback", authHandler.GithubCallback)
}

func registerAuthProtected(r fiber.Router) {
	authRepo := repo.NewAuthRepository(config.DB)
	refreshTokenRepo := repo.NewRefreshTokenRepository(config.DB)
	authService := service.NewAuthService(refreshTokenRepo)
	authHandler := handlers.NewAuthHandler(authRepo, authService)

	// Protected auth routes (requires auth)
	r.Get("/me", authHandler.GetMe)
	r.Post("/logout-all", authHandler.LogoutAll)
	r.Get("/sessions", authHandler.GetActiveSessions)
	r.Delete("/sessions/:sessionId", authHandler.RevokeSession)
}
