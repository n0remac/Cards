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
	Mod     string
	Action  string
	Flavor  string
}

type ResourceCardAttributes struct {
	Name    string
	Type    string
	Element string
	Mod     string
	Flavor  string
}

func CardTemplateFromBiome(b string) (*card.CreateCardTemplateResponse, error) {
	cardTemplateResponse := &card.CreateCardTemplateResponse{}

	biomes, err := biome.LoadBiomesFromJSON("pkg/biome/biomes.json")
	if err != nil {
		return nil, err
	}
	var cardTemplate *card.CardTemplate

	for _, biome := range biomes {
		if biome.Name == b {
			cardTemplate = &card.CardTemplate{
				Template:     "A [Element]-[Animal] from [Biome]. The background depicts [Description]",
				Animals:      biome.Characteristics.Wildlife,
				Plants:       biome.Characteristics.Plants,
				Elements:     biome.Characteristics.Elements,
				Descriptions: biome.Characteristics.Elementdescriptions,
			}
		}
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

func CreateCard(cardType string, selectedBiome string) (*card.Card, error) {
	var newCard *card.Card
	var randomBiome *biome.Biome
	var err error
	if selectedBiome == "" {
		randomBiome, _ = getRandomBiome()
		newCard, err = CreateCardFromBiome(randomBiome, cardType)
	} else {
		newBiome, _ := biomeFromFilename(selectedBiome)
		newCard, err = CreateCardFromBiome(newBiome, cardType)
	}
	if err != nil {
		return newCard, err
	}
	if cardType == "Resource" {
		fmt.Println("generating resource card")
		return generateResourceCard(newCard)
	}
	fmt.Println("generating card")
	return generateCard(newCard)
}

func CreateCardFromBiome(selectedBiome *biome.Biome, cardType string) (*card.Card, error) {
	newCard := &card.Card{}

	element := selectedBiome.Characteristics.Elements[rand.Intn(len(selectedBiome.Characteristics.Elements))]
	description := selectedBiome.Characteristics.Elementdescriptions[rand.Intn(len(selectedBiome.Characteristics.Elementdescriptions))]
	fmt.Println("cardType:", cardType)
	if cardType == "Animal" {
		animal := selectedBiome.Characteristics.Wildlife[rand.Intn(len(selectedBiome.Characteristics.Wildlife))]
		newCard = constructAnimalCard(animal, element, selectedBiome.Name, description)
	} else if cardType == "Plant" {
		plant := selectedBiome.Characteristics.Plants[rand.Intn(len(selectedBiome.Characteristics.Plants))]
		newCard = constructPlantCard(plant, element, selectedBiome.Name, description)
	} else if cardType == "Resource" {
		resource := selectedBiome.Characteristics.Resources[rand.Intn(len(selectedBiome.Characteristics.Resources))]
		newCard = constructResourceCard(resource, element, selectedBiome.Name, description)
	}
	return newCard, nil
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
	newCard.Attack = cardAtributes.Attack
	newCard.Defense = cardAtributes.Defense
	newCard.Action = cardAtributes.Action
	newCard.Mod = cardAtributes.Mod
	newCard.Type = cardAtributes.Type
	newCard.Flavor = cardAtributes.Flavor

	fmt.Println("newCard:", newCard)
	return newCard, nil
}

func generateResourceCard(newCard *card.Card) (*card.Card, error) {
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
	cardQuery, err := ai.ResourceCardQuery(*newCard)
	if err != nil {
		fmt.Println("error with card query:", err)
		return newCard, err
	}

	cardAtributeString, err := ai.QueryToJSON(cardQuery)
	if err != nil {
		fmt.Println("error calling chatgpt api:", err)
		return newCard, err
	}
	var resourceCardAtributes ResourceCardAttributes

	er := json.Unmarshal([]byte(cardAtributeString), &resourceCardAtributes)
	if er != nil {
		log.Fatal(err)
	}

	newCard.Mod = resourceCardAtributes.Mod
	newCard.Type = resourceCardAtributes.Type
	newCard.Flavor = resourceCardAtributes.Flavor

	fmt.Println("newCard:", newCard)
	return newCard, nil
}

func biomeFromFilename(biomeName string) (*biome.Biome, error) {
	newBiome := &biome.Biome{}

	filenames, err := getFileNames("pkg/biome/biomes")
	if err != nil {
		fmt.Println("error getting filenames:", err)
		return newBiome, err
	}
	var biomeFilename string
	for _, filename := range filenames {
		if strings.Contains(filename, biomeName) {
			biomeFilename = filename
			break
		}
	}
	if biomeFilename == "" {
		return newBiome, fmt.Errorf("biome %s not found", biomeName)
	}

	selectedBiome, err := biome.ParseBiome(biomeFilename)
	if err != nil {
		return newBiome, err
	}
	return &selectedBiome, nil
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
	description := selectedBiome.Characteristics.Elementdescriptions[rand.Intn(len(selectedBiome.Characteristics.Elementdescriptions))]

	if isAnimal {
		animal := selectedBiome.Characteristics.Wildlife[rand.Intn(len(selectedBiome.Characteristics.Wildlife))]
		newCard = constructAnimalCard(animal, element, selectedBiome.Name, description)
	} else {
		plant := selectedBiome.Characteristics.Plants[rand.Intn(len(selectedBiome.Characteristics.Plants))]
		newCard = constructPlantCard(plant, element, selectedBiome.Name, description)
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
	return generateCard(newCard)

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

	element := randomBiome.Characteristics.Elements[rand.Intn(len(randomBiome.Characteristics.Elements))]
	description := randomBiome.Characteristics.Elementdescriptions[rand.Intn(len(randomBiome.Characteristics.Elementdescriptions))]

	if isAnimal {
		animal := randomBiome.Characteristics.Wildlife[rand.Intn(len(randomBiome.Characteristics.Wildlife))]
		newCard = constructAnimalCard(animal, element, randomBiome.Name, description)
	} else {
		plant := randomBiome.Characteristics.Plants[rand.Intn(len(randomBiome.Characteristics.Plants))]
		newCard = constructPlantCard(plant, element, randomBiome.Name, description)
	}

	return newCard, nil
}

func constructResourceCard(resource string, element string, biome string, description string) *card.Card {
	newCard := &card.Card{}

	newCard.Animal = resource
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s in the %s. The background depicts %s", element, resource, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, resource)

	return newCard
}

func constructAnimalCard(animal string, element string, biome string, description string) *card.Card {
	newCard := &card.Card{}

	newCard.Animal = animal
	newCard.Element = element
	newCard.Biome = biome
	newCard.Description = fmt.Sprintf("A %s-%s from %s. The background depicts %s", element, animal, biome, description)
	newCard.Name = fmt.Sprintf("%s-%s", element, animal)

	return newCard
}

func constructPlantCard(plant string, element string, biome string, description string) *card.Card {
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

func getRandomBiome() (*biome.Biome, error) {
	newBiome := &biome.Biome{}

	filenames, err := getFileNames("pkg/biome/biomes")
	if err != nil {
		fmt.Println("error getting filenames:", err)
		return newBiome, err
	}
	filename := filenames[rand.Intn(len(filenames))]
	randomBiome, err := biome.ParseBiome(filename)
	if err != nil {
		return newBiome, err
	}
	return &randomBiome, nil
}
