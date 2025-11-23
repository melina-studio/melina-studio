package libraries

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"

	aiplatform "cloud.google.com/go/aiplatform/apiv1"
	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

type Clients struct {
	GCS          *storage.Client
	Vertex       *aiplatform.PredictionClient
	ProjectID    string
	VertexRegion string
}

var clients *Clients

func GetClients() *Clients {
	return clients
}

func NewClients(ctx context.Context) (*Clients, error) {
	// read base64 encoded JSON
	encoded := os.Getenv("GCP_SERVICE_ACCOUNT_CREDENTIALS")
	if encoded == "" {
		return nil, fmt.Errorf("GCP_SERVICE_ACCOUNT_CREDENTIALS not set")
	}

	// decode JSON
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("failed to decode service account json: %w", err)
	}

	// parse JSON
	credOpt := option.WithCredentialsJSON(decoded)

	// create GCS client
	gcsClient, err := storage.NewClient(ctx, credOpt)
	if err != nil {
		return nil, fmt.Errorf("storage.NewClient: %w", err)
	}

	// create Vertex AI Prediction client
	vertexClient, err := aiplatform.NewPredictionClient(ctx, credOpt)
	if err != nil {
		return nil, fmt.Errorf("vertex.NewPredictionClient: %w", err)
	}

	clients = &Clients{
		GCS:          gcsClient,
		Vertex:       vertexClient,
		ProjectID:    os.Getenv("GOOGLE_CLOUD_PROJECT_ID"),
		VertexRegion: os.Getenv("GOOGLE_CLOUD_VERTEXAI_LOCATION"),
	}

	return clients, nil
}

func (c *Clients) Close() {
	c.GCS.Close()
	c.Vertex.Close()
}
