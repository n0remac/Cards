package cards

import (
    "cards/gen/proto/card"
    "context"
    openai "github.com/sashabaranov/go-openai"
    "os"

	"fmt"
)

func generateCards(userId string, count int32) ([]*card.Card, error) {
    var cards []*card.Card

    // Set up OpenAI client
	client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT3Dot5Turbo,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: "Hello!",
				},
			},
		},
	)

	if err != nil {
		fmt.Printf("ChatCompletion error: %v\n", err)
		return nil, nil
	}

	fmt.Println(resp.Choices[0].Message.Content)

	// Create card
	card := &card.Card{
		Name: "cardName",
		Description: "cardDescription",
	}

	cards = append(cards, card)

    return cards, nil
}
