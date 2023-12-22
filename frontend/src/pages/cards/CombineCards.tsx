import React, { useState, useEffect } from 'react';
import { cardService } from '../../service';
import { Card, GetCardsRequest, CreateCardRequest } from '../../rpc/proto/card/card_pb';
import { CardComponent } from './CardComponent';

interface CardSelectorProps {
  cards: Card[];
  onSelect: (index: string) => void;
}

const CardSelector: React.FC<CardSelectorProps> = ({ cards, onSelect }) => {
  return (
    <select className="select select-bordered" onChange={(e) => onSelect(e.target.value)}>
      <option value="" disabled>Select a card</option>
      {cards.map((card, index) => (
        <option key={index} value={index}>
          {card.element} - {card.animal} {/* Display relevant card details */}
        </option>
      ))}
    </select>
  );
};

export const CombineCards: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [card1, setCard1] = useState<Card | null>(null);
  const [card2, setCard2] = useState<Card | null>(null);
  const [combinedCard, setCombinedCard] = useState<Card | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string>("");   
  useEffect(() => {
    const fetchCards = async () => {
      const cardsRequest = new GetCardsRequest();

      try {
        const response = await cardService.getCards(cardsRequest);
        if (response.cards) {
          console.log('Fetched cards:', response.cards);
          setCards(response.cards);
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    };

    fetchCards();
  }, []);

  const handleCard1Select = (index: string) => {
    setCard1(cards[parseInt(index)]);
  };

  const handleCard2Select = (index: string) => {
    setCard2(cards[parseInt(index)]);
  };

  const combineNames = (name1: string, name2: string) => {
    // Half of name1, half of name2
    const name1Half = name1.slice(0, Math.ceil(name1.length / 2));
    const name2Half = name2.slice(Math.ceil(name2.length / 2));
    return name1Half + name2Half;
  }

  const handleCreateCard = async () => {
    if (!card1 || !card2) {
      console.error("Both cards must be selected to combine them");
      return;
    }
  
    const combinedCardToCreate = new Card();
    combinedCardToCreate.animal = `${card1.animal} and ${card2.animal}`;
    combinedCardToCreate.element = `${card1.element} and ${card2.element}`;
    // Combine other properties as needed
    combinedCardToCreate.description = `A fusion of ${card1.description} and ${card2.description}`;
  
    const request = new CreateCardRequest();
    request.card = combinedCardToCreate;
    // You can construct a prompt based on the properties of card1 and card2
    request.prompt = `I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: A mythical creature that is a fusion of a ${card1.name} and ${card2.name}. The background is a combination of ${card1.biome} and ${card2.biome}. There should be no words in the image. `;
  
    try {
      const response = await cardService.createCard(request);
      console.log("Combined card created successfully:", response);
      if (response.card) {
        setCombinedCard(response.card);
        // Assuming the response includes the name used to construct the image URL
        setCardImageUrl(`http://localhost:8080/card_images/${response.card.name}.png`);
      }
    } catch (error) {
      console.error("Error creating combined card:", error);
    }
  };
  

  return (
    <div className="flex flex-col items-center space-y-4">
      <div>
        <CardSelector cards={cards} onSelect={handleCard1Select} />
        <CardSelector cards={cards} onSelect={handleCard2Select} />
      </div>
      <div className="flex justify-center space-x-4">
        {card1 && <CardComponent card={card1} handleDelete={() => setCard1(null)} />}
        {card2 && <CardComponent card={card2} handleDelete={() => setCard2(null)} />}
      </div>

      <button onClick={handleCreateCard} className="btn btn-primary">
      Create Combined Card
    </button>

    {combinedCard && (
      <div className="mt-4">
        <h2 className="text-2xl font-bold mb-2">Combined Card</h2>
        <CardComponent card={combinedCard} handleDelete={() => setCombinedCard(null)} />
        {cardImageUrl && <img src={cardImageUrl} alt="Combined Card Image" />}
      </div>
    )}
    </div>
  );
};
