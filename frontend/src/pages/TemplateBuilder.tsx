import React, { useState } from 'react';

interface Template {
  template: string;
  examples: { [key: string]: string[] };
}

const TemplateBuilder: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplate, setNewTemplate] = useState<string>('');
  const [newPlaceholder, setNewPlaceholder] = useState<string>('');
  const [newOptions, setNewOptions] = useState<string>('');

  const handleAddTemplate = () => {
    setTemplates([...templates, { template: newTemplate, examples: {} }]);
    setNewTemplate('');
  };

  const handleAddOptions = (templateIndex: number) => {
    const updatedTemplates = [...templates];
    const options = newOptions.split(',').map(option => option.trim());
    updatedTemplates[templateIndex].examples[newPlaceholder] = options;
    setTemplates(updatedTemplates);
    setNewPlaceholder('');
    setNewOptions('');
  };

  const exportToJson = () => {
    const dataStr = JSON.stringify({ I_statement_templates: templates }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'templates.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div>
      <div>
        <input
          type="text"
          value={newTemplate}
          onChange={(e) => setNewTemplate(e.target.value)}
          placeholder="Enter template"
        />
        <button onClick={handleAddTemplate}>Add Template</button>
      </div>
      {templates.map((template, index) => (
        <div key={index}>
          <p>{template.template}</p>
          <input
            type="text"
            value={newPlaceholder}
            onChange={(e) => setNewPlaceholder(e.target.value)}
            placeholder="Enter placeholder (e.g., 'noun')"
          />
          <input
            type="text"
            value={newOptions}
            onChange={(e) => setNewOptions(e.target.value)}
            placeholder="Enter options (comma-separated)"
          />
          <button onClick={() => handleAddOptions(index)}>Add Options</button>
        </div>
      ))}
      <button onClick={exportToJson}>Export to JSON</button>
    </div>
  );
};

export default TemplateBuilder;
