package config

import (
	"fmt"
	"log"
	"melina-studio-backend/internal/models"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDB() error {
	dsn := os.Getenv("DB_URL")

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB for connection pool settings
	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("✅ Database connected successfully")
	return nil
}

func MigrateAllModels(run bool) error {
	if run {
		err := DB.AutoMigrate(
			// define all models here
			&models.Todo{},
			&models.Board{},
			&models.BoardData{},
		)
		if err != nil {
			return fmt.Errorf("failed to migrate database: %w", err)
		}
		log.Println("✅ Database migration completed")
		return nil
	} else {
		log.Println("skipping migration")
		return nil
	}
}

func CloseDB() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
