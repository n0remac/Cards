package main

import (
    "context"

    "cards/gen/proto/story" 
)

type storyServiceServer struct {
    pb.UnimplementedStoryServiceServer
    // Add fields for your data storage here (e.g., a database connection)
}

func (s *storyServiceServer) GetAllScenes(ctx context.Context, req *story.CreateSceneRequest) (*story.GetScenesResponse, error) {
    // Logic to retrieve all scenes
    // For example, fetching from a database or in-memory storage
    scenes, err := fetchAllScenes() // Replace with actual data retrieval logic
    if err != nil {
        return nil, err
    }

    return &story.GetScenesResponse{Scenes: scenes}, nil
}


func fetchAllScenes() ([]*story.Scene, error) {
    // Implement your logic to fetch all scenes
    // This is a placeholder function
    return []*story.Scene{}, nil
}
