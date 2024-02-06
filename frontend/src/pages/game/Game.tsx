import React, { useEffect, useState } from 'react';
import { cardService } from '../../service';
import { Deck, GetCardsRequest, DeleteCardRequest } from '../../rpc/proto/card/card_pb';
import { CardComponent } from '../cards/CardComponent';


interface Position {
  x: number;
  y: number;
}

interface Positions {
  [key: number]: Position;
}

export const Game: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [draggingCard, setDraggingCard] = useState<number | null>(null);
  const [positions, setPositions] = useState<Positions>({});

  useEffect(() => {
    const fetchCards = async () => {
      const cardsRequest = new GetCardsRequest();
      cardsRequest.userId = (localStorage.getItem('username') || '');
      // You can set any necessary parameters on cardsRequest if needed

      try {
        const response = await cardService.getDecks(cardsRequest);
        console.log("resp:", response);
        if (response.decks) {
          console.log('Fetched cards:', response.decks);
          setDecks(response.decks);
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    };

    fetchCards();
  }, []);


  const handleMouseDown = (index: number) => {
        setDraggingCard(index);
    };

    const handleMouseUp = () => {
        setDraggingCard(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (draggingCard !== null) {
            setPositions({
                ...positions,
                [draggingCard]: {
                    x: positions[draggingCard].x + e.movementX,
                    y: positions[draggingCard].y + e.movementY
                }
            });
        }
    };
    console.log(decks);
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Cards</h1>
      
      {/* <div className="flex flex-wrap justify-center">
        {decks.toReversed().map((deck) => (
          <CardComponent key={card.id} card={card} handleDelete={handleDelete} />
        ))}
      </div> */}
    </div>
  );
  
  
};
