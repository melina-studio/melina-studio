package v1

import (
	"melina-studio-backend/internal/api"
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

func registerAuthPublic(r fiber.Router) {
	authRepo := repo.NewAuthRepository(config.DB)
	refreshTokenRepo := repo.NewRefreshTokenRepository(config.DB)
	subscriptionPlanRepo := repo.NewSubscriptionPlanRepository(config.DB)
	authService := service.NewAuthService(refreshTokenRepo)
	geoService := service.NewGeolocationService()
	authHandler := handlers.NewAuthHandler(authRepo, authService, subscriptionPlanRepo, geoService)

	// Auth rate limiter for sensitive endpoints (10 requests per minute)
	authLimiter := api.AuthRateLimiter()

	// Public auth routes (no auth required) - with stricter rate limiting
	r.Post("/login", authLimiter, authHandler.Login)
	r.Post("/register", authLimiter, authHandler.Register)
	r.Post("/refresh", authLimiter, authHandler.RefreshToken)
	r.Post("/logout", authHandler.Logout)

	// OAuth routes - with stricter rate limiting
	r.Get("/oauth/google", authLimiter, authHandler.GoogleLogin)
	r.Get("/oauth/google/callback", authHandler.GoogleCallback)

	r.Get("/oauth/github", authLimiter, authHandler.GithubLogin)
	r.Get("/oauth/github/callback", authHandler.GithubCallback)
}

func registerAuthProtected(r fiber.Router) {
	authRepo := repo.NewAuthRepository(config.DB)
	refreshTokenRepo := repo.NewRefreshTokenRepository(config.DB)
	subscriptionPlanRepo := repo.NewSubscriptionPlanRepository(config.DB)
	authService := service.NewAuthService(refreshTokenRepo)
	geoService := service.NewGeolocationService()
	authHandler := handlers.NewAuthHandler(authRepo, authService, subscriptionPlanRepo, geoService)

	// Protected auth routes (requires auth)
	r.Get("/me", authHandler.GetMe)
	r.Patch("/me/update", authHandler.UpdateMe)
	r.Post("/logout-all", authHandler.LogoutAll)
	r.Get("/sessions", authHandler.GetActiveSessions)
	r.Delete("/sessions/:sessionId", authHandler.RevokeSession)
}
