package card

import (
	"cards/gen/proto/card"
	"cards/pkg/ai"
	"cards/pkg/biome"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
)

func CardTemplateFromBiome(b string) (*card.CreateCardTemplateResponse, error) {
	cardTemplateResponse := &card.CreateCardTemplateResponse{}

	filenames, err := getFileNames("pkg/biome/biomes")
	if err != nil {
		fmt.Println("error getting filenames:", err)
		return cardTemplateResponse, err
	}
	// filename containing the biome
	var biomeFilename string
	for _, filename := range filenames {
		if strings.Contains(filename, b) {
			biomeFilename = filename
			break
		}
	}
	if biomeFilename == "" {
		return cardTemplateResponse, fmt.Errorf("biome %s not found", b)
	}

	chosenBiome, err := biome.ParseBiome(biomeFilename)
	if err != nil {
		return cardTemplateResponse, err
	}

	elements := []string{}
	for _, element := range chosenBiome.Characteristics.Elements {
		elements = append(elements, strings.Split(element, " ")[0])
	}
	cardTemplate := &card.CardTemplate{
		Template:     "A [Element]-[Animal] from [Biome]. The background depicts [Description]",
		Animals:      chosenBiome.Characteristics.Wildlife,
		Plants:       chosenBiome.Characteristics.Plants,
		Elements:     elements,
		Descriptions: chosenBiome.Characteristics.Elements,
	}

	cardTemplateResponse.CardTemplate = cardTemplate

	return cardTemplateResponse, nil
}

func CreateRandomCharacter(isAnimal bool) (*card.Card, error) {
	newCard, err := getRandomCharacter(isAnimal)

	if err != nil {
		return newCard, err
	}
	return generateCard(newCard)
}

func generateCard(newCard *card.Card) (*card.Card, error) {
	url, description, err := ai.GenerateImage(newCard.Description)
	if err != nil {
		return newCard, err
	}
	newCard.ImgUrl = url
	newCard.Description = description

	err = ai.DownloadImage(url, fmt.Sprintf("pkg/card_images/%s.png", newCard.Name))
	if err != nil {
		fmt.Println("error downloading image:", err)
		return newCard, err
	}
	return newCard, nil
}

func OrganismFromBiome(biomeName string, isAnimal bool) (*card.Card, error) {
	newCard := &card.Card{}

	filenames, err := getFileNames("pkg/biome/biomes")
	if err != nil {
		fmt.Println("error getting filenames:", err)
		return newCard, err
	}
	var biomeFilename string
	for _, filename := range filenames {
		if strings.Contains(filename, biomeName) {
			biomeFilename = filename
			break
		}
	}
	if biomeFilename == "" {
		return newCard, fmt.Errorf("biome %s not found", biomeName)
	}

	selectedBiome, err := biome.ParseBiome(biomeFilename)
	if err != nil {
		return newCard, err
	}

	element := selectedBiome.Characteristics.Elements[rand.Intn(len(selectedBiome.Characteristics.Elements))]
	elementName := strings.Split(element, " ")[0]

	if isAnimal {
		animal := selectedBiome.Characteristics.Wildlife[rand.Intn(len(selectedBiome.Characteristics.Wildlife))]
		newCard, err = constructAnimalCard(animal, elementName, selectedBiome.Name, element)
	} else {
		plant := selectedBiome.Characteristics.Plants[rand.Intn(len(selectedBiome.Characteristics.Plants))]
		newCard, err = constructPlantCard(plant, elementName, selectedBiome.Name, element)
	}

	if err != nil {
		return newCard, err
	}

	return generateCard(newCard)
}

func CreateCardFromPrompt(newCard *card.Card, prompt string) (*card.Card, error) {
	var localPath string

	url, description, err := ai.GenerateImage(prompt)
	if err != nil {
		return nil, err
	}

	localPath = fmt.Sprintf("pkg/card_images/%s-%s.png", newCard.Element, newCard.Animal)
	newCard.Description = description
	newCard.ImgUrl = localPath
	newCard.Name = fmt.Sprintf("%s-%s", newCard.Element, newCard.Animal)

	ai.DownloadImage(url, localPath)
	return newCard, nil

}

func getRandomCharacter(isAnimal bool) (*card.Card, error) {
	newCard := &card.Card{}

	filenames, err := getFileNames("pkg/biome/biomes")
	if err != nil {
		fmt.Println("error getting filenames:", err)
		return newCard, err
	}
	filename := filenames[rand.Intn(len(filenames))]
	randomBiome, err := biome.ParseBiome(filename)
	if err != nil {
		return newCard, err
	}

	// Get a random animal from the selected biome's wildlife
	if len(randomBiome.Characteristics.Wildlife) == 0 {
		return newCard, fmt.Errorf("no wildlife found in biome %s", randomBiome.Name)
	}
	randomAnimalIndex := rand.Intn(len(randomBiome.Characteristics.Wildlife))
	randomAnimal := randomBiome.Characteristics.Wildlife[randomAnimalIndex]
	randomElement := randomBiome.Characteristics.Elements[rand.Intn(len(randomBiome.Characteristics.Elements))]
	elementName := strings.Split(randomElement, " ")[0]
	randomPlant := randomBiome.Characteristics.Plants[rand.Intn(len(randomBiome.Characteristics.Plants))]
	if isAnimal {
		newCard, err = constructAnimalCard(randomAnimal, elementName, randomBiome.Name, randomElement)
	} else {
		newCard, err = constructPlantCard(randomPlant, elementName, randomBiome.Name, randomElement)
	}
	return newCard, nil
}

func constructAnimalCard(animal string, element string, biome string, description string) (*card.Card, error) {
	newCard := &card.Card{}

	newCard.Animal = animal
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s from %s. The background depicts %s", element, animal, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, animal)

	return newCard, nil
}
func constructPlantCard(plant string, element string, biome string, description string) (*card.Card, error) {
	newCard := &card.Card{}

	newCard.Plant = plant
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s from %s. The background depicts %s", element, plant, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, plant)

	return newCard, nil
}

func getFileNames(directory string) ([]string, error) {
	var filenames []string

	err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			filenames = append(filenames, path)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return filenames, nil
}
