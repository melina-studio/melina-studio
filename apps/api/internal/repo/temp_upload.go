package repo

import (
	"melina-studio-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TempUploadRepo represents the repository for the temp upload model
type TempUploadRepo struct {
	db *gorm.DB
}

type TempUploadRepoInterface interface {
	Create(upload *models.TempUpload) error
	GetExpired(maxAge time.Duration) ([]models.TempUpload, error)
	DeleteByIDs(ids []uuid.UUID) error
}

func NewTempUploadRepository(db *gorm.DB) TempUploadRepoInterface {
	return &TempUploadRepo{db: db}
}

// Create inserts a new temp upload record
func (r *TempUploadRepo) Create(upload *models.TempUpload) error {
	if upload.UUID == uuid.Nil {
		upload.UUID = uuid.New()
	}
	return r.db.Create(upload).Error
}

// GetExpired returns records older than maxAge
func (r *TempUploadRepo) GetExpired(maxAge time.Duration) ([]models.TempUpload, error) {
	var uploads []models.TempUpload
	cutoff := time.Now().Add(-maxAge)
	err := r.db.Where("created_at < ?", cutoff).Find(&uploads).Error
	return uploads, err
}

// DeleteByIDs deletes records by their UUIDs
func (r *TempUploadRepo) DeleteByIDs(ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.Where("uuid IN ?", ids).Delete(&models.TempUpload{}).Error
}
