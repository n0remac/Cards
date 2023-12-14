import React, { useState, useEffect } from 'react';
import getHaikuTemplates from '../components/HaikuComponent'

interface SceneTemplate {
  scene: string;
  examples: { [key: string]: string[] };
}

interface StoryTemplates {
  scenes: SceneTemplate[];
}

const StoryTemplateForm: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    getHaikuTemplates().scenes.forEach((template, index) => {
      Object.keys(template.examples).forEach((key) => {
        setSelectedOptions(prev => ({ ...prev, [`${index}-${key}`]: template.examples[key][0] }));
      });
    });
  }, []);

  const handleChange = (sceneIndex: number, key: string, value: string) => {
    setSelectedOptions({
      ...selectedOptions,
      [`${sceneIndex}-${key}`]: value,
    });
  };

  const renderSceneWithSelectors = (scene: SceneTemplate, index: number) => {
    const segments = scene.scene.split(/\[([^\]]+)\]/);
    return segments.map((segment, i) => {
      if (i % 2 === 0) {
        return <span key={i}>{segment}</span>;
      } else {
        const options = scene.examples[segment];
        if (!options) {
          console.error(`No examples found for segment: ${segment}`);
          return null; // or return a placeholder element
        }
        return (
          <select
            key={i}
            value={selectedOptions[`${index}-${segment}`]}
            onChange={(e) => handleChange(index, segment, e.target.value)}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }
    });
  };
  

  return (
    <form>
      {getHaikuTemplates().scenes.map((scene, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          {renderSceneWithSelectors(scene, index)}
        </div>
      ))}
    </form>
  );
};

export default StoryTemplateForm;
