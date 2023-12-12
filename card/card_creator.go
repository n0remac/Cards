package card

import (
	"cards/ai"
	"cards/biome"
	"fmt"
	"math/rand"
)

func getRandomCharacter(filename string) (string, error) {
	biomes, err := biome.ParseBiomes(filename)
	if err != nil {
		return "", err
	}

	// Get a random biome
	randomBiomeIndex := rand.Intn(len(biomes))
	randomBiome := biomes[randomBiomeIndex]

	// Get a random animal from the selected biome's wildlife
	if len(randomBiome.Characteristics.Wildlife) == 0 {
		return "", fmt.Errorf("no wildlife found in biome %s", randomBiome.Name)
	}
	randomAnimalIndex := rand.Intn(len(randomBiome.Characteristics.Wildlife))
	randomAnimal := randomBiome.Characteristics.Wildlife[randomAnimalIndex]

	characterString := fmt.Sprintf("A %s from the %s biome", randomAnimal, randomBiome.Name)
	return characterString, nil
}

func CreateRandomCharacter() (string, error) {
	characterString, err := getRandomCharacter("biome/biomes.json")
	if err != nil {
		return "", err
	}
	url, err := ai.GenerateImage(characterString)
	ai.DownloadImage(url, "card_images/character.png")
	return url, nil
}
