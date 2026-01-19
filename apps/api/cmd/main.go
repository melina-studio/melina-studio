package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"melina-studio-backend/internal/api"
	"melina-studio-backend/internal/api/routes"
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/repo"
	"melina-studio-backend/internal/service"

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

	// Create and configure Fiber app (also initializes GCS clients)
	app := api.NewServer()

	// Register routes
	routes.Register(app)

	// Initialize and start cleanup service
	cleanupConfig := config.LoadCleanupConfig()
	tempUploadRepo := repo.NewTempUploadRepository(config.DB)
	cleanupService := service.NewCleanupService(cleanupConfig, tempUploadRepo, libraries.GetClients())
	cleanupService.Start()

	// Setup graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		log.Println("Shutting down server...")

		// Stop cleanup service
		cleanupService.Stop()

		// Shutdown Fiber app
		if err := app.Shutdown(); err != nil {
			log.Printf("Error shutting down server: %v", err)
		}
	}()

	// Start server
	if err := api.StartServer(app); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
