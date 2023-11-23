import React, { useState, useEffect } from 'react';
import { cardService } from './service';
import { Card } from './rpc/proto/card/card_pb';

interface Position {
    x: number;
    y: number;
}

interface Positions {
    [key: number]: Position;
}

export default function App() {
    const [cards, setCards] = useState<Card[]>([]);
    const [positions, setPositions] = useState<Positions>({});
    const [draggingCard, setDraggingCard] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const fetchedCards = await cardService.getCards({});

                if (Array.isArray(fetchedCards.cards)) {
                    setCards(fetchedCards.cards as Card[]);

                    const initialPositions = fetchedCards.cards.reduce((acc: Positions, _, index: number) => {
                        acc[index] = { x: 0, y: 0 };
                        return acc;
                    }, {});
                    setPositions(initialPositions);
                }
            } catch (error) {
                console.error("Error fetching cards:", error);
            }
        })();
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
    return (
        <div onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} style={{ height: '100vh', width: '100vw' }}>
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="card"
                    style={{
                        left: positions[index]?.x + 'px',
                        top: positions[index]?.y + 'px',
                        width: '100px',
                        height: '140px',
                        backgroundColor: 'red',
                        position: 'absolute',
                        border: '1px solid black',
                        textAlign: 'center',
                        lineHeight: '140px',
                        cursor: 'move',
                        fontSize: '50px',
                    }}
                    onMouseDown={() => handleMouseDown(index)}
                >
                    {card.rank} {card.suit}
                </div>
            ))}
        </div>
    );
}
