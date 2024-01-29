package card

import (
	"cards/gen/proto/card"
	"context"
	"fmt"

	"github.com/bufbuild/connect-go"
)

type CardService struct {
	// Add any fields if needed
}

func (s *CardService) GetCards(ctx context.Context, req *connect.Request[card.GetCardsRequest]) (*connect.Response[card.GetCardsResponse], error) {
	cards, err := getCardsFromDB()
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

func (s *CardService) GenerateCards(ctx context.Context, req *connect.Request[card.GenerateCardsRequest]) (*connect.Response[card.GenerateCardsResponse], error) {
	fmt.Println("Generating Cards")
	count := int(req.Msg.Count)
	cards := []*card.Card{}
	fmt.Println("Generating Cards, Count: ", count)
	isAnimal := 1
	for i := 0; i < count; i++ {
		fmt.Println("Generating Card: ", i)

		isAnimal *= -1
		c, err := CreateRandomCharacter(isAnimal > 0)
		if err != nil {
			return nil, err
		}

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

	fmt.Println("newCard: ", newCard)

	return connect.NewResponse(&card.CreateCardResponse{
		Card: newCard,
	}), nil
}

func (s *CardService) GenerateDeck(ctx context.Context, req *connect.Request[card.GenerateDeckRequest]) (*connect.Response[card.GenerateDeckResponse], error) {
	fmt.Println("Generating Deck")
	numCards := int(req.Msg.NumCards)
	biomeName := req.Msg.Biome

	deck := card.Deck{}

	isAnimal := 1
	for i := 0; i < numCards; i++ {
		fmt.Println("Generating Card: ", i)
		isAnimal *= -1
		c, err := OrganismFromBiome(biomeName, isAnimal > 0)
		newCard, err := createCard(c)
		if err != nil {
			fmt.Println("There was an error creating the card", err)
			return nil, err
		}
		deck.Cards = append(deck.Cards, newCard)
	}
	createDeckInDB(&deck)
	return connect.NewResponse(&card.GenerateDeckResponse{Deck: &deck}), nil
}

func (s *CardService) GetDecks(ctx context.Context, req *connect.Request[card.GetDecksRequest]) (*connect.Response[card.GetDecksResponse], error) {
	fmt.Println("Getting Decks")
	userId := req.Msg.UserId

	decks, err := getDecksFromDB(userId)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&card.GetDecksResponse{Decks: decks}), nil
}
