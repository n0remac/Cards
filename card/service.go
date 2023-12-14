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
	for i := 0; i < count; i++ {
		fmt.Println("Generating Card: ", i)
		c := &card.Card{}
		name, description, err := CreateRandomCharacter()
		if err != nil {
			return nil, err
		}
		fmt.Println("name: ", name)
		c.Name = name
		c.Description = description
		newCard, err := createCard(c)
		if err != nil {
			return nil, err
		}
		cards = append(cards, newCard)

	}

	return connect.NewResponse(&card.GenerateCardsResponse{Cards: cards}), nil
}
