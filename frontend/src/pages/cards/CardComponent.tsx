import React from 'react';
import { Card } from '../../rpc/proto/card/card_pb';

interface CardComponentProps {
  card: Card;
  handleDelete: (cardId: number) => void;
}

export const CardComponent: React.FC<CardComponentProps> = ({ card, handleDelete }) => {
    return (
        <div className="bg-gradient-to-b from-stone-400 via-stone-600 to-stone-400 w-96 min-h-[537.6px] rounded overflow-hidden shadow-lg relative border-2 border-black rounded-lg m-1">
          {/* <button
            onClick={() => handleDelete(card.id)}
            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
            aria-label="Delete card"
          >
            X
          </button> */}
          <div className="absolute z-10 ton-0 left-0">
            <div className="shadow-lg bg-neutral-300 relative border-2 border-black rounded-lg mx-3 mt-3 p-2 bg-opacity-60">
              <p className="text-black text-bold text-base">
                {card.name}
              </p>
            </div>
          </div>
          <div className='m-1 mb-0'>
            <img className="w-full h-auto relative border-2 border-black rounded-lg mb-0" src={`http://localhost:8080/card_images/${card.name}.png`} alt="Card Image" />
          </div>
            { card.type !== "Resource" &&
              <div className="flex item-stretch text-center pt-1.5 h-svh mt-0 text-blue-100">
                <p className="flex item-center justify-center py-14 bg-neutral-300 center-item text-black h-36 w-full text-base shadow-lg relative border-2 border-black rounded-lg min-h-48  m-0.5 mt-0">
                  Action: {card.action} <br></br>
                </p>
                <div className="absolute z-0 bottom-0 right-0">
                  <div className="flex items-center justify-center shadow-lg bg-neutral-300 relative rounded border-2 border-black m-0.5 p-0.5 pt-0 pb-0 pl-1 pr-1">
                    <p className="text-black text-bold text-base">
                    {card.attack}/{card.defense}
                    </p>
                  </div>
              </div>
            </div>
            }
            { card.type === "Resource" &&
              <div className="flex item-stretch text-center pt-1.5 h-svh mt-0 text-blue-100">
                <p className="flex item-center justify-center p-14 bg-neutral-300 center-item text-black h-36 w-full text-base shadow-lg relative border-2 border-black rounded-lg min-h-48  m-0.5 mt-0">
                  Add {card.mod} resources to your resource pool this turn. <br></br>
                </p>
            </div>
            }
      </div>
    );
  };
  