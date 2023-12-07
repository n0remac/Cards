// src/Card.tsx
import React, { useState, useEffect } from 'react';
import { Card } from './rpc/proto/card/card_pb';
import './card.css';


interface Position {
    x: number;
    y: number;
}



interface CardProps {
    name: string;
    card: Card;
    index: number;
    position: Position;
    description: string;
    handleMouseDown: (index: number) => void;
}



const CardComponent: React.FC<CardProps> = ({ card, handleMouseDown, index }) => {

    return (
        <div
            className="card"
            style={{
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
            <div className="card-title">{card.name}</div>
            <div className="card-description">{card.description}</div>
        </div>
    );
};

export default CardComponent;
