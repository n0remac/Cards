interface TemplateExample {
    [key: string]: string[];
  }
  
  interface IStatementTemplate {
    template: string;
    examples: TemplateExample;
  }
  
  interface Templates {
    I_statement_templates: IStatementTemplate[];
  }
  
  const getTemplates = (): Templates => {
    const templates: Templates = {
      "I_statement_templates": [
        {
          "template": "I am [adjective] of [noun]",
          "examples": {
            "adjective": ["afraid", "proud", "fond"],
            "noun": ["heights", "my achievements", "classical music"]
          }
        },
        {
          "template": "I [verb] [adverb] when [scenario]",
          "examples": {
            "verb": ["laugh", "think", "work"],
            "adverb": ["loudly", "deeply", "hard"],
            "scenario": ["I'm happy", "I'm alone", "under pressure"]
          }
        },
        {
          "template": "I have a [adjective] [noun] that [verb] [direct object]",
          "examples": {
            "adjective": ["unique", "strong", "keen"],
            "noun": ["sense", "ability", "desire"],
            "verb": ["detects", "overcomes", "pursues"],
            "direct object": ["subtleties", "obstacles", "dreams"]
          }
        },
        {
          "template": "I [verb] [prepositional phrase]",
          "examples": {
            "verb": ["dream", "aspire", "strive"],
            "prepositional phrase": ["of a better world", "to make a change", "for excellence"]
          }
        },
        {
          "template": "I [verb] [adjective] [noun]",
          "examples": {
            "verb": ["prefer", "enjoy", "avoid"],
            "adjective": ["spicy", "quiet", "crowded"],
            "noun": ["foods", "places", "situations"]
          }
        }
      ]
    };
  
    return templates;
  };
  
  export default getTemplates;
  