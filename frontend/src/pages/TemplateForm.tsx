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
    // Initialize state with default values
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

  const renderTemplate = (template: Template, index: number) => {
    let statement = template.template;
    Object.keys(template.examples).forEach((key) => {
      const regex = new RegExp(`\\[${key}\\]`, 'g');
      statement = statement.replace(regex, selectedOptions[`${index}-${key}`] || key);
    });
    return statement;
  };

  return (
    <form>
      {Statements().I_statement_templates.map((template, index) => (
        <div key={index}>
          {Object.entries(template.examples).map(([key, options]) => (
            <select
              key={key}
              value={selectedOptions[`${index}-${key}`]}
              onChange={(e) => handleChange(index, key, e.target.value)}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
          <p>{renderTemplate(template, index)}</p>
        </div>
      ))}
    </form>
  );
};

export default TemplateForm;
