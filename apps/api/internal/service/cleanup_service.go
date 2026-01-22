package service

import (
	"context"
	"log"
	"melina-studio-backend/internal/config"
	"melina-studio-backend/internal/libraries"
	"melina-studio-backend/internal/repo"
	"time"

	"github.com/google/uuid"
)

// CleanupService handles background cleanup of temporary uploads
type CleanupService struct {
	config         config.CleanupConfig
	tempUploadRepo repo.TempUploadRepoInterface
	gcsClient      *libraries.Clients
	stopChan       chan struct{}
	doneChan       chan struct{}
}

// NewCleanupService creates a new cleanup service
func NewCleanupService(
	cfg config.CleanupConfig,
	tempUploadRepo repo.TempUploadRepoInterface,
	gcsClient *libraries.Clients,
) *CleanupService {
	return &CleanupService{
		config:         cfg,
		tempUploadRepo: tempUploadRepo,
		gcsClient:      gcsClient,
		stopChan:       make(chan struct{}),
		doneChan:       make(chan struct{}),
	}
}

// Start launches the background cleanup goroutine
func (s *CleanupService) Start() {
	if !s.config.Enabled {
		log.Println("Cleanup service is disabled")
		return
	}

	go s.runCleanupLoop()
	log.Printf("Cleanup service started (interval: %v, max age: %v)", s.config.Interval, s.config.MaxAge)
}

// Stop gracefully shuts down the cleanup service
func (s *CleanupService) Stop() {
	if !s.config.Enabled {
		return
	}

	log.Println("Stopping cleanup service...")
	close(s.stopChan)
	<-s.doneChan
	log.Println("Cleanup service stopped")
}

// runCleanupLoop runs the ticker-based cleanup loop
func (s *CleanupService) runCleanupLoop() {
	defer close(s.doneChan)

	ticker := time.NewTicker(s.config.Interval)
	defer ticker.Stop()

	// Run cleanup immediately on start
	s.cleanupExpiredUploads()

	for {
		select {
		case <-ticker.C:
			s.cleanupExpiredUploads()
		case <-s.stopChan:
			return
		}
	}
}

// cleanupExpiredUploads queries DB for expired uploads and deletes them from GCS and DB
func (s *CleanupService) cleanupExpiredUploads() {
	ctx := context.Background()

	// Get expired uploads from DB
	expiredUploads, err := s.tempUploadRepo.GetExpired(s.config.MaxAge)
	if err != nil {
		log.Printf("Cleanup: failed to get expired uploads: %v", err)
		return
	}

	if len(expiredUploads) == 0 {
		log.Println("Cleanup: no expired uploads found")
		return
	}

	log.Printf("Cleanup: found %d expired uploads to clean up", len(expiredUploads))

	// Track successfully deleted IDs
	var deletedIDs []uuid.UUID

	// Delete each file from GCS
	for _, upload := range expiredUploads {
		if err := s.gcsClient.Remove(ctx, upload.ObjectKey); err != nil {
			log.Printf("Cleanup: failed to delete %s from GCS: %v", upload.ObjectKey, err)
			continue
		}
		deletedIDs = append(deletedIDs, upload.UUID)
		log.Printf("Cleanup: deleted %s from GCS", upload.ObjectKey)
	}

	// Delete successfully removed records from DB
	if len(deletedIDs) > 0 {
		if err := s.tempUploadRepo.DeleteByIDs(deletedIDs); err != nil {
			log.Printf("Cleanup: failed to delete DB records: %v", err)
			return
		}
		log.Printf("Cleanup: deleted %d records from database", len(deletedIDs))
	}
}
