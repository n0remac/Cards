// StoryTemplate.ts
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
    scenes: [
      {
        // Beginning Scene
        scene: "Once upon a time, in a world where [adjective] volcanoes were commonplace, there lived a [adjective] fire dog named [name]. This fire dog [verb] amongst the [adjective] lava flows.",
        examples: {
          adjective: ["towering", "smoldering", "active"],
          name: ["Flare", "Ember", "Blaze"],
          verb: ["roamed", "thrived", "played"]
        }
      },
      {
        // Middle Scene
        scene: "One day, while exploring a [adjective] volcanic crater, [name] stumbled upon a [adjective] [object]. The fire dog [verb] [adverb], realizing this object had the power to [verb] the entire volcano world.",
        examples: {
          adjective: ["hidden", "mysterious", "ancient"],
          object: ["crystal", "artifact", "stone"],
          verb: ["gazed", "marveled", "pondered"],
          adverb: ["curiously", "intently", "cautiously"]
        }
      },
      {
        // End Scene
        scene: "Determined to [verb] the volcano world, [name] embarked on a [adjective] journey. Along the way, the fire dog [verb] [adverb] challenges, ultimately [verb] to [verb] peace and [adjective] to the land.",
        examples: {
          verb: ["save", "protect", "unite"],
          adjective: ["perilous", "heroic", "legendary"],
          adverb: ["bravely", "skillfully", "wisely"]
        }
      }
    ]
  };

  return storyTemplates;
};

export default getStoryTemplates;
