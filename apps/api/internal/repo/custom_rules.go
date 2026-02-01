package repo

import (
	"errors"
	"log"
	"melina-studio-backend/internal/models"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CustomRulesRepo struct {
	db *gorm.DB
}

type CustomRulesRepoInterface interface {
	GetCustomRules(userID uuid.UUID) (models.CustomRules, error)
	GetFormattedCustomRules(userID uuid.UUID) (string, error)
	SaveCustomRules(userID uuid.UUID, rules string) error
}

func NewCustomRulesRepository(db *gorm.DB) CustomRulesRepoInterface {
	return &CustomRulesRepo{db: db}
}

// GetCustomRules fetches the custom rules for the user
func (r *CustomRulesRepo) GetCustomRules(userID uuid.UUID) (models.CustomRules, error) {
	var customRules models.CustomRules
	err := r.db.Preload("User").Where(&models.CustomRules{UserID: userID}).First(&customRules).Error
	if err != nil {
		return models.CustomRules{}, err
	}
	return customRules, nil
}

// SaveCustomRules saves the custom rules for the user
func (r *CustomRulesRepo) SaveCustomRules(userID uuid.UUID, rules string) error {
	// get the existing custom rules for the user
	existingCustomRules, err := r.GetCustomRules(userID)
	if err != nil {
		// if no record found, create new custom rules
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Println("creating new custom rules")
			return r.db.Create(&models.CustomRules{
				UUID:   uuid.New(),
				UserID: userID,
				Rules:  rules,
			}).Error
		}
		return err
	}

	// if the custom rules already exist, update them
	existingCustomRules.Rules = rules
	existingCustomRules.UpdatedAt = time.Now()
	return r.db.Save(&existingCustomRules).Error
}

// GetFormattedCustomRules formats the custom rules for the user
func (r *CustomRulesRepo) GetFormattedCustomRules(userID uuid.UUID) (string, error) {
	customRules, err := r.GetCustomRules(userID)
	if err != nil {
		return "", err
	}

	var sb strings.Builder
	sb.WriteString("<USER_CUSTOM_RULES>\n")
	sb.WriteString("The user has provided these custom rules for you to follow, If these rules make sense, follow them, otherwise ignore them.\n")
	sb.WriteString("<RULES>\n")
	sb.WriteString(customRules.Rules)
	sb.WriteString("</RULES>\n")
	sb.WriteString("\n</USER_CUSTOM_RULES>\n")

	return sb.String(), nil
}
