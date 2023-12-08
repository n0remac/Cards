import React, { useState, useEffect } from 'react';
import { biomeService } from '../service';
import { Biome } from '../rpc/proto/biome/biome_pb';

function BiomeSelector() {
  const [biomes, setBiomes] = useState<Biome[]>([]);
  const [selectedBiome, setSelectedBiome] = useState<Biome | null>(null);

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

  const handleBiomeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const biome = biomes.find(b => b.name === event.target.value) || null;
    setSelectedBiome(biome);
  };

  return (
    <div>
      <select onChange={handleBiomeChange} defaultValue="">
        <option value="" disabled>Select a biome</option>
        {biomes.map(biome => (
          <option key={biome.name} value={biome.name}>{biome.name}</option>
        ))}
      </select>

      {selectedBiome && (
        <div>
          <h2>{selectedBiome.name} ({selectedBiome.type})</h2>
          <p>Climate: {selectedBiome.characteristics.climate}</p>
          <p>Vegetation: {selectedBiome.characteristics.vegetation}</p>
          <p>Plants: {selectedBiome.characteristics.plants.join(', ')}</p>
          <p>Wildlife: {selectedBiome.characteristics.wildlife.join(', ')}</p>
          <p>Precipitation: {selectedBiome.characteristics.precipitation}</p>
        </div>
      )}
    </div>
  );
}

export default BiomeSelector;
