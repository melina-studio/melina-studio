package repo

import (
	"melina-studio-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RefreshTokenRepo struct {
	db *gorm.DB
}

type RefreshTokenRepoInterface interface {
	Create(token *models.RefreshToken) error
	FindByTokenID(tokenID string) (*models.RefreshToken, error)
	UpdateLastUsed(id uuid.UUID) error
	Revoke(id uuid.UUID) error
	RevokeByTokenID(tokenID string) error
	RevokeAllForUser(userID uuid.UUID) error
	DeleteExpired() error
	GetActiveSessionsForUser(userID uuid.UUID) ([]models.RefreshToken, error)
	RevokeByID(userID uuid.UUID, tokenID uuid.UUID) error
}

func NewRefreshTokenRepository(db *gorm.DB) RefreshTokenRepoInterface {
	return &RefreshTokenRepo{db: db}
}

// Create stores a new refresh token
func (r *RefreshTokenRepo) Create(token *models.RefreshToken) error {
	if token.ID == uuid.Nil {
		token.ID = uuid.New()
	}
	token.CreatedAt = time.Now()
	return r.db.Create(token).Error
}

// FindByTokenID retrieves a token by its JWT ID (not revoked and not expired)
func (r *RefreshTokenRepo) FindByTokenID(tokenID string) (*models.RefreshToken, error) {
	var token models.RefreshToken
	err := r.db.Where("token_id = ? AND revoked = ? AND expires_at > ?",
		tokenID, false, time.Now()).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// RevokeByTokenID revokes a token by its JWT ID
func (r *RefreshTokenRepo) RevokeByTokenID(tokenID string) error {
	return r.db.Model(&models.RefreshToken{}).
		Where("token_id = ?", tokenID).
		Update("revoked", true).Error
}

// UpdateLastUsed updates the last_used_at timestamp
func (r *RefreshTokenRepo) UpdateLastUsed(id uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&models.RefreshToken{}).
		Where("id = ?", id).
		Update("last_used_at", now).Error
}

// Revoke marks a token as revoked
func (r *RefreshTokenRepo) Revoke(id uuid.UUID) error {
	return r.db.Model(&models.RefreshToken{}).
		Where("id = ?", id).
		Update("revoked", true).Error
}

// RevokeAllForUser revokes all refresh tokens for a user (global logout)
func (r *RefreshTokenRepo) RevokeAllForUser(userID uuid.UUID) error {
	return r.db.Model(&models.RefreshToken{}).
		Where("user_id = ?", userID).
		Update("revoked", true).Error
}

// RevokeByID revokes a specific token for a user (per-device logout)
func (r *RefreshTokenRepo) RevokeByID(userID uuid.UUID, tokenID uuid.UUID) error {
	return r.db.Model(&models.RefreshToken{}).
		Where("id = ? AND user_id = ?", tokenID, userID).
		Update("revoked", true).Error
}

// DeleteExpired removes expired tokens from the database
func (r *RefreshTokenRepo) DeleteExpired() error {
	return r.db.Where("expires_at < ?", time.Now()).
		Delete(&models.RefreshToken{}).Error
}

// GetActiveSessionsForUser returns all active sessions for a user
func (r *RefreshTokenRepo) GetActiveSessionsForUser(userID uuid.UUID) ([]models.RefreshToken, error) {
	var tokens []models.RefreshToken
	err := r.db.Where("user_id = ? AND revoked = ? AND expires_at > ?",
		userID, false, time.Now()).
		Order("created_at DESC").
		Find(&tokens).Error
	return tokens, err
}
