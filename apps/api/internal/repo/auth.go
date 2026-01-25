package repo

import (
	"melina-studio-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthRepo struct {
	db *gorm.DB
}

type AuthRepoInterface interface {
	CreateUser(user *models.User) (uuid.UUID, error)
	GetUserByEmail(email string) (models.User, error)
	GetUserByID(id uuid.UUID) (models.User, error)
	UpdateUser(user *models.User) error
	UpdateUserByID(id uuid.UUID, payload *models.User) error
	DeleteUser(id uuid.UUID) error
	UpdateUserSubscription(userID uuid.UUID, subscription models.Subscription, startDate time.Time) error
}

func NewAuthRepository(db *gorm.DB) AuthRepoInterface {
	return &AuthRepo{db: db}
}

func (r *AuthRepo) CreateUser(user *models.User) (uuid.UUID, error) {
	uuid := uuid.New()
	user.UUID = uuid
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	err := r.db.Create(user).Error
	return uuid, err
}

func (r *AuthRepo) GetUserByEmail(email string) (models.User, error) {
	var user models.User
	err := r.db.Where(&models.User{Email: email}).First(&user).Error
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (r *AuthRepo) GetUserByID(id uuid.UUID) (models.User, error) {
	var user models.User
	err := r.db.Where(&models.User{UUID: id}).First(&user).Error
	if err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (r *AuthRepo) UpdateUser(user *models.User) error {
	return r.db.Model(&models.User{UUID: user.UUID}).Updates(user).Error
}

func (r *AuthRepo) UpdateUserByID(id uuid.UUID, payload *models.User) error {
	return r.db.Model(&models.User{UUID: id}).Updates(payload).Error
}

func (r *AuthRepo) DeleteUser(id uuid.UUID) error {
	return r.db.Delete(&models.User{UUID: id}).Error
}

// UpdateUserSubscription updates the user's subscription plan and start date
func (r *AuthRepo) UpdateUserSubscription(userID uuid.UUID, subscription models.Subscription, startDate time.Time) error {
	updates := map[string]interface{}{
		"subscription":            subscription,
		"subscription_start_date": startDate,
		"tokens_consumed":         0, // Reset token consumption on new subscription
		"last_token_reset_date":   startDate,
	}
	return r.db.Model(&models.User{}).Where("uuid = ?", userID).Updates(updates).Error
}
