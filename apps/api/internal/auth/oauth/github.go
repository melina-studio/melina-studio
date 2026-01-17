package oauth

import (
	"os"
	"sync"

	"golang.org/x/oauth2"
)

var (
	githubOAuthConfig *oauth2.Config
	githubOnce        sync.Once
)

func GetGitHubOAuthConfig() *oauth2.Config {
	githubOnce.Do(func() {
		githubOAuthConfig = &oauth2.Config{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("GITHUB_REDIRECT_URI"),
			Scopes: []string{
				"read:user",
				"user:email",
			},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://github.com/login/oauth/authorize",
				TokenURL: "https://github.com/login/oauth/access_token",
			},
		}
	})
	return githubOAuthConfig
}