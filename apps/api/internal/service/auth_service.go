package service

import (
	"melina-studio-backend/internal/auth"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"

	"github.com/google/uuid"
)

type AuthService struct {
	refreshTokenRepo repo.RefreshTokenRepoInterface
}

func NewAuthService(refreshTokenRepo repo.RefreshTokenRepoInterface) *AuthService {
	return &AuthService{refreshTokenRepo: refreshTokenRepo}
}

// CreateAndStoreRefreshToken generates a JWT refresh token and stores metadata in DB
func (s *AuthService) CreateAndStoreRefreshToken(userID uuid.UUID, userAgent, ipAddress string) (string, error) {
	// Generate JWT refresh token with unique ID
	refreshToken, tokenID, err := auth.GenerateRefreshToken(userID.String())
	if err != nil {
		return "", err
	}

	// Store token metadata in DB for revocation tracking
	refreshTokenModel := &models.RefreshToken{
		UserID:    userID,
		TokenID:   tokenID,
		ExpiresAt: auth.GetRefreshTokenExpiry(),
		UserAgent: userAgent,
		IPAddress: ipAddress,
	}

	if err := s.refreshTokenRepo.Create(refreshTokenModel); err != nil {
		return "", err
	}

	return refreshToken, nil
}

// ValidateAndGetToken validates a refresh token JWT and checks if it's revoked
func (s *AuthService) ValidateAndGetToken(tokenString string) (*auth.JWTClaims, *models.RefreshToken, error) {
	// Validate the JWT first
	claims, err := auth.ValidateRefreshToken(tokenString)
	if err != nil {
		return nil, nil, err
	}

	// Check if token is revoked in DB
	storedToken, err := s.refreshTokenRepo.FindByTokenID(claims.ID)
	if err != nil {
		return nil, nil, err
	}

	return claims, storedToken, nil
}

// RevokeToken revokes a refresh token by its DB ID
func (s *AuthService) RevokeToken(id uuid.UUID) error {
	return s.refreshTokenRepo.Revoke(id)
}

// RevokeTokenByJTI revokes a token by its JWT ID
func (s *AuthService) RevokeTokenByJTI(tokenString string) error {
	claims, err := auth.ValidateRefreshToken(tokenString)
	if err != nil {
		return nil // Invalid token, nothing to revoke
	}
	return s.refreshTokenRepo.RevokeByTokenID(claims.ID)
}

// RevokeAllForUser revokes all refresh tokens for a user
func (s *AuthService) RevokeAllForUser(userID uuid.UUID) error {
	return s.refreshTokenRepo.RevokeAllForUser(userID)
}

// GetActiveSessions returns all active sessions for a user
func (s *AuthService) GetActiveSessions(userID uuid.UUID) ([]models.RefreshToken, error) {
	return s.refreshTokenRepo.GetActiveSessionsForUser(userID)
}

// RevokeSession revokes a specific session for a user
func (s *AuthService) RevokeSession(userID, sessionID uuid.UUID) error {
	return s.refreshTokenRepo.RevokeByID(userID, sessionID)
}
