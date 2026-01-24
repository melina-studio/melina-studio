package service

import (
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

/*
GetUserTokenUsage(userID uuid.UUID) (consumed int, limit int, percentage float64, err error)
Checks if token reset is needed (based on subscription start date)
Resets TokensConsumedThisCycle if billing cycle rolled over
Queries subscription_plans for user's plan limit
Returns current usage stats
*/
func GetUserTokenUsage(db *gorm.DB, userID uuid.UUID) (consumed int, limit int, percentage float64, err error) {
	subscriptionPlanRepo := repo.NewSubscriptionPlanRepository(db)
	authRepo := repo.NewAuthRepository(db)

	// Get user data
	user, err := authRepo.GetUserByID(userID)
	if err != nil {
		return 0, 0, 0, err
	}

	// Check if billing cycle has rolled over and reset tokens if needed
	now := time.Now()
	needsReset := false

	if user.LastTokenResetDate == nil {
		// First time - initialize reset date
		needsReset = true
	} else {
		// Check if a month has passed since last reset
		nextResetDate := user.LastTokenResetDate.AddDate(0, 1, 0)
		if now.After(nextResetDate) || now.Equal(nextResetDate) {
			needsReset = true
		}
	}

	// Reset tokens if billing cycle rolled over
	if needsReset {
		user.TokensConsumed = 0
		user.LastTokenResetDate = &now
		err = authRepo.UpdateUser(&user)
		if err != nil {
			return 0, 0, 0, err
		}
	}

	// Get subscription plan limits
	subscriptionPlan, err := subscriptionPlanRepo.GetByPlanName(user.Subscription)
	if err != nil {
		return 0, 0, 0, err
	}

	// Calculate usage stats
	consumed = user.TokensConsumed
	limit = subscriptionPlan.MonthlyTokenLimit

	if limit > 0 {
		percentage = (float64(consumed) / float64(limit)) * 100.0
	} else {
		percentage = 0
	}

	return consumed, limit, percentage, nil
}

/*
CheckTokenLimitBeforeRequest(userID uuid.UUID) (allowed bool, usage TokenUsageStats, err error)
Returns false if user >= 100% of limit
Returns usage stats for logging
*/
func CheckTokenLimitBeforeRequest(db *gorm.DB, userID uuid.UUID) (allowed bool, consumed int, limit int, percentage float64, err error) {
	consumed, limit, percentage, err = GetUserTokenUsage(db, userID)
	if err != nil {
		return false, 0, 0, 0, err
	}

	// User is allowed if they haven't reached 100% of their limit
	allowed = percentage < 100.0

	return allowed, consumed, limit, percentage, nil
}

/*
CheckTokenLimitAfterRequest(userID uuid.UUID) (warning bool, blocked bool, usage TokenUsageStats, err error)
Returns warning=true if >= 80% and < 100%
Returns blocked=true if >= 100%
*/
func CheckTokenLimitAfterRequest(db *gorm.DB, userID uuid.UUID) (warning bool, blocked bool, consumed int, limit int, percentage float64, err error) {
	consumed, limit, percentage, err = GetUserTokenUsage(db, userID)
	if err != nil {
		return false, false, 0, 0, 0, err
	}

	// Check if user is blocked (>= 100%)
	if percentage >= 100.0 {
		return false, true, consumed, limit, percentage, nil
	}

	// Check if user should receive a warning (>= 80% and < 100%)
	if percentage >= 80.0 {
		return true, false, consumed, limit, percentage, nil
	}

	// User is under 80%, no warning or block
	return false, false, consumed, limit, percentage, nil
}

/*
IncrementUserTokens(userID uuid.UUID, tokens int) error
Atomically increments TokensConsumedThisCycle
Called after each chat completion
*/
func IncrementUserTokens(db *gorm.DB, userID uuid.UUID, tokens int) error {
	// Use atomic SQL UPDATE to avoid race conditions
	// UPDATE users SET tokens_consumed = tokens_consumed + ? WHERE uuid = ?
	result := db.Model(&models.User{}).
		Where("uuid = ?", userID).
		UpdateColumn("tokens_consumed", gorm.Expr("tokens_consumed + ?", tokens))

	if result.Error != nil {
		return result.Error
	}

	// Check if user exists
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}

	return nil
}
