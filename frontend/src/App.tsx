import React, { useState, useEffect } from 'react';
import { cardService } from './service';
import { Card } from './rpc/proto/card/card_pb';
import './styles.css';


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
    const [newCardName, setNewCardName] = useState('');
    const [newCardDescription, setNewCardDescription] = useState('');

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

    const handleCreateCard = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const newCard = new Card();
            newCard.name = newCardName;
            newCard.description = newCardDescription;
    
            await cardService.createCard(newCard);
            // Optionally, fetch cards again to update the list
        } catch (error) {
            console.error("Error creating card:", error);
        }
    };

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
        <div className="container">
            <div className="form-container">
                <form onSubmit={handleCreateCard}>
                    <input
                        type="text"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        placeholder="Card Name"
                    />
                    <textarea
                        value={newCardDescription}
                        onChange={(e) => setNewCardDescription(e.target.value)}
                        placeholder="Card Description"
                    />
                    <button type="submit">Create Card</button>
                </form>
            </div>
            <div className="cards-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                {cards.map((card, index,) => (
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
                         fontSize: '25px',
                     }}
                     onMouseDown={() => handleMouseDown(index)}
                 >
                     <div 
                        className="card-title"
                        style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            height: '20px',
                        }}
                    >{card.name}</div>
                    <div 
                        className="card-description"
                        style={{
                            fontSize: '15px',
                            height: '120px',
                        }}
                    >{card.description}</div>
        </div>
                ))}
            </div>
        </div>

    );
}
