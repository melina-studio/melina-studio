package v1

import (
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/handlers"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

func registerPayment(r fiber.Router) {
	// Initialize dependencies
	orderRepo := repo.NewOrderRepository(config.DB)
	authRepo := repo.NewAuthRepository(config.DB)
	razorpayClient := libraries.NewRazorpayClient()
	geoService := service.NewGeolocationService()
	paymentService := service.NewPaymentService(orderRepo, authRepo, razorpayClient, geoService)
	paymentHandler := handlers.NewPaymentHandler(paymentService, razorpayClient)

	// Protected routes (require authentication)
	r.Post("/orders/create", paymentHandler.CreateOrder)
	r.Post("/orders/verify", paymentHandler.VerifyPayment)
	r.Get("/orders/history", paymentHandler.GetOrderHistory)
	r.Get("/orders/:orderId", paymentHandler.GetOrderByID)
}

func registerPaymentPublic(r fiber.Router) {
	// Initialize dependencies
	orderRepo := repo.NewOrderRepository(config.DB)
	authRepo := repo.NewAuthRepository(config.DB)
	razorpayClient := libraries.NewRazorpayClient()
	geoService := service.NewGeolocationService()
	paymentService := service.NewPaymentService(orderRepo, authRepo, razorpayClient, geoService)
	paymentHandler := handlers.NewPaymentHandler(paymentService, razorpayClient)

	// Public routes (no authentication required)
	r.Post("/webhooks/razorpay", paymentHandler.RazorpayWebhook)
	r.Get("/pricing", paymentHandler.GetPricing)
}
