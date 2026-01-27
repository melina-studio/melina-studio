# Model Pricing & Cost Estimation

This document outlines the pricing strategy for AI model usage in Melina Studio.

## Pricing Strategy

All model prices include a **25-30% margin** above actual API provider costs to cover:
- Infrastructure and operational costs
- Platform maintenance
- Profit margin

## Model Pricing Table

| Model | Provider | Actual Cost (per 1M tokens) | Our Price (per 1M tokens) | Margin |
|-------|----------|----------------------------|---------------------------|--------|
| `claude-4.5-sonnet` | Anthropic | $3.00 input / $15.00 output | $4.00 input / $19.00 output | ~27% |
| `gpt-5.1` | OpenAI | $1.25 input / $10.00 output | $1.60 input / $12.50 output | ~25% |
| `gemini-2.5-flash` | Google | $0.15 input / $0.60 output | $0.20 input / $0.75 output | ~25% |
| `meta-llama/llama-4-scout-17b-16e-instruct` | Groq | $0.11 input / $0.34 output | $0.15 input / $0.45 output | ~30% |
| `llama-3.3-70b-versatile` | Groq | $0.59 input / $0.79 output | $0.75 input / $1.00 output | ~25% |

## Cost Calculation Formula

The cost for each API request is calculated as:

```
Total Cost = Input Cost + Output Cost

Where:
  Input Cost  = (Input Tokens / 1,000,000) × Input Price per 1M
  Output Cost = (Output Tokens / 1,000,000) × Output Price per 1M
```

### Example Calculation

For a request using `claude-4.5-sonnet` with:
- Input tokens: 1,500
- Output tokens: 500

```
Input Cost  = (1,500 / 1,000,000) × $4.00 = $0.006
Output Cost = (500 / 1,000,000) × $19.00  = $0.0095
Total Cost  = $0.006 + $0.0095 = $0.0155
```

## Code Implementation

The pricing is defined in `internal/handlers/token_handler.go`:

```go
var modelPricing = map[string]struct {
    Input  float64
    Output float64
}{
    "claude-4.5-sonnet":                         {Input: 4.00, Output: 19.00},
    "gpt-5.1":                                   {Input: 1.60, Output: 12.50},
    "gemini-2.5-flash":                          {Input: 0.20, Output: 0.75},
    "meta-llama/llama-4-scout-17b-16e-instruct": {Input: 0.15, Output: 0.45},
    "llama-3.3-70b-versatile":                   {Input: 0.75, Output: 1.00},
}
```

The calculation function:

```go
func calculateCost(model string, inputTokens, outputTokens int) float64 {
    pricing, exists := modelPricing[model]
    if !exists {
        // Default pricing if model not found
        pricing = struct {
            Input  float64
            Output float64
        }{Input: 1.0, Output: 2.0}
    }

    inputCost := (float64(inputTokens) / 1_000_000) * pricing.Input
    outputCost := (float64(outputTokens) / 1_000_000) * pricing.Output

    return inputCost + outputCost
}
```

## Provider Pricing Sources

| Provider | Pricing Page | Last Updated |
|----------|--------------|--------------|
| Anthropic | https://www.anthropic.com/pricing | Jan 2026 |
| OpenAI | https://platform.openai.com/docs/pricing | Jan 2026 |
| Google | https://ai.google.dev/gemini-api/docs/pricing | Jan 2026 |
| Groq | https://groq.com/pricing | Jan 2026 |

## Subscription Token Limits

| Plan | Monthly Token Limit | Price |
|------|---------------------|-------|
| Free | 200,000 | $0 |
| Pro | 2,000,000 | $10/month |
| Premium | 20,000,000 | $30/month |
| On Demand | 200,000,000 | Custom |

## Updating Prices

When provider prices change:

1. Update the `modelPricing` map in `internal/handlers/token_handler.go`
2. Update this documentation
3. Maintain the ~25-30% margin for profitability

## Notes

- Prices are displayed to users in the Usage/Analytics section
- Token consumption is tracked per request in the `token_consumptions` table
- Monthly limits are enforced at 100% usage (warning at 80%)
