package biome

import (
	"cards/gen/proto/biome"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

type Biomes []biome.Biome

func ParseBiomes(filename string) (Biomes, error) {
	var biomes Biomes

	file, err := os.Open(filename)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return nil, err
	}
	defer file.Close()

	byteValue, err := io.ReadAll(file)
	if err != nil {
		fmt.Println("Error reading file:", err)
		return nil, err
	}

	err = json.Unmarshal(byteValue, &biomes)
	if err != nil {
		fmt.Println("Error unmarshalling json:", err)
		return nil, err
	}

	return biomes, nil
}

func ParseBiome(filename string) (Biome, error) {
	var biome Biome

	file, err := os.Open(filename)
	if err != nil {
		fmt.Println("error opening file:", err)
		return biome, err
	}
	defer file.Close()

	byteValue, err := io.ReadAll(file)
	if err != nil {
		fmt.Println("error reading file:", err)
		return biome, err
	}

	err = json.Unmarshal(byteValue, &biome)
	if err != nil {
		fmt.Println("error unmarshalling json:", err)
		return biome, err
	}

	return biome, nil
}

func ParseBiomeJSON(biomeJson string) (Biome, error) {
	var biome Biome

	byteValue := []byte(biomeJson)

	err := json.Unmarshal(byteValue, &biome)
	if err != nil {
		fmt.Println("error unmarshalling json:", err)
		return biome, err
	}

	return biome, nil
}
