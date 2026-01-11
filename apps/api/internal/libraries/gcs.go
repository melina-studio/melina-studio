package libraries

import (
	"context"
	"fmt"
	"io"
	"os"

	"cloud.google.com/go/storage"
)

// Upload uploads a file to GCS at bucket/key
func (c *Clients) Upload(
	ctx context.Context,
	objectKey string,
	reader io.Reader,
	contentType string,
) (string, error) {
	bucket := os.Getenv("GCP_STORAGE_BUCKET")
	if bucket == "" {
		return "", fmt.Errorf("GCP_STORAGE_BUCKET environment variable is not set")
	}
	obj := c.GCS.Bucket(bucket).Object(objectKey)

	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType

	if _, err := io.Copy(writer, reader); err != nil {
		_ = writer.Close()
		return "", fmt.Errorf("gcs upload failed: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("gcs upload close failed: %w", err)
	}

	// Make object publicly readable
	if err := obj.ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
		return "", fmt.Errorf("gcs set public acl failed: %w", err)
	}

	// Public, non-expiring URL
	base_url := os.Getenv("GCS_BASE_URL")
	publicURL := fmt.Sprintf("%s/%s/%s", base_url , bucket, objectKey)

	return publicURL, nil
}


// Replace replaces an existing file at bucket/key
// (GCS overwrite is implicit)
func (c *Clients) Replace(
	ctx context.Context,
	objectKey string,
	reader io.Reader,
	contentType string,
) (string, error) {
	// same as Upload — overwrite happens automatically\
	publicURL, err := c.Upload(ctx, objectKey, reader, contentType)
	if err != nil {
		return "", fmt.Errorf("gcs upload failed: %w", err)
	}
	return publicURL, nil
}

// Remove deletes a file from GCS
func (c *Clients) Remove(
	ctx context.Context,
	objectKey string,
) error {
	bucket := os.Getenv("GCS_BUCKET_NAME")
	obj := c.GCS.Bucket(bucket).Object(objectKey)

	if err := obj.Delete(ctx); err != nil {
		return fmt.Errorf("gcs delete failed: %w", err)
	}

	return nil
}