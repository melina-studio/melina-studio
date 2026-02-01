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
	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // disables implicit prepared statement usage
	}), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info),
		PrepareStmt: false,
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
			&models.User{},
			&models.Board{},
			&models.BoardData{},
			&models.Chat{},
			&models.RefreshToken{},
			&models.TempUpload{},
			&models.TokenConsumption{},
			&models.SubscriptionTier{},
			&models.Order{},
			&models.CustomRules{},
		)
		if err != nil {
			return fmt.Errorf("failed to migrate database: %w", err)
		}
		log.Println("✅ Database migration completed")

		// // Seed subscription plans
		// err = SeedSubscriptionPlans(DB)
		// if err != nil {
		// 	log.Printf("⚠️ Warning: Failed to seed subscription plans: %v", err)
		// }

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

/*
// SeedSubscriptionPlans seeds the database with initial subscription plan data
// This function is safe to call multiple times - it will only create plans that don't exist
func SeedSubscriptionPlans(db *gorm.DB) error {
	log.Println("🌱 Starting subscription plans seeding...")

	now := time.Now()

	plans := []models.SubscriptionTier{
		{
			UUID:              uuid.New(),
			PlanName:          models.SubscriptionFree,
			MonthlyTokenLimit: 200000, // 200K tokens/month
			Description:       "Free tier with basic features - 200K tokens per month",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			UUID:              uuid.New(),
			PlanName:          models.SubscriptionPro,
			MonthlyTokenLimit: 2000000, // 2M tokens/month
			Description:       "Pro tier with advanced features - 2M tokens per month",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			UUID:              uuid.New(),
			PlanName:          models.SubscriptionPremium,
			MonthlyTokenLimit: 20000000, // 20M tokens/month
			Description:       "Premium tier with premium features - 20M tokens per month",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
		{
			UUID:              uuid.New(),
			PlanName:          models.SubscriptionOnDemand,
			MonthlyTokenLimit: 200000000, // 200M tokens/month
			Description:       "On-demand tier with unlimited features - 200M tokens per month",
			CreatedAt:         now,
			UpdatedAt:         now,
		},
	}

	// Insert plans if they don't exist (using FirstOrCreate to avoid duplicates)
	for _, plan := range plans {
		var existingPlan models.SubscriptionTier
		result := db.Where("plan_name = ?", plan.PlanName).First(&existingPlan)

		if result.Error == gorm.ErrRecordNotFound {
			// Plan doesn't exist, create it
			log.Printf("📝 Creating subscription plan: %s...", plan.PlanName)
			if err := db.Create(&plan).Error; err != nil {
				log.Printf("❌ Failed to create subscription plan %s: %v", plan.PlanName, err)
				return fmt.Errorf("failed to create subscription plan %s: %w", plan.PlanName, err)
			}
			log.Printf("✅ Seeded subscription plan: %s (%d tokens/month)", plan.PlanName, plan.MonthlyTokenLimit)
		} else if result.Error != nil {
			log.Printf("❌ Error checking subscription plan %s: %v", plan.PlanName, result.Error)
			return fmt.Errorf("failed to check subscription plan %s: %w", plan.PlanName, result.Error)
		} else {
			log.Printf("ℹ️  Subscription plan already exists: %s", plan.PlanName)
		}
	}

	log.Println("✅ Subscription plans seeding completed")
	return nil
}
*/
