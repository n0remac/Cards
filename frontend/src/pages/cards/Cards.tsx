import React, { useEffect, useState } from 'react';
import { cardService } from '../../service';
import { Card, GetCardsRequest, DeleteCardRequest } from '../../rpc/proto/card/card_pb';
import { CardComponent } from './CardComponent';
import { useParams } from 'react-router-dom';

export const AllCards = () => {
  const [cards, setCards] = useState<Card[]>([]);

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

  const handleDelete = async (cardId: number) => {
    try {
      const deleteRequest = new DeleteCardRequest();
      deleteRequest.cardId = cardId;
  
      // Send the delete request
      await cardService.deleteCard(deleteRequest);
  
      // Remove the card from the state
      setCards(cards.filter(card => card.id != cardId));
  
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Cards</h1>
      
      <div className="flex flex-wrap justify-center">
        {cards.toReversed().map((card) => (
          <CardComponent key={card.id} card={card} handleDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
  
  
};

export const UsersCards = () => {
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    const fetchCards = async () => {
      const cardsRequest = new GetCardsRequest();
      cardsRequest.userId = (localStorage.getItem('username') || '');

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

  const handleDelete = async (cardId: number) => {
    try {
      const deleteRequest = new DeleteCardRequest();
      deleteRequest.cardId = cardId;
  
      // Send the delete request
      await cardService.deleteCard(deleteRequest);
  
      // Remove the card from the state
      setCards(cards.filter(card => card.id != cardId));
  
    } catch (error) {
      console.error('Error deleting card:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Cards</h1>
      
      <div className="flex flex-wrap justify-center">
        {cards.toReversed().map((card) => (
          <CardComponent key={card.id} card={card} handleDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
  
  
};

export const DisplayCard: React.FC  = () => {
  const { cardId } = useParams();
};