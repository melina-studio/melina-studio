package service

import (
	"fmt"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/repo"
	"time"

	"github.com/google/uuid"
)

type PaymentService struct {
	orderRepo      repo.OrderRepoInterface
	authRepo       repo.AuthRepoInterface
	razorpayClient *libraries.RazorpayClient
	geoService     *GeolocationService
}

func NewPaymentService(
	orderRepo repo.OrderRepoInterface,
	authRepo repo.AuthRepoInterface,
	razorpayClient *libraries.RazorpayClient,
	geoService *GeolocationService,
) *PaymentService {
	return &PaymentService{
		orderRepo:      orderRepo,
		authRepo:       authRepo,
		razorpayClient: razorpayClient,
		geoService:     geoService,
	}
}

// DetectUserCurrency detects the user's currency based on their IP address
func (ps *PaymentService) DetectUserCurrency(ipAddress string) (currency, country string, err error) {
	country, err = ps.geoService.GetCountryFromIP(ipAddress)
	if err != nil {
		// Default to US/USD on error
		return "USD", "US", nil
	}

	currency = ps.geoService.GetCurrencyForCountry(country)
	return currency, country, nil
}

// CalculatePrice calculates the price for a plan in the specified currency
// Returns amount in smallest currency unit (paise/cents) and display amount
func (ps *PaymentService) CalculatePrice(plan models.Subscription, currency string) (amountInSmallestUnit int, displayAmount float64, err error) {
	priceUSD, err := models.GetPlanPriceUSD(plan)
	if err != nil {
		return 0, 0, err
	}

	displayAmount = priceUSD

	if currency == "INR" {
		amountInSmallestUnit = models.ConvertUSDToINR(priceUSD)
	} else {
		// USD or any other currency - use cents
		amountInSmallestUnit = models.ConvertUSDToCents(priceUSD)
	}

	return amountInSmallestUnit, displayAmount, nil
}

// CreateOrder creates a new order for a user
func (ps *PaymentService) CreateOrder(userID uuid.UUID, plan models.Subscription, ipAddress string) (*models.Order, map[string]interface{}, error) {
	// Validate plan
	if plan == models.SubscriptionFree {
		return nil, nil, fmt.Errorf("cannot create order for free plan")
	}

	// Detect currency
	currency, country, err := ps.DetectUserCurrency(ipAddress)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to detect currency: %w", err)
	}

	// Calculate price
	amountCharged, amountUSD, err := ps.CalculatePrice(plan, currency)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to calculate price: %w", err)
	}

	// Generate unique receipt ID
	receipt := fmt.Sprintf("rcpt_%s_%d", userID.String()[:8], time.Now().Unix())

	// Create order in database
	order := &models.Order{
		UUID:             uuid.New(),
		UserID:           userID,
		SubscriptionPlan: plan,
		AmountUSD:        amountUSD,
		AmountCharged:    amountCharged,
		Currency:         currency,
		UserCountry:      country,
		Receipt:          receipt,
		Status:           models.OrderStatusPending,
	}

	// Create Razorpay order
	notes := map[string]interface{}{
		"user_id": userID.String(),
		"plan":    string(plan),
	}

	razorpayOrder, err := ps.razorpayClient.CreateOrder(amountCharged, currency, receipt, notes)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create razorpay order: %w", err)
	}

	// Extract Razorpay order ID
	razorpayOrderID, ok := razorpayOrder["id"].(string)
	if !ok {
		return nil, nil, fmt.Errorf("invalid razorpay order response")
	}

	order.RazorpayOrderID = razorpayOrderID

	// Save order to database
	if err := ps.orderRepo.CreateOrder(order); err != nil {
		return nil, nil, fmt.Errorf("failed to save order: %w", err)
	}

	return order, razorpayOrder, nil
}

// VerifyAndProcessPayment verifies a payment and processes the subscription upgrade
func (ps *PaymentService) VerifyAndProcessPayment(razorpayOrderID, razorpayPaymentID, razorpaySignature string) (*models.Order, error) {
	// Verify signature
	if !ps.razorpayClient.VerifyPaymentSignature(razorpayOrderID, razorpayPaymentID, razorpaySignature) {
		return nil, fmt.Errorf("invalid payment signature")
	}

	// Get order from database
	order, err := ps.orderRepo.GetOrderByRazorpayID(razorpayOrderID)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	// Check if order is already processed
	if order.Status == models.OrderStatusSuccess {
		return &order, nil
	}

	// Fetch payment details from Razorpay
	payment, err := ps.razorpayClient.FetchPayment(razorpayPaymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch payment details: %w", err)
	}

	// Extract payment method
	paymentMethod := ""
	if method, ok := payment["method"].(string); ok {
		paymentMethod = method
	}

	// Update order status
	if err := ps.orderRepo.UpdateOrderStatus(order.UUID, models.OrderStatusSuccess, razorpayPaymentID, paymentMethod); err != nil {
		return nil, fmt.Errorf("failed to update order status: %w", err)
	}

	// Process successful payment
	if err := ps.ProcessSuccessfulPayment(order.UUID); err != nil {
		return nil, fmt.Errorf("failed to process payment: %w", err)
	}

	// Fetch updated order
	updatedOrder, err := ps.orderRepo.GetOrderByID(order.UUID)
	if err != nil {
		return nil, err
	}

	return &updatedOrder, nil
}

// ProcessSuccessfulPayment upgrades the user's subscription after successful payment
func (ps *PaymentService) ProcessSuccessfulPayment(orderID uuid.UUID) error {
	// Get order
	order, err := ps.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return fmt.Errorf("order not found: %w", err)
	}

	// Update user subscription
	startDate := time.Now()
	if err := ps.authRepo.UpdateUserSubscription(order.UserID, order.SubscriptionPlan, startDate); err != nil {
		return fmt.Errorf("failed to update user subscription: %w", err)
	}

	return nil
}

// GetUserOrderHistory retrieves the order history for a user
func (ps *PaymentService) GetUserOrderHistory(userID uuid.UUID, limit, offset int) ([]models.Order, int64, error) {
	return ps.orderRepo.GetUserOrders(userID, limit, offset)
}

// GetOrderByID retrieves an order by its ID
func (ps *PaymentService) GetOrderByID(orderID uuid.UUID, userID uuid.UUID) (*models.Order, error) {
	order, err := ps.orderRepo.GetOrderByID(orderID)
	if err != nil {
		return nil, err
	}

	// Verify the order belongs to the user
	if order.UserID != userID {
		return nil, fmt.Errorf("unauthorized access to order")
	}

	return &order, nil
}
