package biome

import (
	"cards/gen/proto/biome"
	"context"
	"os"
	"path/filepath"

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
	biomes, err := LoadBiomesFromJSON("pkg/biome/biomes.json")
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

func (s *BiomeService) GenerateBiomeCard(ctx context.Context, req *connect.Request[biome.Biome]) (*connect.Response[biome.CardResponse], error) {
	story, err := generateTemplate(*req.Msg)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&biome.CardResponse{
		Data: story,
	}), nil
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
