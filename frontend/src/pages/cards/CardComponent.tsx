import React from 'react';
import { Card } from '../../rpc/proto/card/card_pb';

interface CardComponentProps {
  card: Card;
  handleDelete: (cardId: number) => void;
}

export const CardComponent: React.FC<CardComponentProps> = ({ card, handleDelete }) => {
    return (
        <div className="m-2 w-96 h-5/6 rounded overflow-hidden shadow-lg relative border-2 border-black rounded-lg">
        <button
          onClick={() => handleDelete(card.id)}
          className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
          aria-label="Delete card"
        >
          X
        </button>
        <div className="overflow-hidden">
          <img className="w-full h-auto" src={`http://localhost:8080/card_images/${card.name}.png`} alt="Card Image" />
        </div>
        <div className="p-2">
          <p className="text-gray-700 text-base">
            {card.element} - {card.animal}
          </p>
          <p className="text-gray-700 text-base">
            {card.description}
          </p>
        </div>
      </div>
    );
  };
  