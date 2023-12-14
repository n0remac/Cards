package card

import (
	"cards/ai"
	"cards/biome"
	"fmt"
	"math/rand"
)

func getRandomCharacter(filename string) (string, string, error) {
	biomes, err := biome.ParseBiomes(filename)
	if err != nil {
		return "", "", err
	}

	// Get a random biome
	randomBiomeIndex := rand.Intn(len(biomes))
	randomBiome := biomes[randomBiomeIndex]

	// Get a random animal from the selected biome's wildlife
	if len(randomBiome.Characteristics.Wildlife) == 0 {
		return "", "", fmt.Errorf("no wildlife found in biome %s", randomBiome.Name)
	}
	randomAnimalIndex := rand.Intn(len(randomBiome.Characteristics.Wildlife))
	randomAnimal := randomBiome.Characteristics.Wildlife[randomAnimalIndex]

	return randomAnimal, randomBiome.Name, nil
}

func CreateRandomCharacter() (string, string, error) {
	randomAnimal, randomBiome, err := getRandomCharacter("biome/biomes.json")
	characterString := fmt.Sprintf("A %s from the %s biome", randomAnimal, randomBiome)

	if err != nil {
		return "", "", err
	}
	url, description, err := ai.GenerateImage(characterString)
	ai.DownloadImage(url, fmt.Sprintf("card_images/%s.png", randomAnimal))
	return url, description, nil
}
