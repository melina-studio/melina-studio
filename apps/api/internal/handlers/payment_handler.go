package handlers

import (
	"encoding/json"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/models"
	"melina-studio-backend/internal/service"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type PaymentHandler struct {
	paymentService *service.PaymentService
	razorpayClient *libraries.RazorpayClient
}

func NewPaymentHandler(paymentService *service.PaymentService, razorpayClient *libraries.RazorpayClient) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
		razorpayClient: razorpayClient,
	}
}

// CreateOrderRequest represents the request body for creating an order
type CreateOrderRequest struct {
	Plan string `json:"plan"`
}

// CreateOrderResponse represents the response for order creation
type CreateOrderResponse struct {
	OrderID         string  `json:"order_id"`
	RazorpayOrderID string  `json:"razorpay_order_id"`
	Amount          int     `json:"amount"`
	Currency        string  `json:"currency"`
	RazorpayKey     string  `json:"razorpay_key"`
	AmountUSD       float64 `json:"amount_usd"`
}

// VerifyPaymentRequest represents the request body for payment verification
type VerifyPaymentRequest struct {
	RazorpayOrderID   string `json:"razorpay_order_id"`
	RazorpayPaymentID string `json:"razorpay_payment_id"`
	RazorpaySignature string `json:"razorpay_signature"`
}

// VerifyPaymentResponse represents the response for payment verification
type VerifyPaymentResponse struct {
	Success      bool   `json:"success"`
	Subscription string `json:"subscription"`
	Message      string `json:"message"`
}

// CreateOrder creates a new order for subscription upgrade
func (h *PaymentHandler) CreateOrder(c *fiber.Ctx) error {
	// Get user ID from context (set by auth middleware)
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse request body
	var req CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate plan
	plan := models.Subscription(req.Plan)
	if plan != models.SubscriptionPro && plan != models.SubscriptionPremium {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid subscription plan. Only 'pro' and 'premium' are allowed.",
		})
	}

	// Get user IP address
	ipAddress := c.IP()
	// Check for X-Forwarded-For header (for proxies/load balancers)
	if forwardedFor := c.Get("X-Forwarded-For"); forwardedFor != "" {
		ipAddress = forwardedFor
	}

	// Create order
	order, _, err := h.paymentService.CreateOrder(userID, plan, ipAddress)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Prepare response
	response := CreateOrderResponse{
		OrderID:         order.UUID.String(),
		RazorpayOrderID: order.RazorpayOrderID,
		Amount:          order.AmountCharged,
		Currency:        order.Currency,
		RazorpayKey:     h.razorpayClient.GetRazorpayKey(),
		AmountUSD:       order.AmountUSD,
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// VerifyPayment verifies the payment and upgrades the user's subscription
func (h *PaymentHandler) VerifyPayment(c *fiber.Ctx) error {
	// Get user ID from context
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse request body
	var req VerifyPaymentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Verify and process payment
	order, err := h.paymentService.VerifyAndProcessPayment(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Verify the order belongs to the user
	if order.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Unauthorized access to order",
		})
	}

	// Prepare response
	response := VerifyPaymentResponse{
		Success:      true,
		Subscription: string(order.SubscriptionPlan),
		Message:      "Payment verified successfully. Your subscription has been upgraded.",
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// GetOrderHistory retrieves the user's order history
func (h *PaymentHandler) GetOrderHistory(c *fiber.Ctx) error {
	// Get user ID from context
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse query parameters
	limit := 10
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// Get order history
	orders, total, err := h.paymentService.GetUserOrderHistory(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve order history",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"orders": orders,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetOrderByID retrieves a specific order by ID
func (h *PaymentHandler) GetOrderByID(c *fiber.Ctx) error {
	// Get user ID from context
	userIDStr, ok := c.Locals("userID").(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse order ID from URL parameter
	orderIDStr := c.Params("orderId")
	orderID, err := uuid.Parse(orderIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid order ID",
		})
	}

	// Get order
	order, err := h.paymentService.GetOrderByID(orderID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"order": order,
	})
}

// RazorpayWebhook handles Razorpay webhook events
func (h *PaymentHandler) RazorpayWebhook(c *fiber.Ctx) error {
	// Get the webhook signature from headers
	signature := c.Get("X-Razorpay-Signature")
	
	// Read the raw body
	body := c.Body()

	// Verify webhook signature if secret is configured
	if signature != "" {
		if !h.razorpayClient.VerifyWebhookSignature(body, signature) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid signature",
			})
		}
	}

	// Parse webhook payload
	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid payload",
		})
	}

	// Get event type
	event, ok := payload["event"].(string)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing event type",
		})
	}

	// Log the event for monitoring
	// In production, you can add specific handling for different events:
	// - payment.captured: Send confirmation email, log analytics
	// - payment.failed: Send failure notification, update order status
	// - order.paid: Backup verification if frontend verification fails
	// For now, the main payment verification is handled by the /orders/verify endpoint

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "ok",
		"event":  event,
	})
}

// GetPricing returns pricing information for all plans
func (h *PaymentHandler) GetPricing(c *fiber.Ctx) error {
	// Get user IP address
	ipAddress := c.IP()
	if forwardedFor := c.Get("X-Forwarded-For"); forwardedFor != "" {
		ipAddress = forwardedFor
	}

	// Detect currency
	currency, country, err := h.paymentService.DetectUserCurrency(ipAddress)
	if err != nil {
		currency = "USD"
		country = "US"
	}

	// Get all plans
	allPlans := models.GetAllPlans()

	// Calculate prices for each plan
	type PlanPricing struct {
		ID            string  `json:"id"`
		Name          string  `json:"name"`
		PriceDisplay  string  `json:"price_display"`
		PriceCharged  int     `json:"price_charged"`
		Currency      string  `json:"currency"`
		TokenLimit    int     `json:"token_limit"`
		Description   string  `json:"description"`
	}

	var plans []PlanPricing
	for _, plan := range allPlans {
		// Skip free plan
		if plan.Plan == models.SubscriptionFree {
			continue
		}

		// Skip on-demand for now
		if plan.Plan == models.SubscriptionOnDemand {
			continue
		}

		priceCharged, _, err := h.paymentService.CalculatePrice(plan.Plan, currency)
		if err != nil {
			continue
		}

		priceDisplay := "$" + strconv.FormatFloat(plan.PriceUSD, 'f', 0, 64)

		plans = append(plans, PlanPricing{
			ID:           string(plan.Plan),
			Name:         plan.Name,
			PriceDisplay: priceDisplay,
			PriceCharged: priceCharged,
			Currency:     currency,
			TokenLimit:   plan.TokenLimit,
			Description:  plan.Description,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"currency": currency,
		"country":  country,
		"plans":    plans,
	})
}
