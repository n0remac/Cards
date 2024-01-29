package biome

import (
	"cards/gen/proto/biome"
	"cards/pkg/database"
	"fmt"

	"encoding/json"
	"io"
	"os"
)

type Biome struct {
	Name            string          `db:"name"`
	Type            string          `db:"type"`
	Characteristics Characteristics `db:"characteristics"`
}

type Characteristics struct {
	Climate               string   `json:"climate"`
	Vegetation            string   `json:"vegetation"`
	Plants                []string `json:"plants"`
	Wildlife              []string `json:"wildlife"`
	Precipitation         string   `json:"precipitation"`
	Elements              []string `json:"elements"`
	Elementdescriptions   []string `json:"elementdescriptions"`
	Resources             []string `json:"resources"`
	Resourcesdescriptions []string `json:"resourcedescriptions"`
}

func createBiomeInDB(biome *biome.Biome) (*biome.Biome, error) {
	sess := database.GetSession()

	newCharacteristics := Characteristics{
		Climate:               biome.Characteristics.Climate,
		Vegetation:            biome.Characteristics.Vegetation,
		Plants:                biome.Characteristics.Plants,
		Wildlife:              biome.Characteristics.Wildlife,
		Precipitation:         biome.Characteristics.Precipitation,
		Elements:              biome.Characteristics.Elements,
		Elementdescriptions:   biome.Characteristics.Elementdescriptions,
		Resources:             biome.Characteristics.Resources,
		Resourcesdescriptions: biome.Characteristics.Resourcesdescriptions,
	}

	// Create a new biome record
	newBiome := Biome{
		Name:            biome.Name,
		Type:            biome.Type,
		Characteristics: newCharacteristics,
	}

	// Insert the new biome into the database
	_, err := sess.Collection("biomes").Insert(newBiome)
	return biome, err
}

func getBiomesFromDB() ([]*biome.Biome, error) {
	sess := database.GetSession()
	var biomes []*biome.Biome

	// Query the database for all biome records
	res := sess.Collection("biomes").Find()

	var dbBiomes []Biome
	err := res.All(&dbBiomes)
	if err != nil {
		return nil, err
	}

	// Convert the JSON data back into biome structs
	for _, dbBiome := range dbBiomes {
		var b biome.Biome
		b.Name = dbBiome.Name
		b.Type = dbBiome.Type
		b.Characteristics = &biome.Characteristics{
			Climate:               dbBiome.Characteristics.Climate,
			Vegetation:            dbBiome.Characteristics.Vegetation,
			Plants:                dbBiome.Characteristics.Plants,
			Wildlife:              dbBiome.Characteristics.Wildlife,
			Precipitation:         dbBiome.Characteristics.Precipitation,
			Elements:              dbBiome.Characteristics.Elements,
			Elementdescriptions:   dbBiome.Characteristics.Elementdescriptions,
			Resources:             dbBiome.Characteristics.Resources,
			Resourcesdescriptions: dbBiome.Characteristics.Resourcesdescriptions,
		}
		biomes = append(biomes, &b)
	}

	return biomes, nil
}

func LoadBiomesFromJSON(filePath string) ([]*biome.Biome, error) {
	var biomes []*biome.Biome

	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	bytes, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(bytes, &biomes)
	if err != nil {
		fmt.Println("Unmarshal error:", err)
		return nil, err
	}

	return biomes, nil
}
