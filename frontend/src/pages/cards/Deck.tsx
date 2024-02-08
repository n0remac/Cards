import React, { useState, useEffect, useRef } from 'react';
// Import generated gRPC client
import { biomeService, cardService } from '../../service';
import { Biome } from '../../rpc/proto/biome/biome_pb';
import { CreateCardTemplateRequest, CardTemplate, Card, Deck, CreateDeckTemplateRequest, GetCardsRequest, DeleteCardRequest, GetDeckRequest} from '../../rpc/proto/card/card_pb';
import { Link, useNavigate } from 'react-router-dom';
import { CardComponent } from './CardComponent';
import {useParams} from "react-router-dom";



export const CreateDeck: React.FC = () => {
  // State for your form elements
  const navigate = useNavigate();
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [selectedBiome, setSelectedBiome] = useState<string>('');
  const [count, setCount] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await biomeService.getBiomes({});
        if (response.biomes) {
          setBiomes(response.biomes.biomes);
        }
      } catch (error) {
        console.error("Error fetching biomes:", error);
      }
    })();

    const token = localStorage.getItem('userToken');
    setUsername(localStorage.getItem('username') || '');
    setIsLoggedIn(!!token);

    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleCountChange = (e) => {
    setCount(parseInt(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const deckTemplateRequest = new CreateDeckTemplateRequest();
    deckTemplateRequest.settting = e.target.setting.value;
    deckTemplateRequest.count = count;
    deckTemplateRequest.userId = localStorage.getItem('username') || '';
    deckTemplateRequest.deck = e.target.deckName.value;
    
    try {
      const response = await cardService.createDeckTemplate(deckTemplateRequest);
      if (response.deck?.cards) {
        setCards(response.deck.cards);
      }
    } catch (error) {
      console.error('Error generating cards:', error);
    }
  };

  return (
    <div>
      {isLoggedIn &&
      <div className="m-2 w-96 h-5/6 rounded overflow-hidden shadow-lg relative border-2 border-black rounded-lg">
        <div className="p-2">
        <form onSubmit={handleSubmit} className="mb-4">
          
          <div className="mb-2">
            <label className="label">
              <span className="label-text">Deck Name:</span>
            </label>
            <input
              type="text"
              id="deckName"
              className="input input-bordered"
              placeholder="Name your deck"
            />
            <label className="label">
              <span className="label-text">Describe the setting for this deck:</span>
            </label>
            <input
              type="text"
              id="setting"
              className="input input-bordered"
              placeholder="Describe a setting"
            />
            <label htmlFor="count" className="block text-gray-700 text-sm font-bold mb-2">
                Number of Cards to Generate:
            </label>
            <input
                type="number"
                id="count"
                value={count}
                onChange={handleCountChange}
                className="shadow appearance-none border rounded w-full py-2 px-3  leading-tight focus:outline-none focus:shadow-outline"
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
        </div>
      </div>
      }
      {!isLoggedIn && <p>Please log in to create a deck.</p>}
    </div>
  );
}

export const UsersDecks: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const componentRef = useRef(null);

  useEffect(() => {
    const fetchDecks = async () => {
      const cardsRequest = new GetCardsRequest();
      cardsRequest.userId = localStorage.getItem('username') || '';
      console.log('cardsRequest.userId:', cardsRequest.userId);

      try {
        const response = await cardService.getDecks(cardsRequest);
        if (response.decks) {
          console.log('Fetched decks:', response.decks);
          setDecks(response.decks);
        }
      } catch (error) {
        console.error('Error fetching decks:', error);
      }
    };

    fetchDecks();
  }, []);


  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Your Decks</h1>
      <div className="flex flex-wrap justify-center">
        {decks.map((deck) => (
          <div className="max-w-sm rounded overflow-hidden shadow-lg m-2">
            <div className="px-6 py-4">
              <p className="text-gray-700 text-base">
                Name: {deck.name}
                Cards: {deck.cards.length}
              </p>
              <Link to={`/deck/${deck.name}`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              View Deck
              </Link>
              <DisplayDeck cards={cards}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 

export const DeckById: React.FC = () => {
  const [deck, setDeck] = useState<Deck>();
  const {deckId} = useParams();
  
  useEffect(() => {
    const fetchDeck = async () => {
      const deckRequest = new GetDeckRequest();
      
      deckRequest.name  = deckId || '';
      try {
        const response = await cardService.getDeck(deckRequest);
        if (response.cards) {
          console.log('Fetched deck:', response.cards);
          setDeck(response);
        }
      } catch (error) {
        console.error('Error fetching deck:', error);
      }
    };

    fetchDeck();
  }, []);

  const handleDelete = async (cardId: number) => {
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-wrap justify-center">
        <DisplayDeck cards={deck?.cards || []}/>
      </div>
    </div>
  );
}

export const DisplayDeck = ({ cards }: { cards: Card[] }) => {


  const handleDelete = async (cardId: number) => {
  };
  return (
    <div className="container mx-auto p-4">
      <div id="deck" className="flex flex-wrap justify-center">
        {cards.map((card) => (
          <CardComponent key={card.id} card={card} handleDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};
