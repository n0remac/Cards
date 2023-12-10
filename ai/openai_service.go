package ai

import (
	"context"
	"os"

	openai "github.com/sashabaranov/go-openai"

	"fmt"
	"regexp"
)

func QueryToJSON(query string) (string, error) {
	// Query AI
	aiResponse, err := query_ai(query)
	if err != nil {
		return "", err
	}
	return aiResponse, nil

	// fmt.Println(aiResponse)

	// // Extract JSON from AI response
	// json, err := extractJSON(aiResponse)
	// if err != nil {
	// 	return "", err
	// }

	// return json, nil
}

func query_ai(query string) (string, error) {
	// Set up OpenAI client
	client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT3Dot5Turbo,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: query,
				},
			},
		},
	)

	if err != nil {
		fmt.Printf("ChatCompletion error: %v\n", err)
		return "ChatCompletion error: %v\n", err
	}

	return resp.Choices[0].Message.Content, nil
}

func extractJSON(text string) (string, error) {
	// Regular expression to match JSON objects
	re := regexp.MustCompile(`\{(?:[^{}]|(?R))*\}`)
	matches := re.FindStringSubmatch(text)

	if len(matches) == 0 {
		return "", fmt.Errorf("no JSON found in text")
	}

	// Return the first match
	return matches[0], nil
}
