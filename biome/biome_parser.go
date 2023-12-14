package biome

import (
	"cards/gen/proto/biome"
	"encoding/json"
	"io"
	"os"
)

type Biomes []biome.Biome

func ParseBiomes(filename string) (Biomes, error) {
	var biomes Biomes

	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	byteValue, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(byteValue, &biomes)
	if err != nil {
		return nil, err
	}

	return biomes, nil
}
