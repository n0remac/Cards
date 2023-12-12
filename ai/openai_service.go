package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	openai "github.com/sashabaranov/go-openai"
)

type Response struct {
	Created int64  `json:"created"`
	Data    []Data `json:"data"`
}

type Data struct {
	RevisedPrompt string `json:"revised_prompt"`
	URL           string `json:"url"`
}

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

	stringResp := string(bodyText)

	description, url, err := extractInfo(stringResp)
	if err != nil {
		fmt.Println(err)
		return "", err
	}
	fmt.Println(url, description)

	return url, nil

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

func DownloadImage(url, filePath string) error {
	// Send a GET request to the URL
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check if the response status is OK
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Create a file at the specified file path
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Copy the response body to the file
	_, err = io.Copy(file, resp.Body)
	return err
}

func extractInfo(jsonStr string) (string, string, error) {
	var resp Response

	err := json.Unmarshal([]byte(jsonStr), &resp)
	if err != nil {
		return "", "", err
	}

	if len(resp.Data) == 0 {
		return "", "", fmt.Errorf("no data available")
	}

	data := resp.Data[0]
	return data.RevisedPrompt, data.URL, nil
}
