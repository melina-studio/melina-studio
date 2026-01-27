# Payment API Documentation

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

Protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Create Order

Creates a new order for subscription upgrade.

**Endpoint:** `POST /orders/create`

**Authentication:** Required

**Request Body:**
```json
{
  "plan": "pro"  // or "premium"
}
```

**Response:** `201 Created`
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "razorpay_order_id": "order_MHqKlPqEVPzjRm",
  "amount": 83000,
  "currency": "INR",
  "razorpay_key": "rzp_test_xxxxxxxxxxxxx",
  "amount_usd": 10.0
}
```

**Error Responses:**

`400 Bad Request` - Invalid plan
```json
{
  "error": "Invalid subscription plan. Only 'pro' and 'premium' are allowed."
}
```

`401 Unauthorized` - Missing or invalid token
```json
{
  "error": "Unauthorized"
}
```

`500 Internal Server Error` - Order creation failed
```json
{
  "error": "Failed to create razorpay order: <error details>"
}
```

**Notes:**
- Amount is in smallest currency unit (paise for INR, cents for USD)
- Currency is automatically detected based on user's IP address
- India → INR, Others → USD
- Receipt ID is automatically generated for idempotency

---

### 2. Verify Payment

Verifies payment signature and upgrades user subscription.

**Endpoint:** `POST /orders/verify`

**Authentication:** Required

**Request Body:**
```json
{
  "razorpay_order_id": "order_MHqKlPqEVPzjRm",
  "razorpay_payment_id": "pay_MHqKlPqEVPzjRm",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "subscription": "pro",
  "message": "Payment verified successfully. Your subscription has been upgraded."
}
```

**Error Responses:**

`400 Bad Request` - Invalid signature
```json
{
  "error": "invalid payment signature"
}
```

`403 Forbidden` - Order doesn't belong to user
```json
{
  "error": "Unauthorized access to order"
}
```

`404 Not Found` - Order not found
```json
{
  "error": "order not found: record not found"
}
```

**Notes:**
- Signature is verified using HMAC SHA256
- User subscription is automatically upgraded on successful verification
- Token consumption is reset to 0
- Order status is updated to "success"

---

### 3. Get Order History

Retrieves user's order history with pagination.

**Endpoint:** `GET /orders/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional, default: 10) - Number of orders to return
- `offset` (optional, default: 0) - Number of orders to skip

**Example:**
```
GET /orders/history?limit=5&offset=0
```

**Response:** `200 OK`
```json
{
  "orders": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "660e8400-e29b-41d4-a716-446655440000",
      "subscription_plan": "pro",
      "amount_usd": 10.0,
      "amount_charged": 83000,
      "currency": "INR",
      "razorpay_order_id": "order_MHqKlPqEVPzjRm",
      "razorpay_payment_id": "pay_MHqKlPqEVPzjRm",
      "status": "success",
      "payment_method": "card",
      "user_country": "IN",
      "receipt": "rcpt_660e8400_1234567890",
      "created_at": "2024-01-26T10:30:00Z",
      "updated_at": "2024-01-26T10:31:00Z"
    }
  ],
  "total": 5,
  "limit": 5,
  "offset": 0
}
```

**Error Responses:**

`401 Unauthorized` - Missing or invalid token
```json
{
  "error": "Unauthorized"
}
```

`500 Internal Server Error` - Failed to retrieve orders
```json
{
  "error": "Failed to retrieve order history"
}
```

---

### 4. Get Order by ID

Retrieves a specific order by its UUID.

**Endpoint:** `GET /orders/:orderId`

**Authentication:** Required

**Path Parameters:**
- `orderId` - UUID of the order

**Example:**
```
GET /orders/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`
```json
{
  "order": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "660e8400-e29b-41d4-a716-446655440000",
    "subscription_plan": "pro",
    "amount_usd": 10.0,
    "amount_charged": 83000,
    "currency": "INR",
    "razorpay_order_id": "order_MHqKlPqEVPzjRm",
    "razorpay_payment_id": "pay_MHqKlPqEVPzjRm",
    "status": "success",
    "payment_method": "card",
    "user_country": "IN",
    "receipt": "rcpt_660e8400_1234567890",
    "created_at": "2024-01-26T10:30:00Z",
    "updated_at": "2024-01-26T10:31:00Z"
  }
}
```

**Error Responses:**

`400 Bad Request` - Invalid order ID format
```json
{
  "error": "Invalid order ID"
}
```

`404 Not Found` - Order not found or doesn't belong to user
```json
{
  "error": "unauthorized access to order"
}
```

---

### 5. Get Pricing

Returns pricing information for all plans based on user's location.

**Endpoint:** `GET /pricing`

**Authentication:** Not required (Public endpoint)

**Response:** `200 OK`
```json
{
  "currency": "INR",
  "country": "IN",
  "plans": [
    {
      "id": "pro",
      "name": "Pro",
      "price_display": "$10",
      "price_charged": 83000,
      "currency": "INR",
      "token_limit": 2000000,
      "description": "Advanced AI features with 2M tokens per month"
    },
    {
      "id": "premium",
      "name": "Premium",
      "price_display": "$30",
      "price_charged": 249000,
      "currency": "INR",
      "token_limit": 20000000,
      "description": "Premium features with 20M tokens per month"
    }
  ]
}
```

**Notes:**
- Currency is detected based on user's IP address
- India → INR, Others → USD
- `price_display` is always in USD for consistency
- `price_charged` is in smallest currency unit (paise/cents)
- Free plan is not included in the response

---

### 6. Razorpay Webhook

Handles webhook events from Razorpay.

**Endpoint:** `POST /webhooks/razorpay`

**Authentication:** Not required (Signature verified)

**Headers:**
```
X-Razorpay-Signature: <webhook_signature>
Content-Type: application/json
```

**Request Body:** (Example for payment.captured event)
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_MHqKlPqEVPzjRm",
        "order_id": "order_MHqKlPqEVPzjRm",
        "amount": 83000,
        "currency": "INR",
        "status": "captured",
        "method": "card"
      }
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

**Error Responses:**

`400 Bad Request` - Missing signature or invalid payload
```json
{
  "error": "Missing signature"
}
```

`401 Unauthorized` - Invalid signature
```json
{
  "error": "Invalid signature"
}
```

**Supported Events:**
- `payment.captured` - Payment successfully captured
- `payment.failed` - Payment failed
- `order.paid` - Order marked as paid

**Notes:**
- Webhook signature is verified using HMAC SHA256
- Webhook secret must be configured in environment variables
- Events are processed asynchronously
- Duplicate events are handled gracefully

---

## Data Models

### Order Status

| Status | Description |
|--------|-------------|
| `pending` | Order created, payment not completed |
| `success` | Payment successful, subscription upgraded |
| `failed` | Payment failed |
| `refunded` | Payment refunded |

### Subscription Plans

| Plan | Price (USD) | Token Limit | Description |
|------|-------------|-------------|-------------|
| `free` | $0 | 200K/month | Basic features |
| `pro` | $10 | 2M/month | Advanced features |
| `premium` | $30 | 20M/month | Premium features |
| `on_demand` | Custom | 200M/month | Enterprise features |

### Currency Codes

| Code | Currency | Country |
|------|----------|---------|
| `INR` | Indian Rupee | India |
| `USD` | US Dollar | All others |

---

## Error Handling

All error responses follow this format:
```json
{
  "error": "Error message here"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production:

- Order creation: 5 requests per minute per user
- Pricing endpoint: 60 requests per minute per IP
- Webhook: No limit (verified by signature)

---

## Testing

### Test Credentials (Razorpay Test Mode)

**Test Card:**
- Number: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: `12/25`
- Name: `Test User`

**Test UPI:**
- UPI ID: `success@razorpay`

**Test Netbanking:**
- Select any bank
- Use credentials provided by Razorpay

### Example cURL Commands

**Create Order:**
```bash
curl -X POST http://localhost:8080/api/v1/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"plan": "pro"}'
```

**Verify Payment:**
```bash
curl -X POST http://localhost:8080/api/v1/orders/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "razorpay_order_id": "order_xxxxx",
    "razorpay_payment_id": "pay_xxxxx",
    "razorpay_signature": "signature_xxxxx"
  }'
```

**Get Order History:**
```bash
curl http://localhost:8080/api/v1/orders/history?limit=10&offset=0 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Get Pricing:**
```bash
curl http://localhost:8080/api/v1/pricing
```

---

## Integration Guide

### Frontend Integration

1. **Load Razorpay SDK:**
```javascript
const script = document.createElement("script");
script.src = "https://checkout.razorpay.com/v1/checkout.js";
document.body.appendChild(script);
```

2. **Create Order:**
```javascript
const response = await fetch('/api/v1/orders/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ plan: 'pro' })
});
const orderData = await response.json();
```

3. **Open Razorpay Checkout:**
```javascript
const options = {
  key: orderData.razorpay_key,
  amount: orderData.amount,
  currency: orderData.currency,
  order_id: orderData.razorpay_order_id,
  handler: async function(response) {
    // Verify payment
    await fetch('/api/v1/orders/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });
  }
};

const razorpay = new Razorpay(options);
razorpay.open();
```

---

## Security Best Practices

1. **Never expose secret key to frontend**
2. **Always verify signatures on backend**
3. **Use HTTPS in production**
4. **Validate all input data**
5. **Implement rate limiting**
6. **Log all payment operations**
7. **Monitor for suspicious activity**
8. **Use environment variables for secrets**
9. **Implement proper error handling**
10. **Test thoroughly before going live**
