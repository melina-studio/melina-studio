package tools

import (
	"encoding/base64"
	"fmt"
	"os"
)

/*
GetBoardData is a tool that returns the image base64 of the board
@param boardId string
@return map[string]interface{} containing boardId, image base64, and format, error
*/
func GetBoardData(boardId string) (map[string]interface{} , error) {
	// get board id and return the image base64
	imagePath := "temp/images/" + boardId + ".png"
	imageData , err := os.ReadFile(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image file: %w", err)
	}
	imageBase64 := base64.StdEncoding.EncodeToString(imageData)
	return map[string]interface{}{
		"boardId": boardId,
		"image": imageBase64,
		"format": "png",
	}, nil
}