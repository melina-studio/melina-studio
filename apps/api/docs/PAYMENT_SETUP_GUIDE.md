# Razorpay Payment Integration - Setup Guide

## Quick Start

### 1. Install Dependencies

The Razorpay Go SDK is already added to `go.mod`. Run:

```bash
cd apps/api
go mod tidy
```

### 2. Configure Environment Variables

Update your `apps/api/.env` file with Razorpay credentials:

```env
# Payment Gateway (Razorpay)
RAZORPAY_CLIENT_API_KEY=rzp_test_xxxxxxxxxxxxx
RAZORPAY_CLIENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Currency conversion (optional, default: 83)
USD_TO_INR_RATE=83
```

**Getting Razorpay Credentials:**
1. Sign up at https://razorpay.com/
2. Go to Settings → API Keys
3. Generate Test/Live API Keys
4. For webhook secret: Settings → Webhooks → Create Webhook → Copy secret

### 3. Run Database Migration

The Order model will be automatically migrated when you start the server:

```bash
cd apps/api
go run cmd/main.go
```

The migration will create the `orders` table and add the `country` column to the `users` table.

### 4. Configure Razorpay Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Create Webhook"
3. Set URL: `https://your-domain.com/api/v1/webhooks/razorpay`
4. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Copy the webhook secret and add it to `.env`

### 5. Test the Integration

#### Test Order Creation

```bash
curl -X POST http://localhost:8080/api/v1/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"plan": "pro"}'
```

Expected response:
```json
{
  "order_id": "uuid-here",
  "razorpay_order_id": "order_xxxxx",
  "amount": 83000,
  "currency": "INR",
  "razorpay_key": "rzp_test_xxxxx",
  "amount_usd": 10
}
```

#### Test Pricing Endpoint

```bash
curl http://localhost:8080/api/v1/pricing
```

Expected response:
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
      "token_limit": 1000000,
      "description": "Advanced AI features with 1M tokens per month"
    },
    {
      "id": "premium",
      "name": "Premium",
      "price_display": "$30",
      "price_charged": 249000,
      "currency": "INR",
      "token_limit": 10000000,
      "description": "Premium features with 10M tokens per month"
    }
  ]
}
```

### 6. Frontend Setup

The frontend is already configured. Just make sure:

1. `NEXT_PUBLIC_API_URL` is set in `apps/web/.env`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

2. The Razorpay SDK will be loaded automatically when user clicks "Upgrade"

### 7. Testing Payment Flow

#### Using Razorpay Test Mode

Razorpay provides test cards for testing:

**Test Card Details:**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date
- Name: Any name

**Test UPI:**
- UPI ID: `success@razorpay`

**Test Netbanking:**
- Select any bank
- Use the test credentials provided by Razorpay

#### Complete Test Flow

1. Login to your application
2. Go to Settings → Billing
3. Click "Upgrade" on Pro or Premium plan
4. Razorpay checkout modal opens
5. Use test card details above
6. Complete payment
7. Verify subscription is upgraded
8. Check order history

### 8. Verify Database

Check if order was created:

```sql
SELECT * FROM orders WHERE user_id = 'your-user-uuid';
```

Check if user subscription was updated:

```sql
SELECT uuid, email, subscription, subscription_start_date, tokens_consumed 
FROM users 
WHERE uuid = 'your-user-uuid';
```

## Troubleshooting

### Issue: "Failed to create razorpay order"

**Solution:** Check if Razorpay API keys are correct in `.env`

### Issue: "Invalid payment signature"

**Solution:** Make sure you're using the correct secret key. Test and live keys are different.

### Issue: "Geolocation not working"

**Solution:** The geolocation service uses ip-api.com which has a rate limit of 45 requests/minute. For development, localhost IPs default to "US".

### Issue: "Order created but subscription not upgraded"

**Solution:** Check the payment verification endpoint. Make sure the signature verification is passing.

### Issue: "Webhook not receiving events"

**Solution:** 
1. Check if webhook URL is publicly accessible
2. Verify webhook secret matches in `.env`
3. Check Razorpay dashboard for webhook delivery logs

## Production Checklist

Before going to production:

- [ ] Replace test API keys with live API keys
- [ ] Update webhook URL to production domain
- [ ] Enable HTTPS for webhook endpoint
- [ ] Set up proper error logging
- [ ] Add email notifications for successful payments
- [ ] Set up monitoring for payment failures
- [ ] Configure rate limiting on order creation endpoint
- [ ] Add invoice generation
- [ ] Test with real payment methods
- [ ] Set up backup webhook endpoint
- [ ] Configure proper CORS settings
- [ ] Add payment analytics tracking

## Currency Configuration

### Changing USD to INR Rate

Update in `.env`:
```env
USD_TO_INR_RATE=85
```

### Adding More Currencies

To add support for more currencies:

1. Update `GetCurrencyForCountry()` in `geolocation_service.go`
2. Add conversion function in `pricing.go`
3. Update `CalculatePrice()` in `payment_service.go`

## API Rate Limits

### IP Geolocation (ip-api.com)
- Free tier: 45 requests/minute
- Consider upgrading or using alternative service for production

### Razorpay
- Test mode: No limits
- Live mode: Check Razorpay documentation

## Support

For issues related to:
- **Razorpay Integration**: Check Razorpay documentation at https://razorpay.com/docs/
- **Payment Flow**: Review `PAYMENT_IMPLEMENTATION.md`
- **API Endpoints**: See endpoint documentation in implementation summary

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Go SDK](https://github.com/razorpay/razorpay-go)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Webhook Events](https://razorpay.com/docs/webhooks/)
