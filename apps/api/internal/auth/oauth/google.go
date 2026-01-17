package oauth

import (
	"os"
	"sync"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var (
	googleOAuthConfig *oauth2.Config
	googleOnce        sync.Once
)

// GetGoogleOAuthConfig returns the Google OAuth config, initializing it lazily
// This ensures env vars are loaded before the config is created
func GetGoogleOAuthConfig() *oauth2.Config {
	googleOnce.Do(func() {
		googleOAuthConfig = &oauth2.Config{
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"),
			Scopes: []string{
				"openid",
				"profile",
				"email",
			},
			Endpoint: google.Endpoint,
		}
	})
	return googleOAuthConfig
}
