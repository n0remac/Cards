import React, { useState } from 'react';
import { cardService } from '../../service';
import { Card, GenerateCardsRequest } from '../../rpc/proto/card/card_pb';

export const GenerateCards = () => {
  const [count, setCount] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);


  const handleCountChange = (e) => {
    setCount(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cardsRequest = new GenerateCardsRequest();
    cardsRequest.count = Number(count);
    cardsRequest.userId = (localStorage.getItem('username') || '');

    try {
      const response = await cardService.generateCards(cardsRequest);
      if (response.cards) {
        console.log('Generated cards:', response.cards);
        setCards(response.cards);
      }
    } catch (error) {
      console.error('Error generating cards:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-2">
          <label htmlFor="count" className="block text-gray-700 text-sm font-bold mb-2">
            Number of Cards to Generate:
          </label>
          <input
            type="number"
            id="count"
            value={count}
            onChange={handleCountChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            min="1"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Generate Cards
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="max-w-sm rounded overflow-hidden shadow-lg">
            <img className="w-full" src={card.name} alt="Card Image" />
            <div className="px-6 py-4">
              <p className="text-gray-700 text-base">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

