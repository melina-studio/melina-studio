package models

import (
	"time"

	"github.com/google/uuid"
)

type ModelProvider string
type Model string

const (
	ModelProviderOpenAI    ModelProvider = "openai"
	ModelProviderAnthropic ModelProvider = "anthropic"
	ModelProviderGemini    ModelProvider = "gemini"
	ModelProviderGroq      ModelProvider = "groq"
)

const (
	ModelGPT5_1                            Model = "gpt-5.1"
	ModelClaude4_5_Sonnet                  Model = "claude-4.5-sonnet"
	ModelGroqLlama3_3_70b_Versatile        Model = "llama-3.3-70b-versatile"
	ModelGemini2_5_Flash                   Model = "gemini-2.5-flash"
	ModelMetaLlama4_Scout_17b_16e_Instruct Model = "meta-llama/llama-4-scout-17b-16e-instruct"
)

type TokenConsumption struct {
	UUID      uuid.UUID  `gorm:"type:uuid;primaryKey;" json:"uuid"`
	UserUUID  uuid.UUID  `gorm:"column:user_uuid;not null;index:idx_user_created" json:"user_uuid"`
	BoardUUID *uuid.UUID `gorm:"column:board_uuid;index" json:"board_uuid,omitempty"`
	ChatUUID  *uuid.UUID `gorm:"column:chat_uuid" json:"chat_uuid,omitempty"`

	Provider       string `gorm:"not null;index" json:"provider"`
	Model          string `gorm:"not null" json:"model"`
	TotalTokens    int    `gorm:"column:total_tokens;not null" json:"total_tokens"`
	InputTokens    int    `gorm:"column:input_tokens;not null" json:"input_tokens"`
	OutputTokens   int    `gorm:"column:output_tokens;not null" json:"output_tokens"`
	CountingMethod string `gorm:"not null" json:"counting_method"`

	CreatedAt time.Time `gorm:"index:idx_user_created" json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
