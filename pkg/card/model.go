package card

import (
	"cards/pkg/database"
	"cards/gen/proto/card"
	"encoding/json"
	"fmt"

	"github.com/upper/db/v4"
)

type Card struct {
	ID   int    `db:"id,omitempty"`
	Data string `db:"data"`
}

func createCard(c *card.Card) (*card.Card, error) {
	sess := database.GetSession()

	// Create a new card record
	cJSON, _ := json.Marshal(c)

	newCard := Card{
		Data: string(cJSON),
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

func getCardsFromDB() ([]*card.Card, error) {
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
		cards = append(cards, &c)
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
