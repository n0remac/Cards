import React, { useState, useEffect } from 'react';
import { cardService } from '../service';
import { Card } from '../rpc/proto/card/card_pb';
import { biomeService } from '../service';
import { Biome } from '../rpc/proto/biome/biome_pb';


interface SceneTemplate {
    scene: string;
    examples: { [key: string]: string[] };
  }
  
  interface StoryTemplates {
    scenes: SceneTemplate[];
  }

  interface SceneExample {
    [key: string]: string[];
  }
  

export const StoryTemplateForm: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [selectedBiome, setSelectedBiome] = useState<Biome | null>(null);
  const [story, setStory] = useState('');

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

      const scene = await biomeService.generateBiomeCard(biomes[0]);
    })();
  }, []);

  const handleBiomeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const biome = biomes.find(b => b.name === event.target.value) || null;
    setSelectedBiome(biome);
  };
  
  const parseTemplate = (description: string): StoryTemplates => {
    try {
      // Parse the JSON string
      const parsed: StoryTemplates = JSON.parse(description);
  
      // Check if there are any scenes
      if (!parsed.scenes || parsed.scenes.length === 0) {
        throw new Error('No scenes found');
      }
      return parsed;
    } catch (error) {
      console.error('Failed to parse template:', error);
      // Return a default or empty template in case of an error
      return {  scenes: [] };
    }
  };


  const handleChange = (sceneIndex: number, key: string, value: string) => {
    setSelectedOptions({
      ...selectedOptions,
      [`${sceneIndex}-${key}`]: value,
    });
  };



  const renderSceneWithSelectors = (scenes: StoryTemplates, index: number) => {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        {scenes.scenes.map((scene) => {
          const segments = scene.scene.split(/\[([^\]]+)\]/);
          return segments.map((segment, i) => {
            if (i % 2 === 0) {
              return <span key={i} style={{ margin: '0 4px' }}>{segment}</span>;
            } else {
              const options = scene.examples[segment];
              if (!options) {
                console.error(`No examples found for segment: ${segment}`);
                return null;
              }
              return (
                <select
                  key={i}
                  value={selectedOptions[`${index}-${segment}`]}
                  onChange={(e) => handleChange(index, segment, e.target.value)}
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
          })
        }) 
        }
      </div>
    );
  };

  const handleGenerateStory = async () => {
    if (selectedBiome) {
      try {
        const response = await biomeService.generateBiomeCard(selectedBiome);
        setStory(response.data);
      } catch (error) {
        console.error("Error generating story:", error);
      }
    }
  };

  const renderStory = () => {
    if (!story) return null;
    const template = parseTemplate(story);
    // Assuming renderSceneWithSelectors is implemented to render the scene
    return renderSceneWithSelectors(template, 0);
  };

  return (
    <div className="p-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Select a biome</span>
        </label>
        <select className="select select-bordered" onChange={handleBiomeChange} defaultValue="">
          <option value="" disabled>Select a biome</option>
          console.log("biomes", biomes);
          {biomes.map(biome => (
            <option key={biome.name} value={biome.name}>{biome.name}</option>
          ))}
        </select>
        <button onClick={handleGenerateStory} className="btn btn-primary mt-2">
          Generate Story
        </button>
      </div>

      <div className="story-container">
        {renderStory()}
      </div>
    </div>
  );
};