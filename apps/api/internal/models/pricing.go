package models

import (
	"fmt"
	"os"
	"strconv"
)

// Plan pricing in USD
const (
	PriceFreeUSD      = 0.0
	PriceProUSD       = 10.0
	PricePremiumUSD   = 30.0
	PriceOnDemandUSD  = 0.0 // Custom pricing
	DefaultUSDToINR   = 83.0
)

type PlanDetails struct {
	Plan          Subscription `json:"plan"`
	Name          string       `json:"name"`
	PriceUSD      float64      `json:"price_usd"`
	TokenLimit    int          `json:"token_limit"`
	Description   string       `json:"description"`
}

// GetPlanPriceUSD returns the USD price for a given subscription plan
func GetPlanPriceUSD(plan Subscription) (float64, error) {
	switch plan {
	case SubscriptionFree:
		return PriceFreeUSD, nil
	case SubscriptionPro:
		return PriceProUSD, nil
	case SubscriptionPremium:
		return PricePremiumUSD, nil
	case SubscriptionOnDemand:
		return PriceOnDemandUSD, fmt.Errorf("on_demand plan requires custom pricing")
	default:
		return 0, fmt.Errorf("invalid subscription plan: %s", plan)
	}
}

// GetUSDToINRRate returns the conversion rate from environment or default
func GetUSDToINRRate() float64 {
	rateStr := os.Getenv("USD_TO_INR_RATE")
	if rateStr == "" {
		return DefaultUSDToINR
	}
	
	rate, err := strconv.ParseFloat(rateStr, 64)
	if err != nil {
		return DefaultUSDToINR
	}
	
	return rate
}

// ConvertUSDToINR converts USD amount to INR in paise (smallest unit)
// For example: $10 USD = 830 INR = 83000 paise
func ConvertUSDToINR(usdAmount float64) int {
	rate := GetUSDToINRRate()
	inrAmount := usdAmount * rate
	// Convert to paise (1 INR = 100 paise)
	return int(inrAmount * 100)
}

// ConvertUSDToCents converts USD amount to cents (smallest unit)
// For example: $10 USD = 1000 cents
func ConvertUSDToCents(usdAmount float64) int {
	return int(usdAmount * 100)
}

// GetPlanDetails returns detailed information about a subscription plan
func GetPlanDetails(plan Subscription) (*PlanDetails, error) {
	priceUSD, err := GetPlanPriceUSD(plan)
	if err != nil {
		return nil, err
	}

	details := &PlanDetails{
		Plan:     plan,
		PriceUSD: priceUSD,
	}

	switch plan {
	case SubscriptionFree:
		details.Name = "Free"
		details.TokenLimit = 100000 // 100K tokens
		details.Description = "Basic AI assistance with 100K tokens per month"
	case SubscriptionPro:
		details.Name = "Pro"
		details.TokenLimit = 1000000 // 1M tokens
		details.Description = "Advanced AI features with 1M tokens per month"
	case SubscriptionPremium:
		details.Name = "Premium"
		details.TokenLimit = 10000000 // 10M tokens
		details.Description = "Premium features with 10M tokens per month"
	case SubscriptionOnDemand:
		details.Name = "On Demand"
		details.TokenLimit = 100000000 // 100M tokens
		details.Description = "Custom enterprise solution with 100M tokens per month"
	default:
		return nil, fmt.Errorf("invalid subscription plan: %s", plan)
	}

	return details, nil
}

// GetAllPlans returns details for all available plans
func GetAllPlans() []*PlanDetails {
	plans := []Subscription{
		SubscriptionFree,
		SubscriptionPro,
		SubscriptionPremium,
		SubscriptionOnDemand,
	}

	var planDetails []*PlanDetails
	for _, plan := range plans {
		if details, err := GetPlanDetails(plan); err == nil {
			planDetails = append(planDetails, details)
		}
	}

	return planDetails
}
