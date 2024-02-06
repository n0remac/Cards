package biome

import (
	"cards/gen/proto/biome"
	"cards/pkg/ai"
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

	return story, nil
}
