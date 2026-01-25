package repo

import (
	"melina-studio-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderRepoInterface interface {
	CreateOrder(order *models.Order) error
	GetOrderByID(orderID uuid.UUID) (models.Order, error)
	GetOrderByRazorpayID(razorpayOrderID string) (models.Order, error)
	GetUserOrders(userID uuid.UUID, limit, offset int) ([]models.Order, int64, error)
	UpdateOrderStatus(orderID uuid.UUID, status models.OrderStatus, paymentID, paymentMethod string) error
	GetOrderStats(userID uuid.UUID) (totalSpent float64, orderCount int, err error)
}

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepoInterface {
	return &OrderRepository{db: db}
}

// CreateOrder creates a new order in the database
func (r *OrderRepository) CreateOrder(order *models.Order) error {
	if order.UUID == uuid.Nil {
		order.UUID = uuid.New()
	}
	return r.db.Create(order).Error
}

// GetOrderByID retrieves an order by its UUID
func (r *OrderRepository) GetOrderByID(orderID uuid.UUID) (models.Order, error) {
	var order models.Order
	err := r.db.Preload("User").Where("uuid = ?", orderID).First(&order).Error
	return order, err
}

// GetOrderByRazorpayID retrieves an order by its Razorpay order ID
func (r *OrderRepository) GetOrderByRazorpayID(razorpayOrderID string) (models.Order, error) {
	var order models.Order
	err := r.db.Preload("User").Where("razorpay_order_id = ?", razorpayOrderID).First(&order).Error
	return order, err
}

// GetUserOrders retrieves all orders for a specific user with pagination
func (r *OrderRepository) GetUserOrders(userID uuid.UUID, limit, offset int) ([]models.Order, int64, error) {
	var orders []models.Order
	var total int64

	// Count total orders
	if err := r.db.Model(&models.Order{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated orders
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&orders).Error

	return orders, total, err
}

// UpdateOrderStatus updates the status of an order and adds payment details
func (r *OrderRepository) UpdateOrderStatus(orderID uuid.UUID, status models.OrderStatus, paymentID, paymentMethod string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	if paymentID != "" {
		updates["razorpay_payment_id"] = paymentID
	}

	if paymentMethod != "" {
		updates["payment_method"] = paymentMethod
	}

	return r.db.Model(&models.Order{}).Where("uuid = ?", orderID).Updates(updates).Error
}

// GetOrderStats returns total amount spent and order count for a user
func (r *OrderRepository) GetOrderStats(userID uuid.UUID) (totalSpent float64, orderCount int, err error) {
	var result struct {
		TotalSpent float64
		OrderCount int64
	}

	err = r.db.Model(&models.Order{}).
		Select("COALESCE(SUM(amount_usd), 0) as total_spent, COUNT(*) as order_count").
		Where("user_id = ? AND status = ?", userID, models.OrderStatusSuccess).
		Scan(&result).Error

	return result.TotalSpent, int(result.OrderCount), err
}
