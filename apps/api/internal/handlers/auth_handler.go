package handlers

import (
	"encoding/json"
	"errors"
	"melina-studio-backend/internal/auth"
	"melina-studio-backend/internal/auth/oauth"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
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

	// Check if user uses email login method
	if user.LoginMethod != models.LoginMethodEmail {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid login method. Please use OAuth login.",
		})
	}

	// Check if password exists (should always exist for email login, but safety check)
	if user.Password == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// compare the password with the hashed password in the database
	if !auth.CheckPasswordHash(dto.Password, *user.Password) {
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
	user.Password = nil

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
	_, checkErr := h.authRepo.GetUserByEmail(dto.Email)
	if checkErr == nil {
		// User exists
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
		Email:       dto.Email,
		Password:    &hashedPassword,
		FirstName:   dto.FirstName,
		LastName:    dto.LastName,
		LoginMethod: models.LoginMethodEmail,
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
	user.Password = nil

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"user": user,
	})
}

// GoogleLogin redirects the user to the Google OAuth login page
func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	randomHash := uuid.NewString()
	url := oauth.GetGoogleOAuthConfig().AuthCodeURL(
		randomHash,
		oauth2.AccessTypeOffline,
	)
	return c.Redirect(url)
}

// GoogleCallback handles the callback from the Google OAuth login page
func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	frontendURL := os.Getenv("FRONTEND_URL")

	code := c.Query("code")
	if code == "" {
		return c.Redirect(frontendURL + "/auth?error=missing_code")
	}

	token, err := oauth.GetGoogleOAuthConfig().Exchange(c.Context(), code)
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=oauth_exchange_failed")
	}

	client := oauth.GetGoogleOAuthConfig().Client(c.Context(), token)

	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_get_user_info")
	}
	defer resp.Body.Close()

	var userInfo struct {
		Sub     string `json:"sub"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_decode_user_info")
	}

	// Parse name - handle cases with single name or multiple spaces
	nameParts := strings.Fields(userInfo.Name)
	var firstName, lastName string
	if len(nameParts) > 0 {
		firstName = nameParts[0]
		if len(nameParts) > 1 {
			lastName = strings.Join(nameParts[1:], " ")
		} else {
			lastName = "" // Handle single name case
		}
	}

	// 1. Find user by email
	user, err := h.authRepo.GetUserByEmail(userInfo.Email)

	// 2. Handle user lookup result
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Redirect(frontendURL + "/auth?error=failed_to_check_user")
		}

		// User doesn't exist - create new OAuth user
		newUserUUID, err := h.authRepo.CreateUser(&models.User{
			FirstName:    firstName,
			LastName:     lastName,
			Email:        userInfo.Email,
			Password:     nil, // OAuth users don't have passwords
			LoginMethod:  models.LoginMethodGoogle,
			Subscription: models.SubscriptionFree,
		})
		if err != nil {
			return c.Redirect(frontendURL + "/auth?error=failed_to_create_user")
		}

		// Fetch the newly created user to get all fields
		user, err = h.authRepo.GetUserByID(newUserUUID)
		if err != nil {
			return c.Redirect(frontendURL + "/auth?error=failed_to_retrieve_user")
		}
	} else {
		// User exists - check if they used Google to sign up
		if user.LoginMethod != models.LoginMethodGoogle {
			return c.Redirect(frontendURL + "/auth?error=email_exists_different_provider&provider=" + string(user.LoginMethod))
		}
	}

	// 3. Issue JWTs using the database user UUID (not Google's Sub)
	accessToken, err := auth.GenerateAccessToken(user.UUID.String())
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_generate_token")
	}

	// Generate and store refresh token (using authService like regular login)
	refreshToken, err := h.authService.CreateAndStoreRefreshToken(user.UUID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_generate_refresh_token")
	}

	// Set cookies (like regular login)
	setAuthCookies(c, accessToken, refreshToken)

	// Redirect to frontend after successful OAuth
	return c.Redirect(frontendURL + "/playground/all")
}

// GithubLogin redirects the user to the Github OAuth login page
func (h *AuthHandler) GithubLogin(c *fiber.Ctx) error {
	randomHash := uuid.NewString()
	url := oauth.GetGitHubOAuthConfig().AuthCodeURL(
		randomHash,
		oauth2.AccessTypeOffline,
	)
	return c.Redirect(url)
}

// GithubCallback handles the callback from the Github OAuth login page
func (h *AuthHandler) GithubCallback(c *fiber.Ctx) error {
	frontendURL := os.Getenv("FRONTEND_URL")

	code := c.Query("code")
	if code == "" {
		return c.Redirect(frontendURL + "/auth?error=missing_code")
	}

	token, err := oauth.GetGitHubOAuthConfig().Exchange(c.Context(), code)
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=oauth_exchange_failed")
	}

	client := oauth.GetGitHubOAuthConfig().Client(c.Context(), token)

	// Fetch user profile with proper Accept header
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_get_user_info")
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID    int64  `json:"id"`
		Login string `json:"login"`
		Name  string `json:"name"`
		Email string `json:"email"` // May be null if private
	}

	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_decode_user_info")
	}

	// GitHub doesn't always return email in /user - fetch from /user/emails
	email := userInfo.Email
	if email == "" {
		emailReq, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
		emailReq.Header.Set("Accept", "application/vnd.github+json")

		emailResp, err := client.Do(emailReq)
		if err != nil {
			return c.Redirect(frontendURL + "/auth?error=failed_to_get_user_emails")
		}
		defer emailResp.Body.Close()

		var emails []struct {
			Email    string `json:"email"`
			Primary  bool   `json:"primary"`
			Verified bool   `json:"verified"`
		}

		if err := json.NewDecoder(emailResp.Body).Decode(&emails); err != nil {
			return c.Redirect(frontendURL + "/auth?error=failed_to_decode_user_emails")
		}

		// Find primary verified email
		for _, e := range emails {
			if e.Primary && e.Verified {
				email = e.Email
				break
			}
		}

		// Fallback to any verified email if no primary
		if email == "" {
			for _, e := range emails {
				if e.Verified {
					email = e.Email
					break
				}
			}
		}

		if email == "" {
			return c.Redirect(frontendURL + "/auth?error=no_verified_email")
		}
	}

	// Parse name - handle cases with single name or multiple spaces
	// Fall back to login (username) if name is empty
	displayName := userInfo.Name
	if displayName == "" {
		displayName = userInfo.Login
	}

	nameParts := strings.Fields(displayName)
	var firstName, lastName string
	if len(nameParts) > 0 {
		firstName = nameParts[0]
		if len(nameParts) > 1 {
			lastName = strings.Join(nameParts[1:], " ")
		}
	}

	// 1. Find user by email
	user, err := h.authRepo.GetUserByEmail(email)

	// 2. Handle user lookup result
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Redirect(frontendURL + "/auth?error=failed_to_check_user")
		}

		// User doesn't exist - create new user
		newUserUUID, err := h.authRepo.CreateUser(&models.User{
			FirstName:    firstName,
			LastName:     lastName,
			Email:        email,
			Password:     nil, // OAuth users don't have passwords
			LoginMethod:  models.LoginMethodGithub,
			Subscription: models.SubscriptionFree,
		})
		if err != nil {
			return c.Redirect(frontendURL + "/auth?error=failed_to_create_user")
		}

		// Fetch the newly created user to get all fields
		user, err = h.authRepo.GetUserByID(newUserUUID)
		if err != nil {
			return c.Redirect(frontendURL + "/auth?error=failed_to_retrieve_user")
		}
	} else {
		// User exists - check if they used GitHub to sign up
		if user.LoginMethod != models.LoginMethodGithub {
			return c.Redirect(frontendURL + "/auth?error=email_exists_different_provider&provider=" + string(user.LoginMethod))
		}
	}

	// 3. Issue JWTs using the database user UUID (not Github's ID)
	accessToken, err := auth.GenerateAccessToken(user.UUID.String())
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_generate_token")
	}

	// Generate and store refresh token (using authService like regular login)
	refreshToken, err := h.authService.CreateAndStoreRefreshToken(user.UUID, c.Get("User-Agent"), c.IP())
	if err != nil {
		return c.Redirect(frontendURL + "/auth?error=failed_to_generate_refresh_token")
	}

	// Set cookies (like regular login)
	setAuthCookies(c, accessToken, refreshToken)

	// Redirect to frontend after successful OAuth
	return c.Redirect(frontendURL + "/playground/all")
}