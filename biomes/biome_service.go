package biomes

import (
	"cards/gen/proto/biome"
	"context"

	"github.com/bufbuild/connect-go"
)

type BiomeService struct {
	// Add any fields if needed
}

func (s *BiomeService) CreateBiome(ctx context.Context, req *connect.Request[biome.CreateBiomeRequest]) (*connect.Response[biome.CreateBiomeResponse], error) {
	newBiome, err := createBiomeInDB(req.Msg.Biome)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&biome.CreateBiomeResponse{
		Biome: newBiome,
	}), nil
}

func (s *BiomeService) GetBiome(ctx context.Context, req *connect.Request[biome.GetBiomeRequest]) (*connect.Response[biome.GetBiomeResponse], error) {
	return nil, nil
}

func (s *BiomeService) GetBiomes(ctx context.Context, req *connect.Request[biome.GetBiomesRequest]) (*connect.Response[biome.GetBiomesResponse], error) {
	biomes, err := LoadBiomesFromJSON("biomes/biomes.json")
	if err != nil {
		return nil, err
	}

	// Wrap the slice of *biome.Biome in a Biomes message
	biomesMessage := &biome.Biomes{
		Biomes: biomes,
	}

	return connect.NewResponse(&biome.GetBiomesResponse{
		Biomes: biomesMessage,
	}), nil
}
