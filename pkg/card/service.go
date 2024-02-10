package card

import (
	"cards/gen/proto/card"
	"cards/pkg/ai"
	"cards/pkg/biome"
	"context"
	"fmt"
	"log/slog"
	"math/rand"

	"github.com/bufbuild/connect-go"
)

type CardService struct {
	// Add any fields if needed
}

func (s *CardService) GetCard(ctx context.Context, req *connect.Request[card.GetCardRequest]) (*connect.Response[card.GetCardResponse], error) {
	c, err := getCardFromDB(req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&card.GetCardResponse{
		Card: c,
	}), nil
}

func (s *CardService) GetCards(ctx context.Context, req *connect.Request[card.GetCardsRequest]) (*connect.Response[card.GetCardsResponse], error) {
	user := req.Msg.UserId
	cards, err := getCardsFromDB(user)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&card.GetCardsResponse{
		Cards: cards,
	}), nil
}

func (s *CardService) NewCard(ctx context.Context, req *connect.Request[card.NewCardRequest]) (*connect.Response[card.NewCardResponse], error) {
	newCard, err := createCardInDB(req.Msg.Card)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.NewCardResponse{
		Card: newCard,
	}), nil
}

func (s *CardService) DeleteCard(ctx context.Context, req *connect.Request[card.DeleteCardRequest]) (*connect.Response[card.DeleteCardResponse], error) {
	err := deleteCardFromDB(req.Msg.CardId)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.DeleteCardResponse{
		CardId: req.Msg.CardId,
	}), nil
}

func randomCardType() string {
	randInt := rand.Intn(3)
	var cardType string
	if randInt == 0 {
		cardType = "Animal"
	} else if randInt == 1 {
		cardType = "Plant"
	} else {
		cardType = "Resource"
	}
	return cardType
}

func (s *CardService) GenerateCards(ctx context.Context, req *connect.Request[card.GenerateCardsRequest]) (*connect.Response[card.GenerateCardsResponse], error) {
	fmt.Println("Generating Cards")
	user := req.Msg.UserId
	deck := req.Msg.Deck
	count := int(req.Msg.Count)
	cards := []*card.Card{}
	selectedBiome := req.Msg.Biome
	fmt.Println("Generating Cards, Count: ", count)
	for i := 0; i < count; i++ {
		fmt.Println("Generating Card: ", i)

		cardType := randomCardType()

		c, err := CreateCard(cardType, selectedBiome)
		if err != nil {
			return nil, err
		}
		c.Player = user
		c.Deck = deck

		newCard, err := createCard(c)
		if err != nil {
			return nil, err
		}
		cards = append(cards, newCard)
	}

	return connect.NewResponse(&card.GenerateCardsResponse{Cards: cards}), nil
}

func (s *CardService) CreateCardTemplate(ctx context.Context, req *connect.Request[card.CreateCardTemplateRequest]) (*connect.Response[card.CreateCardTemplateResponse], error) {
	cardTemplateResponse, err := CardTemplateFromBiome(req.Msg.Biome)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(cardTemplateResponse), nil
}

func (s *CardService) CreateCard(ctx context.Context, req *connect.Request[card.CreateCardRequest]) (*connect.Response[card.CreateCardResponse], error) {
	fmt.Println("CreateCard")
	newCard, err := CreateCardFromPrompt(req.Msg.Card, req.Msg.Prompt)

	if err != nil {
		fmt.Println("error creating card from prompt: ", err)
		return nil, err
	}

	newCard, err = createCard(newCard)
	if err != nil {
		fmt.Println("error creating card: ", err)
		return nil, err
	}

	return connect.NewResponse(&card.CreateCardResponse{
		Card: newCard,
	}), nil
}

func (s *CardService) GetDeck(ctx context.Context, req *connect.Request[card.GetDeckRequest]) (*connect.Response[card.Deck], error) {
	deckName := req.Msg.Name

	cards, err := getCardsFromDB("")
	if err != nil {
		return nil, err
	}

	decks, err := getDecks(cards)
	if err != nil {
		return nil, err
	}
	for _, d := range decks {
		if d.Name == deckName {
			return connect.NewResponse(d), nil
		}
	}
	return nil, fmt.Errorf("deck not found")
}

func (s *CardService) GetDecks(ctx context.Context, req *connect.Request[card.GetCardsRequest]) (*connect.Response[card.GetDecksResponse], error) {
	cards, err := getCardsFromDB(req.Msg.UserId)
	if err != nil {
		return nil, err
	}

	decks, err := getDecks(cards)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.GetDecksResponse{
		Decks: decks,
	}), nil
}

func (s *CardService) CreateDeckTemplate(ctx context.Context, req *connect.Request[card.CreateDeckTemplateRequest]) (*connect.Response[card.CreateDeckTemplateResponse], error) {
	slog.Info("Creating a new deck template")

	var deck card.Deck

	deck.Name = req.Msg.Deck
	setting := req.Msg.Settting
	count := int(req.Msg.Count)

	prompt, err := ai.DeckTemplateQuery(setting)
	if err != nil {
		return nil, err
	}

	response, err := ai.QueryToJSON(prompt)
	if err != nil {
		return nil, err
	}
	b, err := biome.ParseBiomeJSON(response)
	if err != nil {
		return nil, err
	}

	fmt.Println("Creating deck with biome: ", b)

	for c := 0; c < count; c++ {
		cardType := randomCardType()
		curCard, err := CreateCardFromBiome(&b, cardType)
		if err != nil {
			return nil, err
		}
		curCard.Player = req.Msg.UserId
		curCard.Deck = req.Msg.Deck
		var newCard *card.Card

		if cardType == "Resource" {
			newCard, err = generateResourceCard(curCard)
		} else {
			newCard, err = generateCard(curCard)
		}
		if err != nil {
			return nil, err
		}

		completeCard, err := createCard(newCard)
		if err != nil {
			return nil, err
		}

		deck.Cards = append(deck.Cards, completeCard)
	}

	return connect.NewResponse(&card.CreateDeckTemplateResponse{
		Template: response,
		Deck:     &deck,
	}), nil
}

func getDecks(cards []*card.Card) ([]*card.Deck, error) {
	var decks []*card.Deck

	for _, c := range cards {
		if c.Deck != "" {
			found := false
			for _, d := range decks {
				if d.Name == c.Deck {
					found = true
					d.Cards = append(d.Cards, c)
				}
			}
			if !found {
				newDeck := &card.Deck{Name: c.Deck}
				newDeck.Cards = append(newDeck.Cards, c)
				decks = append(decks, newDeck)
			}

		}
	}

	return decks, nil
}
