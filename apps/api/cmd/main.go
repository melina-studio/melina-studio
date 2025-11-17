package main

import (
	"log"
	"melina-studio-backend/internal/api"
	"melina-studio-backend/internal/api/routes"
	"melina-studio-backend/internal/config"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Connect to database
	if err := config.ConnectDB(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	if err := config.MigrateAllModels(false); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Create and configure Fiber app
	app := api.NewServer()

	// Register routes
	routes.Register(app)

	// Start server
	if err := api.StartServer(app); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
