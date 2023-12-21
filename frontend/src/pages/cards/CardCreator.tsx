import React, { useState, useEffect } from 'react';
import { cardService } from '../../service'; 
import { Biome } from '../../rpc/proto/biome/biome_pb';
import { biomeService } from '../../service';
import { CreateCardTemplateRequest, CardTemplate, Card, CreateCardRequest} from '../../rpc/proto/card/card_pb';



export const CardCreator: React.FC<{}> = () => {  
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [cardTemplate, setCardTemplate] = useState<CardTemplate | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [finalTemplate, setFinalTemplate] = useState("");
  const [selectedBiome, setSelectedBiome] = useState<string>('');
  const [createdCard, setCreatedCard] = useState<Card | null>(null);
  const [cardImageUrl, setCardImageUrl] = useState<string>("");

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

  const handleBiomeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBiome = event.target.value;
    setSelectedBiome(selectedBiome);
  
    if (selectedBiome) {
      try {
        const request = new CreateCardTemplateRequest();
        request.biome = selectedBiome;
        const response = await cardService.createCardTemplate(request);
  
        if (response.cardTemplate) {
          const newCardTemplate = response.cardTemplate as CardTemplate;
  
          // Initialize selectedOptions with the first option from each category
          const initialSelectedOptions = {
            "Element": newCardTemplate.elements[0],
            "Animal": newCardTemplate.animals[0],
            "Biome": selectedBiome,
            "Description": newCardTemplate.descriptions[0],
            // Add other categories as necessary
          };
  
          setCardTemplate(newCardTemplate);
          setSelectedOptions(initialSelectedOptions);
          setFinalTemplate(updateFinalTemplate(initialSelectedOptions));
        }
      } catch (error) {
        console.error("Error generating card:", error);
      }
    }
  };

  const handleCreateCard = async () => {
    const cardToCreate = createCardObject();
    const request = new CreateCardRequest();
    request.card = cardToCreate;
    request.prompt = finalTemplate;

    try {
        const response = await cardService.createCard(request);
        console.log("Card created successfully:", response);
        if (response.card) {
        setCreatedCard(response.card);
        setCardImageUrl(`http://localhost:8080/card_images/${response.card.name}.png`); // Update the image URL
        }
    } catch (error) {
        console.error("Error creating card:", error);
    }
};

  const createCardObject = () => {
    const newCard = new Card();
    newCard.animal = selectedOptions["Animal"];
    newCard.biome = selectedOptions["Biome"];
    newCard.element = selectedOptions["Element"];
    newCard.description = selectedOptions["Description"];

    return newCard;
  };
  
  const handleOptionChange = (segment: string, value: string) => {
    const newSelectedOptions = { ...selectedOptions, [segment]: value };
    setSelectedOptions(newSelectedOptions);
    const newTemplate = updateFinalTemplate(newSelectedOptions);
    setFinalTemplate(newTemplate);
  };
  
  const updateFinalTemplate = (options: { [key: string]: string }) => {
    if (!cardTemplate) return '';
    const segments = cardTemplate.template.split(/\[([^\]]+)\]/);
    return segments.map((segment, i) => {
      if (i % 2 === 0) {
        return segment;
      } else {
        return options[segment] || `[${segment}]`;
      }
    }).join('');
  };

  const renderTemplateWithSelectors = () => {
    if (!cardTemplate) return null;
  
    const templateOptionsMap: { [key: string]: string[] } = {
      "Element": cardTemplate.elements,
      "Animal": cardTemplate.animals,
      "Biome": [selectedBiome], 
      "Description": cardTemplate.descriptions,
      // Add other mappings as necessary
    };
  
    const segments = cardTemplate.template.split(/\[([^\]]+)\]/);
  
    return segments.map((segment, i) => {
        if (i % 2 === 0) {
          return <span key={i} style={{ margin: '0 4px' }}>{segment}</span>;
        } else {
          const options = templateOptionsMap[segment];
          if (!options) {
            console.error(`No options found for segment: ${segment}`);
            return null;
          }
          return (
            <select
              key={i}
              value={selectedOptions[segment]}
              onChange={(e) => handleOptionChange(segment, e.target.value)}
              style={{ margin: '0 4px', padding: '2px 6px', fontSize: '0.8rem', height: 'auto' }}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
      });
      
  };

  return (
    <div className="m-2 w-96 h-5/6 rounded overflow-hidden shadow-lg relative border-2 border-black rounded-lg">
      <button
      
        onClick={() => setCreatedCard(null)}
        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
        aria-label="Delete card"
      >
        X
      </button>
      <div className="overflow-hidden">
        <img className="w-full h-auto" src={cardImageUrl} alt="Card Image" />
      </div>
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
      <div className="card-template-container">
        {renderTemplateWithSelectors()}
      </div>
      <button onClick={handleCreateCard} className="btn btn-primary mt-2">
      Create Card
     </button>
    </div>
    
  );
};

  