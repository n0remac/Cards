package card

import (
	"cards/gen/proto/card"
	"cards/pkg/ai"
	"cards/pkg/biome"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
)

type CardAttributes struct {
	Name    string
	Type    string
	Element string
	Attack  string
	Defense string
	Action  string
}

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
	fmt.Println("DESCRIPTION", newCard.Description)

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
	cardQuery, err := ai.CardQuery(*newCard)
	if err != nil {
		fmt.Println("error with card query:", err)
		return newCard, err
	}

	cardAtributeString, err := ai.QueryToJSON(cardQuery)
	if err != nil {
		fmt.Println("error calling chatgpt api:", err)
		return newCard, err
	}
	var cardAtributes CardAttributes

	er := json.Unmarshal([]byte(cardAtributeString), &cardAtributes)
	if er != nil {
		log.Fatal(err)
	}
	fmt.Println("ACTION:", cardAtributes.Action)
	newCard.Attack = cardAtributes.Attack
	newCard.Defense = cardAtributes.Defense
	newCard.Action = cardAtributes.Action

	return newCard, nil
}

func ResourceFromBiome(biomeName string, isAnimal bool) (*card.Card, error) {
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
	fmt.Print("selectedBiome:", selectedBiome)

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
	fmt.Print("selectedBiome:", selectedBiome)

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
		newCard = constructAnimalCard(randomAnimal, elementName, randomBiome.Name, randomElement)
	} else {
		newCard = constructPlantCard(randomPlant, elementName, randomBiome.Name, randomElement)
	}
	return newCard, nil
}

func constructResourceCard(resource string, element string, biome string, description string) (*card.Card) {
	newCard := &card.Card{}

	newCard.Animal = resource
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s in the %s. The background depicts %s", element, resource, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, resource)

	return newCard
}

func constructAnimalCard(animal string, element string, biome string, description string) (*card.Card) {
	newCard := &card.Card{}

	newCard.Animal = animal
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s from %s. The background depicts %s", element, animal, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, animal)

	return newCard
}

func constructPlantCard(plant string, element string, biome string, description string) (*card.Card) {
	newCard := &card.Card{}

	newCard.Plant = plant
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s from %s. The background depicts %s", element, plant, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, plant)

	return newCard
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
