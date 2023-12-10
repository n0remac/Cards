interface HaikuTemplate {
    scene: string;
    examples: { [key: string]: string[] };
  }
  
  interface HaikuTemplates {
    scenes: HaikuTemplate[];
  }
  
  const getHaikuTemplates = (): HaikuTemplates => {
    const haikuTemplates: HaikuTemplates = {
      scenes: [
        {
          // First line (5 syllables)
          scene: "Life like a [noun1], [verb1]",
          examples: {
            noun1: ["leaf", "stream", "breeze"],
            verb1: ["flows", "glides", "drifts"]
          }
        },
        {
          // Second line (7 syllables)
          scene: "[Adjective1] paths, [adjective2] [noun2]",
          examples: {
            Adjective1: ["winding", "hidden", "endless"],
            adjective2: ["lonely", "mystic", "silent"],
            noun2: ["roads", "journeys", "dreams"]
          }
        },
        {
          // Third line (5 syllables)
          scene: "In [noun3], [verb2] peace",
          examples: {
            noun3: ["stillness", "silence", "nature"],
            verb2: ["find", "seek", "embrace"]
          }
        }
      ]
    };
  
    return haikuTemplates;
  };
  
  export default getHaikuTemplates;
  