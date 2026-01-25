package models

import (
	"time"

	"github.com/google/uuid"
)

type OrderStatus string

const (
	OrderStatusPending  OrderStatus = "pending"
	OrderStatusSuccess  OrderStatus = "success"
	OrderStatusFailed   OrderStatus = "failed"
	OrderStatusRefunded OrderStatus = "refunded"
)

type Order struct {
	UUID              uuid.UUID    `gorm:"primaryKey" json:"uuid"`
	UserID            uuid.UUID    `gorm:"not null;index" json:"user_id"`
	User              User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	SubscriptionPlan  Subscription `gorm:"not null" json:"subscription_plan"`
	AmountUSD         float64      `gorm:"not null" json:"amount_usd"`         // Original price in USD
	AmountCharged     int          `gorm:"not null" json:"amount_charged"`     // Amount charged in smallest currency unit (paise/cents)
	Currency          string       `gorm:"not null" json:"currency"`           // INR or USD
	RazorpayOrderID   string       `gorm:"unique;not null" json:"razorpay_order_id"`
	RazorpayPaymentID *string      `gorm:"null" json:"razorpay_payment_id,omitempty"`
	Status            OrderStatus  `gorm:"not null;default:'pending'" json:"status"`
	PaymentMethod     *string      `gorm:"null" json:"payment_method,omitempty"` // card, netbanking, upi, etc.
	UserCountry       string       `gorm:"not null" json:"user_country"`         // Country code (IN, US, etc.)
	Receipt           string       `gorm:"not null" json:"receipt"`              // Unique receipt ID for idempotency
	CreatedAt         time.Time    `json:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at"`
}
