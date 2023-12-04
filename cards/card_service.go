package cards

import (
	"cards/gen/proto/card/cardconnect"
	"cards/gen/proto/card"
	"context"
	"github.com/bufbuild/connect-go"
)


type CardService struct {

}

var _ cardconnect.CardServiceHandler = (*CardService)(nil)

func (s *CardService) GetCards(ctx context.Context, req *connect.Request[card.GetCardsRequest]) (*connect.Response[card.GetCardsResponse], error) {
	cards, err := getCardsFromDB()
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.GetCardsResponse{
		Cards: cards,
	}), nil
}

func (s *CardService) NewCard(ctx context.Context, req *connect.Request[card.Card]) (*connect.Response[card.Card], error) {
	newCard, err := createCardInDB(req.Msg)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(newCard), nil
}

