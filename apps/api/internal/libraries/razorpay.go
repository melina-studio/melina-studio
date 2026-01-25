package libraries

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/razorpay/razorpay-go"
)

type RazorpayClient struct {
	client *razorpay.Client
}

func NewRazorpayClient() *RazorpayClient {
	return &RazorpayClient{
		client: razorpay.NewClient(os.Getenv("RAZORPAY_CLIENT_API_KEY"), os.Getenv("RAZORPAY_CLIENT_SECRET_KEY")),
	}
}

// CreateOrder creates a new order in Razorpay
// amount: amount in smallest currency unit (paise for INR, cents for USD)
// currency: "INR" or "USD"
// receipt: unique receipt ID for idempotency
// notes: additional metadata
func (rc *RazorpayClient) CreateOrder(amount int, currency, receipt string, notes map[string]interface{}) (map[string]interface{}, error) {
	data := map[string]interface{}{
		"amount":   amount,
		"currency": currency,
		"receipt":  receipt,
	}

	if notes != nil {
		data["notes"] = notes
	}

	body, err := rc.client.Order.Create(data, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create razorpay order: %w", err)
	}

	return body, nil
}

// VerifyPaymentSignature verifies the payment signature from Razorpay
// This is used to verify webhook signatures and payment completion
func (rc *RazorpayClient) VerifyPaymentSignature(orderID, paymentID, signature string) bool {
	secret := os.Getenv("RAZORPAY_CLIENT_SECRET_KEY")

	// Create the message to verify: order_id|payment_id
	message := orderID + "|" + paymentID

	// Create HMAC SHA256 hash
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	// Compare signatures
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

// VerifyWebhookSignature verifies the webhook signature from Razorpay
func (rc *RazorpayClient) VerifyWebhookSignature(body []byte, signature string) bool {
	secret := os.Getenv("RAZORPAY_WEBHOOK_SECRET")

	// Create HMAC SHA256 hash
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(body)
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	// Compare signatures
	return hmac.Equal([]byte(expectedSignature), []byte(signature))
}

// FetchPayment retrieves payment details from Razorpay
func (rc *RazorpayClient) FetchPayment(paymentID string) (map[string]interface{}, error) {
	body, err := rc.client.Payment.Fetch(paymentID, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch payment: %w", err)
	}
	return body, nil
}

// FetchOrder retrieves order details from Razorpay
func (rc *RazorpayClient) FetchOrder(orderID string) (map[string]interface{}, error) {
	body, err := rc.client.Order.Fetch(orderID, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch order: %w", err)
	}
	return body, nil
}

// GetRazorpayKey returns the Razorpay API key (for frontend use)
func (rc *RazorpayClient) GetRazorpayKey() string {
	return os.Getenv("RAZORPAY_CLIENT_API_KEY")
}
