import React, { useState, useEffect } from 'react';
import { cardService } from '../../service'; 
import { biomeService } from '../../service';
import { Biome } from '../../rpc/proto/biome/biome_pb';
import { CreateCardTemplateRequest, CardTemplate, Card, CreateCardRequest} from '../../rpc/proto/card/card_pb';
import { CardComponent } from './CardComponent';

export const CreateCard: React.FC = () => {
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [selectedBiome, setSelectedBiome] = useState<string>('');
  const [cardTemplate, setCardTemplate] = useState<CardTemplate | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [finalTemplate, setFinalTemplate] = useState("");
  const [createdCard, setCreatedCard] = useState<Card | null>(null);


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
      // Assuming you have a method in your cardService to handle this request
      const response = await cardService.createCard(request);
      console.log("Card created successfully:", response);
      if (response.card) setCreatedCard(response.card);
      // Handle the response as needed
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
    <div className="p-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Select a biome</span>
        </label>
        <select className="select select-bordered" onChange={handleBiomeChange} defaultValue="">
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
     {createdCard && (
      <div className="created-card-container mt-4">
        <h2 className="text-2xl font-bold mb-2">Created Card</h2>
        <CardComponent card={createdCard} handleDelete={() => setCreatedCard(null)} />
      </div>
    )}
    </div>
  );
};
