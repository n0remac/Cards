import React, { useState, useEffect, useRef } from 'react';
// Import generated gRPC client
import { biomeService, cardService } from '../../service';
import { Biome } from '../../rpc/proto/biome/biome_pb';
import { CreateCardTemplateRequest, CardTemplate, Card, Deck, GenerateCardsRequest, GetCardsRequest, DeleteCardRequest, GetDeckRequest} from '../../rpc/proto/card/card_pb';
import { Link, useNavigate } from 'react-router-dom';
import { CardComponent } from './CardComponent';
import {useParams} from "react-router-dom";
import { useReactToPrint } from 'react-to-print';
import { Button } from 'react-bootstrap';
import ReactToPrint from "react-to-print";

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
    setCount(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cardsRequest = new GenerateCardsRequest();
    cardsRequest.count = Number(count);
    cardsRequest.biome = selectedBiome;
    cardsRequest.userId = username; 
    cardsRequest.deck = Date.now().toString();

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
  

  const handleBiomeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBiome = event.target.value;
    setSelectedBiome(selectedBiome);
    
    if (selectedBiome) {
        try {
          const request = new CreateCardTemplateRequest();
          request.biome = selectedBiome;
          const response = await cardService.createCardTemplate(request);
          const newCardTemplate = response.cardTemplate as CardTemplate;
        } catch (error) {
          console.error("Error setting biomes:", error);
        }
      }
  };

  return (
    <div>
      {isLoggedIn && (
      <div className="m-2 w-96 h-5/6 rounded overflow-hidden shadow-lg relative border-2 border-black rounded-lg">
        <div className="p-2">
        <label className="label">
          <span className="label-text">Select a biome</span>
        </label>
        <select className="select select-bordered" onChange={handleBiomeChange} value={selectedBiome}>
            <option value="" disabled>Select a biome</option>
            {biomes.map((biome) => (
              <option key={biome.name} value={biome.name}>{biome.name}</option>
            ))}
          </select>
      </div>
      {selectedBiome && (
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
          )}
      </div>
      )}
      {!isLoggedIn && <p>Please log in to create a deck.</p>}
    </div>
)};

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

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

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
              <Button onClick={handlePrint} >Print</Button>
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
  const componentRef = useRef();
  
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
  let componentRef = useRef<HTMLDivElement | null>(null);

  const handleDelete = async (cardId: number) => {
  };
  console.log('cards:', cards.length);
  return (
    <div className="container mx-auto p-4">
      <div ref={componentRef} className="flex flex-wrap justify-center">
        {cards.map((card) => (
          <CardComponent key={card.id} card={card} handleDelete={handleDelete} />
        ))}
      </div>
      <ReactToPrint 
        trigger={() =>{ return <Button>Print this out!</Button>}} 
        content={() => componentRef.current} />
    </div>
  );
};
