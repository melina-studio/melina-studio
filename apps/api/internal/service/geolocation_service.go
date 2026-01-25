package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type GeolocationService struct {
	cache map[string]string // Simple in-memory cache for IP -> country mapping
}

type IPAPIResponse struct {
	CountryCode string `json:"country_code"`
	Country     string `json:"country"`
	Status      string `json:"status"`
}

func NewGeolocationService() *GeolocationService {
	return &GeolocationService{
		cache: make(map[string]string),
	}
}

// GetCountryFromIP detects the country from an IP address
// Returns the ISO country code (e.g., "IN", "US")
func (g *GeolocationService) GetCountryFromIP(ip string) (string, error) {
	// Check if localhost or private IP
	if g.isLocalOrPrivateIP(ip) {
		// Default to IN for local development (since you're in India)
		return "IN", nil
	}

	// Check cache first
	if country, exists := g.cache[ip]; exists {
		return country, nil
	}

	// Call free IP geolocation API (ip-api.com)
	// Note: This API has a rate limit of 45 requests per minute
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,country,countryCode", ip)

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		// Fallback to IN if API call fails (since you're in India)
		return "IN", nil
	}
	defer resp.Body.Close()

	var result IPAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "IN", nil
	}

	if result.Status != "success" {
		return "IN", nil
	}

	// Cache the result
	g.cache[ip] = result.CountryCode

	return result.CountryCode, nil
}

// isLocalOrPrivateIP checks if an IP is localhost or a private IP
func (g *GeolocationService) isLocalOrPrivateIP(ip string) bool {
	if ip == "" || ip == "::1" || ip == "127.0.0.1" || strings.HasPrefix(ip, "localhost") {
		return true
	}

	// Check for private IP ranges
	if strings.HasPrefix(ip, "10.") ||
		strings.HasPrefix(ip, "192.168.") ||
		strings.HasPrefix(ip, "172.16.") ||
		strings.HasPrefix(ip, "172.17.") ||
		strings.HasPrefix(ip, "172.18.") ||
		strings.HasPrefix(ip, "172.19.") ||
		strings.HasPrefix(ip, "172.20.") ||
		strings.HasPrefix(ip, "172.21.") ||
		strings.HasPrefix(ip, "172.22.") ||
		strings.HasPrefix(ip, "172.23.") ||
		strings.HasPrefix(ip, "172.24.") ||
		strings.HasPrefix(ip, "172.25.") ||
		strings.HasPrefix(ip, "172.26.") ||
		strings.HasPrefix(ip, "172.27.") ||
		strings.HasPrefix(ip, "172.28.") ||
		strings.HasPrefix(ip, "172.29.") ||
		strings.HasPrefix(ip, "172.30.") ||
		strings.HasPrefix(ip, "172.31.") {
		return true
	}

	return false
}

// GetCurrencyForCountry returns the appropriate currency for a country
func (g *GeolocationService) GetCurrencyForCountry(countryCode string) string {
	if countryCode == "IN" {
		return "INR"
	}
	// Default to USD for all other countries
	return "USD"
}
