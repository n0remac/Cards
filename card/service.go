package card

import (
	"cards/gen/proto/card"
	"context"

	"github.com/bufbuild/connect-go"

	"strconv"
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
	id := 0

	id, e := strconv.Atoi(req.Msg.CardId)
	if e != nil {
		return nil, e
	}

	err := deleteCardFromDB(id)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.DeleteCardResponse{
		CardId: req.Msg.CardId,
	}), nil
}

func (s *CardService) GenerateCards(ctx context.Context, req *connect.Request[card.GenerateCardsRequest]) (*connect.Response[card.GenerateCardsResponse], error) {
	// cards, err := biome.generateCards(req.Msg.UserId)
	// if err != nil {
	// 	return nil, err
	// }

	// return connect.NewResponse(&card.GenerateCardsResponse{
	// 	Cards: cards,
	// }), nil
	return nil, nil
}
