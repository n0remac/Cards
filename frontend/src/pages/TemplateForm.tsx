import React, { useState, useEffect } from 'react';
import Statements from '../components/StatementsComponent';

interface Template {
  template: string;
  examples: { [key: string]: string[] };
}

interface TemplatesJSON {
  I_statement_templates: Template[];
}

const TemplateForm: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    Statements().I_statement_templates.forEach((template, index) => {
      Object.keys(template.examples).forEach((key) => {
        setSelectedOptions(prev => ({ ...prev, [`${index}-${key}`]: template.examples[key][0] }));
      });
    });
  }, []);

  const handleChange = (templateIndex: number, key: string, value: string) => {
    setSelectedOptions({
      ...selectedOptions,
      [`${templateIndex}-${key}`]: value,
    });
  };

  const renderTemplateWithSelectors = (template: Template, index: number) => {
    const segments = template.template.split(/\[([^\]]+)\]/);
    return segments.map((segment, i) => {
      if (i % 2 === 0) {
        return <span key={i}>{segment}</span>;
      } else {
        return (
          <select
            key={i}
            value={selectedOptions[`${index}-${segment}`]}
            onChange={(e) => handleChange(index, segment, e.target.value)}
          >
            {template.examples[segment].map((option) => (
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
      {Statements().I_statement_templates.map((template, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
          {renderTemplateWithSelectors(template, index)}
        </div>
      ))}
    </form>
  );
};

export default TemplateForm;
