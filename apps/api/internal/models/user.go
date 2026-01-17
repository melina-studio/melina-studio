package models

import (
	"time"

	"github.com/google/uuid"
)

type Subscription string

const (
	SubscriptionFree Subscription = "free"
	SubscriptionPro Subscription = "pro"
	SubscriptionEnterprise Subscription = "enterprise"
)

type User struct {
	UUID      uuid.UUID `gorm:"column:uuid;type:uuid;primaryKey" json:"uuid"`
	Email     string    `gorm:"not null" json:"email"`
	Password  string    `gorm:"not null" json:"password"`
	FirstName string    `gorm:"not null" json:"first_name"`
	LastName  string    `gorm:"not null" json:"last_name"`
	Subscription Subscription `gorm:"not null;default:'free'" json:"subscription"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}