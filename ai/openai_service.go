package ai

import (
	"context"
	"os"

	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	openai "github.com/sashabaranov/go-openai"

	"regexp"
)

func QueryToJSON(query string) (string, error) {
	// Query AI
	aiResponse, err := query_ai(query)
	if err != nil {
		return "", err
	}
	return aiResponse, nil
}

func GenerateImage(query string) (string, error) {
	client := &http.Client{}
	var data = strings.NewReader(fmt.Sprintf(`{
		"model": "dall-e-3",
		"prompt": "%s",
		"n": 1,
		"size": "1024x1024"
	}`, query))
	req, err := http.NewRequest("POST", "https://api.openai.com/v1/images/generations", data)
	if err != nil {
		log.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))
	resp, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()
	bodyText, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%s\n", bodyText)

	stringResp := string(bodyText)

	return stringResp, nil

}

func query_ai(query string) (string, error) {
	// Set up OpenAI client
	client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT4,
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
