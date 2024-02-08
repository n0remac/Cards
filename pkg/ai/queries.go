package ai

import (
	"cards/gen/proto/biome"
	"cards/gen/proto/card"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
)

type Scene struct {
	scene    string
	examples map[string][]string
}

type Element struct {
	Element     string `json:"element"`
	Description string `json:"description"`
}

type Biomes []biome.Biome

func ElementQuery() ([]map[string]string, error) {
	elements, err := ParseElements("pkg/ai/elements.json")
	if err != nil {
		slog.Error("error parsing elements:", err)
		return nil, err
	}

	biomes, err := ParseBiomes("pkg/ai/biomes.json")
	if err != nil {
		return nil, err
	}

	var queries []map[string]string
	for _, b := range biomes {
		stringBiome, err := json.Marshal(b)
		if err != nil {
			fmt.Println("error marshalling biome")
			return nil, err
		}

		query := fmt.Sprintf(`Taking elements from this list: %s Return the following biome with an elements section added to the charictaristics. Choose elements from the previous list that match the following biome:\n%s`, elements, stringBiome)

		queries = append(queries, map[string]string{"name": b.Name, "query": query})
	}

	return queries, nil
}

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

func ParseElements(filename string) ([]Element, error) {
	var elements []Element

	jsonData, err := os.ReadFile(filename)
	if err != nil {
		fmt.Println("Error reading JSON file:", err)
		return nil, err
	}
	// Unmarshal the json
	err = json.Unmarshal(jsonData, &elements)
	if err != nil {
		fmt.Println("Error unmarshalling JSON:", err)
		return nil, err
	}

	return elements, nil
}

func StoryQuery(b biome.Biome) (string, error) {
	// Convert the scene and biome to JSON

	biomeJSON, err := json.Marshal(b)
	if err != nil {
		return "", fmt.Errorf("failed to marshal biome: %v", err)
	}

	prompt := fmt.Sprintf(`
    Using this json template as an example:
    {
		"scenes": [
		  {
			"scene": "Once upon a time, in a world where [adjective1] volcanoes were commonplace, there lived a [adjective2] fire dog named [name]. This fire dog [verb1] amongst the [adjective3] lava flows.",
			"examples": {
			  "adjective1": ["towering", "smoldering", "active"],
			  "adjective2": ["fearless", "fiery", "spirited"],
			  "adjective3": ["molten", "raging", "boiling"],
			  "name": ["Flare", "Ember", "Blaze"],
			  "verb1": ["roamed", "thrived", "played"]
			}
		  },
		  {
			"scene": "One day, while exploring a [adjective1] volcanic crater, [name] stumbled upon a [adjective2] [object]. The fire dog [verb1] [adverb], realizing this object had the power to [verb2] the entire volcano world.",
			"examples": {
			  "adjective1": ["hidden", "mysterious", "ancient"],
			  "adjective2": ["glowing", "enchanted", "forgotten"],
			  "object": ["crystal", "artifact", "stone"],
			  "verb1": ["gazed", "marveled", "pondered"],
			  "verb2": ["change", "revitalize", "awaken"],
			  "adverb": ["curiously", "intently", "cautiously"]
			}
		  },
		  {
			"scene": "Determined to [verb1] the volcano world, [name] embarked on a [adjective1] journey. Along the way, the fire dog [verb2] [adverb] challenges, ultimately [verb3] to [verb4] peace and [adjective2] to the land.",
			"examples": {
			  "verb1": ["save", "protect", "unite"],
			  "verb2": ["overcame", "confronted", "navigated"],
			  "verb3": ["managed", "succeeded", "strived"],
			  "verb4": ["restore", "bring", "establish"],
			  "adjective1": ["perilous", "heroic", "legendary"],
			  "adjective2": ["lasting", "enduring", "eternal"],
			  "adverb": ["bravely", "skillfully", "wisely"]
			}
		  }
		]
	  }	  

    Create a new json template bases on the data from this outline:
    %s

    Choose a main character from the wildlife list. Only output the json for the new story template. Do not include the original template or any data from the original template in the response.
    `, string(biomeJSON))

	fmt.Println("generating prompt")
	fmt.Println(prompt)

	return prompt, nil
}

func CardQuery(c card.Card) (string, error) {
	// Convert the scene and biome to JSON
	prompt := fmt.Sprintf(`
Fill out this template with the type, action and attack and defense values. The chosen values should match the animal and element:

{
	"name": "%s",
	"type": "",  // "Plant" or "Animal"
	"element": "%s",
	"attack": "0",  // Appropriate alue between 1 and 5 based on name, type, and element.
	"defense": "0", // Appropriate alue between 1 and 5 based on name, type, and element.
	"mod": "0" // Ability modifyer
	"action": ""  // A unique action that fits the card
	"flavor_text": ""  // A short sentance that gives the card flavor, drawing inspiration from the name, type, or element.
}

Choose only action from this list:
"Actions": [
	"Add one resource to the resource pool.",
	"Raise the attack value of another card by MOD.",
	"Raise the defense value of another card by MOD.",
	"Lower the attack value of another card by MOD.",
	"Lower the defense value of another card by MOD.",
	"Opponent discards a card from their hand.",
	"Opponent discards a card from their field.",
	"Return a card to the hand from the field".,
	"Return a card to the hand from the discard pile.",
	"Draw a card from the deck."
]	

Only return JSON data.
    `, c.Name, c.Element)

	return prompt, nil
}

func ResourceCardQuery(c card.Card) (string, error) {
	// Convert the scene and biome to JSON
	prompt := fmt.Sprintf(`
Fill out this template with the type, action and attack and defense values. The chosen values should match the animal and element:

{
	"name": "%s",
	"type": "Resource",
	"element": "%s",
	"mod": "0" // Appropriate value between 1 and 3 based on name, type, and element. Lean to the lower end of the scale.
	"flavor": ""  // A short sentance that gives the card flavor, drawing inspiration from the name, type, or element.
}

Only return JSON data.
    `, c.Name, c.Element)

	return prompt, nil
}

func DeckTemplateQuery(setting string) (string, error) {
	// Convert the scene and biome to JSON
	prompt := fmt.Sprintf(`
{
	"name": "",
	"type": "",
	"characteristics": {
		"climate": "",
		"vegetation": "",
		"plants": [], // 6 plants that match the prompt
		"wildlife": [], // 6 animals that match the prompt
		"precipitation": "",
		"resources": [], // 6 resources that match the prompt
		"resourcedescrpitions": [], // 6 descriptions matching each of the resources
		"elements": [], // 6 elemental aspects that match the prompt
		"elementdescriptions": [] // 6 descriptions matching each of the elements
	}
}

Create a new json template based on the data from the outline above given the following information:

%s

Only return JSON data.`, setting)

	return prompt, nil
}
