import React, { useState, useEffect } from 'react';
// Import generated gRPC client
import { biomeService, cardService } from '../../service';
import { Deck, GenerateDeckRequest } from '../../rpc/proto/card/deck_pb';
import { Biome } from '../../rpc/proto/biome/biome_pb';
import { CreateCardTemplateRequest, CardTemplate, Card, CreateCardRequest} from '../../rpc/proto/card/card_pb';


const CreateDeck: React.FC = () => {
  // State for your form elements
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [selectedBiome, setSelectedBiome] = useState<string>('');
  const [count, setCount] = useState(1);
  const [deck, setDeck] = useState<Deck>(new Deck());

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
  }, []);

  const handleCountChange = (e) => {
    setCount(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newDeckRequest = new GenerateDeckRequest();
    newDeckRequest.numCards = Number(count);
    newDeckRequest.biome = selectedBiome;

    try {
      const response = await cardService.generateDeck(newDeckRequest);
      if (response.deck) {
        console.log('Generated deck:', response.deck);
        setDeck(response.deck);
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
)};

export default CreateDeck;
