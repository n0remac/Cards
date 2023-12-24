package biome

import (
	"cards/pkg/ai"
	"cards/gen/proto/biome"
	"fmt"
)

func generateTemplate(b biome.Biome) (string, error) {

	query, err := ai.StoryQuery(b)
	if err != nil {
		return err.Error(), err
	}
	story, err := ai.QueryToJSON(query)
	if err != nil {
		return err.Error(), err
	}

	fmt.Println("Generating story:")
	fmt.Println(story)

	return story, nil
}
