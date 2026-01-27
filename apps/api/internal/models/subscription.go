package models

import (
	"time"

	"github.com/google/uuid"
)

/*
Free: 200,000 tokens/month
Pro: 2,000,000 tokens/month
Premium: 20,000,000 tokens/month
On Demand: 200,000,000 tokens/month

  ┌───────────┬─────────────┬────────┐
  │   Plan    │ Token Limit │ Price  │
  ├───────────┼─────────────┼────────┤
  │ free      │ 200K/month  │ $0     │
  ├───────────┼─────────────┼────────┤
  │ pro       │ 2M/month    │ $10    │
  ├───────────┼─────────────┼────────┤
  │ premium   │ 20M/month   │ $30    │
  ├───────────┼─────────────┼────────┤
  │ on_demand │ 200M/month  │ Custom │
  └───────────┴─────────────┴────────┘

*/

type SubscriptionTier struct {
	UUID              uuid.UUID    `gorm:"primaryKey" json:"uuid"`
	PlanName          Subscription `gorm:"unique;not null" json:"plan_name"`    // free, pro, premium, on_demand
	MonthlyTokenLimit int          `gorm:"not null" json:"monthly_token_limit"` // e.g., 1000000 for 1M tokens
	InputTokenLimit   *int         `gorm:"null" json:"input_token_limit"`       // Optional separate input limit
	OutputTokenLimit  *int         `gorm:"null" json:"output_token_limit"`      // Optional separate output limit
	Description       string       `gorm:"type:text" json:"description"`
	CreatedAt         time.Time    `json:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at"`
}
