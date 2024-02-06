package card

import (
	"cards/gen/proto/card"
	"cards/pkg/database"
	"encoding/json"
	"fmt"

	"github.com/upper/db/v4"
)

type Card struct {
	ID     int    `db:"id,omitempty"`
	Player string `json:"player"`
	Data   string `db:"data"`
}

func createCard(c *card.Card) (*card.Card, error) {
	sess := database.GetSession()

	// Create a new card record
	cJSON, _ := json.Marshal(c)

	newCard := Card{
		Data:   string(cJSON),
		Player: "",
	}

	_, err := sess.Collection("cards").Insert(newCard)
	if err != nil {
		return nil, err
	}
	return c, err
}

func createCardInDB(card *card.Card) (*card.Card, error) {
	sess := database.GetSession()

	cardJSON, _ := json.Marshal(card)
	// if err != nil {
	// 	return err
	// }

	// Create a new card record
	newCard := Card{
		Data: string(cardJSON),
	}

	// Insert the new card into the database
	result, err := sess.Collection("cards").Insert(newCard)
	fmt.Println("result: ", result)
	return card, err
}

func getCardFromDB(id int32) (*card.Card, error) {
	sess := database.GetSession()
	var c Card
	var card *card.Card

	// Query the database for the card with the given ID
	res := sess.Collection("cards").Find(db.Cond{"id": id})
	err1 := res.One(&c)
	if err1 != nil {
		return nil, err1
	}

	er := json.Unmarshal([]byte(c.Data), &card)
	if er != nil {
		return nil, er
	}
	return card, nil
}

func getCardsFromDB(user string) ([]*card.Card, error) {
	sess := database.GetSession()
	var cards []*card.Card

	// Query the database for all card records
	res := sess.Collection("cards").Find()

	var dbCards []Card
	err := res.All(&dbCards)
	if err != nil {
		return nil, err
	}
	// Convert the JSON data back into card structs
	for _, dbCard := range dbCards {
		var c card.Card
		id := dbCard.ID
		err := json.Unmarshal([]byte(dbCard.Data), &c)
		if err != nil {
			return nil, err
		}
		c.Id = int32(id)
		if user == "" {
			cards = append(cards, &c)
		} else if c.Player == user {
			cards = append(cards, &c)
		}
	}
	return cards, nil
}

func deleteCardFromDB(id int32) error {
	sess := database.GetSession()
	// Delete the card with the given ID
	res := sess.Collection("cards").Find(db.Cond{"id": id})
	err := res.Delete()
	return err
}
