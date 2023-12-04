package card

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

func (s *CardService) CreateCard(ctx context.Context, req *connect.Request[card.Card]) (*connect.Response[card.CreateCardResponse], error) {
	err := createCardInDB(req.Msg)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.CreateCardResponse{
		Card: req.Msg,
	}), nil
}

func (s *CardService) DeleteCard(ctx context.Context, req *connect.Request[card.DeleteCardRequest]) (*connect.Response[card.DeleteCardResponse], error) {
	err := deleteCardFromDB(req.Msg.Id)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&card.DeleteCardResponse{}), nil
}
