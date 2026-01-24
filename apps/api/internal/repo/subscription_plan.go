package repo

import (
	"melina-studio-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionPlanRepo struct {
	db *gorm.DB
}

type SubscriptionPlanRepoInterface interface {
	Create(plan *models.SubscriptionTier) error
	GetByPlanName(planName models.Subscription) (models.SubscriptionTier, error)
	GetAllPlans() ([]models.SubscriptionTier, error)
	UpdatePlan(plan *models.SubscriptionTier) error
}

func NewSubscriptionPlanRepository(db *gorm.DB) SubscriptionPlanRepoInterface {
	return &SubscriptionPlanRepo{db: db}
}

func (r *SubscriptionPlanRepo) Create(plan *models.SubscriptionTier) error {
	if plan.UUID == uuid.Nil {
		plan.UUID = uuid.New()
	}
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()
	err := r.db.Create(plan).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *SubscriptionPlanRepo) GetByPlanName(planName models.Subscription) (models.SubscriptionTier, error) {
	var plan models.SubscriptionTier
	err := r.db.Where(&models.SubscriptionTier{PlanName: planName}).First(&plan).Error
	return plan, err
}

func (r *SubscriptionPlanRepo) GetAllPlans() ([]models.SubscriptionTier, error) {
	var plans []models.SubscriptionTier
	err := r.db.Order("monthly_token_limit ASC").Find(&plans).Error
	return plans, err
}

func (r *SubscriptionPlanRepo) UpdatePlan(plan *models.SubscriptionTier) error {
	return r.db.Model(&models.SubscriptionTier{UUID: plan.UUID}).Updates(plan).Error
}
