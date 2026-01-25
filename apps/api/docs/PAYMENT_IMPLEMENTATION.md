# Razorpay Payment Integration - Implementation Summary

## Overview

Successfully implemented a complete pricing/orders module with Razorpay integration that displays USD pricing to users but charges in INR/USD based on geolocation.

## Architecture

### Hybrid Billing System
- **Frontend Display**: Always shows prices in USD ($10 for Pro, $30 for Premium)
- **Backend Processing**: Detects user location via IP geolocation
- **Currency Conversion**: Automatically converts to INR for Indian users (1 USD = 83 INR)
- **Razorpay Integration**: Creates orders in the appropriate currency

## Implementation Details

### 1. Database Models

#### Order Model (`apps/api/internal/models/order.go`)
- Tracks all payment orders with complete details
- Fields: UUID, UserID, SubscriptionPlan, AmountUSD, AmountCharged, Currency, RazorpayOrderID, RazorpayPaymentID, Status, PaymentMethod, UserCountry, Receipt
- Status enum: pending, success, failed, refunded

#### Pricing Model (`apps/api/internal/models/pricing.go`)
- Centralized pricing configuration
- USD prices: Pro=$10, Premium=$30
- Conversion functions for INR (paise) and USD (cents)
- Helper functions: `GetPlanPriceUSD()`, `ConvertUSDToINR()`, `GetPlanDetails()`

#### User Model Updates (`apps/api/internal/models/user.go`)
- Added `Country` field for caching user location

### 2. Repository Layer

#### Order Repository (`apps/api/internal/repo/order.go`)
- `CreateOrder()` - Creates new order
- `GetOrderByID()` - Retrieves order by UUID
- `GetOrderByRazorpayID()` - Retrieves order by Razorpay order ID
- `GetUserOrders()` - Gets user's order history with pagination
- `UpdateOrderStatus()` - Updates order status and payment details
- `GetOrderStats()` - Returns total spent and order count

#### Auth Repository Updates (`apps/api/internal/repo/auth.go`)
- `UpdateUserSubscription()` - Updates user subscription and resets token consumption

### 3. Services

#### Geolocation Service (`apps/api/internal/service/geolocation_service.go`)
- `GetCountryFromIP()` - Detects country from IP address using ip-api.com
- `GetCurrencyForCountry()` - Returns appropriate currency (INR for India, USD for others)
- In-memory caching to reduce API calls
- Handles localhost/private IPs for development

#### Payment Service (`apps/api/internal/service/payment_service.go`)
- `DetectUserCurrency()` - Detects user's currency based on IP
- `CalculatePrice()` - Calculates price in appropriate currency
- `CreateOrder()` - Creates order in database and Razorpay
- `VerifyAndProcessPayment()` - Verifies payment signature and processes subscription upgrade
- `ProcessSuccessfulPayment()` - Updates user subscription after successful payment
- `GetUserOrderHistory()` - Retrieves user's order history
- `GetOrderByID()` - Gets specific order with authorization check

#### Razorpay Client (`apps/api/internal/libraries/razorpay.go`)
- `CreateOrder()` - Creates order in Razorpay
- `VerifyPaymentSignature()` - Verifies payment signature
- `VerifyWebhookSignature()` - Verifies webhook signature
- `FetchPayment()` - Retrieves payment details
- `FetchOrder()` - Retrieves order details
- `GetRazorpayKey()` - Returns API key for frontend

### 4. HTTP Handlers

#### Payment Handler (`apps/api/internal/handlers/payment_handler.go`)

**Endpoints:**

1. **POST /api/v1/orders/create** (Protected)
   - Creates order for subscription upgrade
   - Detects user currency from IP
   - Returns order details and Razorpay key

2. **POST /api/v1/orders/verify** (Protected)
   - Verifies payment signature
   - Updates order status
   - Upgrades user subscription

3. **GET /api/v1/orders/history** (Protected)
   - Returns user's order history with pagination
   - Query params: `limit`, `offset`

4. **GET /api/v1/orders/:orderId** (Protected)
   - Returns specific order details
   - Verifies order belongs to user

5. **POST /api/v1/webhooks/razorpay** (Public)
   - Handles Razorpay webhook events
   - Verifies webhook signature
   - Processes events: payment.captured, payment.failed, order.paid

6. **GET /api/v1/pricing** (Public)
   - Returns pricing for all plans
   - Detects user currency
   - Returns prices in appropriate currency

### 5. Routes

#### Payment Routes (`apps/api/internal/api/routes/v1/payment.go`)
- Registers protected routes (require authentication)
- Registers public routes (webhooks, pricing)
- Initializes all dependencies (repos, services, handlers)

#### Route Registration (`apps/api/internal/api/routes/v1/routes.go`)
- Added `registerPayment()` for protected routes
- Added `registerPaymentPublic()` for public routes

### 6. Frontend Integration

#### BillingSettings Component (`apps/web/src/components/custom/Settings/BillingSettings.tsx`)
- Displays all subscription plans with USD pricing
- "Upgrade" button for Pro and Premium plans
- Loads Razorpay SDK dynamically
- Creates order via API
- Opens Razorpay checkout modal
- Verifies payment after completion
- Refreshes user data to show updated subscription
- Uses Sonner for toast notifications

### 7. Environment Configuration

#### Updated .env.example (`apps/api/.env.example`)
```env
# Payment Gateway (Razorpay)
RAZORPAY_CLIENT_API_KEY=rzp_test_xxxxx
RAZORPAY_CLIENT_SECRET_KEY=xxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx

# Currency conversion (optional)
USD_TO_INR_RATE=83
```

### 8. Database Migration

Updated `apps/api/internal/config/db.go` to include Order model in auto-migration.

## API Endpoints Summary

### Protected Endpoints (Require Authentication)
- `POST /api/v1/orders/create` - Create new order
- `POST /api/v1/orders/verify` - Verify payment
- `GET /api/v1/orders/history` - Get order history
- `GET /api/v1/orders/:orderId` - Get specific order

### Public Endpoints
- `POST /api/v1/webhooks/razorpay` - Razorpay webhook
- `GET /api/v1/pricing` - Get pricing information

## Security Features

1. **Signature Verification**: All payments and webhooks verified using HMAC SHA256
2. **Idempotency**: Unique receipt IDs prevent duplicate orders
3. **Authorization**: Order access restricted to owner
4. **Amount Validation**: Prices calculated on backend, never trusted from frontend
5. **Webhook Security**: Signature verification before processing events

## Payment Flow

1. User clicks "Upgrade" on a plan
2. Frontend calls `/api/v1/orders/create` with plan ID
3. Backend detects user location from IP
4. Backend calculates price in appropriate currency
5. Backend creates order in Razorpay
6. Backend saves order to database
7. Frontend receives order details and Razorpay key
8. Frontend opens Razorpay checkout modal
9. User completes payment
10. Razorpay sends webhook to backend (optional)
11. Frontend receives payment success callback
12. Frontend calls `/api/v1/orders/verify` with payment details
13. Backend verifies signature
14. Backend updates order status
15. Backend upgrades user subscription
16. Frontend refreshes user data
17. User sees updated subscription

## Testing Checklist

- [ ] Test order creation with Pro plan
- [ ] Test order creation with Premium plan
- [ ] Test payment verification with valid signature
- [ ] Test payment verification with invalid signature
- [ ] Test geolocation detection (India vs other countries)
- [ ] Test order history pagination
- [ ] Test webhook handling
- [ ] Test currency conversion (USD to INR)
- [ ] Test duplicate payment prevention
- [ ] Test failed payment scenarios

## Next Steps

1. **Add Razorpay Keys**: Update `.env` file with actual Razorpay API keys
2. **Test in Development**: Test the complete flow with Razorpay test mode
3. **Configure Webhooks**: Set up webhook URL in Razorpay dashboard
4. **Add Email Notifications**: Send confirmation emails after successful payment
5. **Add Invoice Generation**: Generate PDF invoices for orders
6. **Add Refund Support**: Implement refund processing
7. **Add Subscription Expiry**: Handle monthly subscription renewal/expiry
8. **Add Payment Analytics**: Track payment metrics and conversion rates

## Files Created

- `apps/api/internal/models/order.go`
- `apps/api/internal/models/pricing.go`
- `apps/api/internal/repo/order.go`
- `apps/api/internal/service/payment_service.go`
- `apps/api/internal/service/geolocation_service.go`
- `apps/api/internal/handlers/payment_handler.go`
- `apps/api/internal/api/routes/v1/payment.go`

## Files Modified

- `apps/api/internal/libraries/razorpay.go`
- `apps/api/internal/models/user.go`
- `apps/api/internal/repo/auth.go`
- `apps/api/internal/config/db.go`
- `apps/api/internal/api/routes/v1/routes.go`
- `apps/api/.env.example`
- `apps/web/src/components/custom/Settings/BillingSettings.tsx`

## Notes

- The implementation uses ip-api.com for geolocation (free tier: 45 requests/minute)
- Currency conversion rate is configurable via environment variable
- Razorpay handles multi-currency automatically
- All prices are stored in smallest currency units (paise for INR, cents for USD)
- The system is designed to be easily extended with additional currencies
