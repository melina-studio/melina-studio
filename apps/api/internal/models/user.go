package models

import (
	"time"

	"github.com/google/uuid"
)

type Subscription string

const (
	SubscriptionFree     Subscription = "free"
	SubscriptionPro      Subscription = "pro"
	SubscriptionPremium  Subscription = "premium"
	SubscriptionOnDemand Subscription = "on_demand"
)

type LoginMethod string

const (
	LoginMethodEmail  LoginMethod = "email"
	LoginMethodGoogle LoginMethod = "google"
	LoginMethodGithub LoginMethod = "github"
)

type User struct {
	UUID                  uuid.UUID    `gorm:"column:uuid;type:uuid;primaryKey" json:"uuid"`
	Email                 string       `gorm:"not null;unique" json:"email"`
	Password              *string      `gorm:"type:varchar(255)" json:"password,omitempty"` // Optional - nil for OAuth users
	FirstName             string       `gorm:"not null" json:"first_name"`
	LastName              string       `gorm:"not null" json:"last_name"`
	Avatar                string       `gorm:"type:varchar(255)" json:"avatar,omitempty"`
	LoginMethod           LoginMethod  `gorm:"not null;default:'email'" json:"login_method"`
	Subscription          Subscription `gorm:"not null;default:'free'" json:"subscription"`
	SubscriptionStartDate *time.Time   `gorm:"column:subscription_start_date" json:"subscription_start_date,omitempty"`
	TokensConsumed        int          `gorm:"column:tokens_consumed;not null;default:0" json:"tokens_consumed"`
	LastTokenResetDate    *time.Time   `gorm:"column:last_token_reset_date" json:"last_token_reset_date,omitempty"`
	CreatedAt             time.Time    `json:"created_at"`
	UpdatedAt             time.Time    `json:"updated_at"`
}
