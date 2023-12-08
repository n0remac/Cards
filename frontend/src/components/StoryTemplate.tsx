interface SceneExample {
    [key: string]: string[];
  }
  
  interface SceneTemplate {
    scene: string;
    examples: SceneExample;
  }
  
  interface StoryTemplates {
    scenes: SceneTemplate[];
  }
  
  const getStoryTemplates = (): StoryTemplates => {
    const storyTemplates: StoryTemplates = {
      "scenes": [
        {
          "scene": "Once upon a time, there was a [adjective] [noun] who [verb] in a [adjective] [place].",
          "examples": {
            "adjective": ["brave", "mysterious", "kind"],
            "noun": ["knight", "wizard", "princess"],
            "verb": ["lived", "journeyed", "fought"],
            "place": ["kingdom", "forest", "castle"]
          }
        },
        {
          "scene": "One day, the [noun] encountered a [adjective] [creature] that [verb] [adverb].",
          "examples": {
            "noun": ["knight", "wizard", "princess"],
            "adjective": ["fierce", "magical", "gigantic"],
            "creature": ["dragon", "goblin", "giant"],
            "verb": ["roared", "cast a spell", "stomped"],
            "adverb": ["loudly", "menacingly", "angrily"]
          }
        },
        // Additional scenes...
      ]
    };
  
    return storyTemplates;
  };
  
  export default getStoryTemplates;
  