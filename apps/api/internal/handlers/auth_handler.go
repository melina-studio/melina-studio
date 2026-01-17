package handlers

import (
	"melina-studio-backend/internal/auth"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Cookie configuration
const (
	AccessTokenCookie  = "access_token"
	RefreshTokenCookie = "refresh_token"
	AccessTokenMaxAge  = 15 * 60          // 15 minutes in seconds
	RefreshTokenMaxAge = 7 * 24 * 60 * 60 // 7 days in seconds
)

// Helper function to set auth cookies
func setAuthCookies(c *fiber.Ctx, accessToken, refreshToken string) {
	isProduction := os.Getenv("GO_ENV") == "production"

	// Set access token cookie
	c.Cookie(&fiber.Cookie{
		Name:     AccessTokenCookie,
		Value:    accessToken,
		Expires:  time.Now().Add(15 * time.Minute),
		HTTPOnly: true,
		Secure:   isProduction,
		SameSite: "Lax",
		Path:     "/",
	})

	// Set refresh token cookie
	c.Cookie(&fiber.Cookie{
		Name:     RefreshTokenCookie,
		Value:    refreshToken,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   isProduction,
		SameSite: "Lax",
		Path:     "/",
	})
}

// Helper function to clear auth cookies
func clearAuthCookies(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     AccessTokenCookie,
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})
	c.Cookie(&fiber.Cookie{
		Name:     RefreshTokenCookie,
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})
}

type AuthHandler struct {
	authRepo    repo.AuthRepoInterface
	authService *service.AuthService
}

func NewAuthHandler(authRepo repo.AuthRepoInterface, authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		authRepo:    authRepo,
		authService: authService,
	}
}

// Login authenticates a user and sets auth cookies
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var dto struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := h.authRepo.GetUserByEmail(dto.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// compare the password with the hashed password in the database
	if !auth.CheckPasswordHash(dto.Password, user.Password) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// generate access token
	accessToken, err := auth.GenerateAccessToken(user.UUID.String())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	// generate and store refresh token
	refreshToken, err := h.authService.CreateAndStoreRefreshToken(user.UUID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Set cookies
	setAuthCookies(c, accessToken, refreshToken)

	// Don't return password
	user.Password = ""

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"user":         user,
		"access_token": accessToken,
		"message":      "Login successful",
	})
}

// Register creates a new user and sets auth cookies
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var dto struct {
		Email     string `json:"email"`
		Password  string `json:"password"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	}
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// check if the user already exists
	existingUser, _ := h.authRepo.GetUserByEmail(dto.Email)
	if existingUser.Email != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "User already exists",
		})
	}

	// hash the password
	hashedPassword, err := auth.HashPassword(dto.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to hash password",
		})
	}

	// create a new user
	newUserUUID, err := h.authRepo.CreateUser(&models.User{
		Email:     dto.Email,
		Password:  hashedPassword,
		FirstName: dto.FirstName,
		LastName:  dto.LastName,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// generate access token
	accessToken, err := auth.GenerateAccessToken(newUserUUID.String())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	// generate and store refresh token
	refreshToken, err := h.authService.CreateAndStoreRefreshToken(newUserUUID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Set cookies
	setAuthCookies(c, accessToken, refreshToken)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"uuid":         newUserUUID.String(),
		"access_token": accessToken,
		"message":      "User created successfully",
	})
}

// RefreshToken exchanges a valid refresh token for new tokens (with rotation)
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	// Get refresh token from cookie
	refreshTokenValue := c.Cookies(RefreshTokenCookie)
	if refreshTokenValue == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "No refresh token provided",
		})
	}

	// Validate and get stored token
	claims, storedToken, err := h.authService.ValidateAndGetToken(refreshTokenValue)
	if err != nil {
		clearAuthCookies(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid or expired refresh token",
		})
	}

	// Revoke the old token (rotation - one-time use)
	if err := h.authService.RevokeToken(storedToken.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to rotate token",
		})
	}

	// Generate new access token
	accessToken, err := auth.GenerateAccessToken(claims.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate access token",
		})
	}

	// Generate and store new refresh token
	userUUID, _ := uuid.Parse(claims.UserID)
	newRefreshToken, err := h.authService.CreateAndStoreRefreshToken(userUUID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate refresh token",
		})
	}

	// Set new cookies
	setAuthCookies(c, accessToken, newRefreshToken)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"access_token": accessToken,
		"message":      "Tokens refreshed successfully",
	})
}

// Logout revokes the current refresh token and clears cookies
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// Get refresh token from cookie
	refreshTokenValue := c.Cookies(RefreshTokenCookie)
	if refreshTokenValue != "" {
		// Revoke the token (service handles validation internally)
		h.authService.RevokeTokenByJTI(refreshTokenValue)
	}

	// Clear cookies
	clearAuthCookies(c)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}

// LogoutAll revokes all refresh tokens for the user (global logout)
func (h *AuthHandler) LogoutAll(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	if err := h.authService.RevokeAllForUser(userUUID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to logout from all devices",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Logged out from all devices",
	})
}

// GetActiveSessions returns all active sessions for the user
func (h *AuthHandler) GetActiveSessions(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	sessions, err := h.authService.GetActiveSessions(userUUID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get sessions",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"sessions": sessions,
	})
}

// RevokeSession revokes a specific session
func (h *AuthHandler) RevokeSession(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	sessionID := c.Params("sessionId")
	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	if err := h.authService.RevokeSession(userUUID, sessionUUID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to revoke session",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Session revoked",
	})
}

// GetMe returns the current authenticated user
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	user, err := h.authRepo.GetUserByID(userUUID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// Don't return the password
	user.Password = ""

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"user": user,
	})
}