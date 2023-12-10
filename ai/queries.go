package ai

import (
	"cards/gen/proto/biome"
	"encoding/json"
	"fmt"
)

type Scene struct {
	scene    string
	examples map[string][]string
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
